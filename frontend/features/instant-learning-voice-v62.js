/* v62: autoplay the visible vocabulary face as soon as a study card appears. */
(() => {
  'use strict';

  let lastKey = '';
  let scheduled = false;

  function visibleVocabularyTarget() {
    const card = document.querySelector('.c57-word-card');
    if (!card) return null;
    const flipped = card.classList.contains('flipped');
    const face = card.querySelector(flipped ? '.back' : '.front');
    const button = face?.querySelector('.c57-card-voice[data-text]');
    if (!button) return null;
    const text = String(button.dataset.text || '').trim();
    if (!text) return null;
    const language = String(button.dataset.lang || (flipped ? 'ar-IQ' : 'en-US'));
    return {
      key: `vocab:${text}:${language}:${flipped ? 'back' : 'front'}`,
      text,
      language,
      kind: 'word'
    };
  }

  function scan() {
    scheduled = false;
    const target = visibleVocabularyTarget();
    if (!target || target.key === lastKey) return;
    const service = window.LiplipGeminiSpeech;
    if (!service?.speak) return;
    lastKey = target.key;
    service.speak(target.text, {
      language: target.language,
      kind: target.kind,
      volume: 1
    }).catch(error => console.warn('[liplip] vocabulary autoplay failed', error));
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  const observer = new MutationObserver(schedule);
  const start = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    schedule();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
