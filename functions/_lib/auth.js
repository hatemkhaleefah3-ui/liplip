import { getCookie, sha256 } from './http.js';

export const REGISTERED_SESSION_DAYS = 365;
const REGISTERED_REFRESH_THRESHOLD_DAYS = 60;

export async function requireSession(context) {
  const token = getCookie(context.request, 'liplip_session');
  if (!token || !context.env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(
    `SELECT s.user_id AS userId, s.expires_at AS expiresAt, u.kind
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? LIMIT 1`
  ).bind(tokenHash).first();
  if (!row || Number(row.expiresAt) <= Date.now()) return null;
  let email=null,status=null;
  if(row.kind==='registered'){
    try{const account=await context.env.DB.prepare('SELECT email,status FROM user_accounts WHERE user_id=? LIMIT 1').bind(row.userId).first();email=account?.email||null;status=account?.status||null}catch{}
    if(status&&status!=='active')return null;
  }
  return { userId: row.userId, tokenHash, kind: row.kind || 'anonymous', email, expiresAt:Number(row.expiresAt)||0 };
}

async function createSessionForUser(context,userId,{maxAgeDays=365}={}){
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + maxAgeDays * 24 * 60 * 60 * 1000;
  await context.env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).bind(tokenHash,userId,now,expiresAt).run();
  return {userId,token,tokenHash,expiresAt};
}

export async function refreshRegisteredSession(context,session){
  if(!session||session.kind!=='registered'||!session.tokenHash)return {refreshed:false,expiresAt:session?.expiresAt||0};
  const now=Date.now();
  const threshold=REGISTERED_REFRESH_THRESHOLD_DAYS*24*60*60*1000;
  if(Number(session.expiresAt)-now>threshold)return {refreshed:false,expiresAt:Number(session.expiresAt)||0};
  const expiresAt=now+REGISTERED_SESSION_DAYS*24*60*60*1000;
  const result=await context.env.DB.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').bind(expiresAt,session.tokenHash).run();
  return {refreshed:(result.meta?.changes||0)===1,expiresAt};
}

export async function createAnonymousSession(context) {
  const userId = crypto.randomUUID();
  const now = Date.now();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO users (id, kind, created_at, updated_at) VALUES (?, 'anonymous', ?, ?)`
    ).bind(userId, now, now),
    context.env.DB.prepare(
      `INSERT INTO user_state (user_id, revision, data_json, updated_at) VALUES (?, 0, '{}', ?)`
    ).bind(userId, now)
  ]);
  return createSessionForUser(context,userId);
}

export async function createRegisteredSession(context,userId){
  await context.env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND expires_at<=?').bind(userId,Date.now()).run();
  return createSessionForUser(context,userId,{maxAgeDays:REGISTERED_SESSION_DAYS});
}

export async function revokeSession(context,session){
  if(session?.tokenHash)await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session.tokenHash).run();
}
