import { cookie, error, json, readJson, sha256 } from '../../../_lib/http.js';
import { completeIdentityLogin, normalizePhone } from '../../../_lib/social.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  if (!context.env.WHATSAPP_OTP_SECRET) return error(503, 'whatsapp_unconfigured', 'WhatsApp sign-in is not configured.');
  let body;
  try { body = await readJson(context.request, 8 * 1024); }
  catch (e) { return error(e.status || 400, e.code || 'invalid_request', e.message); }
  const phone = normalizePhone(body.phone);
  const code = String(body.code || '').trim();
  if (!phone || !/^\d{6}$/.test(code)) return error(400, 'invalid_code', 'Enter the 6-digit verification code.');

  const row = await context.env.DB.prepare(
    'SELECT code_hash AS codeHash,attempts,expires_at AS expiresAt FROM whatsapp_otps WHERE phone=? LIMIT 1'
  ).bind(phone).first();
  if (!row || Number(row.expiresAt) <= Date.now()) return error(400, 'code_expired', 'The verification code expired. Request a new one.');
  if (Number(row.attempts) >= 5) return error(429, 'too_many_attempts', 'Too many incorrect codes. Request a new code.');

  const supplied = await sha256(`${phone}:${code}:${context.env.WHATSAPP_OTP_SECRET}`);
  if (supplied !== row.codeHash) {
    await context.env.DB.prepare('UPDATE whatsapp_otps SET attempts=attempts+1 WHERE phone=?').bind(phone).run();
    return error(401, 'wrong_code', 'Incorrect verification code.');
  }

  await context.env.DB.prepare('DELETE FROM whatsapp_otps WHERE phone=?').bind(phone).run();
  const login = await completeIdentityLogin(context, { provider: 'whatsapp', subject: phone, name: phone });
  return json(
    { ok: true, user: { id: login.userId, kind: 'registered', provider: 'whatsapp', phone } },
    { headers: { 'set-cookie': cookie('liplip_session', login.session.token, { maxAge: 30 * 24 * 60 * 60 }) } }
  );
}
