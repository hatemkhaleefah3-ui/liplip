/* Dedicated Excel importer for Watch & Read content. */
const LiplipReceptionImporter = (() => {
 const SCHEMA_VERSION=1;
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
   } if(r.some(x=>val(x)))out.push(r);
  } return out;
 }
 const exact=(got,expected)=>expected.every((h,i)=>val(got[i])===h)&&got.slice(expected.length).every(x=>!val(x));
 function parseRows(input,validate){
  if(!Array.isArray(input)||!input.length)throw Error('لم نجد جدول محتوى.');
  const head=input[0],format=exact(head,WATCH_HEADERS)?'watch':exact(head,READ_HEADERS)?'read':null;
  if(!format)throw Error('أسماء الأعمدة لا تطابق قالب المشاهدة أو قالب القراءة.');
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
   const id=(level-1)*200+(step-1)*20+box;if(!boxes.has(id))boxes.set(id,{watch:[],watchExam:[],read:[],readExam:[]});
   const bucket=boxes.get(id)[process];if(bucket.length>=30)throw Error(`الصف ${line}: تجاوزت 30 عنصراً في العملية.`);
   bucket.push(item);count++;
  });
  if(!count)throw Error('الملف لا يحتوي عناصر قابلة للاستيراد.');
  return {format,boxes,count}
 }
 async function read(file,validate){
  if(!file||!/\.xlsx$/i.test(file.name||''))throw Error('اختر ملف Excel بصيغة .xlsx.');
  if(file.size>12*1024*1024)throw Error('الحد الأقصى 12 ميغابايت.');
  return parseRows(await rows(file),validate);
 }
 return {SCHEMA_VERSION,WATCH_HEADERS,READ_HEADERS,parseRows,read};
})();