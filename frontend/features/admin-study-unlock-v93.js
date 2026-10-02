/* v93: keep current/previous study access open; admin bypasses all study locks and phase walls. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const PHASES=['vocabulary','grammar','watchRead'];
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const app=()=>document.getElementById('app')||document.body;

  function courseSnapshot(){
    try{
      if(!window.LiplipProgress?.courseSnapshot)return null;
      return window.LiplipProgress.courseSnapshot(window.state?.progress);
    }catch{return null}
  }

  function unlockQuickStudy(){
    const snap=courseSnapshot();
    if(!snap)return;
    const hasCurrent=Boolean(snap.currentBox);
    const hasPrevious=Array.isArray(snap.completedBoxes)&&snap.completedBoxes.length>0;
    document.querySelectorAll('[data-v28="study-current"]').forEach(b=>{
      if(hasCurrent||isAdmin()){
        b.disabled=false;
        b.removeAttribute('aria-disabled');
        b.classList.remove('v47-home-study-blocked','course-nav-locked');
      }
    });
    document.querySelectorAll('[data-v28="review-last"]').forEach(b=>{
      if(hasPrevious||isAdmin()){
        b.disabled=false;
        b.removeAttribute('aria-disabled');
        b.classList.remove('v47-home-study-blocked','course-nav-locked');
      }
    });
  }

  function unlockAdminLevels(){
    if(!isAdmin())return;

    document.querySelectorAll('.c57-level').forEach((b,i)=>{
      b.disabled=false;
      b.classList.remove('locked');
      b.dataset.course='level';
      if(!b.dataset.level){
        const txt=b.querySelector('.c57-level-no')?.textContent||'';
        const n=Number(txt.replace(/\D/g,''))||i+1;
        b.dataset.level=String(n);
      }
    });

    const level=Number(window.LiplipCourse57?.level)||1;
    document.querySelectorAll('.c57-box').forEach((b,i)=>{
      b.disabled=false;
      b.classList.remove('locked');
      b.dataset.course='box';
      if(!b.dataset.boxId)b.dataset.boxId=String((level-1)*200+i+1);
    });

    document.querySelectorAll('.treasure-level-card').forEach((b,i)=>{
      b.disabled=false;
      b.classList.remove('locked');
      b.dataset.course='level';
      if(!b.dataset.level)b.dataset.level=String(i+1);
    });

    document.querySelectorAll('.treasure-box-card').forEach((b,i)=>{
      b.disabled=false;
      b.classList.remove('locked');
      const l=Number(b.dataset.level)||Number(window.LiplipCourse57?.level)||1;
      const local=Number(b.dataset.localBox)||i+1;
      b.dataset.course='box';
      b.dataset.boxId=String((l-1)*200+local);
    });
  }

  function unlockAdminPhases(){
    if(!isAdmin())return;
    document.querySelectorAll('.c57-stage-nav section').forEach((section,pi)=>{
      section.classList.remove('locked');
      const phase=PHASES[pi]||PHASES[0];
      const phaseButton=section.querySelector(':scope > button');
      if(phaseButton){
        phaseButton.disabled=false;
        phaseButton.dataset.course='phase';
        phaseButton.dataset.phase=phase;
        phaseButton.removeAttribute('aria-disabled');
      }
      section.querySelectorAll(':scope > div > button').forEach((b,i)=>{
        b.disabled=false;
        b.dataset.course='process';
        b.dataset.process=String(i);
        b.removeAttribute('aria-disabled');
      });
    });

    document.querySelectorAll('.course-item-nav button.primary,[data-course="finish-exam"],[data-course="media-exam"]').forEach(b=>{
      b.disabled=false;
      b.removeAttribute('aria-disabled');
      b.classList.remove('course-nav-locked');
    });
  }

  function unlockAdminGlobal(){
    if(!isAdmin())return;
    document.querySelectorAll('.v45-nav-locked,.v47-nav-locked,.course-nav-locked').forEach(el=>{
      el.classList.remove('v45-nav-locked','v47-nav-locked','course-nav-locked');
      if('disabled' in el)el.disabled=false;
      el.removeAttribute('aria-disabled');
      delete el.dataset.v47Lock;
    });
    document.querySelectorAll('[data-v47-lock]').forEach(el=>{
      delete el.dataset.v47Lock;
      if('disabled' in el)el.disabled=false;
      el.removeAttribute('aria-disabled');
    });
  }

  function apply(){
    unlockQuickStudy();
    unlockAdminLevels();
    unlockAdminPhases();
    unlockAdminGlobal();
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  const start=()=>{
    apply();
    const root=app();
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    window.addEventListener('storage',schedule);
    document.addEventListener('click',schedule,true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
