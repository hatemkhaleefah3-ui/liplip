import { json } from '../_lib/http.js';

export async function onRequestGet(context) {
  let database = 'unbound';
  if (context.env.DB) {
    try {
      await context.env.DB.prepare('SELECT 1 AS ok').first();
      database = 'ok';
    } catch {
      database = 'error';
    }
  }
  return json({ ok: database === 'ok', service: 'liplip-backend', database, time: new Date().toISOString() }, { status: database === 'ok' ? 200 : 503 });
}
