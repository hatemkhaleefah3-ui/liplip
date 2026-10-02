/* v87: allow only intentional literacy audio (current-card autoplay/manual); block stale A/0 speech and stop during mic recognition. */
(() => {
  'use strict';

  let permit = null;
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

  function authorize(source='manual',key=''){
    permit={source,key:String(key||''),until:Date.now()+1800};
  }

  function setListening(value){
    listening=Boolean(value);
    if(listening){permit=null;stopAll()}
  }

  document.addEventListener('click',e=>{
    const hear=e.target.closest?.('[data-v74="hear"],[data-v74="hear-ar"],[data-v82="hear"]');
    const mic=e.target.closest?.('[data-v74="mic"],[data-v82="mic"]');
    if(hear && literacyVisible()){
      authorize('manual',`click:${visibleSymbol()}`);
      return;
    }
    if(mic && literacyVisible()) setListening(true);
  },true);

  function install(){
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak || svc.__v87Guard) return false;
    const baseSpeak=svc.speak.bind(svc);
    const baseCancel=svc.cancel?.bind(svc);

    svc.speak=async function(text,options={}){
      if(!literacyVisible()) return baseSpeak(text,options);
      if(listening) return {source:'blocked-during-mic'};
      if(!permit || Date.now()>permit.until) return {source:'blocked-stale-literacy-audio'};

      const raw=String(text??'').trim();
      const symbol=visibleSymbol();
      const kind=String(options?.kind||'');

      // English target audio must belong to the symbol that is currently on screen.
      if(kind==='letter' && /^[A-Za-z]$/.test(raw) && raw.toUpperCase()!==symbol.toUpperCase()){
        permit=null;
        return {source:'blocked-wrong-literacy-letter'};
      }
      if(kind==='number' && /^\d+$/.test(raw) && raw!==symbol){
        permit=null;
        return {source:'blocked-wrong-literacy-number'};
      }

      permit=null;
      return baseSpeak(text,options);
    };

    svc.cancel=function(){
      permit=null;
      return baseCancel?.();
    };
    Object.defineProperty(svc,'__v87Guard',{value:true});
    return true;
  }

  if(!install()){
    let n=0;
    const timer=setInterval(()=>{n++;if(install()||n>60)clearInterval(timer)},100);
  }

  window.LiplipLiteracyAudioGate={
    authorizeAuto:key=>authorize('auto',key),
    authorizeManual:key=>authorize('manual',key),
    setListening,
    cancel:stopAll,
    isListening:()=>listening
  };

  window.addEventListener('liplip:voice-recognition-finished',()=>setListening(false),{passive:true});
})();
