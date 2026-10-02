/* v63: sequential two-part drawing challenges with Gemini judgment. */
(() => {
  'use strict';

  const UI = window.LiplipFrontend;
  const t = (ar, en) => UI?.t ? UI.t(ar, en) : (localStorage.getItem('liplip-ui-language') === 'en' ? en : ar);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMBER_WORDS = [
    'zero','one','two','three','four','five','six','seven','eight','nine',
    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
    'seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two',
    'twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven',
    'twenty-eight','twenty-nine','thirty','thirty-one','thirty-two',
    'thirty-three','thirty-four'
  ];
  const AR_LETTER_NAMES = {
    A:'ألف',B:'باء',C:'سي',D:'دي',E:'إي',F:'إف',G:'جي',H:'إيتش',I:'آي',J:'جاي',
    K:'كاي',L:'إل',M:'إم',N:'إن',O:'أو',P:'بي',Q:'كيو',R:'آر',S:'إس',T:'تي',
    U:'يو',V:'في',W:'دبليو',X:'إكس',Y:'واي',Z:'زي'
  };

  const style = document.createElement('style');
  style.textContent = `
    .v63-hidden{display:none!important}
    .v63-draw-flow{display:flex;flex-direction:column;gap:14px;margin-top:14px}
    .v63-draw-flag{display:none;padding:12px 14px;border-radius:14px;font-weight:800;line-height:1.45}
    .v63-draw-flag.show{display:block;background:#fff2ef;color:#9b2f25;border:1px solid #efb4ac}
    .v63-draw-flag.info{display:block;background:#fff9df;color:#735c09;border:1px solid #ead58b}
    .v63-draw-action{min-height:50px;border:0;border-radius:16px;font:inherit;font-weight:900;cursor:pointer;padding:0 20px;background:#51366d;color:#fff}
    .v63-draw-action:disabled{opacity:.45;cursor:not-allowed}
    .v63-draw-action.loading{background:#75677f}
    .v63-draw-action.correct,.c57-question-next .v63-green{background:#18834b!important;color:#fff!important;border-color:#18834b!important}
    .v63-draw-step[hidden]{display:none!important}
    .v63-vocab-draw{display:flex;flex-direction:column;gap:16px}
    .v63-vocab-step{display:flex;flex-direction:column;gap:12px}
    .v63-vocab-step .v63-prompt{padding:14px 16px;border-radius:16px;background:#f7f2fb}
    .v63-vocab-step .v63-prompt small{display:block;font-weight:800;opacity:.65;margin-bottom:5px}
    .v63-vocab-step .v63-prompt strong{display:block;font-size:clamp(24px,4vw,42px)}
    .v63-vocab-step canvas{width:100%;height:min(42vw,320px);min-height:220px;border:2px dashed #b9a8c8;border-radius:18px;background:#fff;touch-action:none}
    .v63-success{padding:22px;border-radius:18px;background:#eaf8f0;color:#176c42;font-weight:900;text-align:center}
  `;
  document.head.appendChild(style);

  async function grade(target, kind, image) {
    const response = await fetch('/api/gemini/drawing', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target, kind, image })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(data.error || `gemini_drawing_${response.status}`));
    if (typeof data.correct !== 'boolean') throw new Error('invalid_drawing_response');
    return data;
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }

  function literacyKey(state) {
    return `${state.mode}:${state.stage}:${state.index}`;
  }

  function literacyExpected(state) {
    const index = Math.max(0, Number(state.index) || 0);
    if (state.mode === 'letters') {
      const upper = LETTERS[Math.min(index, LETTERS.length - 1)] || 'A';
      return [
        { target: upper, kind: 'letter' },
        { target: upper.toLowerCase(), kind: 'letter' }
      ];
    }
    const n = Math.min(index, NUMBER_WORDS.length - 1);
    return [
      { target: String(n), kind: 'number' },
      { target: NUMBER_WORDS[n], kind: 'number' }
    ];
  }

  function literacyFlag(root, text, kind = 'wrong') {
    const flag = root.querySelector('.v63-draw-flag');
    if (!flag) return;
    flag.textContent = text || '';
    flag.className = `v63-draw-flag${text ? ` show${kind === 'info' ? ' info' : ''}` : ''}`;
  }

  function updateLiteracy(root) {
    const state = window.LiplipLiteracy;
    if (!state || !['letters', 'numbers'].includes(state.mode) || !['trace', 'draw', 'hear-draw'].includes(state.stage)) return;
    const canvases = [...root.querySelectorAll('[data-v48-canvas]')];
    if (canvases.length !== 2) return;

    const key = literacyKey(state);
    if (state._v63DrawKey !== key) {
      state._v63DrawKey = key;
      state._v63DrawStep = 0;
      state._v63DrawStatus = 'idle';
      state._v48Drawn = [false, false];
      state.drawn = false;
    }

    root.querySelector('[data-v54-check-drawing]')?.remove();
    const original = root.querySelector('[data-lit36="finish-draw"]');
    if (original) original.classList.add('v63-hidden');

    let flow = root.querySelector('.v63-draw-flow');
    if (!flow) {
      flow = document.createElement('div');
      flow.className = 'v63-draw-flow';
      flow.innerHTML = `<div class="v63-draw-flag" role="status"></div><button type="button" class="v63-draw-action" data-v63-literacy-draw></button>`;
      (root.querySelector('.lit36-draw-actions') || root).appendChild(flow);
    }

    const fields = canvases.map(c => c.closest('.lit48-draw-field')).filter(Boolean);
    fields.forEach((field, i) => field.toggleAttribute('hidden', i !== Number(state._v63DrawStep || 0)));

    const action = flow.querySelector('[data-v63-literacy-draw]');
    const step = Number(state._v63DrawStep || 0);
    const status = state._v63DrawStatus || 'idle';
    action.className = `v63-draw-action ${status === 'loading' ? 'loading' : status === 'correct' ? 'correct' : ''}`;
    if (status === 'loading') {
      action.textContent = t('↻ Gemini يتحقق…', '↻ Gemini judging…');
      action.disabled = true;
    } else if (status === 'correct') {
      action.textContent = t('التالي', 'Next');
      action.disabled = false;
    } else {
      action.textContent = step === 0 ? t('التالي', 'Next') : t('تم', 'Done');
      action.disabled = !Boolean(state._v48Drawn?.[step]);
    }
  }

  async function handleLiteracy(button) {
    const root = button.closest('.lit36');
    const state = window.LiplipLiteracy;
    if (!root || !state) return;
    const canvases = [...root.querySelectorAll('[data-v48-canvas]')];
    if (canvases.length !== 2) return;

    if (state._v63DrawStatus === 'correct') {
      state._v54ApprovedDrawing = literacyKey(state);
      state.drawn = true;
      const original = root.querySelector('[data-lit36="finish-draw"]');
      original?.click();
      return;
    }

    const step = Number(state._v63DrawStep || 0);
    if (!state._v48Drawn?.[step]) return;
    literacyFlag(root, '');

    if (step === 0) {
      state._v63DrawStep = 1;
      updateLiteracy(root);
      return;
    }

    state._v63DrawStatus = 'loading';
    updateLiteracy(root);
    const expected = literacyExpected(state);
    try {
      const grades = [];
      for (let i = 0; i < 2; i++) {
        grades.push(await grade(expected[i].target, expected[i].kind, canvases[i].toDataURL('image/webp', 0.78)));
      }
      const correct = grades.every(item => item.correct && Number(item.confidence || 0) >= 0.55);
      if (correct) {
        state._v63DrawStatus = 'correct';
        state._v54ApprovedDrawing = literacyKey(state);
        state.drawn = true;
        literacyFlag(root, '');
      } else {
        canvases.forEach(clearCanvas);
        state._v48Drawn = [false, false];
        state.drawn = false;
        state._v54ApprovedDrawing = '';
        state._v63DrawStep = 0;
        state._v63DrawStatus = 'idle';
        literacyFlag(root, t('⚑ الرسمان غير مطابقين. ابدأ من الرسم الأول وحاول مرة أخرى.', '⚑ The drawings did not match. Start again from the first drawing.'));
      }
    } catch (error) {
      state._v63DrawStatus = 'idle';
      literacyFlag(root, t('تعذر على Gemini التحقق الآن. اضغط تم للمحاولة مرة أخرى.', 'Gemini could not judge right now. Tap Done to retry.'), 'info');
      console.error('[liplip] sequential literacy drawing', error);
    }
    updateLiteracy(root);
  }

  function vocabKey(state, q) {
    return `${state.boxId}:${state.item}:${q?.word?.en || ''}:${q?.word?.ar || ''}`;
  }

  function vocabFlow(state, q) {
    const key = vocabKey(state, q);
    if (!state._v63VocabDraw || state._v63VocabDraw.key !== key) {
      state._v63VocabDraw = { key, step: 0, drawn: [false, false], status: 'idle', flag: '' };
    }
    return state._v63VocabDraw;
  }

  function vocabMarkup(q, flow) {
    const esc = value => UI?.escapeHTML ? UI.escapeHTML(value) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<div class="v63-vocab-draw">
      <div class="v63-draw-flag${flow.flag ? ' show' : ''}" role="status">${esc(flow.flag)}</div>
      <section class="v63-vocab-step" data-v63-vocab-step="0" ${flow.step === 0 ? '' : 'hidden'}>
        <div class="v63-prompt"><small>${t('الرسم 1 من 2 · الإنجليزية','DRAW 1 OF 2 · ENGLISH')}</small><strong dir="rtl">${esc(q.word.ar)}</strong><p>${t('ارسم الكلمة الإنجليزية المطابقة.', 'Draw the matching English word.')}</p></div>
        <canvas data-c57-canvas data-v63-vocab-canvas="0" width="1000" height="420"></canvas>
      </section>
      <section class="v63-vocab-step" data-v63-vocab-step="1" ${flow.step === 1 ? '' : 'hidden'}>
        <div class="v63-prompt"><small>${t('الرسم 2 من 2 · العربية','DRAW 2 OF 2 · ARABIC')}</small><strong dir="ltr">${esc(q.word.en)}</strong><p>${t('ارسم الكلمة العربية المطابقة.', 'Draw the matching Arabic word.')}</p></div>
        <canvas data-c57-canvas data-v63-vocab-canvas="1" width="1000" height="420"></canvas>
      </section>
      <button type="button" class="v63-draw-action${flow.status === 'loading' ? ' loading' : ''}" data-v63-vocab-draw ${flow.drawn[flow.step] && flow.status !== 'loading' ? '' : 'disabled'}>${flow.status === 'loading' ? t('↻ Gemini يتحقق…','↻ Gemini judging…') : flow.step === 0 ? t('التالي','Next') : t('تم','Done')}</button>
    </div>`;
  }

  function mountVocabularyDraw() {
    const state = window.LiplipCourse57;
    const question = document.querySelector('.c57-draw-question');
    if (!state || !question) return;
    const q = state.exam?.[state.item];
    if (!q || q.type !== 'draw' || !q.word) return;

    if (state.revealed && state.results?.[state.item] === true) {
      question.innerHTML = `<div class="v63-success">${t('✓ الرسمان صحيحان. تابع إلى السؤال التالي.', '✓ Both drawings are correct. Continue to the next question.')}</div>`;
      const next = document.querySelector('.c57-question-next button');
      if (next) {
        next.classList.add('v63-green');
        if (state.item < (state.exam?.length || 1) - 1) next.textContent = t('التالي', 'Next');
      }
      return;
    }

    const flow = vocabFlow(state, q);
    const key = `${flow.key}:${flow.step}:${flow.status}:${flow.flag}:${flow.drawn.join('-')}`;
    if (question.dataset.v63RenderKey === key) return;
    question.dataset.v63RenderKey = key;
    question.innerHTML = vocabMarkup(q, flow);
  }

  async function handleVocab(button) {
    const state = window.LiplipCourse57;
    const q = state?.exam?.[state.item];
    if (!state || !q || q.type !== 'draw') return;
    const flow = vocabFlow(state, q);
    const root = button.closest('.c57-draw-question');
    const canvases = [...root.querySelectorAll('[data-v63-vocab-canvas]')];
    if (canvases.length !== 2 || !flow.drawn[flow.step]) return;

    flow.flag = '';
    if (flow.step === 0) {
      flow.step = 1;
      mountVocabularyDraw();
      return;
    }

    flow.status = 'loading';
    mountVocabularyDraw();
    try {
      const first = await grade(q.word.en, 'word', canvases[0].toDataURL('image/webp', 0.78));
      const second = await grade(q.word.ar, 'word', canvases[1].toDataURL('image/webp', 0.78));
      const correct = [first, second].every(item => item.correct && Number(item.confidence || 0) >= 0.55);
      if (correct) {
        flow.status = 'correct';
        state.results[state.item] = true;
        state.revealed = true;
        state.drawn = true;
        window.render?.(false);
      } else {
        canvases.forEach(clearCanvas);
        flow.step = 0;
        flow.drawn = [false, false];
        flow.status = 'idle';
        flow.flag = t('⚑ الرسمان غير مطابقين. عد إلى الرسم الأول وحاول مرة أخرى.', '⚑ The drawings did not match. Return to the first drawing and try again.');
        state.drawn = false;
        mountVocabularyDraw();
      }
    } catch (error) {
      flow.status = 'idle';
      flow.flag = t('تعذر على Gemini التحقق الآن. اضغط تم للمحاولة مرة أخرى.', 'Gemini could not judge right now. Tap Done to retry.');
      mountVocabularyDraw();
      console.error('[liplip] vocabulary drawing judgment', error);
    }
  }

  function mountAll() {
    const lit = document.querySelector('.lit36');
    if (lit) updateLiteracy(lit);
    mountVocabularyDraw();
  }

  document.addEventListener('click', event => {
    const literacyButton = event.target.closest?.('[data-v63-literacy-draw]');
    if (literacyButton) {
      event.preventDefault();
      handleLiteracy(literacyButton);
      return;
    }
    const vocabButton = event.target.closest?.('[data-v63-vocab-draw]');
    if (vocabButton) {
      event.preventDefault();
      handleVocab(vocabButton);
    }
  }, true);

  document.addEventListener('pointermove', event => {
    const canvas = event.target.closest?.('[data-v63-vocab-canvas]');
    if (!canvas) return;
    const state = window.LiplipCourse57;
    const q = state?.exam?.[state.item];
    if (!state || !q) return;
    const flow = vocabFlow(state, q);
    flow.drawn[Number(canvas.dataset.v63VocabCanvas) || 0] = true;
  }, true);

  document.addEventListener('pointerup', () => requestAnimationFrame(mountAll), true);

  // Replace the late literacy Web Speech wrapper with the exact face target.
  // In particular A's Arabic face is spoken as "ألف" only, never "أ ألف".
  const synth = window.speechSynthesis;
  if (synth && typeof synth.speak === 'function' && !synth.__liplipV63ExactFaceVoice) {
    const previous = synth.speak.bind(synth);
    synth.speak = utterance => {
      const state = window.LiplipLiteracy;
      const service = window.LiplipGeminiSpeech;
      if (state?.stage === 'learn' && ['letters', 'numbers'].includes(state.mode) && service?.speak) {
        const index = Math.max(0, Number(state.index) || 0);
        if (state.mode === 'letters') {
          const letter = LETTERS[Math.min(index, LETTERS.length - 1)] || 'A';
          const arabic = state.face === false;
          service.speak(arabic ? (AR_LETTER_NAMES[letter] || letter) : letter, {
            language: arabic ? 'ar-IQ' : 'en-US',
            kind: arabic ? 'word' : 'letter',
            volume: utterance?.volume ?? 1
          }).catch(() => {});
          return;
        }
      }
      return previous(utterance);
    };
    try { Object.defineProperty(synth, '__liplipV63ExactFaceVoice', { value: true }); } catch {}
  }

  const observer = new MutationObserver(() => requestAnimationFrame(mountAll));
  const start = () => {
    if (!document.body) return;
    observer.observe(document.body, { childList: true, subtree: true });
    mountAll();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
