import { createRegisteredSession, requireSession, revokeSession } from './auth.js';
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
  const stateHash = await sha256(suppliedState);
  const row = await context.env.DB.prepare(
    `SELECT provider,user_id AS userId,expires_at AS expiresAt FROM oauth_states WHERE state_hash=? LIMIT 1`
  ).bind(stateHash).first();
  await context.env.DB.prepare('DELETE FROM oauth_states WHERE state_hash=?').bind(stateHash).run();
  if (!row || row.provider !== provider || Number(row.expiresAt) <= Date.now()) return null;
  return row;
}

export async function completeIdentityLogin(context, identity) {
  const provider = String(identity.provider || '');
  const subject = String(identity.subject || '');
  if (!provider || !subject) throw new Error('Invalid social identity');

  const now = Date.now();
  let userId = null;
  const existingIdentity = await context.env.DB.prepare(
    'SELECT user_id AS userId FROM auth_identities WHERE provider=? AND subject=? LIMIT 1'
  ).bind(provider, subject).first();
  if (existingIdentity) userId = existingIdentity.userId;

  const current = await requireSession(context);
  if (!userId && identity.email) {
    const account = await context.env.DB.prepare('SELECT user_id AS userId FROM user_accounts WHERE email=? LIMIT 1').bind(String(identity.email).toLowerCase()).first();
    if (account) userId = account.userId;
  }
  if (!userId && current) userId = current.userId;

  if (!userId) {
    userId = crypto.randomUUID();
    await context.env.DB.batch([
      context.env.DB.prepare("INSERT INTO users(id,kind,created_at,updated_at) VALUES(?,'registered',?,?)").bind(userId, now, now),
      context.env.DB.prepare("INSERT INTO user_state(user_id,revision,data_json,updated_at) VALUES(?,0,'{}',?)").bind(userId, now)
    ]);
  } else {
    await context.env.DB.prepare("UPDATE users SET kind='registered',updated_at=? WHERE id=?").bind(now, userId).run();
  }

  await context.env.DB.prepare(
    `INSERT INTO auth_identities(user_id,provider,subject,email,display_name,avatar_url,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(provider,subject) DO UPDATE SET
       email=excluded.email,display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at`
  ).bind(
    userId,
    provider,
    subject,
    identity.email ? String(identity.email).toLowerCase() : null,
    identity.name || null,
    identity.picture || null,
    now,
    now
  ).run();

  if (current) await revokeSession(context, current);
  const session = await createRegisteredSession(context, userId);
  return { userId, session };
}

export function socialRedirectResponse(session, provider, oauthStateCookie) {
  const headers = new Headers({ location: `/?auth=${encodeURIComponent(provider)}` });
  headers.append('set-cookie', cookie('liplip_session', session.token, { maxAge: 30 * 24 * 60 * 60 }));
  if (oauthStateCookie !== false) headers.append('set-cookie', cookie('liplip_oauth_state', '', { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}

export function socialErrorRedirect(code) {
  return Response.redirect(`/?auth_error=${encodeURIComponent(code || 'social_login_failed')}`, 302);
}
