import { cookie, error, json, readJson } from '../../_lib/http.js';
import { REGISTERED_SESSION_MAX_AGE_SECONDS, createRegisteredSession, requireSession, revokeSession } from '../../_lib/auth.js';
import { clearFailures, normalizeEmail, throttle, validEmail, verifyPassword } from '../../_lib/password.js';

export async function onRequestPost(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  let body;try{body=await readJson(context.request,16*1024)}catch(e){return error(e.status||400,e.code||'invalid_request',e.message)}
  const email=normalizeEmail(body.email),password=String(body.password||'');
  if(!validEmail(email)||!password)return error(400,'invalid_credentials','Email and password are required.');
  const key=`login:${email}`,gate=await throttle(context,key,{limit:8});if(!gate.ok)return error(429,'too_many_attempts','Too many sign-in attempts. Try again later.',{retryAfterMs:gate.retryAfterMs});
  const row=await context.env.DB.prepare(`SELECT a.user_id AS userId,a.email,a.password_salt AS passwordSalt,a.password_hash AS passwordHash,a.password_iterations AS passwordIterations,a.status,u.kind FROM user_accounts a JOIN users u ON u.id=a.user_id WHERE a.email=? LIMIT 1`).bind(email).first();
  if(!row||row.status!=='active'||!(await verifyPassword(password,row)))return error(401,'invalid_credentials','Invalid email or password.');
  await clearFailures(context,key);
  const current=await requireSession(context);if(current)await revokeSession(context,current);
  const session=await createRegisteredSession(context,row.userId);
  await context.env.DB.prepare('UPDATE users SET updated_at=? WHERE id=?').bind(Date.now(),row.userId).run();
  return json({ok:true,user:{id:row.userId,kind:'registered',email:row.email}}, {headers:{'set-cookie':cookie('liplip_session',session.token,{maxAge:REGISTERED_SESSION_MAX_AGE_SECONDS})}});
}
