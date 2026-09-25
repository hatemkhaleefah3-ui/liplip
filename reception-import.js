/* Dedicated Excel importer for Watch & Read content. */
const LiplipReceptionImporter = (() => {
 const SCHEMA_VERSION=2;
 const COMBINED_HEADERS=['Read','Read Exam','Watch','Watch Exam'];
 const WATCH_HEADERS=['Item process','Item level','Item step','Item box','Item type','Title Arabic','YouTube URL','English','Arabic','Image link','Prompt Arabic','Option 1','Option 2','Option 3','Option 4','Correct option','Answer','Explanation Arabic'];
 const READ_HEADERS=['Item process','Item level','Item step','Item box','Item type','Title Arabic','Page','English','Arabic','Image link','Prompt Arabic','Option 1','Option 2','Option 3','Option 4','Correct option','Answer','Explanation Arabic'];
 const XML='http://schemas.openxmlformats.org/spreadsheetml/2006/main',REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const val=x=>String(x??'').trim();
 const num=(x,max)=>{const s=val(x);if(!/^[1-9]\d*$/.test(s))return null;const n=Number(s);return n<=max?n:null};
 function xml(text){const doc=new DOMParser().parseFromString(text.replace(/^\uFEFF/,''),'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('ملف Excel يحتوي بيانات غير صالحة.');return doc}
 function nodes(parent,name){return [...parent.getElementsByTagNameNS(XML,name)]}
 function column(ref){const letters=/^[A-Z]+/.exec(ref)?.[0];return letters?[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1:-1}
 async function rows(file){
  if(typeof JSZip==='undefined')throw Error('قارئ Excel غير متاح. أعد تحميل الصفحة.');
  let zip;try{zip=await JSZip.loadAsync(await file.arrayBuffer())}catch{throw Error('تعذّر فتح الملف. استخدم ملف .xlsx صالحاً.')}
  const read=async p=>{const e=zip.file(p);return e?e.async('string'):null};
  const wt=await read('xl/workbook.xml'),rt=await read('xl/_rels/workbook.xml.rels');if(!wt||!rt)throw Error('ملف Excel غير مكتمل.');
  const book=xml(wt),rels=xml(rt),sheets=nodes(book,'sheet'),sheet=sheets.find(x=>x.getAttribute('name')==='Content')||(sheets.length===1?sheets[0]:null);
  if(!sheet)throw Error('استخدم ورقة باسم Content أو ملفاً يحتوي ورقة واحدة.');
  const rid=sheet.getAttributeNS(REL,'id'),rel=[...rels.getElementsByTagName('*')].find(x=>x.localName==='Relationship'&&x.getAttribute('Id')===rid),target=rel?.getAttribute('Target'),path=target?.startsWith('/')?target.slice(1):'xl/'+target;
  const st=path&&await read(path);if(!st)throw Error('تعذّر العثور على ورقة Content.');
  const sharedText=await read('xl/sharedStrings.xml'),shared=sharedText?nodes(xml(sharedText),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
  const out=[];
  for(const row of nodes(xml(st),'row')){
   const r=[];for(const cell of [...row.children].filter(x=>x.localName==='c')){
    if([...cell.children].some(x=>x.localName==='f'))throw Error('لا تستخدم معادلات Excel؛ حوّلها إلى قيم.');
    const i=column(cell.getAttribute('r')||'');if(i<0||i>40)continue;
    const kind=cell.getAttribute('t'),v=[...cell.children].find(x=>x.localName==='v')?.textContent;let x='';
    if(kind==='s'){const id=Number(v);x=shared[id]??''}
    else if(kind==='inlineStr'){const inline=[...cell.children].find(x=>x.localName==='is');x=inline?nodes(inline,'t').map(t=>t.textContent).join(''):''}
    else if(v!==undefined)x=kind==='n'||(!kind&&v!==''&&Number.isFinite(Number(v)))?Number(v):v;
    r[i]=x;
   }
   if(r.some(x=>val(x))){const rn=Number(row.getAttribute('r'))||out.length+1;out[rn-1]=r}
  }
  return out;
 }
 const exact=(got,expected)=>expected.every((h,i)=>val(got?.[i])===h)&&(got||[]).slice(expected.length).every(x=>!val(x));
 const freshBox=()=>({watch:[],watchExam:[],read:[],readExam:[]});
 function push(boxes,boxId,process,item,line){
  if(!boxes.has(boxId))boxes.set(boxId,freshBox());
  const bucket=boxes.get(boxId)[process];
  if(bucket.length>=30)throw Error(`الصف ${line}: تجاوزت 30 عنصراً في ${process}.`);
  bucket.push(item);
 }
 function parseCombinedExam(text,kind,boxId,line,validate,boxes){
  const lines=String(text??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let count=0;
  lines.forEach((entry,qIndex)=>{
   const parts=entry.split('|').map(x=>x.trim()),code=String(parts.shift()||'').toUpperCase();
   const qLine=`${line}، سؤال ${qIndex+1}`;
   let process,item;
   try{
    if(kind==='read'){
     process='readExam';
     if(code==='EN_AR'){if(parts.length<2)throw Error('صيغة EN_AR هي: EN_AR | English | العربية');item=validate(process,{type:'enToArWrite',english:parts[0],answer:parts[1]})}
     else if(code==='AR_EN'){if(parts.length<2)throw Error('صيغة AR_EN هي: AR_EN | العربية | English');item=validate(process,{type:'arToEnWrite',arabic:parts[0],answer:parts[1]})}
     else if(code==='MCQ'){
      if(parts.length<4)throw Error('صيغة MCQ تحتاج سؤالاً وخيارين على الأقل ورقم الإجابة الصحيحة.');
      const correct=Number(parts.at(-1)),options=parts.slice(1,-1).filter(Boolean);
      if(!Number.isInteger(correct)||correct<1||correct>options.length)throw Error('رقم الإجابة الصحيحة في MCQ غير صالح.');
      item=validate(process,{type:'mcq',prompt:parts[0],options,correct:correct-1})
     }else throw Error('استخدم EN_AR أو AR_EN أو MCQ في Read Exam.')
    }else{
     process='watchExam';
     if(code==='VOICE'){
      if(parts.length<4)throw Error('صيغة VOICE تحتاج النص الإنجليزي وخيارين على الأقل ورقم الإجابة.');
      const correct=Number(parts.at(-1)),options=parts.slice(1,-1).filter(Boolean);
      if(!Number.isInteger(correct)||correct<1||correct>options.length)throw Error('رقم الإجابة الصحيحة في VOICE غير صالح.');
      item=validate(process,{type:'textVoice',english:parts[0],options,correct:correct-1})
     }else if(code==='IMAGE_AR'){
      if(parts.length<2)throw Error('صيغة IMAGE_AR هي: IMAGE_AR | Image URL | الإجابة العربية | عنوان اختياري');
      item=validate(process,{type:'imageArabicWrite',image:parts[0],answer:parts[1],prompt:parts[2]||'انظر إلى الصورة واكتب معناها بالعربية.'})
     }else if(code==='MCQ'){
      if(parts.length<4)throw Error('صيغة MCQ تحتاج سؤالاً وخيارين على الأقل ورقم الإجابة الصحيحة.');
      const correct=Number(parts.at(-1)),options=parts.slice(1,-1).filter(Boolean);
      if(!Number.isInteger(correct)||correct<1||correct>options.length)throw Error('رقم الإجابة الصحيحة في MCQ غير صالح.');
      item=validate(process,{type:'mcq',prompt:parts[0],options,correct:correct-1})
     }else throw Error('استخدم VOICE أو IMAGE_AR أو MCQ في Watch Exam.')
    }
   }catch(e){throw Error(`الصف ${qLine}: ${e.message}`)}
   push(boxes,boxId,process,item,line);count++;
  });
  return count;
 }
 function parseCombined(input,validate){
  const boxes=new Map();let count=0;
  for(let index=1;index<input.length;index++){
   const src=input[index];if(!src?.some(x=>val(x)))continue;
   const boxId=index,line=index+1;
   if(boxId>1000)throw Error(`الصف ${line}: القالب يدعم حتى 1000 صندوق فقط.`);
   const readText=val(src[0]),readExam=val(src[1]),watchUrl=val(src[2]),watchExam=val(src[3]);
   if(readText){let item;try{item=validate('read',{type:'storyPage',title:`قصة الصندوق ${boxId}`,page:1,english:readText})}catch(e){throw Error(`الصف ${line}، Read: ${e.message}`)}push(boxes,boxId,'read',item,line);count++}
   if(readExam)count+=parseCombinedExam(readExam,'read',boxId,line,validate,boxes);
   if(watchUrl){let item;try{item=validate('watch',{type:'video',title:`فيديو الصندوق ${boxId}`,youtube:watchUrl})}catch(e){throw Error(`الصف ${line}، Watch: ${e.message}`)}push(boxes,boxId,'watch',item,line);count++}
   if(watchExam)count+=parseCombinedExam(watchExam,'watch',boxId,line,validate,boxes);
  }
  if(!count)throw Error('الملف لا يحتوي محتوى قابلاً للاستيراد.');
  return {format:'combined',boxes,count}
 }
 function parseLegacy(input,validate,format){
  const boxes=new Map();let count=0;
  input.slice(1).forEach((src,index)=>{
   const line=index+2;if(!src?.some(x=>val(x)))return;
   const process=val(src[0]),level=num(src[1],5),step=num(src[2],10),box=num(src[3],20),type=val(src[4]);
   const allowed=format==='watch'?['watch','watchExam']:['read','readExam'];
   if(!allowed.includes(process)||!level||!step||!box)throw Error(`الصف ${line}: العملية أو المستوى أو الخطوة أو الصندوق غير صحيح لهذا القالب.`);
   const base={type,title:val(src[5]),english:val(src[7]),arabic:val(src[8]),image:val(src[9]),prompt:val(src[10]),options:[val(src[11]),val(src[12]),val(src[13]),val(src[14])].filter(Boolean),answer:val(src[16]),explanation:val(src[17])};
   if(format==='watch')base.youtube=val(src[6]);else base.page=num(src[6],99)||1;
   if(type==='mcq'||type==='textVoice'){const correct=num(src[15],base.options.length);if(!correct)throw Error(`الصف ${line}: Correct option يجب أن يطابق عدد الخيارات.`);base.correct=correct-1}
   let item;try{item=validate(process,base)}catch(e){throw Error(`الصف ${line}: ${e.message}`)}
   const id=(level-1)*200+(step-1)*20+box;push(boxes,id,process,item,line);count++;
  });
  if(!count)throw Error('الملف لا يحتوي عناصر قابلة للاستيراد.');
  return {format,boxes,count}
 }
 function parseRows(input,validate){
  if(!Array.isArray(input)||!input.length)throw Error('لم نجد جدول محتوى.');
  const head=input[0]||[];
  if(exact(head,COMBINED_HEADERS))return parseCombined(input,validate);
  if(exact(head,WATCH_HEADERS))return parseLegacy(input,validate,'watch');
  if(exact(head,READ_HEADERS))return parseLegacy(input,validate,'read');
  throw Error('أسماء الأعمدة لا تطابق القالب الجديد: Read | Read Exam | Watch | Watch Exam.');
 }
 async function read(file,validate){
  if(!file||!/\.xlsx$/i.test(file.name||''))throw Error('اختر ملف Excel بصيغة .xlsx.');
  if(file.size>12*1024*1024)throw Error('الحد الأقصى 12 ميغابايت.');
  return parseRows(await rows(file),validate);
 }
 return {SCHEMA_VERSION,COMBINED_HEADERS,WATCH_HEADERS,READ_HEADERS,parseRows,read};
})();