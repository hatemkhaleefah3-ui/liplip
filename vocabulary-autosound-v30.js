/* v31: reliably pronounce active vocabulary word/sentence/image when it appears. */
(() => {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;

  let lastKey = '';
  let pendingKey = '';
  let timer = 0;
  let unlocked = false;
  let speakingCard = null;

  const supported = new Set(['flashcardWord','flashcardSentence','imageToWord','imageToSpeak','voiceToSpeak']);

  function activeCard(){
    return document.querySelector('.phase-vocabulary .vocab-deck.vocab-single .vocab-card');
  }

  function cardText(card){
    if (!card) return '';
    const button = card.querySelector('.vocab-speak[data-text]');
    if (button?.dataset.text?.trim()) return button.dataset.text.trim();
    const type = card.dataset.vocabType || '';
    if (type === 'flashcardSentence') return card.querySelector('.vocab-sentence-en p')?.textContent?.trim() || '';
    if (type === 'imageToWord' || type === 'imageToSpeak') return card.querySelector('figcaption strong, blockquote, .vocab-main-word')?.textContent?.trim() || '';
    return card.querySelector('.vocab-flip-face strong, blockquote, .vocab-main-word')?.textContent?.trim() || '';
  }

  function cardKey(card,text){
    const type = card?.dataset.vocabType || '';
    const number = card?.querySelector(':scope > header > span')?.textContent?.trim() || '';
    return `${type}|${number}|${text}`;
  }

  function stopSpeakingVisual(){
    if (speakingCard) speakingCard.classList.remove('is-auto-speaking');
    speakingCard = null;
  }

  function pronounce(card,{force=false}={}){
    if (!card) return;
    const type = card.dataset.vocabType || '';
    if (!supported.has(type)) return;
    const text = cardText(card);
    if (!text) return;
    const key = cardKey(card,text);
    if (!force && key === lastKey) return;

    pendingKey = key;
    try {
      speechSynthesis.cancel();
      stopSpeakingVisual();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = type === 'flashcardSentence' ? 0.80 : 0.86;
      u.pitch = type === 'flashcardWord' || type === 'imageToWord' ? 1.05 : 1;
      u.volume = 1;
      u.onstart = () => {
        unlocked = true;
        lastKey = key;
        pendingKey = '';
        speakingCard = card;
        card.classList.add('is-auto-speaking');
      };
      u.onend = () => stopSpeakingVisual();
      u.onerror = () => {
        stopSpeakingVisual();
        pendingKey = key;
      };
      speechSynthesis.speak(u);
    } catch {
      pendingKey = key;
    }
  }

  function schedule(force=false){
    clearTimeout(timer);
    timer = setTimeout(() => {
      const card = activeCard();
      if (!card) {
        lastKey = '';
        pendingKey = '';
        stopSpeakingVisual();
        return;
      }
      pronounce(card,{force});
    }, 70);
  }

  /* Watch the actual DOM because course rendering replaces the active card after navigation. */
  const observer = new MutationObserver(() => schedule(false));
  const startObserver = () => {
    const root = document.getElementById('app') || document.body;
    observer.observe(root,{childList:true,subtree:true});
    schedule(false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();

  /* Explicitly schedule after vocabulary navigation; the new card should speak as soon as it appears. */
  document.addEventListener('click',e => {
    const nav = e.target.closest?.('[data-course="item-next"],[data-course="item-prev"],[data-course="phase"],[data-course="box"]');
    if (nav) {
      lastKey = '';
      setTimeout(() => schedule(false),0);
    }

    const manual = e.target.closest?.('.vocab-speak[data-text]');
    if (manual) {
      const card = manual.closest('.vocab-card');
      const text = manual.dataset.text?.trim() || '';
      if (card && text) lastKey = cardKey(card,text);
    }
  },true);

  /* Mobile browsers may block synthetic speech until the first user gesture. Retry the visible card immediately after that gesture. */
  const unlock = () => {
    if (!unlocked || pendingKey || !lastKey) {
      lastKey = '';
      schedule(true);
    }
    document.removeEventListener('pointerdown',unlock,true);
    document.removeEventListener('keydown',unlock,true);
  };
  document.addEventListener('pointerdown',unlock,true);
  document.addEventListener('keydown',unlock,true);

  document.addEventListener('visibilitychange',() => {
    if (!document.hidden) schedule(false);
    else {
      try{speechSynthesis.cancel()}catch{}
      stopSpeakingVisual();
    }
  });
})();
