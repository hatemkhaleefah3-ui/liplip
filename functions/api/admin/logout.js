import { requireAdmin } from '../../_lib/admin.js';
import { cookie, json } from '../../_lib/http.js';

export async function onRequestPost(context){
  const admin=await requireAdmin(context);
  if(admin&&context.env.DB)await context.env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(admin.tokenHash).run();
  return json({ok:true},{headers:{'set-cookie':cookie('liplip_admin','',{maxAge:0})}});
}
