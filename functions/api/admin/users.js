import { requireAdmin } from '../../_lib/admin.js';
import { error, json } from '../../_lib/http.js';

export async function onRequestGet(context) {
  if (!context.env.DB) return error(503, 'db_unavailable', 'Database binding DB is not configured.');
  if (!(await requireAdmin(context))) return error(401, 'admin_required', 'Admin authentication required.');
  const rows = await context.env.DB.prepare(
    `SELECT u.id, u.kind, u.created_at AS createdAt, u.updated_at AS updatedAt,
            s.revision, s.updated_at AS stateUpdatedAt, s.data_json AS dataJson
       FROM users u LEFT JOIN user_state s ON s.user_id = u.id
      ORDER BY u.updated_at DESC LIMIT 500`
  ).all();
  const users = (rows.results || []).map(row => {
    let data = {};
    try { data = JSON.parse(row.dataJson || '{}'); } catch {}
    let preview = {};
    try { preview = JSON.parse(data['liplip-preview'] || '{}'); } catch {}
    const profile = preview.profile && typeof preview.profile === 'object' ? preview.profile : {};
    return { id: row.id, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt, stateUpdatedAt: row.stateUpdatedAt, revision: row.revision || 0, name: profile.name || '', city: profile.city || '', town: profile.town || '', guest: preview.guest === true };
  });
  return json({ ok: true, users });
}
