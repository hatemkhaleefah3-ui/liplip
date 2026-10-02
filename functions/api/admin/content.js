import { requireAdmin } from '../../_lib/admin.js';
import { error, json, readJson } from '../../_lib/http.js';

const MAX=2*1024*1024;
async function load(db){const row=await db.prepare("SELECT revision,data_json AS dataJson,updated_at AS updatedAt,updated_by AS updatedBy FROM course_content WHERE id='published' LIMIT 1").first();let data={};try{data=JSON.parse(row?.dataJson||'{}')}catch{}return{revision:Number(row?.revision)||0,data,updatedAt:Number(row?.updatedAt)||0,updatedBy:row?.updatedBy||null}}

export async function onRequestGet(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  if(!(await requireAdmin(context)))return error(401,'admin_required','Admin authentication required.');
  return json({ok:true,...await load(context.env.DB)});
}

export async function onRequestPut(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  if(!(await requireAdmin(context)))return error(401,'admin_required','Admin authentication required.');
  let body;try{body=await readJson(context.request,MAX)}catch(e){return error(e.status||400,e.code||'invalid_request',e.message)}
  if(!body||typeof body.data!=='object'||body.data===null||Array.isArray(body.data))return error(400,'invalid_content','data must be an object.');
  const expected=Number(body.revision);if(!Number.isInteger(expected)||expected<0)return error(400,'invalid_revision','revision must be a non-negative integer.');
  const current=await load(context.env.DB);if(current.revision!==expected)return json({ok:false,error:{code:'revision_conflict',message:'Content changed on another admin client.'},...current},{status:409});
  const dataJson=JSON.stringify(body.data);if(new TextEncoder().encode(dataJson).byteLength>MAX)return error(413,'content_too_large','Published content exceeds 2 MiB.');
  const next=expected+1,now=Date.now();
  const result=await context.env.DB.prepare("UPDATE course_content SET revision=?,data_json=?,updated_at=?,updated_by='admin' WHERE id='published' AND revision=?").bind(next,dataJson,now,expected).run();
  if((result.meta?.changes||0)!==1)return json({ok:false,error:{code:'revision_conflict',message:'Content changed on another admin client.'},...await load(context.env.DB)},{status:409});
  await context.env.DB.prepare("INSERT INTO audit_log(actor_type,actor_id,action,target_type,target_id,created_at,meta_json) VALUES('admin','admin','content.publish','course_content','published',?,?)").bind(now,JSON.stringify({revision:next})).run();
  return json({ok:true,revision:next,updatedAt:now});
}
