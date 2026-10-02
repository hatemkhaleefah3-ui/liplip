import { json } from '../_lib/http.js';

export async function onRequestGet(context) {
  let database='unbound',schema='unknown';
  if(context.env.DB){
    try{
      await context.env.DB.prepare('SELECT 1 AS ok').first();database='ok';
      try{
        await context.env.DB.prepare('SELECT user_id FROM user_accounts LIMIT 1').first();
        await context.env.DB.prepare("SELECT revision FROM course_content WHERE id='published' LIMIT 1").first();
        await context.env.DB.prepare('SELECT provider FROM auth_identities LIMIT 1').first();
        await context.env.DB.prepare('SELECT phone FROM whatsapp_otps LIMIT 1').first();
        schema='v3';
      }catch{schema='migration-required'}
    }catch{database='error'}
  }
  const ok=database==='ok'&&schema==='v3';
  return json({ok,service:'liplip-backend',version:3,database,schema,time:new Date().toISOString()},{status:ok?200:503});
}
