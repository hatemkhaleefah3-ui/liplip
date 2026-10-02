import { cookie, json } from '../../_lib/http.js';
import { requireSession, revokeSession } from '../../_lib/auth.js';

export async function onRequestPost(context){
  const session=await requireSession(context);if(session)await revokeSession(context,session);
  return json({ok:true},{headers:{'set-cookie':cookie('liplip_session','',{maxAge:0})}});
}
