/* v67: on-device handwriting judging with Tesseract.js; intercepts drawing grading locally. */
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  let workerPromise = null;
  let lastProgress = 0;

  function normalize(value, target) {
    const text = String(value || '').trim().replace(/\s+/g, ' ');
    const expected = String(target || '').trim();
    if (/^[A-Za-z]$/.test(expected)) return text.replace(/[^A-Za-z]/g, '').slice(0, 1);
    if (/^\d{1,2}$/.test(expected)) return text.replace(/[^0-9]/g, '');
    if (/^[A-Za-z][A-Za-z -]*$/.test(expected)) return text.toLowerCase().replace(/[^a-z]/g, '');
    return text.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
  }

  function expectedNormalized(target) {
    const value = String(target || '').trim();
    if (/^[A-Za-z]$/.test(value)) return value;
    if (/^\d{1,2}$/.test(value)) return value;
    if (/^[A-Za-z][A-Za-z -]*$/.test(value)) return value.toLowerCase().replace(/[^a-z]/g, '');
    return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
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
    const threshold = expected.length <= 2 ? 0.30 : expected.length <= 4 ? 0.40 : 0.45;
    return { correct: recognized === expected && confidence >= threshold, confidence, text: raw, normalized: recognized };
  }

  async function gradePair(items) {
    if (!Array.isArray(items) || items.length !== 2) throw new Error('invalid_local_drawing_pair');
    const results = [];
    for (const item of items) results.push(await judge(item));
    return {
      correct: results.every(result => result.correct),
      confidence: Math.min(...results.map(result => result.confidence)),
      results,
      source: 'tesseract-local'
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
      let body = init?.body;
      if (typeof body !== 'string') return localJson({ error: 'invalid_local_drawing_input' }, 400);
      const payload = JSON.parse(body);
      const items = Array.isArray(payload?.items)
        ? payload.items
        : payload?.target && payload?.image
          ? [{ target: payload.target, kind: payload.kind, image: payload.image }]
          : [];
      if (!items.length) return localJson({ error: 'invalid_local_drawing_input' }, 400);
      const result = items.length === 1 ? await judge(items[0]) : await gradePair(items);
      return localJson(result);
    } catch (error) {
      console.error('[liplip] local drawing judge failed', error);
      return localJson({ error: String(error?.message || 'local_drawing_judge_failed') }, 503);
    }
  };

  window.LiplipLocalDrawingJudge = { warmup, judge, gradePair, progress: () => lastProgress, source: 'tesseract-local' };

  const scheduleWarmup = () => {
    const run = () => warmup();
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleWarmup, { once: true });
  else scheduleWarmup();
})();
