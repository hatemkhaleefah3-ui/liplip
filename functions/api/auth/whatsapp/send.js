import { error, json, readJson, sha256 } from '../../../_lib/http.js';
import { normalizePhone } from '../../../_lib/social.js';

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_AUTH_TEMPLATE', 'WHATSAPP_OTP_SECRET'];
  for (const name of required) if (!context.env[name]) return error(503, 'whatsapp_unconfigured', 'WhatsApp sign-in is not configured.');

  let body;
  try { body = await readJson(context.request, 8 * 1024); }
  catch (e) { return error(e.status || 400, e.code || 'invalid_request', e.message); }
  const phone = normalizePhone(body.phone);
  if (!phone) return error(400, 'invalid_phone', 'Enter a valid phone number with country code, for example +9647...');

  const now = Date.now();
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  const code = String(100000 + (bytes[0] % 900000));
  const codeHash = await sha256(`${phone}:${code}:${context.env.WHATSAPP_OTP_SECRET}`);

  // Claim the per-phone cooldown in the same statement that installs the OTP. Concurrent
  // requests cannot both observe an old last_sent_at and send two codes.
  const claimed = await context.env.DB.prepare(
    `INSERT INTO whatsapp_otps(phone,code_hash,attempts,created_at,expires_at,last_sent_at)
     VALUES(?,?,0,?,?,?)
     ON CONFLICT(phone) DO UPDATE SET
       code_hash=excluded.code_hash,
       attempts=0,
       created_at=excluded.created_at,
       expires_at=excluded.expires_at,
       last_sent_at=excluded.last_sent_at
     WHERE whatsapp_otps.last_sent_at <= ?`
  ).bind(phone, codeHash, now, now + 10 * 60_000, now, now - 60_000).run();
  if ((claimed.meta?.changes || 0) !== 1) return error(429, 'otp_too_soon', 'Wait one minute before requesting another code.');

  const version = String(context.env.META_GRAPH_VERSION || 'v24.0').replace(/^\/+/, '');
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(context.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: phone.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: String(context.env.WHATSAPP_AUTH_TEMPLATE),
      language: { code: String(context.env.WHATSAPP_AUTH_LANGUAGE || 'en_US') },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }
      ]
    }
  };

  let response;
  let result = {};
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${context.env.WHATSAPP_ACCESS_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    result = await response.json().catch(() => ({}));
  } catch (sendError) {
    await context.env.DB.prepare('DELETE FROM whatsapp_otps WHERE phone=? AND code_hash=?').bind(phone, codeHash).run();
    console.error('[whatsapp otp]', sendError);
    return error(502, 'whatsapp_send_failed', 'Could not send the WhatsApp verification code.');
  }

  if (!response.ok) {
    // Only remove the OTP installed by this request. A very slow upstream failure must not
    // delete a newer code that another request legitimately issued after the cooldown.
    await context.env.DB.prepare('DELETE FROM whatsapp_otps WHERE phone=? AND code_hash=?').bind(phone, codeHash).run();
    console.error('[whatsapp otp]', result);
    return error(502, 'whatsapp_send_failed', 'Could not send the WhatsApp verification code.');
  }
  return json({ ok: true, expiresIn: 600 });
}
