/* v86: literacy audio is user-triggered only; cancel speech before microphone recognition. */
(() => {
  'use strict';

  let explicitUntil = 0;
  let explicitKind = '';
  let listening = false;

  function literacyVisible(){
    const page=window.state?.page;
    if(page==='literacy-exam-v82') return Boolean(document.querySelector('.v82-exam'));
    if(page==='literacy-v36' && ['letters','numbers'].includes(window.LiplipLiteracy?.mode)) return Boolean(document.querySelector('.lit74'));
    return false;
  }

  function visibleSymbol(){
    const exam=window.LiplipLiteracyExam82;
    if(window.state?.page==='literacy-exam-v82' && exam?.items?.length){
      return String(exam.items[exam.index] ?? '').trim();
    }
    const L=window.LiplipLiteracy;
    if(window.state?.page==='literacy-v36' && L){
      if(L.mode==='letters') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.max(0,Math.min(25,Number(L.index)||0))] || '';
      if(L.mode==='numbers') return String(Math.max(0,Math.min(34,Number(L.index)||0)));
    }
    return '';
  }

  function stopAll(){
    try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  document.addEventListener('click',e=>{
    const hear=e.target.closest?.('[data-v74="hear"],[data-v74="hear-ar"],[data-v82="hear"]');
    const mic=e.target.closest?.('[data-v74="mic"],[data-v82="mic"]');
    if(hear && literacyVisible()){
      explicitUntil=Date.now()+1500;
      explicitKind=hear.matches('[data-v74="hear-ar"]')?'arabic':'target';
      return;
    }
    if(mic && literacyVisible()){
      explicitUntil=0;
      explicitKind='';
      listening=true;
      stopAll();
      setTimeout(()=>{listening=false},12000);
    }
  },true);

  function install(){
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak || svc.__v86Guard) return false;
    const baseSpeak=svc.speak.bind(svc);
    const baseCancel=svc.cancel?.bind(svc);

    svc.speak=async function(text,options={}){
      if(!literacyVisible()) return baseSpeak(text,options);
      if(listening) return {source:'blocked-during-mic'};
      if(Date.now()>explicitUntil) return {source:'blocked-non-user-literacy-audio'};

      const raw=String(text??'').trim();
      const symbol=visibleSymbol();
      if(explicitKind==='target'){
        const kind=String(options?.kind||'');
        if(kind==='letter' && /^[A-Za-z]$/.test(raw) && raw.toUpperCase()!==symbol.toUpperCase()){
          return {source:'blocked-wrong-literacy-letter'};
        }
        if(kind==='number' && /^\d+$/.test(raw) && raw!==symbol){
          return {source:'blocked-wrong-literacy-number'};
        }
      }

      explicitUntil=0;
      const result=await baseSpeak(text,options);
      return result;
    };

    svc.cancel=function(){explicitUntil=0;explicitKind='';listening=false;return baseCancel?.()};
    Object.defineProperty(svc,'__v86Guard',{value:true});
    return true;
  }

  if(!install()){
    let n=0;
    const timer=setInterval(()=>{n++;if(install()||n>60)clearInterval(timer)},100);
  }

  window.addEventListener('liplip:voice-recognition-finished',()=>{listening=false},{passive:true});
})();
