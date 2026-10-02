import { getCookie, sha256 } from './http.js';

export async function requireSession(context) {
  const token = getCookie(context.request, 'liplip_session');
  if (!token || !context.env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(
    `SELECT s.user_id AS userId, s.expires_at AS expiresAt
     FROM sessions s WHERE s.token_hash = ? LIMIT 1`
  ).bind(tokenHash).first();
  if (!row || Number(row.expiresAt) <= Date.now()) return null;
  return { userId: row.userId, tokenHash };
}

export async function createAnonymousSession(context) {
  const userId = crypto.randomUUID();
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + 365 * 24 * 60 * 60 * 1000;

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO users (id, kind, created_at, updated_at) VALUES (?, 'anonymous', ?, ?)`
    ).bind(userId, now, now),
    context.env.DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(tokenHash, userId, now, expiresAt),
    context.env.DB.prepare(
      `INSERT INTO user_state (user_id, revision, data_json, updated_at) VALUES (?, 0, '{}', ?)`
    ).bind(userId, now)
  ]);

  return { userId, token, expiresAt };
}
