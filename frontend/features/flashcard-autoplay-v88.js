/* v88: autoplay exactly the face that is visible in the DOM, once per real face change. */
(() => {
  'use strict';

  let lastKey='';
  let timer=0;
  let lastContext='';

  function literacyTarget(){
    if(window.state?.page!=='literacy-v36')return null;
    const L=window.LiplipLiteracy;
    if(!L||!['letters','numbers'].includes(L.mode))return null;
    const card=document.querySelector('.lit74-flash');
    const side=card?.querySelector('.side:not([hidden])');
    if(!side)return null;
    const text=side.querySelector('strong')?.textContent?.trim()||'';
    if(!text)return null;
    const arabic=Boolean(side.querySelector('[data-v74="hear-ar"]'));

    if(!arabic){
      if(L.mode==='letters'&&!/^[A-Za-z]$/.test(text))return null;
      if(L.mode==='numbers'&&!/^\d{1,2}$/.test(text))return null;
    }

    const face={mode:L.mode,text,arabic};
    return {
      key:`literacy:${L.mode}:${arabic?'ar':'en'}:${text}`,
      context:`literacy:${L.mode}`,
      text,
      language:arabic?'ar-IQ':'en-US',
      kind:arabic?'word':L.mode==='letters'?'letter':'number',
      face
    };
  }

  function vocabularyTarget(){
    const card=document.querySelector('.c57-word-card');
    if(!card)return null;
    const flipped=card.classList.contains('flipped');
    const face=card.querySelector(flipped?'.back':'.front');
    const button=face?.querySelector('.c57-card-voice[data-text]');
    const text=String(button?.dataset.text||'').trim();
    if(!text)return null;
    const count=face.querySelector('.c57-card-count')?.textContent?.trim()||'';
    return {
      key:`vocab:${count}:${flipped?'ar':'en'}:${text}`,
      context:'vocab',
      text,
      language:String(button.dataset.lang||(flipped?'ar-IQ':'en-US')),
      kind:'word'
    };
  }

  function currentTarget(){return literacyTarget()||vocabularyTarget()}

  function play(target){
    if(!target||target.key===lastKey)return;
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak)return;
    if(window.LiplipLiteracyAudioGate?.isListening?.())return;

    lastKey=target.key;
    lastContext=target.context;
    if(target.face)window.LiplipLiteracyAudioGate?.authorizeFace?.(target.face);
    svc.speak(target.text,{language:target.language,kind:target.kind,volume:1}).catch(()=>{});
  }

  function scan(){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const target=currentTarget();
      if(!target){
        // During render the card can briefly disappear. Keep lastKey so a click/render cannot replay A/0.
        const page=window.state?.page;
        const L=window.LiplipLiteracy;
        const context=page==='literacy-v36'&&['letters','numbers'].includes(L?.mode)?`literacy:${L.mode}`:document.querySelector('.c57-word-card')?'vocab':'';
        if(!context||context!==lastContext){lastKey='';lastContext=context}
        return;
      }
      play(target);
    },110);
  }

  const observer=new MutationObserver(scan);
  const start=()=>{
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    scan();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  document.addEventListener('click',e=>{
    const mic=e.target.closest?.('[data-v74="mic"],[data-v82="mic"],[data-course="pronounce"]');
    if(mic){
      try{window.LiplipLiteracyAudioGate?.setListening?.(true)}catch{}
      try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
      return;
    }
    const manual=e.target.closest?.('[data-v74="hear"],[data-v74="hear-ar"],[data-v82="hear"],.c57-card-voice[data-text]');
    if(manual){
      const target=currentTarget();
      if(target){lastKey=target.key;lastContext=target.context}
    }
  },true);

  window.addEventListener('liplip:voice-recognition-finished',()=>scan(),{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){try{window.LiplipGeminiSpeech?.cancel?.()}catch{}}
    else scan();
  });
})();
