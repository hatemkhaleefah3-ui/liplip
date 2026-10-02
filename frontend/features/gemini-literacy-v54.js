/* v54: Gemini-only judgment for letter and number handwriting. */
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI) return;

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const drawingKey = state => `${state.mode}:${state.stage}:${state.index}`;

  async function grade(canvas, target, kind) {
    const response = await fetch('/api/gemini/drawing', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target, kind, image: canvas.toDataURL('image/webp', 0.72) })
    });
    if (!response.ok) {
      let code = '';
      try { code = String((await response.json())?.error || ''); } catch {}
      throw new Error(code || `gemini_drawing_${response.status}`);
    }
    const result = await response.json();
    if (typeof result.correct !== 'boolean' || !Number.isFinite(result.confidence)) throw new Error('invalid_drawing_response');
    return result;
  }

  function targets(state, count) {
    const index = Math.max(0, Number(state.index) || 0);
    if (state.mode === 'letters') {
      const upper = LETTERS[Math.min(index, LETTERS.length - 1)];
      return Array.from({ length: count }, (_, i) => ({ target: i ? upper.toLowerCase() : upper, kind: 'letter' }));
    }
    const n = Math.min(index, NUMBER_WORDS.length - 1);
    return Array.from({ length: count }, (_, i) => ({ target: i ? NUMBER_WORDS[n] : String(n), kind: 'number' }));
  }

  UI.delegate('click', '[data-v54-check-drawing]', async (event, button) => {
    event.preventDefault();
    if (button.disabled) return;
    const page = button.closest('.lit36');
    const root = page?.querySelector('.lit36-canvas-card');
    const state = window.LiplipLiteracy;
    if (!root || !state || !['letters', 'numbers'].includes(state.mode)) return;
    const canvases = [...root.querySelectorAll('[data-v48-canvas]')];
    if (!canvases.length || !canvases.every((_, i) => state._v48Drawn?.[i])) {
      button.textContent = UI.t('ارسم في الحقلين أولاً', 'Draw in both fields first');
      button.dataset.state = 'wrong';
      return;
    }

    const expected = targets(state, canvases.length);
    button.disabled = true;
    button.textContent = UI.t('Gemini يتحقق من الرسم…', 'Gemini is checking…');
    try {
      // Keep requests sequential: the free tier is much more likely to throttle
      // two simultaneous vision calls than two small calls made back-to-back.
      const grades = [];
      for (let i = 0; i < canvases.length; i++) grades.push(await grade(canvases[i], expected[i].target, expected[i].kind));
      const correct = grades.every(item => item.correct && item.confidence >= 0.55);
      state.drawn = correct;
      state._v54ApprovedDrawing = correct ? drawingKey(state) : '';
      button.textContent = correct ? UI.t('صحيح ✓', 'Correct ✓') : UI.t('حاول مرة أخرى', 'Try again');
      button.dataset.state = correct ? 'correct' : 'wrong';
      if (correct) UI.render(false);
    } catch (error) {
      state.drawn = false;
      const code = String(error?.message || '');
      button.textContent = code === 'gemini_not_configured'
        ? UI.t('المفتاح غير متاح لهذا النشر', 'API key unavailable in this deployment')
        : code.includes('429') || code.includes('RESOURCE_EXHAUSTED')
          ? UI.t('تم بلوغ الحد المجاني — حاول لاحقاً', 'Free quota reached — retry later')
          : UI.t('تعذر تحقق Gemini — حاول مجدداً', 'Gemini could not check — retry');
      button.dataset.state = 'wrong';
    } finally {
      button.disabled = false;
    }
  });

  function mount({ root }) {
    const state = window.LiplipLiteracy;
    if (!state || !['letters', 'numbers'].includes(state.mode) || !['draw', 'hear-draw'].includes(state.stage)) return;
    const card = root.querySelector('.lit36-canvas-card');
    if (!card || root.querySelector('[data-v54-check-drawing]')) return;
    const key = drawingKey(state);
    if (state._v54DrawingKey !== key) {
      state._v54DrawingKey = key;
      state._v54ApprovedDrawing = '';
    }
    state.drawn = state._v54ApprovedDrawing === key;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.dataset.v54CheckDrawing = '1';
    button.textContent = UI.t('تحقق من الرسم بواسطة Gemini', 'Check drawing with Gemini');
    (root.querySelector('.lit36-draw-actions') || card).appendChild(button);
  }

  UI.registerFeature('gemini-literacy-v54', { mount });

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('[data-v48-canvas]')) return;
    const state = window.LiplipLiteracy;
    if (!state || !['draw', 'hear-draw'].includes(state.stage)) return;
    state._v54ApprovedDrawing = '';
    state.drawn = false;
    const button = event.target.closest('.lit36')?.querySelector('[data-v54-check-drawing]');
    if (button) {
      button.dataset.state = '';
      button.textContent = UI.t('تحقق من الرسم بواسطة Gemini', 'Check drawing with Gemini');
    }
  }, true);

  document.addEventListener('click', event => {
    const finish = event.target.closest?.('[data-lit36="finish-draw"]');
    if (!finish) return;
    const state = window.LiplipLiteracy;
    if (!state || !['letters', 'numbers'].includes(state.mode) || !['draw', 'hear-draw'].includes(state.stage)) return;
    if (state._v54ApprovedDrawing === drawingKey(state)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = finish.closest('.lit36-canvas-card')?.querySelector('[data-v54-check-drawing]') || document.querySelector('[data-v54-check-drawing]');
    if (button) {
      button.dataset.state = 'wrong';
      button.textContent = UI.t('تحقق بواسطة Gemini قبل المتابعة', 'Check with Gemini before continuing');
      button.focus();
    }
  }, true);

  window.LiplipGemini = {
    grade,
    speak: (...args) => window.LiplipGeminiSpeech?.speak(...args),
    cancelSpeech: () => window.LiplipGeminiSpeech?.cancel()
  };
})();
