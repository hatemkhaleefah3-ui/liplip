/* v37: exact literacy flow polish layered after v36. */
(() => {
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const L=window.LiplipLiteracy;
  if(!L) return;

  function polishPractice(){
    if(state.page!=='literacy-v36'||!L.mode||L.mode==='fast-write') return;
    const root=document.querySelector('.lit36');
    if(!root) return;

    /* Guided/unguided writing is presented as a true two-sided practice card. */
    if(L.stage==='trace'||L.stage==='draw'){
      const head=root.querySelector('.lit36-practice-head');
      const canvasCard=root.querySelector('.lit36-canvas-card');
      if(head&&canvasCard&&!root.querySelector('.lit37-practice-flip')){
        const symbol=head.querySelector('strong')?.textContent||'';
        const sound=head.querySelector('[data-lit36="sound"]');
        const hint=head.querySelector('p')?.textContent||'';
        const host=document.createElement('section');
        host.className='lit37-practice-flip flipped';
        host.innerHTML=`<div class="lit37-practice-face"><small>${t('شاهد واستمع','Look & listen')}</small><strong>${symbol}</strong><button type="button" data-lit37="show-draw">${t('ابدأ الرسم','Start drawing')}</button></div><div class="lit37-practice-back"><div class="lit37-practice-tools"><span>${hint}</span></div></div>`;
        const back=host.querySelector('.lit37-practice-back');
        if(sound) back.querySelector('.lit37-practice-tools').prepend(sound);
        back.append(canvasCard);
        head.replaceWith(host);
      }
    }

    /* Hear-and-draw must not reveal the answer. */
    if(L.stage==='hear-draw'){
      const head=root.querySelector('.lit36-practice-head');
      head?.querySelector('strong')?.remove();
      if(head){
        head.classList.add('lit37-audio-only');
        const p=head.querySelector('p');
        if(p)p.textContent=t('استمع فقط ثم ارسم الحرف أو الرقم من الذاكرة.','Listen only, then draw the letter or number from memory.');
      }
    }

    /* Listen-and-speak must give audio + microphone, without showing the answer. */
    if(L.stage==='listen-speak'){
      const card=root.querySelector('.lit36-one-card');
      card?.querySelector(':scope > strong')?.remove();
      card?.classList.add('lit37-audio-speaking');
      const next=card?.querySelector('[data-lit36="stage-next"]');
      if(next){
        next.disabled=!String(L.speech||'').trim();
        next.title=next.disabled?t('تحدث أولاً للمتابعة','Speak first to continue'):'';
      }
    }

    /* Final speaking stage has symbol + microphone only and requires an attempt. */
    if(L.stage==='speak'){
      const card=root.querySelector('.lit36-one-card.final');
      const next=card?.querySelector('[data-lit36="stage-next"]');
      if(next){
        next.disabled=!String(L.speech||'').trim();
        next.title=next.disabled?t('انطق الحرف أو الرقم أولاً','Pronounce the letter or number first'):'';
      }
    }
  }

  const previousRender=render;
  render=function(scroll=true){
    previousRender(scroll);
    polishPractice();
  };

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-lit37="show-draw"]');
    if(!b)return;
    e.preventDefault();
    const card=b.closest('.lit37-practice-flip');
    card?.classList.add('show-back');
  });

  /* Apply immediately when this file loads onto an already-rendered page. */
  polishPractice();
})();