/* v90: deterministic literacy autoplay + hard speech firewall for letters/numbers. */
(() => {
  'use strict';

  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const AR_LETTER={A:'أ',B:'ب',C:'س',D:'د',E:'إ',F:'ف',G:'ج',H:'إتش',I:'اي',J:'جاي',K:'ك',L:'ل',M:'م',N:'ن',O:'أو',P:'بي',Q:'كيو',R:'ر',S:'س',T:'ت',U:'يو',V:'ف',W:'دبليو',X:'إكس',Y:'واي',Z:'ز'};
  const AR_NUMBER=['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر','عشرون','واحد وعشرون','اثنان وعشرون','ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون','ثمانية وعشرون','تسعة وعشرون','ثلاثون','واحد وثلاثون','اثنان وثلاثون','ثلاثة وثلاثون','أربعة وثلاثون'];

  let permit=null;
  let lastKey='';
  let listening=false;
  let timer=0;

  const literacyActive=()=>window.state?.page==='literacy-v36'&&['letters','numbers'].includes(window.LiplipLiteracy?.mode);

  function visibleFlashFace(){
    if(!literacyActive())return null;
    const L=window.LiplipLiteracy;
    const card=document.querySelector('.lit74-flash');
    const side=card?.querySelector('.side:not([hidden])');
    if(!side)return null;
    const raw=side.querySelector('strong')?.textContent?.trim()||'';
    if(!raw)return null;
    const arabic=Boolean(side.querySelector('[data-v74="hear-ar"]'));
    const mode=L.mode;
    if(!arabic){
      if(mode==='letters'&&!/^[A-Za-z]$/.test(raw))return null;
      if(mode==='numbers'&&!/^\d{1,2}$/.test(raw))return null;
    }
    return {mode,arabic,text:raw,key:`${mode}:${arabic?'ar':'en'}:${raw}`};
  }

  function expectedForFace(face){
    if(!face)return null;
    if(face.arabic)return {text:face.text,language:'ar-IQ',kind:'word'};
    return {text:face.text,language:'en-US',kind:face.mode==='letters'?'letter':'number'};
  }

  function sameFace(a,b){return Boolean(a&&b&&a.mode===b.mode&&a.arabic===b.arabic&&a.text===b.text)}
  function authorize(face,source){permit={face:{...face},source,until:Date.now()+1800}}

  function stopAll(){
    try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  function installFirewall(){
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak||svc.__v90Firewall)return false;
    const baseSvcSpeak=svc.speak.bind(svc);
    const baseSvcCancel=svc.cancel?.bind(svc);

    svc.speak=async function(text,options={}){
      if(!literacyActive())return baseSvcSpeak(text,options);
      if(listening)return {source:'blocked-during-mic'};
      const face=visibleFlashFace();
      if(!face)return {source:'blocked-no-flashcard'};
      if(!permit||Date.now()>permit.until||!sameFace(face,permit.face)){
        permit=null;
        return {source:'blocked-unapproved-literacy-speech'};
      }
      const expected=expectedForFace(face);
      const raw=String(text??'').trim();
      const kind=String(options?.kind||'');
      const lang=String(options?.language||'');
      permit=null;
      if(raw!==expected.text||kind!==expected.kind||lang!==expected.language)return {source:'blocked-wrong-literacy-target'};
      return baseSvcSpeak(raw,{...options,language:expected.language,kind:expected.kind});
    };

    svc.cancel=function(){permit=null;return baseSvcCancel?.()};
    Object.defineProperty(svc,'__v90Firewall',{value:true});

    // Block every legacy direct speechSynthesis call while the modern literacy page is active.
    const synth=window.speechSynthesis;
    if(synth&&typeof synth.speak==='function'&&!synth.__v90Firewall){
      const baseSynthSpeak=synth.speak.bind(synth);
      synth.speak=function(utterance){
        if(!literacyActive())return baseSynthSpeak(utterance);
        if(listening)return;
        const face=visibleFlashFace();
        if(!face||!permit||Date.now()>permit.until||!sameFace(face,permit.face)){permit=null;return}
        const expected=expectedForFace(face);
        const raw=String(utterance?.text||'').trim();
        permit=null;
        if(raw!==expected.text)return;
        try{utterance.lang=expected.language}catch{}
        return baseSynthSpeak(utterance);
      };
      Object.defineProperty(synth,'__v90Firewall',{value:true});
    }
    return true;
  }

  function playVisible(face,source='auto'){
    if(!face||listening)return;
    const svc=window.LiplipGeminiSpeech;
    if(!svc?.speak)return;
    const expected=expectedForFace(face);
    authorize(face,source);
    svc.speak(expected.text,{language:expected.language,kind:expected.kind,volume:1}).catch(()=>{});
  }

  function scan(){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(!literacyActive()){lastKey='';permit=null;return}
      const face=visibleFlashFace();
      if(!face)return;
      if(face.key===lastKey)return;
      lastKey=face.key;
      stopAll();
      playVisible(face,'auto');
    },120);
  }

  // Window capture runs before the legacy document capture handlers.
  window.addEventListener('click',e=>{
    if(!literacyActive())return;
    const mic=e.target.closest?.('[data-v74="mic"],[data-v82="mic"]');
    if(mic){
      listening=true;
      permit=null;
      stopAll();
      return;
    }
    const hear=e.target.closest?.('[data-v74="hear"],[data-v74="hear-ar"]');
    if(hear){
      const face=visibleFlashFace();
      if(face){lastKey=face.key;authorize(face,'manual')}
      return;
    }
  },true);

  window.addEventListener('liplip:voice-recognition-finished',()=>{listening=false;permit=null},{passive:true});

  const observer=new MutationObserver(scan);
  const start=()=>{
    installFirewall();
    let tries=0;
    const installTimer=setInterval(()=>{tries++;if(installFirewall()||tries>50)clearInterval(installTimer)},100);
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    scan();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
