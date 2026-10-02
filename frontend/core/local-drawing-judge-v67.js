/* v69: very forgiving on-device handwriting judging for practice. Tesseract helps, but substantial ink is enough for beginner work. */
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
    const groups = ['o0q','i1lj','s5','b8','z2','g9','a4','cge','uvy','mn'];
    return groups.some(group => group.includes(recognized) && group.includes(expected));
  }

  function analyzeInk(src) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 180; canvas.height = 110;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
          let dark=0,minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
          for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
            const p=(y*canvas.width+x)*4;
            const lum=(data[p]*0.2126)+(data[p+1]*0.7152)+(data[p+2]*0.0722);
            if(data[p+3] > 25 && lum < 210){ dark++; if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y; }
          }
          const coverage=dark/(canvas.width*canvas.height);
          const width=maxX>=minX?(maxX-minX+1)/canvas.width:0;
          const height=maxY>=minY?(maxY-minY+1)/canvas.height:0;
          resolve({ coverage, width, height, substantial: coverage>=0.0015 && width>=0.035 && height>=0.08 });
        } catch { resolve({ coverage:0,width:0,height:0,substantial:false }); }
      };
      image.onerror = () => resolve({ coverage:0,width:0,height:0,substantial:false });
      image.src = src;
    });
  }

  async function getWorker() {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      if (!window.Tesseract?.createWorker) throw new Error('tesseract_unavailable');
      return window.Tesseract.createWorker(['eng', 'ara'], 1, {
        logger: message => { if (message?.status === 'recognizing text') lastProgress = Number(message.progress || 0); }
      });
    })().catch(error => { workerPromise = null; throw error; });
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
    const target = String(item?.target || '').trim();
    const kind = String(item?.kind || 'word');
    const image = item?.image;
    if (!target || !image) return { correct:false, confidence:0, text:'', reason:'missing' };

    const ink = await analyzeInk(image);
    if (!ink.substantial) return { correct:false, confidence:0, text:'', reason:'too_little_ink', ink };

    let raw='', confidence=0, recognized='';
    try {
      const worker = await getWorker();
      await configure(worker, target, kind);
      lastProgress = 0;
      const result = await worker.recognize(image);
      raw = String(result?.data?.text || '').trim();
      confidence = Math.max(0, Math.min(1, Number(result?.data?.confidence || 0) / 100));
      recognized = normalize(raw, target);
    } catch (error) {
      console.warn('[liplip] OCR unavailable; using practice ink heuristic', error);
    }

    const expected = expectedNormalized(target);
    let ocrMatch = false;
    if (expected.length === 1) {
      ocrMatch = equivalentSingle(recognized, expected);
    } else if (recognized) {
      const distance = editDistance(recognized, expected);
      const allowedErrors = Math.max(1, Math.ceil(expected.length * 0.5));
      ocrMatch = distance <= allowedErrors || expected.includes(recognized) || recognized.includes(expected.slice(0, Math.max(1, Math.floor(expected.length * 0.5))));
    }

    // Practice mode is intentionally generous. If the learner made a real-sized drawing,
    // accept it even when handwriting OCR cannot confidently read beginner strokes.
    const singleTarget = /^[A-Za-z]$/.test(target) || /^\d{1,2}$/.test(target);
    const wordLike = !singleTarget;
    const shapeEnough = singleTarget
      ? ink.coverage >= 0.0015 && ink.width >= 0.035 && ink.height >= 0.08
      : ink.coverage >= 0.002 && ink.width >= 0.12 && ink.height >= 0.07;
    const correct = ocrMatch || shapeEnough;

    return {
      correct,
      confidence: correct ? Math.max(0.92, confidence) : confidence,
      text: raw,
      normalized: recognized,
      expected,
      ink,
      reason: ocrMatch ? 'ocr_match' : shapeEnough ? 'practice_ink' : 'mismatch'
    };
  }

  async function gradePair(items) {
    if (!Array.isArray(items) || items.length !== 2) throw new Error('invalid_local_drawing_pair');
    const results = [];
    for (const item of items) results.push(await judge(item));
    const correct = results.every(result => result.correct);
    const rawConfidence = Math.min(...results.map(result => result.confidence));
    return { correct, confidence: correct ? Math.max(0.92, rawConfidence) : rawConfidence, results, source:'local-practice-judge' };
  }

  function warmup() {
    return getWorker().then(() => true).catch(error => { console.warn('[liplip] local drawing judge warmup failed', error); return false; });
  }

  function localJson(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers:{ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!/\/?api\/gemini\/drawing(?:\?|$)/.test(url)) return originalFetch(input, init);
    try {
      const body = init?.body;
      if (typeof body !== 'string') return localJson({ error:'invalid_local_drawing_input' },400);
      const payload = JSON.parse(body);
      const items = Array.isArray(payload?.items) ? payload.items : payload?.target && payload?.image ? [{target:payload.target,kind:payload.kind,image:payload.image}] : [];
      if (!items.length) return localJson({ error:'invalid_local_drawing_input' },400);
      if (items.length === 1) return localJson({ ...(await judge(items[0])), source:'local-practice-judge' });
      return localJson(await gradePair(items));
    } catch (error) {
      console.error('[liplip] local drawing judge failed', error);
      return localJson({ error:String(error?.message || 'local_drawing_judge_failed') },503);
    }
  };

  window.LiplipLocalDrawingJudge = { warmup, judge, gradePair, progress:()=>lastProgress, source:'local-practice-judge' };

  const scheduleWarmup = () => {
    const run = () => warmup();
    if ('requestIdleCallback' in window) window.requestIdleCallback(run,{timeout:1500});
    else setTimeout(run,500);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleWarmup,{once:true});
  else scheduleWarmup();
})();
