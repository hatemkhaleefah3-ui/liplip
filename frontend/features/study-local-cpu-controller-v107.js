/* v107: local-device study content controller. Opens admin content control reliably and imports workbook entirely on the user's device CPU. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const STORE='liplip-course-content-v2';
  const STATUS_KEY='liplip-study-import-v107-status';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;

  function state(){ return window.LiplipCourse57; }
  function redraw(){ try{ window.render?.(false); }catch{} }

  function setStatus(kind,title,detail=''){
    const payload={kind,title,detail,time:Date.now()};
    try{sessionStorage.setItem(STATUS_KEY,JSON.stringify(payload))}catch{}
    paintStatus(payload);
    toast(payload);
  }

  function readStatus(){
    try{return JSON.parse(sessionStorage.getItem(STATUS_KEY)||'null')}catch{return null}
  }

  function panel(){ return document.querySelector('.v97-content-control,.c57-manager'); }

  function paintStatus(payload){
    const root=panel(); if(!root) return;
    let box=root.querySelector('.v107-local-status');
    if(!box){
      box=document.createElement('div');
      box.className='v107-local-status';
      box.style.cssText='margin:14px 22px 0;padding:15px 17px;border-radius:16px;font-weight:800;line-height:1.55;white-space:pre-wrap;word-break:break-word;border:1px solid rgba(81,54,109,.12)';
      const head=root.querySelector('.v97-cc-head')||root.querySelector('section > header');
      (head?.parentNode||root).insertBefore(box,head?.nextSibling||root.firstChild);
    }
    const kind=payload?.kind||'ready';
    box.style.background=kind==='success'?'#eaf7ee':kind==='error'?'#fff0f0':kind==='working'?'#f2edf7':'#f7f3fa';
    box.style.color=kind==='success'?'#235d35':kind==='error'?'#8a2630':'#3f2d52';
    box.textContent=payload?.detail?`${payload.title}\n${payload.detail}`:payload?.title||'';
  }

  function toast(payload){
    if(!payload||payload.kind==='ready') return;
    document.querySelectorAll('.v107-local-toast').forEach(x=>x.remove());
    const el=document.createElement('div');
    el.className='v107-local-toast';
    el.style.cssText='position:fixed;z-index:2147483647;left:16px;right:16px;top:max(18px,env(safe-area-inset-top));padding:16px 18px;border-radius:18px;box-shadow:0 14px 42px rgba(30,20,40,.28);font-weight:800;line-height:1.45;text-align:center;white-space:pre-wrap;word-break:break-word';
    el.style.background=payload.kind==='success'?'#eaf7ee':payload.kind==='error'?'#fff0f0':'#f2edf7';
    el.style.color=payload.kind==='success'?'#235d35':payload.kind==='error'?'#8a2630':'#3f2d52';
    el.textContent=payload.detail?`${payload.title}\n${payload.detail}`:payload.title;
    document.body.appendChild(el);
    if(payload.kind!=='working') setTimeout(()=>el.remove(),10000);
  }

  function openManager(){
    const s=state();
    if(!s) return false;
    s.manager=true;
    redraw();
    requestAnimationFrame(()=>{
      patchUI();
      const root=panel();
      if(root) root.scrollTop=0;
    });
    return true;
  }

  function closeManager(){
    const s=state();
    if(!s) return false;
    s.manager=false;
    redraw();
    return true;
  }

  function chooseFile(){
    return new Promise(resolve=>{
      const input=document.createElement('input');
      input.type='file';
      input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      input.style.cssText='position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none';
      document.body.appendChild(input);
      input.addEventListener('change',()=>{const file=input.files?.[0]||null;input.remove();resolve(file)},{once:true});
      input.click();
    });
  }

  async function localImport(){
    if(!isAdmin()) return;
    const file=await chooseFile();
    if(!file) return;
    const importer=window.LiplipStudyWorkbookImporter104;
    if(!importer?.importWorkbook){
      setStatus('error',t('فشل استيراد Excel.','Excel import failed.'),t('محرك Excel المحلي غير جاهز.','The local Excel engine is not ready.'));
      return;
    }

    setStatus('working',t(`جاري معالجة ${file.name} على جهازك…`,`Processing ${file.name} on your device…`),t('القراءة والتحقق والحفظ تتم محلياً باستخدام CPU الجهاز.','Reading, validation, and saving run locally using this device CPU.'));

    const before=localStorage.getItem(STORE)||'';
    const backend=window.LiplipContentBackend;
    const originalPublish=backend?.publish;
    try{
      // Force the existing parser/save engine into local-only mode. No Cloudflare/D1 publish is required.
      if(backend && typeof originalPublish==='function') backend.publish=async()=>null;
      // Yield one frame before the CPU-heavy workbook parse so the working flag paints first.
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
      const stats=await importer.importWorkbook(file);
      const after=localStorage.getItem(STORE)||'';
      if(!after || after===before) throw Error(t('لم يتم حفظ أي محتوى جديد على الجهاز.','No new content was saved on the device.'));
      setStatus('success',t('✓ تم استيراد Excel بنجاح على الجهاز.','✓ Excel imported successfully on this device.'),t(`الصناديق: ${stats?.boxes??'-'} · المفردات: ${stats?.vocabulary??'-'} · أسئلة القواعد: ${stats?.grammarQuestions??'-'} · الفيديو: ${stats?.videoQuestions??'-'} · القصة: ${stats?.storyQuestions??'-'}`,`Boxes: ${stats?.boxes??'-'} · Vocabulary: ${stats?.vocabulary??'-'} · Grammar Q: ${stats?.grammarQuestions??'-'} · Video Q: ${stats?.videoQuestions??'-'} · Story Q: ${stats?.storyQuestions??'-'}`));
    }catch(error){
      setStatus('error',t('✕ فشل استيراد Excel.','✕ Excel import failed.'),String(error?.message||error||'Unknown error'));
      console.error('[liplip] v107 local CPU import failed',error);
    }finally{
      if(backend && typeof originalPublish==='function') backend.publish=originalPublish;
      patchUI();
    }
  }

  function patchUI(){
    if(!isAdmin()) return;
    const root=panel();
    if(!root) return;

    // Remove all older file inputs/buttons so there is exactly one import path.
    root.querySelectorAll('input[type="file"]').forEach(input=>{
      const label=input.closest('label');
      if(label) label.remove(); else input.remove();
    });
    root.querySelectorAll('[data-v104-import],[data-v106-import]').forEach(x=>x.remove());

    const actions=root.querySelector('.v97-cc-actions')||root.querySelector('.c57-import')?.parentElement||root.querySelector('section');
    if(actions && !actions.querySelector('[data-v107-local-import]')){
      const b=document.createElement('button');
      b.type='button';
      b.dataset.v107LocalImport='1';
      b.textContent=t('استيراد Excel على هذا الجهاز','Import Excel on this device');
      b.style.cssText='width:100%;min-height:60px;border-radius:16px;border:1px solid rgba(81,54,109,.2);background:#fff;color:#51366d;font:inherit;font-weight:800;font-size:18px;padding:14px 18px';
      actions.appendChild(b);
    }

    paintStatus(readStatus()||{kind:'ready',title:t('المستورد المحلي جاهز · build 107','Local importer ready · build 107'),detail:t('المعالجة والحفظ تتم على جهاز المستخدم، بدون انتظار الخادم.','Processing and saving run on the user device, without waiting for the server.')});
  }

  // Register before the legacy importer loads. Capture manager/import clicks and keep them local/reliable.
  document.addEventListener('click',event=>{
    if(!isAdmin()) return;
    const open=event.target.closest?.('[data-course="manager-open"],.v97-content-button');
    if(open){
      event.preventDefault();
      event.stopImmediatePropagation();
      openManager();
      return;
    }
    const close=event.target.closest?.('[data-course="manager-close"],.v97-cc-close');
    if(close){
      event.preventDefault();
      event.stopImmediatePropagation();
      closeManager();
      return;
    }
    const imp=event.target.closest?.('[data-v107-local-import],[data-v104-import],[data-v106-import]');
    if(imp){
      event.preventDefault();
      event.stopImmediatePropagation();
      localImport();
    }
  },true);

  let queued=false;
  const schedule=()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patchUI()});
  };
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();

  window.LiplipStudyLocalCPU107={openManager,closeManager,localImport,patchUI};
})();
