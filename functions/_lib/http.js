export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status, code, message, extra = {}) {
  return json({ ok: false, error: { code, message, ...extra } }, { status });
}

export async function readJson(request, maxBytes = 512 * 1024) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw Object.assign(new Error('Payload too large'), { status: 413, code: 'payload_too_large' });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw Object.assign(new Error('Payload too large'), { status: 413, code: 'payload_too_large' });
  try { return text ? JSON.parse(text) : {}; }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400, code: 'invalid_json' }); }
}

export function cookie(name, value, { maxAge = 60 * 60 * 24 * 365 } = {}) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
