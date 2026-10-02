/* v91: isolate letters/numbers exam from legacy literacy state so A/0 cannot leak into exam controls. */
(() => {
  'use strict';

  const examActive=()=>window.state?.page==='literacy-exam-v82';

  function stopSpeech(){
    try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  function isolateLegacyLiteracy(){
    if(!examActive())return;
    const L=window.LiplipLiteracy;
    if(!L)return;
    // The v82 exam owns its mode/items in LiplipLiteracyExam82. Leaving the
    // legacy mode at letters/numbers makes older listeners use index 0 and
    // speak A/zero whenever the exam rerenders or a control is clicked.
    if(L.mode==='letters'||L.mode==='numbers'){
      L._examDetachedMode=L.mode;
      L.mode=null;
    }
    L._v74=null;
  }

  // Window capture runs before all document-level legacy literacy handlers.
  // Detach the legacy state before the exam-choice click or any exam control
  // is allowed to propagate.
  window.addEventListener('click',event=>{
    const choice=event.target.closest?.('[data-v45-literacy-choice="exam"]');
    if(choice){
      stopSpeech();
      const L=window.LiplipLiteracy;
      if(L){L._examDetachedMode=choice.dataset.mode||L.mode||null;L.mode=null;L._v74=null}
      return;
    }
    if(!examActive())return;
    isolateLegacyLiteracy();
    const control=event.target.closest?.('[data-v82]');
    if(!control)return;
    const action=control.dataset.v82;
    // Mic/Next/other exam controls must never trigger leftover lesson audio.
    // Hear is allowed to start its own current-item audio after this capture.
    if(action!=='hear')stopSpeech();
  },true);

  window.addEventListener('pointerdown',()=>{if(examActive())isolateLegacyLiteracy()},true);

  const observer=new MutationObserver(()=>{
    if(examActive())isolateLegacyLiteracy();
  });

  const start=()=>{
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    isolateLegacyLiteracy();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
