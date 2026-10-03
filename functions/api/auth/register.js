import { cookie, error, json, readJson } from '../../_lib/http.js';
import { createRegisteredSession, REGISTERED_SESSION_DAYS, requireSession, revokeSession } from '../../_lib/auth.js';
import { clearFailures, hashPassword, normalizeEmail, throttle, validEmail, validPassword } from '../../_lib/password.js';

export async function onRequestPost(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  let body;try{body=await readJson(context.request,16*1024)}catch(e){return error(e.status||400,e.code||'invalid_request',e.message)}
  const email=normalizeEmail(body.email),password=String(body.password||'');
  if(!validEmail(email))return error(400,'invalid_email','Enter a valid email address.');
  if(!validPassword(password))return error(400,'weak_password','Password must be 10–128 characters.');
  const key=`register:${email}`,gate=await throttle(context,key,{limit:5});if(!gate.ok)return error(429,'too_many_attempts','Too many attempts. Try again later.',{retryAfterMs:gate.retryAfterMs});
  const existing=await context.env.DB.prepare('SELECT user_id FROM user_accounts WHERE email=? LIMIT 1').bind(email).first();
  if(existing)return error(409,'email_in_use','An account already exists for this email.');

  const current=await requireSession(context),userId=current?.kind==='anonymous'?current.userId:crypto.randomUUID(),now=Date.now();
  const pw=await hashPassword(password);
  const account=context.env.DB.prepare(`INSERT INTO user_accounts(user_id,email,password_salt,password_hash,password_iterations,email_verified,status,created_at,updated_at) VALUES(?,?,?,?,?,0,'active',?,?)`).bind(userId,email,pw.salt,pw.hash,pw.iterations,now,now);

  try{
    if(current?.kind==='anonymous'){
      // D1 batch() is transactional: either promotion and account creation both commit, or neither does.
      await context.env.DB.batch([
        context.env.DB.prepare("UPDATE users SET kind='registered',updated_at=? WHERE id=?").bind(now,userId),
        account
      ]);
    }else{
      await context.env.DB.batch([
        context.env.DB.prepare("INSERT INTO users(id,kind,created_at,updated_at) VALUES(?,'registered',?,?)").bind(userId,now,now),
        context.env.DB.prepare("INSERT INTO user_state(user_id,revision,data_json,updated_at) VALUES(?,0,'{}',?)").bind(userId,now),
        account
      ]);
    }
  }catch(batchError){
    // A concurrent registration can win the UNIQUE(email) race after the pre-check.
    const raced=await context.env.DB.prepare('SELECT user_id FROM user_accounts WHERE email=? LIMIT 1').bind(email).first().catch(()=>null);
    if(raced)return error(409,'email_in_use','An account already exists for this email.');
    console.error('[register]',batchError);
    return error(500,'registration_failed','Could not create the account. Try again.');
  }

  // Create the replacement session before revoking the old anonymous one so a transient
  // session-write failure cannot strand an upgraded account without a usable session.
  let session;
  try{session=await createRegisteredSession(context,userId)}catch(sessionError){
    console.error('[register session]',sessionError);
    return error(500,'session_failed','Account created, but sign-in could not be completed. Try signing in again.');
  }
  if(current)await revokeSession(context,current);
  await clearFailures(context,key);
  return json({ok:true,user:{id:userId,kind:'registered',email}}, {status:201,headers:{'set-cookie':cookie('liplip_session',session.token,{maxAge:REGISTERED_SESSION_DAYS*24*60*60})}});
}
