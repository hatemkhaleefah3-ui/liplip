/* One worksheet / one table: all box content types use these columns. */
const LiplipImporter = (() => {
 const HEADERS=['Item process','Item level','Item step','Item box','Item type','English','Arabic','Example','Prompt','Audio','Option 1','Option 2','Option 3','Correct option','Explanation','Answer','Title','Formula','Body'];
 const PROCESSES=['vocab','checkpointVocab','listen','checkpointListen','grammar','exam'];
 const blank=()=>Object.fromEntries(PROCESSES.map(key=>[key,[]]));
 let scriptPromise;
 function library(){
  if(typeof XLSX!=='undefined')return Promise.resolve(XLSX);
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise((resolve,reject)=>{
   const tag=document.createElement('script');
   tag.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
   tag.async=true;
   tag.onload=()=>typeof XLSX!=='undefined'?resolve(XLSX):reject(Error('تعذّر تحميل قارئ Excel. جرّب لاحقاً.'));
   tag.onerror=()=>reject(Error('تعذّر تحميل قارئ Excel. تحقّق من اتصال الإنترنت.'));
   document.head.appendChild(tag);
  }).catch(error=>{scriptPromise=null;throw error});
  return scriptPromise;
 }
 const value=x=>String(x??'').trim();
 function positive(value,max){
  const raw=String(value??'').trim();
  if(!/^[1-9]\d*$/.test(raw))return null;
  const number=Number(raw);
  return number<=max?number:null;
 }
 function parseRows(rows,validateItem){
  if(!Array.isArray(rows)||!rows.length)throw Error('لم نجد جدول المحتوى.');
  if(HEADERS.some((heading,i)=>value(rows[0]?.[i])!==heading)||rows[0].slice(HEADERS.length).some(x=>value(x)))throw Error('أسماء الأعمدة غير مطابقة للقالب. استخدم ملف liplip الأصلي.');
  if(rows.length>30001)throw Error('الملف يتجاوز ٣٠٬٠٠٠ صف. قسّمه إلى مستويات أو خطوات.');
  const boxes=new Map();let count=0;
  rows.slice(1).forEach((row,index)=>{
   if(!row?.some(cell=>value(cell)))return;
   const line=index+2,process=value(row[0]),stage=positive(row[1],5),step=positive(row[2],10),box=positive(row[3],20),type=value(row[4]);
   if(!PROCESSES.includes(process)||!stage||!step||!box)throw Error(`الصف ${line}: العملية أو المستوى أو الخطوة أو الصندوق غير صحيح.`);
   const fields={type,en:value(row[5]),ar:value(row[6]),example:value(row[7]),prompt:value(row[8]),audio:value(row[9]),options:[value(row[10]),value(row[11]),value(row[12])],explanation:value(row[14]),answer:value(row[15]),title:value(row[16]),formula:value(row[17]),body:value(row[18])};
   if(type==='choice'||type==='audioChoice'){
    const correct=positive(row[13],3);
    if(!correct)throw Error(`الصف ${line}: الإجابة الصحيحة يجب أن تكون 1 أو 2 أو 3.`);
    fields.correct=correct-1;
   }
   let item;
   try{item=validateItem(process,fields)}catch(error){throw Error(`الصف ${line}: ${error.message}`)}
   const id=(stage-1)*200+(step-1)*20+box;
   if(!boxes.has(id))boxes.set(id,blank());
   const bucket=boxes.get(id)[process];
   if(bucket.length>=30)throw Error(`الصف ${line}: الحد الأقصى ٣٠ عنصراً لكل عملية في الصندوق.`);
   bucket.push(item);count++;
  });
  if(!count)throw Error('الملف لا يحتوي عناصر تعليمية.');
  return {boxes,count};
 }
 async function read(file,validateItem){
  if(!file||!/\.xlsx$/i.test(file.name||''))throw Error('اختر ملف Excel بصيغة .xlsx.');
  if(file.size>12*1024*1024)throw Error('الحد الأقصى لحجم الملف ١٢ ميغابايت.');
  const parser=await library();
  let book;
  try{book=parser.read(await file.arrayBuffer(),{type:'array',sheetRows:30002,cellFormula:true})}catch{throw Error('تعذّر فتح الملف. تأكد أنه ملف .xlsx صالح.')}
  const sheet=book.Sheets?.Content;
  if(!sheet)throw Error('يجب أن يحتوي الملف على ورقة باسم Content.');
  if(parser.utils.decode_range(sheet['!ref']||'A1').e.r>30000)throw Error('الملف يتجاوز ٣٠٬٠٠٠ صف.');
  if(Object.values(sheet).some(cell=>cell&&typeof cell==='object'&&cell.f))throw Error('تحتوي الورقة على صيغ. استبدلها بالقيم قبل الاستيراد.');
  return parseRows(parser.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:false}),validateItem);
 }
 return {HEADERS,parseRows,read};
})();
