/* v39: audit fixes for exact typewriter/speaking requirements. Loaded after v38. */
(() => {
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const ARTICLES=[
    'Every day is a new chance to learn something useful.',
    'Small steps can build strong habits over time.',
    'I like reading stories and practicing English every day.',
    'Good communication starts with listening carefully and speaking clearly.',
    'Learning a language takes patience, practice, and curiosity.'
  ];
  const PUNCT=/[.,?!()\/“”"]/g;
  const L=()=>window.LiplipLiteracy;
  const normalized=v=>String(v||'').replace(PUNCT,'').replace(/\s+/g,' ').trim().toLowerCase();

  function currentArticle(){const s=L();return ARTICLES[Math.max(0,Math.min(ARTICLES.length-1,Number(s?.article)||0))]}

  function enhanceTypewriter(){
    const s=L();
    if(!s||s.mode!=='fast-write'||!s.started||s.result)return;
    const page=document.querySelector('.fast38-page');
    if(!page)return;

    /* The real keyboard input lives inside the same paper/shadow field. */
    const input=document.getElementById('fast38-input');
    const win=document.querySelector('.fast38-window');
    if(input&&win&&input.parentElement!==win){
      win.appendChild(input);
      input.classList.add('fast39-input-overlay');
    }

    /* Speech punctuation is automatic, and completion waits for the spoken article rather than one short attempt. */
    if(s.fastMode==='speak'){
      const targetComparable=normalized(currentArticle());
      const speechComparable=normalized(s.speech||'');
      const finish=document.querySelector('[data-v38="fast-finish"]');
      if(finish){
        const enough=speechComparable.length>=Math.max(1,targetComparable.length-2);
        finish.disabled=!enough;
        finish.title=enough?'':t('أكمل نطق النص أولاً. علامات الترقيم محسوبة تلقائياً.','Finish speaking the article first. Punctuation is checked automatically.');
      }
      const controls=document.querySelector('.fast38-speech-controls');
      if(controls&&!controls.querySelector('.fast39-auto-punctuation')){
        const note=document.createElement('div');
        note.className='fast39-auto-punctuation';
        note.textContent=t('✓ . , ? ! ( ) / “ ” تُحتسب تلقائياً','✓ . , ? ! ( ) / “ ” are checked automatically');
        controls.appendChild(note);
      }
    }

    const track=document.getElementById('fast38-track');
    if(track)track.setAttribute('aria-live','polite');
  }

  function verifyFinalPronunciation(){
    const s=L();
    if(!s||(s.mode!=='letters'&&s.mode!=='numbers')||s.stage!=='speak')return;
    const card=document.querySelector('.lit38-final-card');
    if(!card)return;
    /* Final stage must contain symbol + microphone only: strip any accidental sound/example controls from older layers. */
    card.querySelectorAll('[data-lit36="sound"],.lit36-sound').forEach(el=>el.remove());
    const mic=card.querySelector('[data-lit36="mic"]');
    if(mic)mic.setAttribute('aria-label',t('انطق الحرف أو الرقم','Pronounce the letter or number'));
  }

  function audit(){enhanceTypewriter();verifyFinalPronunciation()}

  const observer=new MutationObserver(audit);
  const app=document.getElementById('app');
  if(app)observer.observe(app,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target?.id==='fast38-input')requestAnimationFrame(audit)},true);
  audit();
})();
