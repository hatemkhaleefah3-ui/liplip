/* One worksheet / one table: all box content types use these columns. */
const LiplipImporter = (() => {
 const SCHEMA_VERSION=8;
 const HEADERS=['Item process','Item level','Item step','Item box','Item type','Image link','English','Arabic','Example','Prompt','Audio','Option 1','Option 2','Option 3','Correct option','Explanation','Answer','Title','Formula','Body'];
 const EXTENDED_HEADERS=[...HEADERS,'Option 4','Image link 2','Image link 3','Image link 4'];
 const PREVIOUS_HEADERS=[...HEADERS.slice(0,5),...HEADERS.slice(6),'Image link'];
 const PROCESSES=['vocab','checkpointVocab','listen','checkpointListen','grammar','exam'];
 const blank=()=>Object.fromEntries(PROCESSES.map(key=>[key,[]]));
 const XML='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 function xml(string){const doc=new DOMParser().parseFromString(string.replace(/^\uFEFF/,''),'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('ملف Excel يحتوي بيانات غير صالحة.');return doc}
 function nodes(parent,name){return [...parent.getElementsByTagNameNS(XML,name)]}
 function column(ref){const letters=/^[A-Z]+/.exec(ref)?.[0];if(!letters)return -1;return [...letters].reduce((index,char)=>index*26+char.charCodeAt(0)-64,0)-1}
 async function sheetRows(file){
  if(typeof JSZip==='undefined')throw Error('تعذّر فتح قارئ Excel. أعد تحميل الصفحة وحاول مجدداً.');
  let zip;try{zip=await JSZip.loadAsync(await file.arrayBuffer())}catch{throw Error('تعذّر فتح الملف. تأكد أنه ملف .xlsx صالح.')}
  const read=async name=>{const entry=zip.file(name);return entry?entry.async('string'):null};
  const workbookText=await read('xl/workbook.xml'),relationshipsText=await read('xl/_rels/workbook.xml.rels');
  if(!workbookText||!relationshipsText)throw Error('تعذّر فتح الملف. تأكد أنه ملف .xlsx صالح.');
  const book=xml(workbookText),relationships=xml(relationshipsText);
  const sheets=nodes(book,'sheet'),content=sheets.find(sheet=>sheet.getAttribute('name')==='Content')||(sheets.length===1?sheets[0]:null);
  if(!content)throw Error('استخدم ورقة باسم Content، أو ملف Excel يحتوي على ورقة واحدة فقط.');
  const relationId=content.getAttributeNS(REL,'id');
  const relation=[...relationships.getElementsByTagName('*')].find(element=>element.localName==='Relationship'&&element.getAttribute('Id')===relationId);
  const target=relation?.getAttribute('Target');
  const path=target?.startsWith('/')?target.slice(1):'xl/'+target;
  if(!path||!/^xl\/worksheets\/[a-zA-Z0-9_.-]+\.xml$/.test(path))throw Error('تعذّر العثور على ورقة المحتوى في الملف.');
  const sheetText=await read(path);
  if(!sheetText)throw Error('تعذّر العثور على ورقة المحتوى في الملف.');
  const sharedText=await read('xl/sharedStrings.xml');
  const shared=sharedText?nodes(xml(sharedText),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
  const rows=[];
  for(const row of nodes(xml(sheetText),'row')){
   const number=Number(row.getAttribute('r'));
   if(!Number.isInteger(number)||number<1||number>30001)throw Error('الملف يتجاوز ٣٠٬٠٠٠ صف أو يحتوي صفوفاً غير صحيحة.');
   const result=[];
   for(const cell of [...row.children].filter(element=>element.localName==='c')){
    if([...cell.children].some(child=>child.localName==='f'))throw Error(`الصف ${number}: يحتوي معادلة. استبدل الصيغ بالقيم قبل الاستيراد.`);
    const index=column(cell.getAttribute('r')||'');
    if(index<0||index>100)throw Error(`الصف ${number}: عنوان العمود غير صحيح.`);
    const kind=cell.getAttribute('t'),v=[...cell.children].find(child=>child.localName==='v')?.textContent;
    let resultValue='';
    if(kind==='s'){const id=Number(v);if(!Number.isInteger(id)||id<0||id>=shared.length)throw Error(`الصف ${number}: نص مشترك غير صحيح.`);resultValue=shared[id]}
    else if(kind==='inlineStr'){const inline=[...cell.children].find(child=>child.localName==='is');resultValue=inline?nodes(inline,'t').map(t=>t.textContent).join(''):''}
    else if(v!==undefined)resultValue=kind==='n'||(!kind&&v!==''&&Number.isFinite(Number(v)))?Number(v):v;
    result[index]=resultValue;
   }
   if(rows.length===0&&number!==1)throw Error('يجب أن تكون أسماء الأعمدة في الصف الأول.');
   if(result.some(value=>String(value??'').trim()))rows.push(result);
  }
  return rows;
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
  const headings=rows[0].map(value),same=expected=>expected.every((heading,i)=>headings[i]===heading)&&headings.slice(expected.length).every(x=>!x);
  const imageExtended=same(EXTENDED_HEADERS),imageFirst=same(HEADERS),imageLast=same(PREVIOUS_HEADERS),legacy=same(PREVIOUS_HEADERS.slice(0,19));
  if(!imageExtended&&!imageFirst&&!imageLast&&!legacy)throw Error('أسماء الأعمدة غير مطابقة للقالب. استخدم ملف liplip الأصلي.');
  if(rows.length>30001)throw Error('الملف يتجاوز ٣٠٬٠٠٠ صف. قسّمه إلى مستويات أو خطوات.');
  const boxes=new Map();let count=0;
  rows.slice(1).forEach((source,index)=>{
   const width=imageExtended?EXTENDED_HEADERS.length:HEADERS.length,normalized=Array.from({length:width},(_,i)=>source?.[i]);
   const row=imageExtended||imageFirst?[...normalized.slice(0,5),...normalized.slice(6,20),normalized[5],...normalized.slice(20)]:normalized;
   if(!row?.some(cell=>value(cell)))return;
   const line=index+2,rawProcess=value(row[0]),process=rawProcess==='checkpointGrammar'?'grammar':rawProcess,stage=positive(row[1],5),step=positive(row[2],10),box=positive(row[3],20),type=value(row[4]);
   if(!PROCESSES.includes(process)||!stage||!step||!box)throw Error(`الصف ${line}: العملية أو المستوى أو الخطوة أو الصندوق غير صحيح.`);
   const option4=value(row[20]),fields={type,en:value(row[5]),ar:value(row[6]),example:value(row[7]),prompt:value(row[8]),audio:value(row[9]),options:[value(row[10]),value(row[11]),value(row[12])],explanation:value(row[14]),answer:value(row[15]),title:value(row[16]),formula:value(row[17]),body:value(row[18]),image:value(row[19]),images:[value(row[19]),value(row[21]),value(row[22]),value(row[23])]};
   if(['wordImageChoice','imageMatch','imageChoice'].includes(type)&&option4)fields.options.push(option4);
   if(['choice','audioChoice'].includes(type)){
    const correct=positive(row[13],3);
    if(!correct)throw Error(`الصف ${line}: الإجابة الصحيحة يجب أن تكون 1 أو 2 أو 3.`);
    fields.correct=correct-1;
   }else if(['wordImageChoice','imageChoice'].includes(type)){
    const correct=positive(row[13],type==='imageChoice'&&fields.options.length===3?3:4);
    if(!correct)throw Error(`الصف ${line}: الإجابة الصحيحة خارج نطاق الخيارات.`);
    fields.correct=correct-1;
   }
   let item;
   try{item=validateItem(process,fields)}catch(error){throw Error(`الصف ${line}: ${error.message}`)}
   const id=(stage-1)*200+(step-1)*20+box;
   if(!boxes.has(id))boxes.set(id,blank());
   const bucket=boxes.get(id)[process];
   const limit=process==='vocab'||process==='listen'?60:30;
   if(bucket.length>=limit)throw Error(`الصف ${line}: الحد الأقصى ${limit} عنصراً لعملية ${process} في الصندوق.`);
   bucket.push(item);count++;
  });
  if(!count)throw Error('الملف لا يحتوي عناصر تعليمية.');
  return {boxes,count};
 }
 async function read(file,validateItem){
  if(!file||!/\.xlsx$/i.test(file.name||''))throw Error('اختر ملف Excel بصيغة .xlsx.');
  if(file.size>12*1024*1024)throw Error('الحد الأقصى لحجم الملف ١٢ ميغابايت.');
  return parseRows(await sheetRows(file),validateItem);
 }
 return {SCHEMA_VERSION,HEADERS,EXTENDED_HEADERS,parseRows,read};
})();
