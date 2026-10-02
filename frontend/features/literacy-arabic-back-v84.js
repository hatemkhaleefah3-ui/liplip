/* v84: Arabic glyph backs for literacy flashcards. */
(() => {
  'use strict';
  const GLYPH = {
    A:'أ',B:'ب',C:'س',D:'د',E:'ي',F:'ف',G:'ج',H:'هـ',I:'اي',J:'جاي',K:'ك',L:'ل',M:'م',N:'ن',O:'و',P:'بي',Q:'كيو',R:'ر',S:'س',T:'ت',U:'يو',V:'ف',W:'و',X:'إكس',Y:'واي',Z:'ز'
  };
  let scheduled=false;
  function apply(){
    scheduled=false;
    const s=window.LiplipLiteracy;
    if(!s||s.mode!=='letters')return;
    const el=document.querySelector('.lit74-flash .arabic');
    if(!el)return;
    const letter='ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.max(0,Math.min(25,Number(s.index)||0))]||'A';
    const value=GLYPH[letter]||letter;
    if(el.textContent!==value)el.textContent=value;
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
  const start=()=>{if(!document.body)return;new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
