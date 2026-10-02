/* v103: authoritative Excel import controller with durable visible status across manager rerenders. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const STATUS_KEY='liplip-study-import-status-v103';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const BUILD='103';

  function manager(){return document.querySelector('.c57-manager,.v97-content-control')}

  function getSavedStatus(){
    try{
      const raw=sessionStorage.getItem(STATUS_KEY);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }

  function saveStatus(message,state='info'){
    const payload={message:String(message||''),state,at:Date.now()};
    try{sessionStorage.setItem(STATUS_KEY,JSON.stringify(payload))}catch{}
    renderStatus(payload);
  }

  function statusHost(){
    const m=manager();
    if(!m)return null;
    const section=m.querySelector(':scope > section')||m.querySelector('section')||m;
    let el=section.querySelector('.v103-import-status');
    if(!el){
      el=document.createElement('div');
      el.className='v103-import-status';
      el.style.cssText='margin:14px 22px 0;padding:14px 16px;border-radius:16px;background:#f3eef7;color:#3f2d52;font-weight:800;line-height:1.5;word-break:break-word;border:1px solid rgba(81,54,109,.12);';
      const header=section.querySelector('.v97-cc-head,header');
      if(header?.nextSibling)section.insertBefore(el,header.nextSibling);else section.prepend(el);
    }
    return el;
  }

  function renderStatus(payload=getSavedStatus()){
    if(!isAdmin()||!manager())return;
    const el=statusHost();
    if(!el)return;
    const p=payload||{message:t(`مستورد Excel جاهز · build ${BUILD}`,`Excel importer ready · build ${BUILD}`),state:'info'};
    el.textContent=p.message;
    el.dataset.state=p.state||'info';
    el.style.background=p.state==='error'?'#fff0f0':p.state==='success'?'#edf8ef':p.state==='working'?'#eef4ff':'#f3eef7';
    el.style.color=p.state==='error'?'#7a2525':p.state==='success'?'#205a32':'#3f2d52';
  }

  function contentCount(){
    try{
      const data=JSON.parse(localStorage.getItem('liplip-course-content-v2')||'{}');
      return Object.keys(data&&typeof data==='object'?data:{}).length;
    }catch{return 0}
  }

  async function importFile(input,file){
    saveStatus(t(`جاري استيراد ${file.name}…`,`Importing ${file.name}…`),'working');
    try{
      const importer=window.LiplipCourse?.importStudyWorkbookV95;
      if(typeof importer!=='function')throw new Error(t('مستورد Excel الحالي غير محمّل.','The current Excel importer is not loaded.'));

      const ok=await importer(file);
      if(!ok)throw new Error(window.LiplipCourse57?.error||t('فشل الاستيراد بدون رسالة إضافية.','Import failed without an additional message.'));

      const boxes=contentCount();
      saveStatus(t(`تم استيراد ${file.name} بنجاح. المحتوى المحفوظ الآن: ${boxes} صندوقاً.`,`Imported ${file.name} successfully. Stored content now covers ${boxes} boxes.`),'success');

      try{if(window.LiplipCourse57)window.LiplipCourse57.manager=true}catch{}
      try{window.render?.(false)}catch{}
      setTimeout(()=>renderStatus(),40);
    }catch(error){
      console.error('[liplip] v103 Excel import failed',error);
      saveStatus(t(`فشل الاستيراد: ${error?.message||error}`,`Import failed: ${error?.message||error}`),'error');
      try{if(window.LiplipCourse57)window.LiplipCourse57.manager=true}catch{}
      try{window.render?.(false)}catch{}
      setTimeout(()=>renderStatus(),40);
    }finally{
      try{input.value=''}catch{}
    }
  }

  document.addEventListener('change',event=>{
    if(!isAdmin())return;
    const input=event.target?.closest?.('.c57-manager input[type="file"],.v97-content-control input[type="file"]');
    if(!input)return;
    const file=input.files?.[0];
    if(!file)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if(!file.name?.toLowerCase().endsWith('.xlsx')){
      saveStatus(t('فشل الاستيراد: اختر ملف Excel بصيغة .xlsx.','Import failed: choose an .xlsx Excel file.'),'error');
      input.value='';
      return;
    }
    importFile(input,file);
  },true);

  document.addEventListener('click',event=>{
    if(!isAdmin())return;
    const b=event.target?.closest?.('.v97-cc-actions [data-v94-unified-template],.v97-cc-actions [data-v95-template]');
    if(!b)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const fn=window.LiplipCourse?.downloadStudyTemplateV95;
    if(typeof fn==='function')fn().catch?.(e=>saveStatus(t(`تعذر تنزيل القالب: ${e?.message||e}`,`Template download failed: ${e?.message||e}`),'error'));
    else saveStatus(t('مولّد قالب Excel غير محمّل.','The Excel template generator is not loaded.'),'error');
  },true);

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;renderStatus()});
  }

  const root=document.getElementById('app')||document.body;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
