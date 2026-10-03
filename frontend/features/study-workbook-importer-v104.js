/* v104: standalone unified study workbook importer for the website-ready schema. */
(() => {
  'use strict';

  const STORE='liplip-course-content-v2';
  const STATUS_KEY='liplip-study-import-v104-status';
  const STRIDE=200;
  const LEVELS=5;
  const BOXES=50;
  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const text=v=>String(v??'').trim();
  const norm=v=>text(v).toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[.,?!؟؛:()"'’“”\-_]/g,'').replace(/\s+/g,' ');
  const gid=(level,box)=>(level-1)*STRIDE+box;
  const validLoc=(level,box)=>Number.isInteger(level)&&level>=1&&level<=LEVELS&&Number.isInteger(box)&&box>=1&&box<=BOXES;
  const splitList=v=>text(v).split(/\r?\n|\|/).map(x=>x.trim()).filter(Boolean);

  let jsZipPromise=null;
  function loadJSZip(){
    if(window.JSZip)return Promise.resolve(window.JSZip);
    if(jsZipPromise)return jsZipPromise;
    jsZipPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timeout=setTimeout(()=>fail(Error(t('انتهت مهلة تحميل قارئ Excel.','Excel reader load timed out.'))),15000);
      const cleanup=()=>{clearTimeout(timeout);script.onload=null;script.onerror=null};
      const fail=error=>{cleanup();script.remove();jsZipPromise=null;reject(error)};
      script.src=new URL('jszip.min.js?v=110',document.baseURI).href;
      script.async=true;
      script.dataset.liplipJszip='110';
      script.onload=()=>{cleanup();window.JSZip?resolve(window.JSZip):fail(Error(t('تعذر تشغيل قارئ Excel.','Excel reader failed to initialize.')))};
      script.onerror=()=>fail(Error(t('تعذر تحميل قارئ Excel.','Excel reader failed to load.')));
      document.head.appendChild(script);
    });
    return jsZipPromise;
  }

  const SHEETS={
    Vocabulary:['Level','Box','Order','English','Arabic','Voice'],
    Grammar:['Level','Box','Title','Rule','Normal Formula','Negative Formula','Question Formula','Notes','Examples'],
    Grammar_Questions:['Level','Box','Order','Type','Question','Correct Answer','Option 1','Option 2','Option 3','Option 4'],
    Watch_Read:['Level','Box','Story Order','Story Title','Story English','Story Arabic','YouTube URL','Video Title'],
    Video_Questions:['Level','Box','Order','Question','Correct Answer','Option 1','Option 2','Option 3','Option 4'],
    Story_Questions:['Level','Box','Order','Question','Correct Answer','Option 1','Option 2','Option 3','Option 4']
  };

  function readStore(){
    try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}
  }
  function clone(v){try{return structuredClone(v)}catch{return JSON.parse(JSON.stringify(v||{}))}}
  function baseContent(id){
    try{return clone(window.LiplipCourse?.getContent?.(id)||{})}catch{return {}}
  }
  function ensure(map,id){
    if(!map.has(id))map.set(id,baseContent(id));
    const c=map.get(id);
    c.vocabulary=c.vocabulary&&typeof c.vocabulary==='object'?c.vocabulary:{items:[]};
    c.grammar=c.grammar&&typeof c.grammar==='object'?c.grammar:{article:{},questions:[]};
    c.grammar.article=c.grammar.article&&typeof c.grammar.article==='object'?c.grammar.article:{};
    c.grammar.questions=Array.isArray(c.grammar.questions)?c.grammar.questions:[];
    c.watchRead=c.watchRead&&typeof c.watchRead==='object'?c.watchRead:{video:{},story:[],videoQuestions:[],storyQuestions:[]};
    c.watchRead.video=c.watchRead.video&&typeof c.watchRead.video==='object'?c.watchRead.video:{};
    c.watchRead.story=Array.isArray(c.watchRead.story)?c.watchRead.story:[];
    c.watchRead.videoQuestions=Array.isArray(c.watchRead.videoQuestions)?c.watchRead.videoQuestions:[];
    c.watchRead.storyQuestions=Array.isArray(c.watchRead.storyQuestions)?c.watchRead.storyQuestions:[];
    return c;
  }

  function xmlNodes(root,name){
    if(!root)return [];
    try{const a=[...root.getElementsByTagNameNS('*',name)];if(a.length)return a}catch{}
    try{const a=[...root.getElementsByTagName(name)];if(a.length)return a}catch{}
    try{return [...root.getElementsByTagName('x:'+name)]}catch{return []}
  }
  function cellIndex(ref){
    const letters=/^[A-Z]+/.exec(ref||'A1')?.[0]||'A';
    let n=0;for(const ch of letters)n=n*26+ch.charCodeAt(0)-64;return n-1;
  }
  function cellValue(cell,shared){
    const type=cell.getAttribute('t')||'';
    const v=xmlNodes(cell,'v')[0]?.textContent||'';
    if(type==='s')return shared[Number(v)]||'';
    if(type==='inlineStr')return xmlNodes(cell,'t').map(x=>x.textContent||'').join('');
    if(type==='str')return v;
    if(type==='b')return v==='1'?'TRUE':'FALSE';
    return v;
  }
  function normalizeTarget(target){
    let p=String(target||'').replace(/^\//,'');
    if(p.startsWith('xl/'))return p;
    while(p.startsWith('../'))p=p.slice(3);
    return `xl/${p}`;
  }

  async function parseWorkbook(file){
    const JSZipLib=await loadJSZip();
    const zip=await JSZipLib.loadAsync(await file.arrayBuffer());
    const read=async p=>zip.file(p)?.async('string');
    const shared=[];
    const ss=await read('xl/sharedStrings.xml');
    if(ss){const d=new DOMParser().parseFromString(ss,'application/xml');for(const si of xmlNodes(d,'si'))shared.push(xmlNodes(si,'t').map(x=>x.textContent||'').join(''))}
    const workbookXML=await read('xl/workbook.xml');
    const relsXML=await read('xl/_rels/workbook.xml.rels');
    if(!workbookXML||!relsXML)throw Error(t('ملف Excel غير صالح.','Invalid Excel workbook.'));
    const wd=new DOMParser().parseFromString(workbookXML,'application/xml');
    const rd=new DOMParser().parseFromString(relsXML,'application/xml');
    const rels=new Map();
    for(const r of xmlNodes(rd,'Relationship'))rels.set(r.getAttribute('Id'),normalizeTarget(r.getAttribute('Target')));
    const book=new Map();
    for(const sh of xmlNodes(wd,'sheet')){
      const name=sh.getAttribute('name')||'';
      const rid=sh.getAttribute('r:id')||sh.getAttributeNS?.('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'';
      const path=rels.get(rid);if(!path)continue;
      const xml=await read(path);if(!xml)continue;
      const d=new DOMParser().parseFromString(xml,'application/xml'),rows=[];
      for(const rowNode of xmlNodes(d,'row')){
        const row=[];
        for(const c of xmlNodes(rowNode,'c'))row[cellIndex(c.getAttribute('r'))]=cellValue(c,shared);
        rows.push(row);
      }
      book.set(name,rows);
    }
    return book;
  }

  function rowsFor(book,name){
    if(book.get(name))return book.get(name);
    const wanted=name.toLowerCase().replace(/[^a-z0-9]/g,'');
    for(const [n,rows] of book)if(n.toLowerCase().replace(/[^a-z0-9]/g,'')===wanted)return rows;
    return null;
  }
  function headersOK(row,headers){return headers.every((h,i)=>text(row?.[i]).replace(/^\uFEFF/,'')===h)}
  function requireSheet(book,name){
    const rows=rowsFor(book,name);
    if(!rows)throw Error(`${name}: ${t('ورقة مفقودة','missing sheet')}.`);
    if(!headersOK(rows[0],SHEETS[name]))throw Error(`${name}: ${t('عناوين الأعمدة لا تطابق ملف الموقع','headers do not match the website schema')}.`);
    return rows;
  }
  function questionObject(type,question,answer,optionValues,order){
    const options=optionValues.map(text).filter(Boolean);
    const index=Math.max(0,options.findIndex(x=>norm(x)===norm(answer)));
    const reorderTokens=type==='reorder'?text(question).split('|').map(x=>x.trim()).filter(Boolean):options;
    return {
      order:Number(order)||0,
      type,
      title:text(question),prompt:text(question),answer:text(answer),
      option1:text(optionValues[0]),option2:text(optionValues[1]),option3:text(optionValues[2]),option4:text(optionValues[3]),
      options:reorderTokens,
      correct:index,correctIndex:index,
      explanation:''
    };
  }
  function mcqObject(question,answer,optionValues,order){
    const options=optionValues.map(text).filter(Boolean);
    let index=options.findIndex(x=>norm(x)===norm(answer));
    if(index<0&&answer){options.unshift(text(answer));index=0}
    if(index<0)index=0;
    return {
      order:Number(order)||0,type:'mcq',title:text(question),prompt:text(question),answer:text(answer),
      option1:text(optionValues[0]),option2:text(optionValues[1]),option3:text(optionValues[2]),option4:text(optionValues[3]),
      options,correct:index,correctIndex:index,explanation:''
    };
  }

  async function importWorkbook(file){
    if(!file?.name?.toLowerCase().endsWith('.xlsx'))throw Error(t('اختر ملف Excel بصيغة .xlsx.','Choose an .xlsx Excel file.'));
    const book=await parseWorkbook(file);
    const V=requireSheet(book,'Vocabulary');
    const G=requireSheet(book,'Grammar');
    const GQ=requireSheet(book,'Grammar_Questions');
    const W=requireSheet(book,'Watch_Read');
    const VQ=requireSheet(book,'Video_Questions');
    const SQ=requireSheet(book,'Story_Questions');

    const updates=new Map();
    const touchedV=new Set(),touchedG=new Set(),touchedGQ=new Set(),touchedW=new Set(),touchedVQ=new Set(),touchedSQ=new Set();
    const watchTemp=new Map();
    const stats={vocabulary:0,grammar:0,grammarQuestions:0,watchRead:0,videoQuestions:0,storyQuestions:0,boxes:new Set()};

    for(let i=1;i<V.length;i++){
      const r=V[i]||[],level=Number(r[0]),box=Number(r[1]),en=text(r[3]),ar=text(r[4]),voice=text(r[5]);
      if(!en&&!ar&&!voice)continue;
      if(!validLoc(level,box))throw Error(`Vocabulary row ${i+1}: invalid Level/Box.`);
      if(!en||!ar)throw Error(`Vocabulary row ${i+1}: English and Arabic are required.`);
      const id=gid(level,box),c=ensure(updates,id);
      if(!touchedV.has(id)){c.vocabulary={...(c.vocabulary||{}),items:[]};touchedV.add(id)}
      c.vocabulary.items.push({type:'word',order:Number(r[2])||c.vocabulary.items.length+1,en,ar,voice:voice||en});
      stats.vocabulary++;stats.boxes.add(id);
    }
    for(const id of touchedV)cSort(updates.get(id).vocabulary.items);

    for(let i=1;i<G.length;i++){
      const r=G[i]||[],level=Number(r[0]),box=Number(r[1]),v=r.slice(2,9).map(text);
      if(v.every(x=>!x))continue;
      if(!validLoc(level,box))throw Error(`Grammar row ${i+1}: invalid Level/Box.`);
      const id=gid(level,box);if(touchedG.has(id))throw Error(`Grammar row ${i+1}: duplicate Level/Box.`);
      const c=ensure(updates,id);touchedG.add(id);
      c.grammar={...(c.grammar||{}),article:{title:v[0],rule:v[1],normal:v[2],negative:v[3],question:v[4],notes:splitList(v[5]),examples:splitList(v[6]).map(x=>({text:x}))},questions:c.grammar.questions||[]};
      stats.grammar++;stats.boxes.add(id);
    }

    for(let i=1;i<GQ.length;i++){
      const r=GQ[i]||[],level=Number(r[0]),box=Number(r[1]),type=text(r[3]),question=text(r[4]),answer=text(r[5]);
      if(!question&&!answer)continue;
      if(!validLoc(level,box))throw Error(`Grammar_Questions row ${i+1}: invalid Level/Box.`);
      if(!['fill_blank','reorder','correct_error'].includes(type))throw Error(`Grammar_Questions row ${i+1}: invalid Type '${type}'.`);
      if(!question||!answer)throw Error(`Grammar_Questions row ${i+1}: Question and Correct Answer are required.`);
      const options=[r[6],r[7],r[8],r[9]];
      if(type==='fill_blank'&&options.map(text).filter(Boolean).length<2)throw Error(`Grammar_Questions row ${i+1}: fill_blank needs at least 2 options.`);
      const id=gid(level,box),c=ensure(updates,id);
      if(!touchedGQ.has(id)){c.grammar.questions=[];touchedGQ.add(id)}
      c.grammar.questions.push(questionObject(type,question,answer,options,r[2]));
      stats.grammarQuestions++;stats.boxes.add(id);
    }
    for(const id of touchedGQ)cSort(updates.get(id).grammar.questions);

    for(let i=1;i<W.length;i++){
      const r=W[i]||[],level=Number(r[0]),box=Number(r[1]),order=Number(r[2])||1,storyTitle=text(r[3]),storyEnglish=text(r[4]),storyArabic=text(r[5]),youtube=text(r[6]),videoTitle=text(r[7]);
      if(!storyTitle&&!storyEnglish&&!storyArabic&&!youtube&&!videoTitle)continue;
      if(!validLoc(level,box))throw Error(`Watch_Read row ${i+1}: invalid Level/Box.`);
      const id=gid(level,box),c=ensure(updates,id);
      if(!touchedW.has(id)){watchTemp.set(id,{stories:[],video:{...(c.watchRead.video||{})}});touchedW.add(id)}
      const tmp=watchTemp.get(id);
      if(youtube)tmp.video.youtube=youtube;if(videoTitle)tmp.video.title=videoTitle;
      if(storyTitle||storyEnglish||storyArabic)tmp.stories.push({order,title:storyTitle||`Box ${box} story`,text:storyEnglish,arabic:storyArabic});
      stats.watchRead++;stats.boxes.add(id);
    }
    for(const id of touchedW){const c=ensure(updates,id),tmp=watchTemp.get(id);cSort(tmp.stories);c.watchRead={...(c.watchRead||{}),video:{youtube:text(tmp.video.youtube),title:text(tmp.video.title)},story:tmp.stories}}

    const importMCQ=(rows,key,touched,field,statKey)=>{
      for(let i=1;i<rows.length;i++){
        const r=rows[i]||[],level=Number(r[0]),box=Number(r[1]),question=text(r[3]),answer=text(r[4]);
        if(!question&&!answer)continue;
        if(!validLoc(level,box))throw Error(`${key} row ${i+1}: invalid Level/Box.`);
        const options=[r[5],r[6],r[7],r[8]];
        if(!question||!answer)throw Error(`${key} row ${i+1}: Question and Correct Answer are required.`);
        if(options.map(text).filter(Boolean).length<2)throw Error(`${key} row ${i+1}: at least 2 options are required.`);
        const id=gid(level,box),c=ensure(updates,id);
        if(!touched.has(id)){c.watchRead[field]=[];touched.add(id)}
        c.watchRead[field].push(mcqObject(question,answer,options,r[2]));
        stats[statKey]++;stats.boxes.add(id);
      }
      for(const id of touched)cSort(updates.get(id).watchRead[field]);
    };
    importMCQ(VQ,'Video_Questions',touchedVQ,'videoQuestions','videoQuestions');
    importMCQ(SQ,'Story_Questions',touchedSQ,'storyQuestions','storyQuestions');

    if(!updates.size)throw Error(t('لم يتم العثور على محتوى مملوء في الملف.','No filled content was found in the workbook.'));
    const store=readStore();
    for(const [id,c] of updates)store[String(id)]=c;
    localStorage.setItem(STORE,JSON.stringify(store));

    const verify=readStore();
    for(const id of updates.keys())if(!verify[String(id)])throw Error(t('فشل التحقق من حفظ المحتوى في المتصفح.','Browser storage verification failed.'));

    const publish=await window.LiplipContentBackend?.publish?.();
    if(publish&&publish.ok===false)throw Error(t(`تم حفظ الملف محلياً لكن فشل نشره إلى الخادم (الحالة ${publish.status||0}).`,`The workbook was saved locally but server publishing failed (status ${publish.status||0}).`));
    return {...stats,boxes:stats.boxes.size,publish:publish||null};
  }
  function cSort(list){list.sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));list.forEach((x,i)=>x.order=i+1)}

  function saveStatus(state,message,details=''){
    const payload={state,message,details,time:Date.now()};
    try{sessionStorage.setItem(STATUS_KEY,JSON.stringify(payload))}catch{}
    paintStatus(payload);toast(payload);
  }
  function currentStatus(){try{return JSON.parse(sessionStorage.getItem(STATUS_KEY)||'null')}catch{return null}}
  function statusContainer(){
    const m=document.querySelector('.v97-content-control,.c57-manager');if(!m)return null;
    const head=m.querySelector('.v97-cc-head')||m.querySelector('section > header')||m.firstElementChild;
    let box=m.querySelector('.v104-import-status');
    if(!box){box=document.createElement('div');box.className='v104-import-status';box.style.cssText='margin:16px 22px 0;padding:15px 17px;border-radius:16px;font-weight:800;line-height:1.55;border:1px solid rgba(81,54,109,.12);word-break:break-word;';if(head?.parentNode)head.parentNode.insertBefore(box,head.nextSibling);else m.prepend(box)}
    return box;
  }
  function paintStatus(payload){
    const box=statusContainer();if(!box)return;
    const state=payload?.state||'ready';
    box.style.background=state==='success'?'#eaf7ee':state==='error'?'#fff0f0':state==='working'?'#f1ecf7':'#f5f1f8';
    box.style.color=state==='success'?'#235d35':state==='error'?'#8a2630':'#3f2d52';
    box.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">${state==='success'?'✓':state==='error'?'!':state==='working'?'…':'●'}</span><div><strong>${escapeHTML(payload?.message||t('مستورد Excel الجديد جاهز · build 104','New Excel importer ready · build 104'))}</strong>${payload?.details?`<small style="display:block;margin-top:4px;font-weight:600;opacity:.85">${escapeHTML(payload.details)}</small>`:''}</div></div>`;
  }
  function toast(payload){
    if(!payload||payload.state==='ready')return;
    let el=document.querySelector('.v104-import-toast');if(el)el.remove();
    el=document.createElement('div');el.className='v104-import-toast';
    el.style.cssText='position:fixed;z-index:999999;left:16px;right:16px;top:max(18px,env(safe-area-inset-top));padding:15px 17px;border-radius:16px;box-shadow:0 14px 40px rgba(30,20,40,.25);font-weight:800;line-height:1.45;text-align:center;';
    el.style.background=payload.state==='success'?'#eaf7ee':payload.state==='error'?'#fff0f0':'#f1ecf7';
    el.style.color=payload.state==='success'?'#235d35':payload.state==='error'?'#8a2630':'#3f2d52';
    el.textContent=payload.message;document.body.appendChild(el);setTimeout(()=>el.remove(),payload.state==='working'?2200:6500);
  }
  function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function chooseAndImport(){
    const input=document.createElement('input');input.type='file';input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';input.style.position='fixed';input.style.left='-9999px';input.style.opacity='0';document.body.appendChild(input);
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];if(!file){input.remove();return}
      saveStatus('working',t(`جاري استيراد ${file.name}…`,`Importing ${file.name}…`),t('يتم الآن التحقق من الأوراق والمحتوى ثم نشره.','Validating sheets and content, then publishing it.'));
      try{
        const stats=await importWorkbook(file);
        saveStatus('success',t('تم استيراد Excel بنجاح.','Excel import succeeded.'),t(`الصناديق: ${stats.boxes} · المفردات: ${stats.vocabulary} · أسئلة القواعد: ${stats.grammarQuestions} · أسئلة الفيديو: ${stats.videoQuestions} · أسئلة القصة: ${stats.storyQuestions}`,`Boxes: ${stats.boxes} · Vocabulary: ${stats.vocabulary} · Grammar questions: ${stats.grammarQuestions} · Video questions: ${stats.videoQuestions} · Story questions: ${stats.storyQuestions}`));
      }catch(error){
        console.error('[liplip] v104 workbook import failed',error);
        saveStatus('error',t('فشل استيراد Excel.','Excel import failed.'),String(error?.message||error));
      }finally{input.remove()}
    },{once:true});
    input.click();
  }

  function patchCourseReader(){
    const Course=window.LiplipCourse;if(!Course?.getContent||Course.__v104Reader)return;
    const base=Course.getContent.bind(Course);
    Course.getContent=function(id){
      const content=base(id)||{};const raw=readStore()[String(id)]||{};
      content.grammar=content.grammar||{};content.watchRead=content.watchRead||{};
      if(Array.isArray(raw.grammar?.questions))content.grammar.questions=clone(raw.grammar.questions);
      if(Array.isArray(raw.watchRead?.videoQuestions))content.watchRead.videoQuestions=clone(raw.watchRead.videoQuestions);
      if(Array.isArray(raw.watchRead?.storyQuestions))content.watchRead.storyQuestions=clone(raw.watchRead.storyQuestions);
      return content;
    };
    Object.defineProperty(Course,'__v104Reader',{value:true});
  }

  function patchUI(){
    if(!isAdmin())return;
    patchCourseReader();
    const m=document.querySelector('.v97-content-control,.c57-manager');if(!m)return;
    const actions=m.querySelector('.v97-cc-actions')||m.querySelector('.c57-import')?.parentElement||m.querySelector('section');
    if(!actions)return;
    m.querySelectorAll('input[type="file"]').forEach(input=>{const label=input.closest('label');if(label)label.remove();else input.remove()});
    let button=m.querySelector('[data-v104-import]');
    if(!button){
      button=document.createElement('button');button.type='button';button.dataset.v104Import='1';button.textContent=t('استيراد ملف Excel','Import Excel');button.style.cssText='width:100%;min-height:58px;border-radius:16px;border:1px solid rgba(81,54,109,.2);background:#fff;color:#51366d;font:inherit;font-weight:800;font-size:18px;padding:14px 18px;';button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();chooseAndImport()});actions.appendChild(button);
    }
    const status=currentStatus()||{state:'ready',message:t('مستورد Excel الجديد جاهز · build 104','New Excel importer ready · build 104'),details:t('يقبل ملف liplip-study-content-merged-ready.xlsx وبنية الموقع الحالية.','Accepts liplip-study-content-merged-ready.xlsx and the current website schema.')};
    paintStatus(status);
  }

  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchUI()})}
  const root=document.getElementById('app')||document.body;new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.LiplipStudyWorkbookImporter104={importWorkbook,chooseAndImport};
})();
