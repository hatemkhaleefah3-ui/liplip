/* v92: exam-only audio firewall. Only the current exam item's Hear action may produce speech. */
(() => {
  'use strict';

  const LETTER_SPEAK={A:'eigh',B:'bee',C:'see',D:'dee',E:'ee',F:'eff',G:'gee',H:'aitch',I:'eye',J:'jay',K:'kay',L:'el',M:'em',N:'en',O:'oh',P:'pee',Q:'cue',R:'are',S:'ess',T:'tee',U:'you',V:'vee',W:'double you',X:'ex',Y:'why',Z:'zee'};
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];

  let permit=null;

  const active=()=>window.state?.page==='literacy-exam-v82';
  const exam=()=>window.LiplipLiteracyExam82;

  function expected(){
    const X=exam();
    if(!active()||!X||!['letters','numbers'].includes(X.mode))return null;
    const raw=String(X.items?.[X.index]??'').trim();
    if(!raw)return null;
    const text=X.mode==='letters'?(LETTER_SPEAK[raw.toUpperCase()]||raw):(NUMBER_NAMES[Number(raw)]||raw);
    return {raw,text,mode:X.mode};
  }

  function stopAll(){
    try{window.LiplipGeminiSpeech?.cancel?.()}catch{}
    try{window.speechSynthesis?.cancel?.()}catch{}
  }

  function authorize(){
    const e=expected();
    permit=e?{...e,until:Date.now()+1500}:null;
  }

  function valid(text){
    const e=expected();
    if(!e||!permit||Date.now()>permit.until)return false;
    if(permit.mode!==e.mode||permit.raw!==e.raw)return false;
    return String(text??'').trim().toLowerCase()===e.text.toLowerCase();
  }

  function install(){
    const svc=window.LiplipGeminiSpeech;
    if(svc?.speak&&!svc.__v92ExamFirewall){
      const baseSpeak=svc.speak.bind(svc);
      const baseCancel=svc.cancel?.bind(svc);
      svc.speak=async function(text,options={}){
        if(!active())return baseSpeak(text,options);
        if(!valid(text))return {source:'blocked-exam-audio'};
        permit=null;
        return baseSpeak(text,options);
      };
      svc.cancel=function(){permit=null;return baseCancel?.()};
      Object.defineProperty(svc,'__v92ExamFirewall',{value:true});
    }

    const synth=window.speechSynthesis;
    if(synth&&typeof synth.speak==='function'&&!synth.__v92ExamFirewall){
      const baseSpeak=synth.speak.bind(synth);
      synth.speak=function(utterance){
        if(!active())return baseSpeak(utterance);
        if(!valid(utterance?.text))return;
        // Do not consume here. The wrapped Gemini speech service is the next hop
        // and consumes the same one-shot permit after validating the same target.
        return baseSpeak(utterance);
      };
      Object.defineProperty(synth,'__v92ExamFirewall',{value:true});
    }
  }

  // This capture handler runs before the exam's document handler.
  window.addEventListener('click',event=>{
    if(!active())return;
    const control=event.target.closest?.('[data-v82]');
    if(!control)return;
    const action=control.dataset.v82;
    if(action==='hear'){
      stopAll();
      authorize();
      return;
    }
    // No other exam control is allowed to produce audio. In particular Next,
    // Check and Mic cannot leak a stale zero/A from legacy listeners.
    permit=null;
    stopAll();
  },true);

  window.addEventListener('pointerdown',event=>{
    if(!active())return;
    if(event.target.closest?.('[data-v82-canvas]')){permit=null;stopAll()}
  },true);

  const observer=new MutationObserver(()=>{
    install();
    if(!active())permit=null;
  });

  const start=()=>{
    install();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    let tries=0;
    const timer=setInterval(()=>{tries++;install();if(tries>50)clearInterval(timer)},100);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
