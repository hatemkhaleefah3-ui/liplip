/* v68: forgiving on-device handwriting judging with Tesseract.js. */
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  let workerPromise = null;
  let lastProgress = 0;

  function normalize(value, target) {
    const text = String(value || '').trim().replace(/\s+/g, ' ');
    const expected = String(target || '').trim();
    if (/^[A-Za-z]$/.test(expected)) return text.replace(/[^A-Za-z]/g, '').slice(0, 1).toLowerCase();
    if (/^\d{1,2}$/.test(expected)) return text.replace(/[^0-9]/g, '');
    if (/^[A-Za-z][A-Za-z -]*$/.test(expected)) return text.toLowerCase().replace(/[^a-z]/g, '');
    return text.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
  }

  function expectedNormalized(target) {
    const value = String(target || '').trim();
    if (/^[A-Za-z]$/.test(value)) return value.toLowerCase();
    if (/^\d{1,2}$/.test(value)) return value;
    if (/^[A-Za-z][A-Za-z -]*$/.test(value)) return value.toLowerCase().replace(/[^a-z]/g, '');
    return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
  }

  function editDistance(a, b) {
    a = String(a || ''); b = String(b || '');
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = old;
      }
    }
    return row[b.length];
  }

  function equivalentSingle(recognized, expected) {
    if (recognized === expected) return true;
    const groups = ['o0q','i1lj','s5','b8','z2','g9','a4'];
    return groups.some(group => group.includes(recognized) && group.includes(expected));
  }

  async function getWorker() {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      if (!window.Tesseract?.createWorker) throw new Error('tesseract_unavailable');
      return window.Tesseract.createWorker(['eng', 'ara'], 1, {
        logger: message => {
          if (message?.status === 'recognizing text') lastProgress = Number(message.progress || 0);
        }
      });
    })().catch(error => {
      workerPromise = null;
      throw error;
    });
    return workerPromise;
  }

  async function configure(worker, target, kind) {
    const value = String(target || '').trim();
    const params = { preserve_interword_spaces: '0', user_defined_dpi: '180' };
    if (kind === 'letter' || /^[A-Za-z]$/.test(value)) {
      params.tessedit_pageseg_mode = '10';
      params.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    } else if (kind === 'number' && /^\d{1,2}$/.test(value)) {
      params.tessedit_pageseg_mode = '10';
      params.tessedit_char_whitelist = '0123456789';
    } else if (/^[A-Za-z][A-Za-z -]*$/.test(value)) {
      params.tessedit_pageseg_mode = '8';
      params.tessedit_char_whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    } else {
      params.tessedit_pageseg_mode = '8';
      params.tessedit_char_whitelist = '';
    }
    await worker.setParameters(params);
  }

  async function judge(item) {
    const worker = await getWorker();
    const target = String(item?.target || '').trim();
    const kind = String(item?.kind || 'word');
    const image = item?.image;
    if (!target || !image) return { correct: false, confidence: 0, text: '' };

    await configure(worker, target, kind);
    lastProgress = 0;
    const result = await worker.recognize(image);
    const raw = String(result?.data?.text || '').trim();
    const confidence = Math.max(0, Math.min(1, Number(result?.data?.confidence || 0) / 100));
    const recognized = normalize(raw, target);
    const expected = expectedNormalized(target);

    let correct = false;
    if (expected.length === 1) {
      correct = equivalentSingle(recognized, expected) && confidence >= 0.08;
    } else {
      const distance = editDistance(recognized, expected);
      const allowedErrors = expected.length <= 3 ? 1 : Math.max(1, Math.floor(expected.length * 0.34));
      const closeEnough = distance <= allowedErrors;
      const startsWell = expected.length >= 5 && recognized.length >= 3 && expected.startsWith(recognized.slice(0, 3));
      correct = (closeEnough || startsWell) && confidence >= 0.12;
    }

    return { correct, confidence, text: raw, normalized: recognized, expected };
  }

  async function gradePair(items) {
    if (!Array.isArray(items) || items.length !== 2) throw new Error('invalid_local_drawing_pair');
    const results = [];
    for (const item of items) results.push(await judge(item));
    const correct = results.every(result => result.correct);
    const rawConfidence = Math.min(...results.map(result => result.confidence));
    return {
      correct,
      confidence: correct ? Math.max(0.9, rawConfidence) : rawConfidence,
      results,
      source: 'tesseract-local-forgiving'
    };
  }

  function warmup() {
    return getWorker().then(() => true).catch(error => {
      console.warn('[liplip] local drawing judge warmup failed', error);
      return false;
    });
  }

  function localJson(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!/\/?api\/gemini\/drawing(?:\?|$)/.test(url)) return originalFetch(input, init);

    try {
      const body = init?.body;
      if (typeof body !== 'string') return localJson({ error: 'invalid_local_drawing_input' }, 400);
      const payload = JSON.parse(body);
      const items = Array.isArray(payload?.items)
        ? payload.items
        : payload?.target && payload?.image
          ? [{ target: payload.target, kind: payload.kind, image: payload.image }]
          : [];
      if (!items.length) return localJson({ error: 'invalid_local_drawing_input' }, 400);
      if (items.length === 1) {
        const result = await judge(items[0]);
        if (result.correct) result.confidence = Math.max(0.9, result.confidence);
        return localJson({ ...result, source: 'tesseract-local-forgiving' });
      }
      return localJson(await gradePair(items));
    } catch (error) {
      console.error('[liplip] local drawing judge failed', error);
      return localJson({ error: String(error?.message || 'local_drawing_judge_failed') }, 503);
    }
  };

  window.LiplipLocalDrawingJudge = { warmup, judge, gradePair, progress: () => lastProgress, source: 'tesseract-local-forgiving' };

  const scheduleWarmup = () => {
    const run = () => warmup();
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleWarmup, { once: true });
  else scheduleWarmup();
})();
