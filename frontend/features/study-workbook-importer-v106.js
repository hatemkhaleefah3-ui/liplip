/* v106: authoritative import controller. Shows exact failures and treats verified local save separately from server publish. */
(() => {
  'use strict';
  const STORE='liplip-course-content-v2';
  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const text=v=>String(v??'').trim();

  function notice(state,title,detail=''){
    document.querySelectorAll('.v106-import-toast').forEach(x=>x.remove());
    const el=document.createElement('div');
    el.className='v106-import-toast';
    el.style.cssText='position:fixed;z-index:2147483647;left:16px;right:16px;top:max(18px,env(safe-area-inset-top));padding:16px 18px;border-radius:18px;box-shadow:0 14px 42px rgba(30,20,40,.28);font-weight:800;line-height:1.45;text-align:center;white-space:pre-wrap;word-break:break-word;';
    el.style.background=state==='success'?'#eaf7ee':state==='error'?'#fff0f0':'#f2edf7';
    el.style.color=state==='success'?'#235d35':state==='error'?'#8a2630':'#3f2d52';
    el.textContent=detail?`${title}\n${detail}`:title;
    document.body.appendChild(el);
    if(state!=='working')setTimeout(()=>el.remove(),12000);
    const panel=document.querySelector('.v97-content-control,.c57-manager');
    if(panel){
      let box=panel.querySelector('.v106-import-status');
      if(!box){box=document.createElement('div');box.className='v106-import-status';box.style.cssText='margin:16px 22px;padding:16px 18px;border-radius:16px;font-weight:800;line-height:1.55;white-space:pre-wrap;word-break:break-word;';const head=panel.querySelector('.v97-cc-head')||panel.querySelector('section > header');(head?.parentNode||panel).insertBefore(box,head?.nextSibling||panel.firstChild)}
      box.style.background=el.style.background;box.style.color=el.style.color;box.textContent=el.textContent;
    }
  }

  function pickFile(){return new Promise(resolve=>{
    const input=document.createElement('input');input.type='file';input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';input.style.cssText='position:fixed;left:-9999px;opacity:0';document.body.appendChild(input);
    input.addEventListener('change',()=>{const file=input.files?.[0]||null;input.remove();resolve(file)},{once:true});
    input.click();
  })}

  async function run(){
    if(!isAdmin())return;
    const file=await pickFile();if(!file)return;
    const importer=window.LiplipStudyWorkbookImporter104;
    if(!importer?.importWorkbook){notice('error',t('فشل استيراد Excel.','Excel import failed.'),t('مكوّن الاستيراد غير محمّل. حدّث الصفحة بعد اكتمال نشر build 106.','The import engine is not loaded. Refresh after build 106 finishes deploying.'));return}
    const before=localStorage.getItem(STORE)||'';
    notice('working',t(`جاري استيراد ${file.name}…`,`Importing ${file.name}…`),t('لا تغلق الصفحة حتى تظهر نتيجة واضحة.','Keep this page open until a clear result appears.'));
    try{
      const stats=await importer.importWorkbook(file);
      const after=localStorage.getItem(STORE)||'';
      if(!after||after===before)throw Error(t('انتهى المستورد بدون حفظ أي تغيير.','Importer finished without saving any change.'));
      notice('success',t('✓ تم استيراد Excel وحفظ المحتوى بنجاح.','✓ Excel imported and content saved successfully.'),t(`الصناديق: ${stats?.boxes??'-'} · المفردات: ${stats?.vocabulary??'-'} · أسئلة القواعد: ${stats?.grammarQuestions??'-'} · الفيديو: ${stats?.videoQuestions??'-'} · القصة: ${stats?.storyQuestions??'-'}`,`Boxes: ${stats?.boxes??'-'} · Vocabulary: ${stats?.vocabulary??'-'} · Grammar Q: ${stats?.grammarQuestions??'-'} · Video Q: ${stats?.videoQuestions??'-'} · Story Q: ${stats?.storyQuestions??'-'}`));
    }catch(error){
      const after=localStorage.getItem(STORE)||'';
      const msg=text(error?.message||error)||'Unknown import error';
      if(after&&after!==before){
        // v104 saves and verifies local content before attempting server publish. A later publish error must not be reported as an import failure.
        notice('success',t('✓ تم استيراد Excel وحفظ المحتوى على الموقع.','✓ Excel imported and content saved on this site.'),t(`تم الحفظ محلياً. تعذّر فقط مزامنة نسخة الخادم: ${msg}`,`Local save succeeded. Only server synchronization failed: ${msg}`));
      }else{
        notice('error',t('✕ فشل استيراد Excel.','✕ Excel import failed.'),msg);
      }
      console.error('[liplip] v106 import result',error);
    }
  }

  // Capture before the v104 element listener so exactly one import flow runs.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-v104-import]');
    if(!button||!isAdmin())return;
    event.preventDefault();event.stopImmediatePropagation();run();
  },true);

  // Replace the visible label so the admin can tell the new controller is active.
  const patch=()=>{const b=document.querySelector('[data-v104-import]');if(b)b.textContent=t('استيراد ملف Excel · build 106','Import Excel · build 106')};
  new MutationObserver(patch).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch,{once:true});else patch();
})();