/* v94: one Excel workbook for Vocabulary, Grammar, and Watch & Read across all 250 boxes. */
(() => {
  'use strict';

  const STORE='liplip-course-content-v2';
  const STRIDE=200;
  const LEVELS=5;
  const BOXES=50;
  const SHEETS={
    vocabulary:{name:'Vocabulary',headers:['Level','Box','Order','English','Arabic','Voice']},
    grammar:{name:'Grammar',headers:['Level','Box','Title','Rule','Normal Formula','Negative Formula','Question Formula','Notes','Examples']},
    watchRead:{name:'Watch_Read',headers:['Level','Box','Story Order','Story Title','Story English','Story Arabic','YouTube URL','Video Title']}
  };
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const gid=(level,box)=>(level-1)*STRIDE+box;
  const splitList=value=>String(value||'').split(/\r?\n|\|/).map(x=>x.trim()).filter(Boolean);
  const text=value=>String(value??'').trim();
  const validLocation=(level,box)=>Number.isInteger(level)&&level>=1&&level<=LEVELS&&Number.isInteger(box)&&box>=1&&box<=BOXES;

  function currentStore(){try{const v=JSON.parse(localStorage.getItem(STORE)||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}}
  function baseContent(id){
    try{return structuredClone(window.LiplipCourse?.getContent?.(id)||{})}catch{return {}}
  }
  function ensureContent(map,id){
    if(!map.has(id))map.set(id,baseContent(id));
    const c=map.get(id);
    c.vocabulary=c.vocabulary||{items:[]};
    c.grammar=c.grammar||{article:{}};
    c.watchRead=c.watchRead||{video:{},story:[]};
    return c;
  }

  function cellValue(c,shared){
    const type=c.getAttribute('t')||'';
    const v=c.querySelector('v')?.textContent||'';
    if(type==='s')return shared[Number(v)]||'';
    if(type==='inlineStr')return [...c.querySelectorAll('t')].map(x=>x.textContent).join('');
    if(type==='str')return v;
    if(type==='b')return v==='1'?'TRUE':'FALSE';
    return v;
  }
  function cellIndex(ref){
    const letters=/^[A-Z]+/.exec(ref||'A1')?.[0]||'A';
    let n=0;for(const ch of letters)n=n*26+ch.charCodeAt(0)-64;return n-1;
  }
  function normalizePath(target){
    let p=String(target||'').replace(/^\//,'');
    if(p.startsWith('xl/'))return p;
    while(p.startsWith('../'))p=p.slice(3);
    return `xl/${p}`;
  }
  async function parseWorkbook(file){
    if(typeof JSZip==='undefined')throw Error(t('دعم Excel غير متاح.','Excel support is unavailable.'));
    const zip=await JSZip.loadAsync(await file.arrayBuffer());
    const read=async path=>zip.file(path)?.async('string');
    const shared=[];
    const sharedXML=await read('xl/sharedStrings.xml');
    if(sharedXML){
      const doc=new DOMParser().parseFromString(sharedXML,'application/xml');
      doc.querySelectorAll('si').forEach(si=>shared.push([...si.querySelectorAll('t')].map(x=>x.textContent).join('')));
    }
    const workbookXML=await read('xl/workbook.xml');
    const relsXML=await read('xl/_rels/workbook.xml.rels');
    if(!workbookXML||!relsXML)throw Error(t('ملف Excel غير صالح.','Invalid Excel workbook.'));
    const workbookDoc=new DOMParser().parseFromString(workbookXML,'application/xml');
    const relsDoc=new DOMParser().parseFromString(relsXML,'application/xml');
    const rels=new Map();
    relsDoc.querySelectorAll('Relationship').forEach(r=>rels.set(r.getAttribute('Id'),normalizePath(r.getAttribute('Target'))));
    const out=new Map();
    for(const sheet of workbookDoc.querySelectorAll('sheet')){
      const name=sheet.getAttribute('name')||'';
      const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||'';
      const path=rels.get(rid);if(!path)continue;
      const xml=await read(path);if(!xml)continue;
      const doc=new DOMParser().parseFromString(xml,'application/xml');
      const rows=[];
      doc.querySelectorAll('sheetData row').forEach(rowNode=>{
        const row=[];
        rowNode.querySelectorAll('c').forEach(c=>{row[cellIndex(c.getAttribute('r'))]=cellValue(c,shared)});
        rows.push(row);
      });
      out.set(name,rows);
    }
    return out;
  }
  function headerMatches(row,headers){return headers.every((h,i)=>text(row?.[i])===h)}
  function sheetRows(book,spec){
    const direct=book.get(spec.name);if(direct)return direct;
    const wanted=spec.name.toLowerCase().replace(/[^a-z0-9]/g,'');
    for(const [name,rows] of book){if(name.toLowerCase().replace(/[^a-z0-9]/g,'')===wanted)return rows}
    return null;
  }

  async function importUnifiedWorkbook(file){
    const state=window.LiplipCourse57;
    try{
      if(!file||!file.name?.toLowerCase().endsWith('.xlsx'))throw Error(t('استخدم ملف Excel بصيغة .xlsx.','Use an .xlsx Excel workbook.'));
      const book=await parseWorkbook(file);
      const vr=sheetRows(book,SHEETS.vocabulary),gr=sheetRows(book,SHEETS.grammar),wr=sheetRows(book,SHEETS.watchRead);
      if(!vr||!gr||!wr)throw Error(t('يجب أن يحتوي الملف على أوراق Vocabulary و Grammar و Watch_Read.','The workbook must contain Vocabulary, Grammar, and Watch_Read sheets.'));
      if(!headerMatches(vr[0],SHEETS.vocabulary.headers)||!headerMatches(gr[0],SHEETS.grammar.headers)||!headerMatches(wr[0],SHEETS.watchRead.headers))throw Error(t('عناوين الأعمدة لا تطابق قالب لُبلُب الموحد.','Column headers do not match the unified Liplip template.'));

      const updates=new Map();
      const touchedVocab=new Set(),touchedGrammar=new Set(),touchedWatch=new Set();

      for(let i=1;i<vr.length;i++){
        const row=vr[i]||[],level=Number(row[0]),box=Number(row[1]);
        const en=text(row[3]),ar=text(row[4]),voice=text(row[5]);
        if(!en&&!ar&&!voice)continue;
        if(!validLocation(level,box))throw Error(`Vocabulary row ${i+1}: invalid Level/Box.`);
        if(!en||!ar)throw Error(`Vocabulary row ${i+1}: English and Arabic are required.`);
        const id=gid(level,box),c=ensureContent(updates,id);
        if(!touchedVocab.has(id)){c.vocabulary={items:[]};touchedVocab.add(id)}
        c.vocabulary.items.push({type:'word',order:Number(row[2])||c.vocabulary.items.length+1,en,ar,voice:voice||en});
      }
      for(const id of touchedVocab){updates.get(id).vocabulary.items.sort((a,b)=>(a.order||0)-(b.order||0)).forEach((x,i)=>x.order=i+1)}

      for(let i=1;i<gr.length;i++){
        const row=gr[i]||[],level=Number(row[0]),box=Number(row[1]);
        const values=row.slice(2,9).map(text);if(values.every(v=>!v))continue;
        if(!validLocation(level,box))throw Error(`Grammar row ${i+1}: invalid Level/Box.`);
        const id=gid(level,box);if(touchedGrammar.has(id))throw Error(`Grammar row ${i+1}: duplicate Level ${level}, Box ${box}.`);
        const c=ensureContent(updates,id);touchedGrammar.add(id);
        c.grammar={article:{title:values[0],rule:values[1],normal:values[2],negative:values[3],question:values[4],notes:splitList(values[5]),examples:splitList(values[6]).map(x=>({text:x}))}};
      }

      const watchTemp=new Map();
      for(let i=1;i<wr.length;i++){
        const row=wr[i]||[],level=Number(row[0]),box=Number(row[1]);
        const storyOrder=Number(row[2])||1,storyTitle=text(row[3]),storyEnglish=text(row[4]),storyArabic=text(row[5]),youtube=text(row[6]),videoTitle=text(row[7]);
        if(!storyTitle&&!storyEnglish&&!storyArabic&&!youtube&&!videoTitle)continue;
        if(!validLocation(level,box))throw Error(`Watch_Read row ${i+1}: invalid Level/Box.`);
        const id=gid(level,box),c=ensureContent(updates,id);
        if(!touchedWatch.has(id)){watchTemp.set(id,{stories:[],video:{...c.watchRead?.video}});touchedWatch.add(id)}
        const temp=watchTemp.get(id);
        if(youtube)temp.video.youtube=youtube;
        if(videoTitle)temp.video.title=videoTitle;
        if(storyEnglish||storyArabic||storyTitle)temp.stories.push({order:storyOrder,title:storyTitle||`Box ${box} story`,text:storyEnglish,arabic:storyArabic});
      }
      for(const id of touchedWatch){
        const c=updates.get(id),temp=watchTemp.get(id);
        temp.stories.sort((a,b)=>(a.order||0)-(b.order||0)).forEach((x,i)=>x.order=i+1);
        c.watchRead={video:{youtube:text(temp.video?.youtube),title:text(temp.video?.title)},story:temp.stories};
      }

      if(!updates.size)throw Error(t('لم يتم العثور على محتوى مملوء في القالب.','No filled content was found in the template.'));
      const store=currentStore();for(const [id,c] of updates)store[String(id)]=c;
      localStorage.setItem(STORE,JSON.stringify(store));
      if(state){state.error='';state.manager=false}
      try{await window.LiplipContentBackend?.publish?.()}catch{}
      window.render?.(false);
      return true;
    }catch(error){
      if(state){state.error=error?.message||t('فشل الاستيراد.','Import failed.')}
      console.error('[liplip] unified study import',error);
      window.render?.(false);
      return false;
    }
  }

  function escXML(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
  function col(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s}
  function sheetXML(rows){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>`<c r="${col(ci)}${ri+1}" t="inlineStr"><is><t xml:space="preserve">${escXML(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`}
  function templateRows(){
    const instructions=[['Liplip unified study content template'],['Keep sheet names and headers unchanged.'],['5 levels × 50 boxes. Vocabulary uses one row per word; Grammar one row per box; Watch_Read one row per story page.']];
    const vocabulary=[SHEETS.vocabulary.headers];
    const grammar=[SHEETS.grammar.headers];
    const watch=[SHEETS.watchRead.headers];
    for(let level=1;level<=LEVELS;level++)for(let box=1;box<=BOXES;box++){
      for(let order=1;order<=5;order++)vocabulary.push([level,box,order,'','','']);
      grammar.push([level,box,'','','','','','','']);
      watch.push([level,box,1,'','','','','']);
    }
    vocabulary[1]=[1,1,1,'hello','مرحباً','hello'];vocabulary[2]=[1,1,2,'family','عائلة','family'];vocabulary[3]=[1,1,3,'book','كتاب','book'];vocabulary[4]=[1,1,4,'water','ماء','water'];vocabulary[5]=[1,1,5,'school','مدرسة','school'];
    grammar[1]=[1,1,'Present simple','Use the present simple for routines and facts.','Subject + base verb + object.','Subject + do/does not + base verb + object.','Do/Does + subject + base verb + object?','Use does with he/she/it.|Use the base verb after does.','I study English every day.|She reads a book at school.|Do you visit your family?'];
    watch[1]=[1,1,1,'Daily English routine','Ali studies English every morning. He reads a book and learns five new words.','علي يدرس الإنجليزية كل صباح.','https://www.youtube.com/watch?v=VIDEO_ID','Daily English routine'];
    return [['Instructions',instructions],['Vocabulary',vocabulary],['Grammar',grammar],['Watch_Read',watch]];
  }
  async function buildTemplate(){
    if(typeof JSZip==='undefined')throw Error('Excel support is unavailable.');
    const z=new JSZip(),sheets=templateRows();
    z.file('[Content_Types].xml',`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    z.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml',`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name],i)=>`<sheet name="${escXML(name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`);
    sheets.forEach(([,rows],i)=>z.file(`xl/worksheets/sheet${i+1}.xml`,sheetXML(rows)));
    return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  async function downloadUnifiedTemplate(){
    const blob=await buildTemplate(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='liplip-study-content-template.xlsx';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1200);
  }

  function decorateManager(){
    const manager=document.querySelector('.c57-manager');if(!manager||manager.dataset.v94Unified)return;
    manager.dataset.v94Unified='1';
    const section=manager.querySelector('section');
    const heading=section?.querySelector('header h2');if(heading)heading.textContent=t('ملف Excel واحد لكل محتوى الدراسة','One Excel file for all study content');
    const p=section?.querySelector('p');if(p)p.textContent=t('استخدم ملفاً واحداً لملء المفردات والقواعد وشاهد واقرأ عبر المستويات الخمسة وجميع الصناديق. الاختبارات تُبنى من هذا المحتوى.','Use one workbook to fill Vocabulary, Grammar, and Watch & Read across all five levels and every box. Exams are built from this content.');
    const grid=section?.querySelector('.c57-schema-grid');if(grid)grid.innerHTML=`<article style="grid-column:1/-1"><strong>${t('قالب الدراسة الموحد','Unified study workbook')}</strong><small>Vocabulary · Grammar · Watch_Read · 5 Levels · 250 Boxes</small><button type="button" data-v94-unified-template>${t('تنزيل ملف Excel الموحد','Download unified Excel')}</button></article>`;
    const label=section?.querySelector('.c57-import span');if(label)label.textContent=t('استيراد ملف Excel الموحد','Import unified Excel workbook');
    const input=section?.querySelector('[data-course-manager-import]');if(input)input.setAttribute('accept','.xlsx');
    const smalls=section?.querySelectorAll(':scope > small');if(smalls?.length)smalls[smalls.length-1].textContent=t('Vocabulary: صف لكل كلمة. Grammar: صف لكل صندوق. Watch_Read: صف لكل صفحة قصة. الصفوف الفارغة تُتجاهل.','Vocabulary: one row per word. Grammar: one row per box. Watch_Read: one row per story page. Blank placeholders are ignored.');
  }

  window.addEventListener('click',event=>{
    const b=event.target.closest?.('[data-v94-unified-template]');if(!b)return;
    event.preventDefault();event.stopImmediatePropagation();
    downloadUnifiedTemplate().catch(error=>{const s=window.LiplipCourse57;if(s)s.error=error?.message||'Template download failed.';window.render?.(false)});
  },true);

  window.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-course-manager-import]');if(!input)return;
    const file=input.files?.[0];if(!file)return;
    event.stopImmediatePropagation();
    importUnifiedWorkbook(file).finally(()=>{input.value=''});
  },true);

  const install=()=>{
    if(window.LiplipCourse){
      window.LiplipCourse.UNIFIED_HEADERS=SHEETS;
      window.LiplipCourse.importAnyFile=importUnifiedWorkbook;
      window.LiplipCourse.importFile=(_phase,file)=>importUnifiedWorkbook(file);
      window.LiplipCourse.downloadUnifiedTemplate=downloadUnifiedTemplate;
    }
    decorateManager();
  };
  new MutationObserver(decorateManager).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
