import { requireAdmin } from '../../../_lib/admin.js';
import { error, json } from '../../../_lib/http.js';

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'db_unavailable', 'Database binding DB is not configured.');
  if (!(await requireAdmin(context))) return error(401, 'admin_required', 'Admin authentication required.');
  const id = String(context.params?.id || '').trim();
  if (!id) return error(400, 'invalid_user', 'User id is required.');
  const row = await context.env.DB.prepare(
    `SELECT u.id, u.kind, u.created_at AS createdAt, u.updated_at AS updatedAt,
            s.revision, s.updated_at AS stateUpdatedAt, s.data_json AS dataJson
       FROM users u LEFT JOIN user_state s ON s.user_id = u.id
      WHERE u.id = ? LIMIT 1`
  ).bind(id).first();
  if (!row) return error(404, 'user_not_found', 'User not found.');
  let data = {};
  try { data = JSON.parse(row.dataJson || '{}'); } catch {}
  return json({ ok: true, user: { id: row.id, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt, stateUpdatedAt: row.stateUpdatedAt, revision: row.revision || 0 }, data });
}
