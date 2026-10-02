import { cookie, error, json, readJson } from '../../_lib/http.js';
import { createRegisteredSession, requireSession, revokeSession } from '../../_lib/auth.js';
import { clearFailures, hashPassword, normalizeEmail, throttle, validEmail, validPassword } from '../../_lib/password.js';

export async function onRequestPost(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  let body;try{body=await readJson(context.request,16*1024)}catch(e){return error(e.status||400,e.code||'invalid_request',e.message)}
  const email=normalizeEmail(body.email),password=String(body.password||'');
  if(!validEmail(email))return error(400,'invalid_email','Enter a valid email address.');
  if(!validPassword(password))return error(400,'weak_password','Password must be 10–128 characters.');
  const gate=await throttle(context,`register:${email}`,{limit:5});if(!gate.ok)return error(429,'too_many_attempts','Too many attempts. Try again later.',{retryAfterMs:gate.retryAfterMs});
  const existing=await context.env.DB.prepare('SELECT user_id FROM user_accounts WHERE email=? LIMIT 1').bind(email).first();
  if(existing)return error(409,'email_in_use','An account already exists for this email.');
  const current=await requireSession(context);const userId=current?.kind==='anonymous'?current.userId:crypto.randomUUID();const now=Date.now();
  const pw=await hashPassword(password);
  const accountInsert=context.env.DB.prepare(`INSERT INTO user_accounts(user_id,email,password_salt,password_hash,password_iterations,email_verified,status,created_at,updated_at) VALUES(?,?,?,?,?,0,'active',?,?)`).bind(userId,email,pw.salt,pw.hash,pw.iterations,now,now);
  try{
    if(!current||current.kind!=='anonymous'){
      // D1 batch is transactional: a concurrent duplicate-email insert cannot
      // leave behind an orphan users/user_state row.
      await context.env.DB.batch([
        context.env.DB.prepare("INSERT INTO users(id,kind,created_at,updated_at) VALUES(?,'registered',?,?)").bind(userId,now,now),
        context.env.DB.prepare("INSERT INTO user_state(user_id,revision,data_json,updated_at) VALUES(?,0,'{}',?)").bind(userId,now),
        accountInsert
      ]);
    }else{
      await context.env.DB.batch([
        context.env.DB.prepare("UPDATE users SET kind='registered',updated_at=? WHERE id=?").bind(now,userId),
        accountInsert
      ]);
    }
  }catch(e){
    // The pre-check above is advisory; the UNIQUE(email) constraint is the
    // concurrency-safe authority. Convert that race into the normal API result.
    const raced=await context.env.DB.prepare('SELECT user_id FROM user_accounts WHERE email=? LIMIT 1').bind(email).first().catch(()=>null);
    if(raced)return error(409,'email_in_use','An account already exists for this email.');
    throw e;
  }
  if(current)await revokeSession(context,current);
  const session=await createRegisteredSession(context,userId);await clearFailures(context,`register:${email}`);
  return json({ok:true,user:{id:userId,kind:'registered',email}}, {status:201,headers:{'set-cookie':cookie('liplip_session',session.token,{maxAge:30*24*60*60})}});
}
