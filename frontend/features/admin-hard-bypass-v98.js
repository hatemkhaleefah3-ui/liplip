/* v98: admin progression facade — no CEFR, literacy, milestone, level, box, or page access walls. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const META_KEY='liplip-v45-progression';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';

  function fullExamMap(existing={}){
    const exams={...(existing||{})};
    for(let level=1;level<=5;level++)for(const end of [15,30,45,50])exams[`${level}:${end}`]=true;
    return exams;
  }

  function installMetaFacade(){
    const storage=window.LiplipFrontend?.storage;
    if(!storage?.get||storage.__adminV98)return false;
    const baseGet=storage.get.bind(storage);
    storage.get=function(key,fallback){
      const value=baseGet(key,fallback);
      if(key!==META_KEY||!isAdmin())return value;
      const meta=value&&typeof value==='object'?structuredClone(value):{};
      meta.literacy={...(meta.literacy||{}),letters:true,numbers:true};
      meta.exams=fullExamMap(meta.exams);
      return meta;
    };
    Object.defineProperty(storage,'__adminV98',{value:true});
    return true;
  }

  function allBoxIds(){
    const ids=[];
    for(let level=1;level<=5;level++)for(let box=1;box<=50;box++)ids.push((level-1)*200+box);
    return ids;
  }

  function installCourseFacade(){
    const progress=window.LiplipProgress;
    if(!progress?.courseSnapshot||progress.__adminV98)return false;
    const baseSnapshot=progress.courseSnapshot.bind(progress);
    const all=allBoxIds();
    progress.courseSnapshot=function(raw){
      const snap=baseSnapshot(raw);
      if(!isAdmin())return snap;
      return {
        ...snap,
        currentBox:snap?.currentBox||1,
        completedBoxes:[...new Set([...(snap?.completedBoxes||[]),...all])]
      };
    };
    Object.defineProperty(progress,'__adminV98',{value:true});
    return true;
  }

  function clearRenderedLocks(){
    if(!isAdmin())return;
    document.querySelectorAll('.v45-nav-locked,.v47-nav-locked,.v45-locked,.locked,.course-nav-locked,[aria-disabled="true"]').forEach(el=>{
      el.classList.remove('v45-nav-locked','v47-nav-locked','v45-locked','locked','course-nav-locked');
      el.removeAttribute('aria-disabled');
      if('disabled' in el)el.disabled=false;
    });
    document.querySelectorAll('[data-v45-locked]').forEach(el=>{
      delete el.dataset.v45Locked;
      if(!el.dataset.v45Fast&&/fast-write/i.test(el.dataset.literacy||''))el.dataset.v45Fast='1';
    });
  }

  function install(){
    installMetaFacade();
    installCourseFacade();
    clearRenderedLocks();
  }

  const start=()=>{
    install();
    const root=document.getElementById('app')||document.body;
    new MutationObserver(()=>requestAnimationFrame(()=>{install();clearRenderedLocks()})).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled','aria-disabled','data-v45-locked']});
    document.addEventListener('click',()=>queueMicrotask(clearRenderedLocks),true);
    window.addEventListener('storage',install);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
