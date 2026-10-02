/* v61: one resilient voice service for letters, numbers, vocabulary, and sentences. */
(() => {
  'use strict';

  const ui = window.LiplipFrontend;
  if (!ui) return;

  const synth = window.speechSynthesis;
  const NativeUtterance = window.SpeechSynthesisUtterance;
  const nativeSpeak = synth?.speak?.bind(synth);
  const nativeCancel = synth?.cancel?.bind(synth);
  const KINDS = new Set(['letter', 'number', 'word', 'sentence']);
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
  const cache = new Map();

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
    if (activeAudio) {
      try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
      activeAudio = null;
    }
    try { nativeCancel?.(); } catch {}
  }

  function remember(key, url) {
    cache.set(key, url);
    if (cache.size <= 96) return;
    const oldest = cache.keys().next().value;
    try { URL.revokeObjectURL(cache.get(oldest)); } catch {}
    cache.delete(oldest);
  }

  function nativeFallback(text, { language = 'en-US', volume = 1 } = {}) {
    if (!nativeSpeak || !NativeUtterance) return Promise.reject(new Error('native_speech_unavailable'));
    return new Promise((resolve, reject) => {
      try {
        nativeCancel?.();
        const utterance = new NativeUtterance(String(text));
        utterance.lang = language;
        utterance.rate = language.toLowerCase().startsWith('ar') ? 0.78 : 0.84;
        utterance.pitch = 1;
        utterance.volume = volume;
        utterance.onend = () => resolve({ source: 'native' });
        utterance.onerror = event => reject(new Error(String(event?.error || 'native_speech_failed')));
        nativeSpeak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function geminiSpeak(value, { language, kind, volume, token }) {
    const key = `${kind}:${language}:${value}`;

    // Unlock an HTMLMediaElement synchronously when speak() originates from a tap.
    // The same element is reused after the network request, which satisfies iOS Safari.
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
        let payload = null;
        try { payload = await response.json(); } catch {}
        const code = String(payload?.error || `gemini_speech_${response.status}`);
        const detail = String(payload?.detail || '');
        throw new Error(detail ? `${code}: ${detail}` : code);
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
      audio.onended = () => {
        if (token === generation) activeAudio = null;
        resolve({ source: 'gemini' });
      };
      audio.onerror = () => {
        if (token === generation) activeAudio = null;
        reject(new Error('audio_playback_failed'));
      };
      audio.play().catch(error => {
        if (token === generation) activeAudio = null;
        reject(error);
      });
    });
  }

  async function speak(text, options = {}) {
    const value = String(text || '').trim();
    if (!value) throw new Error('empty_speech');

    const language = String(options.language || 'en-US');
    const kind = KINDS.has(options.kind) ? options.kind : classify(value);
    const volume = Math.max(0, Math.min(1, Number(options.volume ?? 1)));

    stop();
    const token = generation;

    try {
      return await geminiSpeak(value, { language, kind, volume, token });
    } catch (error) {
      if (error?.name === 'AbortError' || token !== generation) throw error;
      console.warn('[liplip] Gemini TTS failed; using native speech fallback', error);
      try {
        return await nativeFallback(value, { language, volume });
      } catch (fallbackError) {
        const primary = String(error?.message || 'gemini_voice_failed');
        const secondary = String(fallbackError?.message || 'native_voice_failed');
        throw new Error(`${primary}; fallback=${secondary}`);
      }
    }
  }

  // Compatibility bridge for legacy code that still calls speechSynthesis.speak().
  // New letter/number/vocabulary controls call LiplipGeminiSpeech directly.
  if (synth && typeof synth.speak === 'function') {
    try {
      synth.speak = utterance => {
        const text = String(utterance?.text || '').trim();
        if (!text) return nativeSpeak?.(utterance);
        speak(text, {
          language: utterance.lang || 'en-US',
          kind: classify(text),
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
    cancel: stop,
    classify,
    hasGemini: true,
    hasNativeFallback: Boolean(nativeSpeak && NativeUtterance)
  };
})();
