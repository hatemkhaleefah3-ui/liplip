import { REGISTERED_SESSION_MAX_AGE_SECONDS, createRegisteredSession, requireSession, revokeSession } from './auth.js';
import { cookie, getCookie, sha256 } from './http.js';

const OAUTH_TTL_MS = 10 * 60 * 1000;

export function normalizePhone(value) {
  const raw = String(value || '').trim().replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(raw) ? raw : null;
}

export async function createOAuthState(context, provider) {
  const state = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
  const stateHash = await sha256(state);
  const now = Date.now();
  const current = await requireSession(context);
  await context.env.DB.prepare(
    `INSERT INTO oauth_states(state_hash,provider,user_id,created_at,expires_at) VALUES(?,?,?,?,?)`
  ).bind(stateHash, provider, current?.userId || null, now, now + OAUTH_TTL_MS).run();
  return { state, cookie: cookie('liplip_oauth_state', state, { maxAge: 10 * 60 }) };
}

export async function consumeOAuthState(context, provider, suppliedState) {
  const cookieState = getCookie(context.request, 'liplip_oauth_state');
  if (!suppliedState || !cookieState || suppliedState !== cookieState) return null;
  const stateHash = await sha256(suppliedState),now=Date.now();
  const row = await context.env.DB.prepare(
    `SELECT provider,user_id AS userId,expires_at AS expiresAt FROM oauth_states WHERE state_hash=? LIMIT 1`
  ).bind(stateHash).first();
  if (!row || row.provider !== provider || Number(row.expiresAt) <= now) {
    if (row) await context.env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=?').bind(stateHash).run();
    return null;
  }
  const consumed=await context.env.DB.prepare(
    'DELETE FROM oauth_states WHERE state_hash=? AND provider=? AND expires_at>?'
  ).bind(stateHash,provider,now).run();
  return (consumed.meta?.changes||0)===1?row:null;
}

async function existingUser(context, userId) {
  if (!userId) return null;
  const row = await context.env.DB.prepare('SELECT id FROM users WHERE id=? LIMIT 1').bind(userId).first();
  return row?.id || null;
}

async function identityOwner(context,provider,subject){
  const row=await context.env.DB.prepare('SELECT user_id AS userId FROM auth_identities WHERE provider=? AND subject=? LIMIT 1').bind(provider,subject).first();
  return row?.userId||null;
}

function identityInsert(context,userId,identity,now){
  return context.env.DB.prepare(
    `INSERT INTO auth_identities(user_id,provider,subject,email,display_name,avatar_url,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?)`
  ).bind(
    userId,
    String(identity.provider||''),
    String(identity.subject||''),
    identity.email ? String(identity.email).toLowerCase() : null,
    identity.name || null,
    identity.picture || null,
    now,
    now
  );
}

export async function completeIdentityLogin(context, identity, { userIdHint = null, useCurrentSession = true } = {}) {
  const provider = String(identity.provider || '');
  const subject = String(identity.subject || '');
  if (!provider || !subject) throw new Error('invalid_social_identity');

  const now = Date.now();
  const current = await requireSession(context);
  let userId = await identityOwner(context,provider,subject);

  if (!userId && identity.email && identity.emailVerified === true) {
    const account = await context.env.DB.prepare('SELECT user_id AS userId FROM user_accounts WHERE email=? LIMIT 1').bind(String(identity.email).toLowerCase()).first();
    if (account) userId = account.userId;
  }
  if (!userId && userIdHint) userId = await existingUser(context, userIdHint);
  if (!userId && useCurrentSession && current) userId = current.userId;

  const ownerBeforeClaim=await identityOwner(context,provider,subject);
  if(ownerBeforeClaim){
    userId=ownerBeforeClaim;
  }else{
    const candidate=userId||crypto.randomUUID(),isNew=!userId;
    try{
      const statements=[];
      if(isNew){
        statements.push(
          context.env.DB.prepare("INSERT INTO users(id,kind,created_at,updated_at) VALUES(?,'registered',?,?)").bind(candidate,now,now),
          context.env.DB.prepare("INSERT INTO user_state(user_id,revision,data_json,updated_at) VALUES(?,0,'{}',?)").bind(candidate,now)
        );
      }else{
        statements.push(context.env.DB.prepare("UPDATE users SET kind='registered',updated_at=? WHERE id=?").bind(now,candidate));
      }
      statements.push(identityInsert(context,candidate,identity,now));
      await context.env.DB.batch(statements);
      userId=candidate;
    }catch(identityRace){
      const owner=await identityOwner(context,provider,subject);
      if(!owner)throw identityRace;
      userId=owner;
    }
  }

  await context.env.DB.prepare("UPDATE users SET kind='registered',updated_at=? WHERE id=?").bind(now,userId).run();
  await context.env.DB.prepare(
    `UPDATE auth_identities SET email=?,display_name=?,avatar_url=?,updated_at=? WHERE provider=? AND subject=?`
  ).bind(
    identity.email ? String(identity.email).toLowerCase() : null,
    identity.name || null,
    identity.picture || null,
    now,
    provider,
    subject
  ).run();

  const session = await createRegisteredSession(context, userId);
  if (current) await revokeSession(context, current);
  return { userId, session };
}

export function socialRedirectResponse(session, provider, oauthStateCookie) {
  const headers = new Headers({ location: `/?auth=${encodeURIComponent(provider)}` });
  headers.append('set-cookie', cookie('liplip_session', session.token, { maxAge: REGISTERED_SESSION_MAX_AGE_SECONDS }));
  if (oauthStateCookie !== false) headers.append('set-cookie', cookie('liplip_oauth_state', '', { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}

export function socialErrorRedirect(code) {
  const headers = new Headers({
    location: `/?auth_error=${encodeURIComponent(code || 'social_login_failed')}`,
    'cache-control': 'no-store'
  });
  headers.append('set-cookie', cookie('liplip_oauth_state', '', { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}
