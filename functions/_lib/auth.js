import { getCookie, sha256 } from './http.js';

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
  return { userId: row.userId, tokenHash, kind: row.kind || 'anonymous', email };
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
  return createSessionForUser(context,userId,{maxAgeDays:30});
}

export async function revokeSession(context,session){
  if(session?.tokenHash)await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(session.tokenHash).run();
}
