import { createAdminSession } from '../../_lib/admin.js';
import { cookie, error, json, readJson, sha256 } from '../../_lib/http.js';
import { clearFailures, recordFailure, throttle } from '../../_lib/password.js';

function clientAddress(request) {
  const direct = String(request.headers.get('cf-connecting-ip') || '').trim();
  if (direct) return direct;
  return String(request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'db_unavailable', 'Database binding DB is not configured.');
  if (!context.env.ADMIN_PASSWORD) return error(503, 'admin_unconfigured', 'ADMIN_PASSWORD is not configured.');
  let body;
  try { body = await readJson(context.request, 8 * 1024); }
  catch (e) { return error(e.status || 400, e.code || 'invalid_request', e.message); }

  const key = `admin-login:${clientAddress(context.request)}`;
  const gate = await throttle(context, key, { limit: 5, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 });
  if (!gate.ok) return error(429, 'too_many_attempts', 'Too many admin sign-in attempts. Try again later.', { retryAfterMs: gate.retryAfterMs });

  const supplied = String(body.password || '');
  const [a,b] = await Promise.all([sha256(supplied), sha256(String(context.env.ADMIN_PASSWORD))]);
  if (!supplied || a !== b) {
    await recordFailure(context, key);
    return error(401, 'invalid_admin_credentials', 'Invalid admin credentials.');
  }

  await clearFailures(context, key);
  const session = await createAdminSession(context);
  return json({ ok: true, expiresAt: session.expiresAt }, { headers: { 'set-cookie': cookie('liplip_admin', session.token, { maxAge: 12 * 60 * 60 }) } });
}
