const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export async function onRequestPost({request,env}){
  if(!env.GEMINI_API_KEY)return json({error:'gemini_not_configured'},503);
  let body;try{body=await request.json()}catch{return json({error:'invalid_json'},400)}
  const target=String(body?.target||'').trim();
  const image=String(body?.image||'');
  if(!target||!/^data:image\/(png|webp|jpeg);base64,/.test(image))return json({error:'invalid_input'},400);
  const [meta,data]=image.split(',',2);if(!data||data.length>2_000_000)return json({error:'image_too_large'},413);
  const mimeType=meta.slice(5,meta.indexOf(';'));
  const prompt=`You grade a beginner learner's handwriting. Expected target: ${JSON.stringify(target)}. Judge whether the drawing is recognizably the requested letter, digit, or written word. Be tolerant of normal child/beginner handwriting, stroke order, proportions, and minor imperfections. Reject blank, unrelated, or clearly different symbols. Return JSON only: {"correct":boolean,"confidence":number,"feedback":"short reason"}. confidence must be 0..1.`;
  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data}}]}],generationConfig:{temperature:0,responseMimeType:'application/json'}})});
  if(!r.ok)return json({error:'gemini_failed'},502);
  const out=await r.json();
  const text=out?.candidates?.[0]?.content?.parts?.find(p=>typeof p.text==='string')?.text;
  try{const grade=JSON.parse(text);return json({correct:grade.correct===true,confidence:Math.max(0,Math.min(1,Number(grade.confidence)||0)),feedback:String(grade.feedback||'').slice(0,160)})}catch{return json({error:'invalid_gemini_response'},502)}
}
