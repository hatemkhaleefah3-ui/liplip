import { cookie, error, json } from '../_lib/http.js';
import { createAnonymousSession, requireSession } from '../_lib/auth.js';

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (!session) return error(401, 'unauthorized', 'No active session.');
  return json({ ok: true, user: { id: session.userId, kind: 'anonymous' } });
}

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const existing = await requireSession(context);
  if (existing) return json({ ok: true, user: { id: existing.userId, kind: 'anonymous' }, created: false });

  const session = await createAnonymousSession(context);
  return json(
    { ok: true, user: { id: session.userId, kind: 'anonymous' }, created: true },
    { status: 201, headers: { 'set-cookie': cookie('liplip_session', session.token) } }
  );
}

export async function onRequestDelete(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (session) await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
  return json({ ok: true }, { headers: { 'set-cookie': cookie('liplip_session', '', { maxAge: 0 }) } });
}
