/* v100: direct, visible admin Excel import using the current v95 workbook importer. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;

  function statusHost(input){
    const box=input.closest('.v97-cc-workbook')||input.closest('.c57-manager')||document.body;
    let el=box.querySelector?.('.v100-import-status');
    if(!el){
      el=document.createElement('div');
      el.className='v100-import-status';
      el.style.cssText='margin-top:12px;padding:12px 14px;border-radius:14px;background:#f3eef7;color:#3f2d52;font-weight:700;line-height:1.5;';
      const actions=box.querySelector?.('.v97-cc-actions');
      (actions||box).appendChild(el);
    }
    return el;
  }

  function setStatus(input,message,state='info'){
    const el=statusHost(input);
    el.textContent=message;
    el.dataset.state=state;
    if(state==='error')el.style.background='#fff0f0';
    else if(state==='success')el.style.background='#edf8ef';
    else el.style.background='#f3eef7';
  }

  async function runImport(input){
    const file=input.files?.[0];
    if(!file)return;

    setStatus(input,t(`جاري استيراد ${file.name}…`,`Importing ${file.name}…`));

    try{
      const importer=window.LiplipCourse?.importStudyWorkbookV95;
      if(typeof importer!=='function')throw new Error(t('مستورد Excel الحالي غير جاهز. أعد تحميل الصفحة وحاول مرة أخرى.','The current Excel importer is not ready. Reload the page and try again.'));

      const ok=await importer(file);
      if(!ok){
        const reason=window.LiplipCourse57?.error||t('فشل الاستيراد بدون تفاصيل إضافية.','Import failed without additional details.');
        throw new Error(reason);
      }

      setStatus(input,t('تم استيراد ملف Excel بنجاح. تم تحديث محتوى الدراسة والأسئلة.','Excel imported successfully. Study content and question banks were updated.'),'success');
      try{window.LiplipCourse57.manager=true}catch{}
      setTimeout(()=>window.render?.(false),0);
    }catch(error){
      console.error('[liplip] admin Excel import failed',error);
      setStatus(input,t(`فشل الاستيراد: ${error?.message||error}`,`Import failed: ${error?.message||error}`),'error');
      try{if(window.LiplipCourse57)window.LiplipCourse57.manager=true}catch{}
    }finally{
      input.value='';
    }
  }

  function bind(input){
    if(input.dataset.v100ImportBound)return;
    input.dataset.v100ImportBound='1';
    input.removeAttribute('data-course-manager-import');
    input.removeAttribute('data-v95-import');
    input.setAttribute('accept','.xlsx');
    input.addEventListener('change',event=>{
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      runImport(input);
    },true);
  }

  function patch(){
    if(!isAdmin())return;
    document.querySelectorAll('.v97-cc-actions input[type="file"],.c57-manager input[type="file"]').forEach(bind);

    document.querySelectorAll('.v97-cc-actions [data-v94-unified-template],.v97-cc-actions [data-v95-template]').forEach(button=>{
      button.removeAttribute('data-v94-unified-template');
      button.setAttribute('data-v95-template','');
    });
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch()});
  }

  const start=()=>{
    patch();
    const root=document.getElementById('app')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
