const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestPost({request,env}){
  if(!env.GEMINI_API_KEY)return json({error:'gemini_not_configured'},503);
  let body;try{body=await request.json()}catch{return json({error:'invalid_json'},400)}
  const text=String(body?.text||'').trim(),language=String(body?.language||'en-US').slice(0,20);
  if(!text||text.length>160)return json({error:'invalid_text'},400);
  const style=language.startsWith('ar')?'Clear educational Iraqi Arabic pronunciation, warm and slow enough for a beginner.':'Clear educational pronunciation, warm and slow enough for a beginner.';
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({model:'gemini-3.8-flash-lite-tts',input:[{type:'user_input',content:[{type:'text',text,annotations:[{type:'speech_metadata',style}]}]}],response_format:{type:'audio',mime_type:'audio/wav'},generation_config:{speech_config:[{voice:'Kore',language}]}})});
  if(!r.ok)return json({error:'gemini_tts_failed'},502);
  const out=await r.json(),audio=out?.interaction?.output_audio?.data||out?.output_audio?.data;
  if(!audio)return json({error:'missing_audio'},502);
  const bytes=Uint8Array.from(atob(audio),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'content-type':'audio/wav','cache-control':'public, max-age=86400'}});
}
