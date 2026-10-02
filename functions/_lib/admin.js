import { getCookie, sha256 } from './http.js';

export async function requireAdmin(context) {
  const token = getCookie(context.request, 'liplip_admin');
  if (!token || !context.env.DB) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(
    `SELECT expires_at AS expiresAt FROM admin_sessions WHERE token_hash = ? LIMIT 1`
  ).bind(tokenHash).first();
  if (!row || Number(row.expiresAt) <= Date.now()) return null;
  return { tokenHash };
}

export async function createAdminSession(context) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60 * 1000;
  await context.env.DB.prepare(
    `INSERT INTO admin_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)`
  ).bind(tokenHash, now, expiresAt).run();
  return { token, expiresAt };
}
