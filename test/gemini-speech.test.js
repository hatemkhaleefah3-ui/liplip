const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  let fetchCalls = 0;
  const synth = {
    speak(utterance) { queueMicrotask(() => utterance.onend?.()); },
    cancel() {}
  };
  class Utterance {
    constructor(text) { this.text = text; this.volume = 1; this.lang = 'en-US'; }
    dispatchEvent() {}
  }
  const context = {
    window: {
      LiplipFrontend: {},
      speechSynthesis: synth,
      SpeechSynthesisUtterance: Utterance
    },
    fetch: async () => {
      fetchCalls += 1;
      return { ok: false, status: 500, json: async () => ({}) };
    },
    URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} },
    Audio: class {},
    Event: class {},
    Map,
    Set,
    String,
    Number,
    Math,
    Promise,
    Object,
    console,
    queueMicrotask
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'frontend/core/gemini-speech-v54.js'), 'utf8'),
    context
  );

  const result = await context.window.LiplipGeminiSpeech.speak('hello', { kind: 'word', language: 'en-US' });
  assert.equal(result.source, 'native');
  await new Promise(resolve => queueMicrotask(resolve));
  assert.equal(fetchCalls, 0, 'successful native speech must not trigger a Gemini request');

  await context.window.LiplipGeminiSpeech.prefetch('hello', { kind: 'word', language: 'en-US' });
  assert.equal(fetchCalls, 1, 'explicit prefetch remains available');

  console.log('Gemini speech stays native-first and only prefetches explicitly');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
