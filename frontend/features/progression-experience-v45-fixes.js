/* v45 follow-up guards: cross-level exam gates, quick-entry locks, editor collisions. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;if(!UI)return;
  const STORE='liplip-v45-progression';
  const t=(ar,en)=>UI.t(ar,en);
  const meta=()=>UI.storage.get(STORE,{literacy:{letters:false,numbers:false},exams:{}});
  const examPassed=(l,e)=>!!meta().exams?.[`${l}:${e}`];
  const course=()=>LiplipProgress.courseSnapshot(state.progress);
  const loc=id=>LiplipProgress.courseLocation(id);
  const done=()=>new Set(course().completedBoxes||[]);
  const cefr=()=>{const m=meta();if(!m.literacy?.letters||!m.literacy?.numbers)return'A0';const map=['A1','A2','B1','B2','C1','C2'];let n=0;for(let l=1;l<=5;l++){if(examPassed(l,50))n=l;else break}return map[n]};
  const rank=()=>['A0','A1','A2','B1','B2','C1','C2'].indexOf(cefr());
  function pendingExam(){const c=done();for(let l=1;l<=5;l++)for(const e of [15,30,45,50]){const id=(l-1)*200+e;if(c.has(id)&&!examPassed(l,e))return{level:l,end:e}}return null}
  function bannerHTML(p){return `<div><span>${p.end===50?t('الامتحان النهائي','FINAL EXAM'):t('امتحان المرحلة','MILESTONE EXAM')}</span><h2>${p.end===50?t('أكمل الامتحان النهائي قبل فتح المستوى التالي.','Complete the final exam before the next level opens.'):t('يجب اجتياز الامتحان قبل متابعة الصناديق.','Pass this exam before continuing to later boxes.')}</h2></div><button data-v45-open-exam data-level="${p.level}" data-end="${p.end}">${t('ابدأ الامتحان','Start exam')}</button>`}
  function applyExamGate(root=document){
    const p=pendingExam();if(!p)return;
    const boxMap=root.querySelector?.('.treasure-box-map-page'),levelMap=root.querySelector?.('.treasure-level-map');
    if(boxMap){
      let banner=boxMap.querySelector('.v45-exam-banner');if(!banner){banner=document.createElement('section');banner.className='v45-exam-banner';boxMap.prepend(banner)}banner.innerHTML=bannerHTML(p);
      const shown=Number(window.LiplipTreasureMap?.level)||loc(course().currentBox||1).level;
      boxMap.querySelectorAll('[data-course="box"]').forEach(btn=>{const b=Number(btn.dataset.localBox)||loc(Number(btn.dataset.boxId)).box;if(shown>p.level||(shown===p.level&&b>p.end)){btn.disabled=true;btn.closest('.treasure-box-stop')?.classList.add('v45-exam-blocked')}});
    }
    if(levelMap){
      let banner=levelMap.querySelector('.v45-exam-banner');if(!banner){banner=document.createElement('section');banner.className='v45-exam-banner';levelMap.prepend(banner)}banner.innerHTML=bannerHTML(p);
      levelMap.querySelectorAll('[data-course="level"][data-level]').forEach(btn=>{if(Number(btn.dataset.level)>p.level)btn.disabled=true});
    }
  }
  function fixEditor(root=document){const f=root.querySelector?.('#v45-article-form');if(!f||f.__v45Fixed)return;const title=f.elements.namedItem('title'),body=f.elements.namedItem('body');try{Object.defineProperty(f,'title',{value:title,configurable:true});Object.defineProperty(f,'body',{value:body,configurable:true})}catch{}f.__v45Fixed=true}
  function mount({root}){applyExamGate(root);fixEditor(document)}
  UI.registerFeature('progression-experience-v45-fixes',{mount});
  new MutationObserver(()=>{applyExamGate(document);fixEditor(document)}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const study=e.target.closest?.('[data-v28="study-current"]');if(study&&rank()<1){e.preventDefault();e.stopImmediatePropagation();alert(t('الدراسة تفتح بعد إكمال الحروف والأرقام والوصول إلى A1.','Study unlocks after completing letters and numbers and reaching A1.'));return}
    const talk=e.target.closest?.('[data-v28="talk"],[data-talk]');if(talk&&rank()<3){e.preventDefault();e.stopImmediatePropagation();alert(t('المكالمة والدردشة تفتحان عند B1.','Call and chat unlock at B1.'));return}
  },true);
})();
