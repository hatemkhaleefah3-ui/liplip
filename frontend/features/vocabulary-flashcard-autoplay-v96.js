/* v96: vocabulary study cards always open on English and autoplay the visible face exactly once. */
(() => {
  'use strict';

  const S = window.LiplipCourse57;
  if (!S) return;

  let lastKey = '';
  let scheduled = false;

  function stopSpeech(){
    try { window.LiplipGeminiSpeech?.cancel?.(); } catch {}
    try { window.speechSynthesis?.cancel?.(); } catch {}
  }

  function speak(text, lang){
    const value = String(text || '').trim();
    if (!value) return;
    stopSpeech();
    const svc = window.LiplipGeminiSpeech;
    if (svc?.speak) {
      svc.speak(value, { language: lang, kind: 'word', volume: 1 }).catch(() => {});
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(value);
      u.lang = lang;
      window.speechSynthesis?.speak(u);
    } catch {}
  }

  function currentCard(){
    if (S.phase !== 'vocabulary' || Number(S.process) !== 0 || !S.boxId) return null;
    return document.querySelector('.c57-study.c57-vocab .c57-word-card');
  }

  function faceData(card){
    const flipped = card.classList.contains('flipped');
    const face = card.querySelector(flipped ? '.back' : '.front');
    const button = face?.querySelector('[data-course="speak"]');
    const text = String(button?.dataset.text || face?.querySelector('strong')?.textContent || '').trim();
    const lang = String(button?.dataset.lang || (flipped ? 'ar-IQ' : 'en-US'));
    return { flipped, text, lang };
  }

  function sync(){
    scheduled = false;
    const card = currentCard();
    if (!card) {
      lastKey = '';
      return;
    }
    const { flipped, text, lang } = faceData(card);
    if (!text) return;
    const key = `${S.boxId}:${Number(S.item)||0}:${flipped?'ar':'en'}:${text}`;
    if (key === lastKey) return;
    lastKey = key;
    speak(text, lang);
  }

  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => setTimeout(sync, 0));
  }

  document.addEventListener('click', event => {
    const card = event.target.closest?.('.c57-study.c57-vocab .c57-word-card');
    const nav = event.target.closest?.('.c57-study.c57-vocab [data-course="item-next"], .c57-study.c57-vocab [data-course="item-prev"]');

    if (nav) {
      // New vocabulary cards must always begin on the English face.
      S.flipped = false;
      stopSpeech();
      lastKey = '';
      schedule();
      return;
    }

    if (card && !event.target.closest?.('[data-course="speak"]')) {
      // The course click handler flips immediately after this capture listener.
      stopSpeech();
      schedule();
    }
  }, true);

  const observer = new MutationObserver(schedule);
  const start = () => {
    const app = document.getElementById('app') || document.body;
    if (!app) return;
    observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    schedule();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
