import { error, json, readJson } from '../_lib/http.js';
import { requireSession } from '../_lib/auth.js';

const MAX_STATE_BYTES = 512 * 1024;

async function loadState(context, userId) {
  const row = await context.env.DB.prepare(
    'SELECT revision, data_json AS dataJson, updated_at AS updatedAt FROM user_state WHERE user_id = ? LIMIT 1'
  ).bind(userId).first();
  if (!row) return { revision: 0, data: {}, updatedAt: 0 };
  let data = {};
  try { data = JSON.parse(row.dataJson || '{}'); } catch {}
  return { revision: Number(row.revision) || 0, data, updatedAt: Number(row.updatedAt) || 0 };
}

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (!session) return error(401, 'unauthorized', 'No active session.');
  const state = await loadState(context, session.userId);
  return json({ ok: true, ...state });
}

export async function onRequestPut(context) {
  if (!context.env.DB) return error(503, 'database_unavailable', 'D1 binding DB is not configured.');
  const session = await requireSession(context);
  if (!session) return error(401, 'unauthorized', 'No active session.');

  let body;
  try { body = await readJson(context.request, MAX_STATE_BYTES); }
  catch (e) { return error(e.status || 400, e.code || 'bad_request', e.message || 'Bad request'); }

  if (!body || typeof body.data !== 'object' || Array.isArray(body.data) || body.data === null) {
    return error(400, 'invalid_state', 'data must be a JSON object.');
  }
  const expectedRevision = Number(body.revision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return error(400, 'invalid_revision', 'revision must be a non-negative integer.');
  }

  const current = await loadState(context, session.userId);
  if (current.revision !== expectedRevision) {
    return json({ ok: false, error: { code: 'revision_conflict', message: 'State changed on another client.' }, ...current }, { status: 409 });
  }

  const dataJson = JSON.stringify(body.data);
  if (new TextEncoder().encode(dataJson).byteLength > MAX_STATE_BYTES) {
    return error(413, 'state_too_large', 'State exceeds 512 KiB.');
  }

  const nextRevision = current.revision + 1;
  const now = Date.now();
  const result = await context.env.DB.prepare(
    `UPDATE user_state SET revision = ?, data_json = ?, updated_at = ?
     WHERE user_id = ? AND revision = ?`
  ).bind(nextRevision, dataJson, now, session.userId, current.revision).run();

  if ((result.meta?.changes || 0) !== 1) {
    const latest = await loadState(context, session.userId);
    return json({ ok: false, error: { code: 'revision_conflict', message: 'State changed on another client.' }, ...latest }, { status: 409 });
  }

  return json({ ok: true, revision: nextRevision, updatedAt: now });
}
