/* v87: one-shot autoplay for the flashcard face that is actually visible. */
(() => {
  'use strict';

  const LETTER_NAMES={A:'eigh',B:'bee',C:'see',D:'dee',E:'ee',F:'eff',G:'gee',H:'aitch',I:'eye',J:'jay',K:'kay',L:'el',M:'em',N:'en',O:'oh',P:'pee',Q:'cue',R:'are',S:'ess',T:'tee',U:'you',V:'vee',W:'double you',X:'ex',Y:'why',Z:'zee'};
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];

  let lastKey='';
  let timer=0;

  function literacyTarget(){
    if(window.state?.page!=='literacy-v36')return null;
    const L=window.LiplipLiteracy;
    if(!L||!['letters','numbers'].includes(L.mode))return null;
    const card=document.querySelector('.lit74-flash');
    if(!card)return null;
    const side=card.querySelector('.side:not([hidden])');
    if(!side)return null;
    const isArabic=Boolean(side.querySelector('[data-v74="hear-ar"]'));
    const visible=side.querySelector('strong')?.textContent?.trim()||'';
    const index=Math.max(0,Number(L.index)||0);
    if(isArabic){
      if(!visible)return null;
      return {key:`literacy:${L.mode}:${index}:ar:${visible}`,text:visible,language:'ar-IQ',kind:'word'};
    }
    if(L.mode==='letters'){
      const letter='ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.min(25,index)]||'A';
      return {key:`literacy:letters:${index}:en:${letter}`,text:letter,language:'en-US',kind:'letter'};
    }
    const n=Math.min(34,index);
    return {key:`literacy:numbers:${index}:en:${n}`,text:String(n),language:'en-US',kind:'number'};
  }

  function vocabularyTarget(){
    const card=document.querySelector('.c57-word-card');
    if(!card)return null;
    const flipped=card.classList.contains('flipped');
    const face=card.querySelector(flipped?'.back':'.front');
    const button=face?.querySelector('.c57-card-voice[data-text]');
    if(!button)return null;
    const text=String(button.dataset.text||'').trim();
    if(!text)return null;
    const count=face.querySelector('.c57-card-count')?.textContent?.trim()||'';
    const lang=String(button.dataset.lang||(flipped?'ar-IQ':'en-US'));
    return {key:`vocab:${count}:${flipped?'ar':'en'}:${text}`,text,language:lang,kind:'word'};
  }

  function currentTarget(){return literacyTarget()||vocabularyTarget()}

  function play(target){
    if(!target)return;
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak)return;
    if(window.LiplipLiteracyAudioGate?.isListening?.())return;
    if(target.key===lastKey)return;
    lastKey=target.key;
    if(target.key.startsWith('literacy:')) window.LiplipLiteracyAudioGate?.authorizeAuto?.(target.key);
    svc.speak(target.text,{language:target.language,kind:target.kind,volume:1}).catch(()=>{});
  }

  function scan(){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const target=currentTarget();
      if(!target){lastKey='';return}
      play(target);
    },90);
  }

  const observer=new MutationObserver(scan);
  const start=()=>{
    const root=document.getElementById('app')||document.body;
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
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
      if(target)lastKey=target.key;
    }
  },true);

  window.addEventListener('liplip:voice-recognition-finished',()=>scan(),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){try{window.LiplipGeminiSpeech?.cancel?.()}catch{}}else scan()});
})();
