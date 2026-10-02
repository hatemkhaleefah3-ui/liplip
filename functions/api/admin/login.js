import { createAdminSession } from '../../_lib/admin.js';
import { cookie, error, json, readJson, sha256 } from '../../_lib/http.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'db_unavailable', 'Database binding DB is not configured.');
  if (!context.env.ADMIN_PASSWORD) return error(503, 'admin_unconfigured', 'ADMIN_PASSWORD is not configured.');
  let body;
  try { body = await readJson(context.request, 8 * 1024); }
  catch (e) { return error(e.status || 400, e.code || 'invalid_request', e.message); }
  const supplied = String(body.password || '');
  const [a,b] = await Promise.all([sha256(supplied), sha256(String(context.env.ADMIN_PASSWORD))]);
  if (!supplied || a !== b) return error(401, 'invalid_admin_credentials', 'Invalid admin credentials.');
  const session = await createAdminSession(context);
  return json({ ok: true, expiresAt: session.expiresAt }, { headers: { 'set-cookie': cookie('liplip_admin', session.token, { maxAge: 12 * 60 * 60 }) } });
}
