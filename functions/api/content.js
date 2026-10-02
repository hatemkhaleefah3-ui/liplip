import { error, json } from '../_lib/http.js';

export async function onRequestGet(context){
  if(!context.env.DB)return error(503,'database_unavailable','D1 binding DB is not configured.');
  const row=await context.env.DB.prepare("SELECT revision,data_json AS dataJson,updated_at AS updatedAt FROM course_content WHERE id='published' LIMIT 1").first();
  if(!row)return json({ok:true,revision:0,data:{},updatedAt:0});
  let data={};try{data=JSON.parse(row.dataJson||'{}')}catch{}
  return json({ok:true,revision:Number(row.revision)||0,data,updatedAt:Number(row.updatedAt)||0},{headers:{etag:`W/\"content-${Number(row.revision)||0}\"`}});
}
