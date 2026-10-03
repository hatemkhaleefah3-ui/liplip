/* v114: instant native-first voice with explicit letter-name pronunciation; Gemini is fallback. */
(() => {
  'use strict';

  const ui = window.LiplipFrontend;
  if (!ui) return;

  const synth = window.speechSynthesis;
  const NativeUtterance = window.SpeechSynthesisUtterance;
  const nativeSpeak = synth?.speak?.bind(synth);
  const nativeCancel = synth?.cancel?.bind(synth);
  const KINDS = new Set(['letter', 'number', 'word', 'sentence']);
  const LETTER_NAMES = {
    A:'eigh',B:'bee',C:'cee',D:'dee',E:'ee',F:'ef',G:'gee',H:'aitch',I:'eye',J:'jay',
    K:'kay',L:'el',M:'em',N:'en',O:'oh',P:'pee',Q:'cue',R:'ar',S:'ess',T:'tee',
    U:'you',V:'vee',W:'double you',X:'ex',Y:'why',Z:'zee'
  };
  const cache = new Map();
  const pending = new Map();
  let activeAudio = null;
  let generation = 0;

  function classify(text) {
    const value = String(text || '').trim();
    const literacy = window.LiplipLiteracy;
    if (literacy?.mode === 'letters') return 'letter';
    if (literacy?.mode === 'numbers') return 'number';
    if (/^[A-Za-z]$/.test(value)) return 'letter';
    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(value)) return 'number';
    if (/\s/.test(value) || /[.!?؟؛;]/.test(value)) return 'sentence';
    return 'word';
  }

  function emit(utterance, type, detail = {}) {
    try { utterance.dispatchEvent(new Event(type)); }
    catch { try { utterance[`on${type}`]?.({ type, utterance, ...detail }); } catch {} }
  }

  function stop() {
    generation += 1;
    try { nativeCancel?.(); } catch {}
    if (activeAudio) {
      try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
      activeAudio = null;
    }
  }

  function nativeVoice(text, { language = 'en-US', volume = 1, kind = 'word' } = {}) {
    if (!nativeSpeak || !NativeUtterance) return Promise.reject(new Error('native_speech_unavailable'));
    const token = generation;
    return new Promise((resolve, reject) => {
      try {
        nativeCancel?.();
        const raw = String(text).trim();
        const spoken = kind === 'letter' && /^[A-Za-z]$/.test(raw)
          ? (LETTER_NAMES[raw.toUpperCase()] || raw.toLowerCase())
          : raw;
        const u = new NativeUtterance(spoken);
        u.lang = language;
        u.rate = language.toLowerCase().startsWith('ar') ? 0.86 : 0.92;
        u.pitch = 1;
        u.volume = volume;
        u.onend = () => token === generation ? resolve({ source: 'native' }) : resolve({ source: 'cancelled' });
        u.onerror = e => reject(new Error(String(e?.error || 'native_speech_failed')));
        nativeSpeak(u);
      } catch (error) { reject(error); }
    });
  }

  async function fetchGemini(text, { language, kind }) {
    const key = `${kind}:${language}:${text}`;
    if (cache.has(key)) return cache.get(key);
    if (pending.has(key)) return pending.get(key);
    const job = (async () => {
      const response = await fetch('/api/gemini/speech', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, language, kind })
      });
      if (!response.ok) {
        let payload = null;
        try { payload = await response.json(); } catch {}
        throw new Error(String(payload?.error || `gemini_speech_${response.status}`));
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('audio/')) throw new Error('invalid_speech_response');
      const url = URL.createObjectURL(blob);
      cache.set(key, url);
      if (cache.size > 128) {
        const oldest = cache.keys().next().value;
        try { URL.revokeObjectURL(cache.get(oldest)); } catch {}
        cache.delete(oldest);
      }
      return url;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  }

  async function geminiFallback(text, { language, kind, volume }) {
    const url = await fetchGemini(text, { language, kind });
    const audio = new Audio(url);
    activeAudio = audio;
    audio.volume = volume;
    return new Promise((resolve, reject) => {
      audio.onended = () => { activeAudio = null; resolve({ source: 'gemini' }); };
      audio.onerror = () => { activeAudio = null; reject(new Error('audio_playback_failed')); };
      audio.play().catch(error => { activeAudio = null; reject(error); });
    });
  }

  async function speak(text, options = {}) {
    const value = String(text || '').trim();
    if (!value) throw new Error('empty_speech');
    const language = String(options.language || 'en-US');
    const kind = KINDS.has(options.kind) ? options.kind : classify(value);
    const volume = Math.max(0, Math.min(1, Number(options.volume ?? 1)));

    stop();
    try {
      return await nativeVoice(value, { language, volume, kind });
    } catch (nativeError) {
      console.warn('[liplip] native speech failed; using Gemini fallback', nativeError);
      return geminiFallback(value, { language, kind, volume });
    }
  }

  function prefetch(text, options = {}) {
    const value = String(text || '').trim();
    if (!value) return Promise.resolve();
    const language = String(options.language || 'en-US');
    const kind = KINDS.has(options.kind) ? options.kind : classify(value);
    return fetchGemini(value, { language, kind }).then(() => undefined).catch(() => undefined);
  }

  if (synth && typeof synth.speak === 'function') {
    try {
      synth.speak = utterance => {
        const text = String(utterance?.text || '').trim();
        if (!text) return nativeSpeak?.(utterance);
        const kind = classify(text);
        speak(text, {
          language: utterance.lang || 'en-US',
          kind,
          volume: utterance.volume
        }).then(() => emit(utterance, 'end')).catch(error => {
          if (error?.name !== 'AbortError') emit(utterance, 'error', { error });
        });
      };
      synth.cancel = stop;
      Object.defineProperty(synth, '__liplipGeminiSpeech', { value: true });
    } catch {}
  }

  window.LiplipGeminiSpeech = {
    speak,
    prefetch,
    cancel: stop,
    classify,
    hasGemini: true,
    instant: true,
    hasNativeFallback: Boolean(nativeSpeak && NativeUtterance)
  };
})();
