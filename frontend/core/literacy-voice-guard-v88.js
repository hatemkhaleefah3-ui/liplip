/* v88: permit only speech for the flashcard face that is actually visible; block stale A/0 and stop during mic. */
(() => {
  'use strict';

  let permit=null;
  let listening=false;

  function visibleLiteracyFace(){
    if(window.state?.page!=='literacy-v36')return null;
    const L=window.LiplipLiteracy;
    if(!L||!['letters','numbers'].includes(L.mode))return null;
    const card=document.querySelector('.lit74-flash');
    const side=card?.querySelector('.side:not([hidden])');
    if(!side)return null;
    const text=side.querySelector('strong')?.textContent?.trim()||'';
    if(!text)return null;
    const arabic=Boolean(side.querySelector('[data-v74="hear-ar"]'));
    return {mode:L.mode,text,arabic};
  }

  function stopAll(){
    try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  function authorize(payload){
    permit={...payload,until:Date.now()+1800};
  }

  function setListening(value){
    listening=Boolean(value);
    if(listening){permit=null;stopAll()}
  }

  document.addEventListener('click',e=>{
    const mic=e.target.closest?.('[data-v74="mic"],[data-v82="mic"]');
    if(mic){setListening(true);return}
    const hear=e.target.closest?.('[data-v74="hear"],[data-v74="hear-ar"]');
    if(hear){
      const face=visibleLiteracyFace();
      if(face)authorize({source:'manual',face});
    }
  },true);

  function install(){
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak||svc.__v88Guard)return false;
    const baseSpeak=svc.speak.bind(svc);
    const baseCancel=svc.cancel?.bind(svc);

    svc.speak=async function(text,options={}){
      const face=visibleLiteracyFace();
      if(!face)return baseSpeak(text,options);
      if(listening)return {source:'blocked-during-mic'};
      if(!permit||Date.now()>permit.until)return {source:'blocked-unapproved-literacy-audio'};

      const raw=String(text??'').trim();
      const kind=String(options?.kind||'');
      const approved=permit.face;
      permit=null;

      // The permission itself is tied to the face that was visible when autoplay/manual speech was authorized.
      if(!approved||approved.mode!==face.mode||approved.text!==face.text||approved.arabic!==face.arabic){
        return {source:'blocked-stale-face'};
      }

      if(!face.arabic){
        if(face.mode==='letters'){
          if(!/^[A-Za-z]$/.test(face.text)||kind!=='letter'||raw.toUpperCase()!==face.text.toUpperCase())return {source:'blocked-wrong-letter'};
        }else{
          if(!/^\d{1,2}$/.test(face.text)||kind!=='number'||raw!==face.text)return {source:'blocked-wrong-number'};
        }
      }else if(raw!==face.text){
        return {source:'blocked-wrong-arabic-face'};
      }

      return baseSpeak(text,options);
    };

    svc.cancel=function(){permit=null;return baseCancel?.()};
    Object.defineProperty(svc,'__v88Guard',{value:true});
    return true;
  }

  if(!install()){
    let n=0;
    const timer=setInterval(()=>{n++;if(install()||n>60)clearInterval(timer)},100);
  }

  window.LiplipLiteracyAudioGate={
    authorizeFace:face=>authorize({source:'auto',face}),
    setListening,
    isListening:()=>listening,
    cancel:stopAll
  };

  window.addEventListener('liplip:voice-recognition-finished',()=>{listening=false},{passive:true});
})();
