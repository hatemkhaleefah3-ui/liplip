import { createAdminSession } from '../../_lib/admin.js';
import { cookie, error, json, readJson, sha256 } from '../../_lib/http.js';
import { clearFailures, recordFailure, throttle } from '../../_lib/password.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'db_unavailable', 'Database binding DB is not configured.');
  if (!context.env.ADMIN_PASSWORD) return error(503, 'admin_unconfigured', 'ADMIN_PASSWORD is not configured.');
  let body;
  try { body = await readJson(context.request, 8 * 1024); }
  catch (e) { return error(e.status || 400, e.code || 'invalid_request', e.message); }

  // Scope throttling by source address so one remote client cannot brute-force
  // the global admin secret without also allowing an attacker to lock out every admin.
  const source = String(context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for') || 'unknown')
    .split(',')[0].trim().slice(0, 128);
  const key = `admin-login:${source}`;
  const gate = await throttle(context, key, { limit: 6, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 });
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
