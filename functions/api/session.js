import { cookie, error, getCookie, json } from '../_lib/http.js';
import { REGISTERED_SESSION_MAX_AGE_SECONDS, createAnonymousSession, refreshRegisteredSession, requireSession, revokeSession } from '../_lib/auth.js';

function user(session){return {id:session.userId,kind:session.kind||'anonymous',email:session.email||null}}

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (!session) return error(401, 'unauthorized', 'No active session.');
  const headers={};
  if(session.kind==='registered'){
    await refreshRegisteredSession(context,session);
    const token=getCookie(context.request,'liplip_session');
    if(token)headers['set-cookie']=cookie('liplip_session',token,{maxAge:REGISTERED_SESSION_MAX_AGE_SECONDS});
  }
  return json({ ok: true, user: user(session) }, {headers});
}

export async function onRequestPost(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const existing = await requireSession(context);
  if (existing) return json({ ok: true, user: user(existing), created: false });
  const session = await createAnonymousSession(context);
  return json({ ok: true, user: { id: session.userId, kind: 'anonymous', email:null }, created: true }, { status: 201, headers: { 'set-cookie': cookie('liplip_session', session.token) } });
}

export async function onRequestDelete(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (session) await revokeSession(context,session);
  return json({ ok: true }, { headers: { 'set-cookie': cookie('liplip_session', '', { maxAge: 0 }) } });
}
