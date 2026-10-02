/* v102: single authoritative Excel import controller with persistent status and deployment diagnostics. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const BUILD='102';

  function manager(){return document.querySelector('.c57-manager,.v97-content-control')}

  function statusHost(){
    const m=manager();
    if(!m)return null;
    const box=m.querySelector('.v97-cc-workbook')||m.querySelector('section')||m;
    let el=box.querySelector('.v102-import-status');
    if(!el){
      el=document.createElement('div');
      el.className='v102-import-status';
      el.style.cssText='margin-top:12px;padding:12px 14px;border-radius:14px;background:#f3eef7;color:#3f2d52;font-weight:700;line-height:1.5;word-break:break-word;';
      const actions=box.querySelector('.v97-cc-actions');
      (actions||box).appendChild(el);
    }
    return el;
  }

  function setStatus(message,state='info'){
    const el=statusHost();
    if(!el)return;
    el.textContent=message;
    el.dataset.state=state;
    el.style.background=state==='error'?'#fff0f0':state==='success'?'#edf8ef':state==='warn'?'#fff7e8':'#f3eef7';
  }

  function readyStatus(){
    if(!isAdmin()||!manager())return;
    const host=location.hostname;
    const isPreview=/^[^.]+\.liplip\.pages\.dev$/i.test(host)&&host!=='liplip.pages.dev';
    if(isPreview){
      setStatus(t(`مستورد Excel جاهز · build ${BUILD}. أنت على رابط نشر تجريبي (${host})؛ إعادة التحميل لا تنقلك تلقائياً إلى أحدث نشر.`,`Excel importer ready · build ${BUILD}. You are on a deployment-preview URL (${host}); reloading it does not move you to newer deployments.`),'warn');
    }else{
      setStatus(t(`مستورد Excel جاهز · build ${BUILD}`,`Excel importer ready · build ${BUILD}`),'info');
    }
  }

  async function importFile(input,file){
    setStatus(t(`جاري استيراد ${file.name}…`,`Importing ${file.name}…`),'info');
    try{
      const importer=window.LiplipCourse?.importStudyWorkbookV95;
      if(typeof importer!=='function')throw new Error(t('مستورد v95 غير محمّل في هذه الصفحة.','The v95 importer is not loaded on this page.'));
      const ok=await importer(file);
      if(!ok)throw new Error(window.LiplipCourse57?.error||t('فشل الاستيراد بدون رسالة من المستورد.','Import failed without an importer message.'));
      try{if(window.LiplipCourse57)window.LiplipCourse57.manager=true}catch{}
      setTimeout(()=>{
        try{window.render?.(false)}catch{}
        setTimeout(()=>setStatus(t(`تم الاستيراد بنجاح: ${file.name}`,`Import successful: ${file.name}`),'success'),30);
      },0);
    }catch(error){
      console.error('[liplip] v102 Excel import failed',error);
      try{if(window.LiplipCourse57)window.LiplipCourse57.manager=true}catch{}
      setTimeout(()=>{
        try{window.render?.(false)}catch{}
        setTimeout(()=>setStatus(t(`فشل الاستيراد: ${error?.message||error}`,`Import failed: ${error?.message||error}`),'error'),30);
      },0);
    }finally{
      try{input.value=''}catch{}
    }
  }

  // One document-level listener survives every manager rerender/replacement.
  document.addEventListener('change',event=>{
    if(!isAdmin())return;
    const input=event.target?.closest?.('.c57-manager input[type="file"],.v97-content-control input[type="file"]');
    if(!input)return;
    const file=input.files?.[0];
    if(!file)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!file.name?.toLowerCase().endsWith('.xlsx')){
      setStatus(t('فشل الاستيراد: اختر ملف .xlsx.','Import failed: choose an .xlsx file.'),'error');
      input.value='';
      return;
    }
    importFile(input,file);
  },true);

  document.addEventListener('click',event=>{
    if(!isAdmin())return;
    const b=event.target?.closest?.('.v97-cc-actions [data-v94-unified-template],.v97-cc-actions [data-v95-template]');
    if(!b)return;
    event.preventDefault();event.stopImmediatePropagation();
    const fn=window.LiplipCourse?.downloadStudyTemplateV95;
    if(typeof fn==='function')fn().catch?.(e=>setStatus(t(`تعذر تنزيل القالب: ${e?.message||e}`,`Template download failed: ${e?.message||e}`),'error'));
    else setStatus(t('مولّد قالب v95 غير محمّل.','The v95 template generator is not loaded.'),'error');
  },true);

  let q=false;
  const schedule=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;readyStatus()})};
  const root=document.getElementById('app')||document.body;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
