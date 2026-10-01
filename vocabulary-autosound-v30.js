/* v30: automatically pronounce each vocabulary card when it becomes the active item. */
(() => {
  if (!window.LiplipCourse || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  const originalRender = LiplipCourse.render.bind(LiplipCourse);
  let lastKey = '';
  let timer = null;

  function speakCurrent(){
    clearTimeout(timer);
    timer = setTimeout(() => {
      const card = document.querySelector('.phase-vocabulary .vocab-deck.vocab-single .vocab-card');
      if (!card) { lastKey=''; return; }
      const button = card.querySelector('.vocab-speak[data-text]');
      const text = button?.dataset.text?.trim();
      if (!text) return;
      const type = card.dataset.vocabType || '';
      const number = card.querySelector(':scope > header > span')?.textContent?.trim() || '';
      const key = `${type}|${number}|${text}`;
      if (key === lastKey) return;
      lastKey = key;
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = type === 'flashcardSentence' ? 0.82 : 0.88;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
        card.classList.add('is-auto-speaking');
        utterance.onend = utterance.onerror = () => card.classList.remove('is-auto-speaking');
      } catch {}
    }, 80);
  }

  LiplipCourse.render = function(progress){
    const html = originalRender(progress);
    speakCurrent();
    return html;
  };

  document.addEventListener('click', e => {
    const manual = e.target.closest?.('.vocab-speak[data-text]');
    if (!manual) return;
    const card = manual.closest('.vocab-card');
    if (card) {
      const type = card.dataset.vocabType || '';
      const number = card.querySelector(':scope > header > span')?.textContent?.trim() || '';
      lastKey = `${type}|${number}|${manual.dataset.text?.trim()||''}`;
    }
  }, true);
})();
