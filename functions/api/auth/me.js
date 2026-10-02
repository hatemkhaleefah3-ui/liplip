import { error, json } from '../../_lib/http.js';
import { requireSession } from '../../_lib/auth.js';

export async function onRequestGet(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  const session=await requireSession(context);if(!session)return error(401,'unauthorized','No active session.');
  let identity=null;
  try{
    identity=await context.env.DB.prepare(
      `SELECT provider,email,display_name AS name,avatar_url AS picture,subject
         FROM auth_identities WHERE user_id=? ORDER BY updated_at DESC LIMIT 1`
    ).bind(session.userId).first();
  }catch{}
  return json({ok:true,user:{
    id:session.userId,
    kind:session.kind,
    email:session.email||identity?.email||null,
    provider:identity?.provider||null,
    name:identity?.name||null,
    picture:identity?.picture||null,
    phone:identity?.provider==='whatsapp'?identity.subject:null
  }});
}
