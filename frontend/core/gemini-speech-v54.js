/* v54: Gemini owns educational speech for letters, numbers, words, and sentences. */
(() => {
  'use strict';

  const ui = window.LiplipFrontend;
  const synth = window.speechSynthesis;
  if (!ui) return;

  const KINDS = new Set(['letter', 'number', 'word', 'sentence']);
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
  const cache = new Map();
  const nativeSpeak = synth?.speak?.bind(synth);
  const nativeCancel = synth?.cancel?.bind(synth);
  let activeAudio = null;
  let pendingRequest = null;
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
    pendingRequest?.abort();
    pendingRequest = null;
    if (!activeAudio) return;
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
    activeAudio = null;
  }

  function remember(key, url) {
    cache.set(key, url);
    if (cache.size <= 96) return;
    const oldest = cache.keys().next().value;
    try { URL.revokeObjectURL(cache.get(oldest)); } catch {}
    cache.delete(oldest);
  }

  async function speak(text, options = {}) {
    const value = String(text || '').trim();
    if (!value) throw new Error('empty_speech');
    const language = String(options.language || 'en-US');
    const kind = KINDS.has(options.kind) ? options.kind : classify(value);
    const key = `${kind}:${language}:${value}`;
    stop();
    const token = generation;
    const volume = Math.max(0, Math.min(1, Number(options.volume ?? 1)));
    // Unlock one media element synchronously inside the user's tap. Mobile
    // Safari may otherwise reject play() after the Gemini fetch has finished.
    const audio = new Audio(SILENT_WAV);
    activeAudio = audio;
    audio.volume = 0;
    const unlocked = audio.play().catch(() => {});
    let url = cache.get(key);
    if (!url) {
      const controller = new AbortController();
      pendingRequest = controller;
      const response = await fetch('/api/gemini/speech', {
        method: 'POST',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: value, language, kind })
      });
      if (pendingRequest === controller) pendingRequest = null;
      if (token !== generation) throw new DOMException('Speech replaced', 'AbortError');
      if (!response.ok) {
        let code = '';
        try { code = String((await response.json())?.error || ''); } catch {}
        throw new Error(code || `gemini_speech_${response.status}`);
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('audio/')) throw new Error('invalid_speech_response');
      url = URL.createObjectURL(blob);
      remember(key, url);
    }

    if (token !== generation) throw new DOMException('Speech replaced', 'AbortError');
    await unlocked;
    if (token !== generation) throw new DOMException('Speech replaced', 'AbortError');
    try { audio.pause(); } catch {}
    audio.src = url;
    audio.currentTime = 0;
    audio.volume = volume;
    return new Promise((resolve, reject) => {
      audio.onended = () => { if (token === generation) activeAudio = null; resolve(); };
      audio.onerror = () => { if (token === generation) activeAudio = null; reject(new Error('audio_playback_failed')); };
      audio.play().catch(error => { if (token === generation) activeAudio = null; reject(error); });
    });
  }

  // Gemini audio does not depend on the browser's native speech engine.
  // Keep the legacy bridge only where speechSynthesis is available and writable.
  if (synth && typeof synth.speak === 'function') {
    try {
      synth.speak = utterance => {
        const text = String(utterance?.text || '').trim();
        if (!text) return nativeSpeak(utterance);
        speak(text, {
          language: utterance.lang || 'en-US',
          kind: classify(text),
          volume: utterance.volume
        }).then(() => emit(utterance, 'end')).catch(error => {
          if (error?.name !== 'AbortError') emit(utterance, 'error', { error });
        });
      };
      synth.cancel = () => { stop(); nativeCancel(); };
      Object.defineProperty(synth, '__liplipGeminiSpeech', { value: true });
    } catch {}
  }
  window.LiplipGeminiSpeech = { speak, cancel: stop, classify };
})();
