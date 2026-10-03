import { sha256 } from './http.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

export async function ipRateKey(request, scope) {
  const address = String(request.headers.get('cf-connecting-ip') || '').trim() || 'unknown';
  const digest = await sha256(address);
  return `${scope}:ip:${digest.slice(0, 32)}`;
}

export async function consumeRateLimit(context, key, {
  limit = 60,
  windowMs = DEFAULT_WINDOW_MS,
  blockMs = windowMs
} = {}) {
  const db = context.env?.DB;
  if (!db) return { ok: true, remaining: limit };

  const safeLimit = Math.max(1, Math.floor(Number(limit) || 1));
  const safeWindow = Math.max(1000, Math.floor(Number(windowMs) || DEFAULT_WINDOW_MS));
  const safeBlock = Math.max(1000, Math.floor(Number(blockMs) || safeWindow));
  const now = Date.now();

  await db.prepare(`
    INSERT INTO auth_attempts(key,count,window_started_at,blocked_until)
    VALUES(?,1,?,0)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE
        WHEN auth_attempts.blocked_until > ? THEN auth_attempts.count
        WHEN ? - auth_attempts.window_started_at >= ? THEN 1
        ELSE auth_attempts.count + 1
      END,
      window_started_at = CASE
        WHEN auth_attempts.blocked_until > ? THEN auth_attempts.window_started_at
        WHEN ? - auth_attempts.window_started_at >= ? THEN ?
        ELSE auth_attempts.window_started_at
      END,
      blocked_until = CASE
        WHEN auth_attempts.blocked_until > ? THEN auth_attempts.blocked_until
        WHEN ? - auth_attempts.window_started_at >= ? THEN 0
        ELSE auth_attempts.blocked_until
      END
  `).bind(
    key, now,
    now, now, safeWindow,
    now, now, safeWindow, now,
    now, now, safeWindow
  ).run();

  const row = await db.prepare(
    'SELECT count,window_started_at AS windowStartedAt,blocked_until AS blockedUntil FROM auth_attempts WHERE key=? LIMIT 1'
  ).bind(key).first();
  const blockedUntil = Number(row?.blockedUntil) || 0;
  if (blockedUntil > now) {
    return { ok: false, retryAfterMs: blockedUntil - now, remaining: 0 };
  }

  const count = Number(row?.count) || 0;
  if (count > safeLimit) {
    const until = now + safeBlock;
    await db.prepare(
      'UPDATE auth_attempts SET blocked_until=? WHERE key=? AND blocked_until<=?'
    ).bind(until, key, now).run();
    return { ok: false, retryAfterMs: safeBlock, remaining: 0 };
  }

  return { ok: true, remaining: Math.max(0, safeLimit - count) };
}

export async function consumeIpRateLimit(context, scope, options) {
  return consumeRateLimit(context, await ipRateKey(context.request, scope), options);
}
