/* v44 literacy letter-pair presentation and audio normalization. */
(() => {
  'use strict';

  const ui = window.LiplipFrontend;
  if (!ui) return;

  const state = () => window.LiplipLiteracy;
  const pair = value => {
    const upper = String(value || '').slice(0, 1).toUpperCase();
    return upper ? upper + upper.toLowerCase() : '';
  };

  function decorate({ root }) {
    const s = state();
    if (!s || s.mode !== 'letters') return;
    const current = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.max(0, Math.min(25, Number(s.index) || 0))];
    if (!current) return;
    const text = pair(current);

    if (s.stage === 'learn') {
      const back = root.querySelector('.lit36-face.back b');
      if (back) back.textContent = text;
    }

    if (['trace', 'draw', 'hear-draw'].includes(s.stage)) {
      const heading = root.querySelector('.lit36-practice-head > strong');
      const shadow = root.querySelector('.lit36-shadow');
      if (heading) {
        heading.textContent = text;
        heading.classList.add('lit44-letter-pair');
      }
      if (shadow) {
        shadow.textContent = text;
        shadow.classList.add('lit44-letter-pair-shadow');
      }
    }
  }

  ui.registerFeature('literacy-letter-pairs-v44', { mount: decorate });

  /* Some speech engines announce a one-character uppercase utterance as
     “capital A”. Normalize only the literacy letters flow to lowercase text,
     leaving all other speech synthesis untouched. */
  const synth = window.speechSynthesis;
  if (synth && typeof synth.speak === 'function' && !synth.__liplipLetterPairPatch) {
    const nativeSpeak = synth.speak.bind(synth);
    synth.speak = utterance => {
      try {
        const s = state();
        const text = String(utterance?.text || '');
        if (s?.mode === 'letters' && /^[A-Z]$/.test(text)) {
          const normalized = new SpeechSynthesisUtterance(text.toLowerCase());
          normalized.lang = utterance.lang || 'en-US';
          normalized.rate = utterance.rate;
          normalized.pitch = utterance.pitch;
          normalized.volume = utterance.volume;
          return nativeSpeak(normalized);
        }
      } catch {}
      return nativeSpeak(utterance);
    };
    Object.defineProperty(synth, '__liplipLetterPairPatch', { value: true });
  }
})();
