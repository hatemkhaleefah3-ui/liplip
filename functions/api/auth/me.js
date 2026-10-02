import { error, json } from '../../_lib/http.js';
import { requireSession } from '../../_lib/auth.js';

export async function onRequestGet(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  const session=await requireSession(context);if(!session)return error(401,'unauthorized','No active session.');
  return json({ok:true,user:{id:session.userId,kind:session.kind,email:session.email||null}});
}
