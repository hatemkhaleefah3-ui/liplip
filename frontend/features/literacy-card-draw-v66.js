/* v66: each letter/number card flips directly into a two-step Gemini drawing challenge. */
(() => {
  'use strict';

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMBER_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const t = (ar,en) => window.LiplipFrontend?.t ? window.LiplipFrontend.t(ar,en) : (localStorage.getItem('liplip-ui-language') === 'en' ? en : ar);
  const esc = value => window.LiplipFrontend?.escapeHTML ? window.LiplipFrontend.escapeHTML(value) : String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  const style = document.createElement('style');
  style.textContent = `
    .lit66-active .lit36-nav{display:none!important}
    .lit66-shell{width:min(760px,100%);margin:0 auto;perspective:1200px}
    .lit66-front,.lit66-back{border:0;border-radius:28px;background:linear-gradient(145deg,#fffdf7,#f5eefb);box-shadow:0 18px 50px rgba(58,38,72,.13);padding:24px;min-height:430px}
    .lit66-front{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;cursor:pointer;color:#261c2e}
    .lit66-front small,.lit66-step-label{font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#7a6785}
    .lit66-symbol{font-size:clamp(96px,23vw,190px);line-height:.9;font-weight:900;direction:ltr}
    .lit66-front p{margin:0;font-weight:800;color:#735f7e}
    .lit66-voice{width:46px;height:46px;border-radius:50%;border:1px solid #d9cbe2;background:#fff;display:grid;place-items:center;font-size:22px;cursor:pointer}
    .lit66-back{display:flex;flex-direction:column;gap:16px}
    .lit66-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.lit66-head h2{margin:4px 0 0;font-size:clamp(24px,5vw,36px)}
    .lit66-step-dots{display:flex;gap:7px}.lit66-step-dots i{width:10px;height:10px;border-radius:50%;background:#d9cbe2}.lit66-step-dots i.on{background:#6f4b87}
    .lit66-canvas-wrap{position:relative;flex:1;min-height:270px;border:2px dashed #baa5c9;border-radius:22px;background:#fff;overflow:hidden}
    .lit66-canvas{display:block;width:100%;height:300px;touch-action:none;background:#fff}
    .lit66-guide{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-size:clamp(70px,16vw,130px);font-weight:900;color:rgba(81,54,109,.08);direction:ltr}
    .lit66-actions{display:grid;grid-template-columns:minmax(120px,.42fr) 1fr;gap:12px}.lit66-actions button{min-height:54px;border-radius:17px;border:1px solid #d6c7df;font:inherit;font-weight:900;cursor:pointer}
    .lit66-clear{background:#fff;color:#5c4966}.lit66-next{background:#51366d;color:#fff;border-color:#51366d!important}.lit66-next:disabled{opacity:.4;cursor:not-allowed}.lit66-next.loading{background:#766a7e}.lit66-next.correct{background:#18834b;border-color:#18834b!important}
    .lit66-flag{padding:12px 14px;border-radius:15px;background:#fff2ef;border:1px solid #efb4ac;color:#922d24;font-weight:850}.lit66-flag.info{background:#fff9df;border-color:#e3cf82;color:#6c5708}
    @media(max-width:560px){.lit66-front,.lit66-back{min-height:390px;padding:18px}.lit66-canvas{height:270px}.lit66-actions{grid-template-columns:110px 1fr}}
  `;
  document.head.appendChild(style);

  function stateFor(L) {
    const key = `${L.mode}:${L.index}`;
    if (!L._lit66 || L._lit66.key !== key) L._lit66 = { key, face:'front', step:0, status:'idle', drawn:[false,false], images:['',''], flag:'', info:false };
    return L._lit66;
  }

  function targets(L) {
    const i = Math.max(0, Number(L.index) || 0);
    if (L.mode === 'letters') {
      const upper = LETTERS[Math.min(i,25)] || 'A';
      return [
        {target:upper, kind:'letter', label:t('ارسم الحرف الكبير','Draw the capital letter'), display:upper},
        {target:upper.toLowerCase(), kind:'letter', label:t('ارسم الحرف الصغير','Draw the small letter'), display:upper.toLowerCase()}
      ];
    }
    const n = Math.min(i,34);
    return [
      {target:String(n), kind:'number', label:t('ارسم الرقم','Draw the number'), display:String(n)},
      {target:NUMBER_WORDS[n], kind:'number', label:t('ارسم اسم الرقم','Draw the number name'), display:NUMBER_WORDS[n]}
    ];
  }

  function compactImage(canvas) {
    const max = 620;
    const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(canvas.width * scale));
    out.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,out.width,out.height); ctx.drawImage(canvas,0,0,out.width,out.height);
    return out.toDataURL('image/webp', .62);
  }

  async function gradePair(items) {
    const response = await fetch('/api/gemini/drawing', {method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({items})});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(String(data.error || `gemini_drawing_${response.status}`));
    if (typeof data.correct !== 'boolean') throw new Error('invalid_drawing_response');
    return data;
  }

  function frontMarkup(L) {
    const x = L.mode === 'letters' ? LETTERS[L.index] : String(L.index);
    const subtitle = L.mode === 'letters' ? t('حرف إنجليزي','English letter') : t('رقم إنجليزي','English number');
    return `<div class="lit66-front" data-lit66-flip role="button" tabindex="0"><small>${subtitle}</small><strong class="lit66-symbol">${esc(x)}</strong><button type="button" class="lit66-voice" data-lit66-speak aria-label="${t('استمع','Hear')}">🔊</button><p>${t('اضغط البطاقة للانتقال إلى الرسم','Tap the card to draw it')}</p></div>`;
  }

  function backMarkup(L, f) {
    const q = targets(L)[f.step];
    const buttonLabel = f.status === 'loading' ? t('↻ جارٍ التحقق…','↻ Checking…') : f.status === 'correct' ? t('التالي','Next') : f.step === 0 ? t('التالي','Next') : t('تم','Done');
    return `<section class="lit66-back"><header class="lit66-head"><div><small class="lit66-step-label">${t('الخطوة','Step')} ${f.step+1} / 2</small><h2>${esc(q.label)}</h2></div><span class="lit66-step-dots"><i class="on"></i><i class="${f.step===1||f.status==='correct'?'on':''}"></i></span></header>${f.flag?`<div class="lit66-flag${f.info?' info':''}" role="status">${esc(f.flag)}</div>`:''}<div class="lit66-canvas-wrap"><span class="lit66-guide">${esc(q.display)}</span><canvas class="lit66-canvas" data-lit66-canvas width="900" height="520"></canvas></div><div class="lit66-actions"><button type="button" class="lit66-clear" data-lit66-clear>${t('مسح الرسم','Clear draw')}</button><button type="button" class="lit66-next${f.status==='loading'?' loading':''}${f.status==='correct'?' correct':''}" data-lit66-next ${(!f.drawn[f.step]&&f.status!=='correct')||f.status==='loading'?'disabled':''}>${buttonLabel}</button></div></section>`;
  }

  function renderCard() {
    const L = window.LiplipLiteracy;
    const root = document.querySelector('.lit36');
    const wrap = root?.querySelector('.lit36-card-wrap');
    if (!L || !root || !wrap || L.stage !== 'learn' || !['letters','numbers'].includes(L.mode)) return;
    root.classList.add('lit66-active');
    const f = stateFor(L);
    const renderKey = `${f.key}:${f.face}:${f.step}:${f.status}:${f.flag}`;
    if (wrap.dataset.lit66Key === renderKey) return;
    wrap.dataset.lit66Key = renderKey;
    wrap.innerHTML = `<div class="lit66-shell">${f.face==='front'?frontMarkup(L):backMarkup(L,f)}</div>`;
    if (f.face === 'back') bindCanvas(wrap.querySelector('[data-lit66-canvas]'), f, f.step);
  }

  function bindCanvas(canvas, f, step) {
    if (!canvas || canvas.dataset.bound) return;
    canvas.dataset.bound='1';
    const ctx = canvas.getContext('2d'); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#251b2c'; ctx.lineWidth=18;
    let down=false,last=null;
    const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    canvas.addEventListener('pointerdown',e=>{down=true;last=point(e);canvas.setPointerCapture?.(e.pointerId);e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{if(!down)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;if(!f.drawn[step]){f.drawn[step]=true;const b=document.querySelector('[data-lit66-next]');if(b)b.disabled=false}e.preventDefault()});
    const end=()=>{down=false;last=null}; canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end);
  }

  function speakCurrent() {
    const L=window.LiplipLiteracy;if(!L)return;
    const value=L.mode==='letters'?LETTERS[L.index]:String(L.index);
    window.LiplipGeminiSpeech?.speak?.(value,{language:'en-US',kind:L.mode==='letters'?'letter':'number',volume:1}).catch(()=>{});
  }

  async function onNext() {
    const L=window.LiplipLiteracy;if(!L)return;const f=stateFor(L),canvas=document.querySelector('[data-lit66-canvas]');
    if (f.status === 'correct') {
      const max=L.mode==='letters'?25:34;
      if (L.index < max) { L.index++; L.face=true; L._lit66=null; window.render?.(false); requestAnimationFrame(()=>{renderCard();speakCurrent()}); }
      else { L.index=0; L.face=true; L.stage='listen-speak'; L._lit66=null; window.render?.(); }
      return;
    }
    if (!canvas || !f.drawn[f.step]) return;
    f.images[f.step]=compactImage(canvas);
    f.flag=''; f.info=false;
    if (f.step===0) { f.step=1; renderCard(); return; }
    f.status='loading'; renderCard();
    try {
      const ts=targets(L); const result=await gradePair(ts.map((q,i)=>({target:q.target,kind:q.kind,image:f.images[i]})));
      if (result.correct && Number(result.confidence||0)>=.55) { f.status='correct'; f.flag=''; }
      else { f.step=0; f.status='idle'; f.drawn=[false,false]; f.images=['','']; f.flag=t('⚑ الرسم غير صحيح. ابدأ مرة أخرى من الرسم الأول.','⚑ The drawing is incorrect. Start again from the first drawing.'); }
    } catch (error) { f.status='idle'; f.flag=t('تعذر التحقق الآن. اضغط تم للمحاولة مرة أخرى.','Could not check right now. Tap Done to retry.'); f.info=true; console.error('[liplip] card drawing check',error); }
    renderCard();
  }

  document.addEventListener('click',e=>{
    const flip=e.target.closest?.('[data-lit66-flip]');if(flip){if(e.target.closest('[data-lit66-speak]'))return;e.preventDefault();e.stopImmediatePropagation();const L=window.LiplipLiteracy;if(!L)return;const f=stateFor(L);f.face='back';f.step=0;f.status='idle';f.drawn=[false,false];f.images=['',''];f.flag='';renderCard();return}
    const voice=e.target.closest?.('[data-lit66-speak]');if(voice){e.preventDefault();e.stopImmediatePropagation();speakCurrent();return}
    const clear=e.target.closest?.('[data-lit66-clear]');if(clear){e.preventDefault();const L=window.LiplipLiteracy;if(!L)return;const f=stateFor(L),c=document.querySelector('[data-lit66-canvas]');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);f.drawn[f.step]=false;f.flag='';const b=document.querySelector('[data-lit66-next]');if(b)b.disabled=true;return}
    const next=e.target.closest?.('[data-lit66-next]');if(next){e.preventDefault();onNext()}
  },true);
  document.addEventListener('keydown',e=>{const card=e.target.closest?.('[data-lit66-flip]');if(card&&['Enter',' '].includes(e.key)&&!e.target.closest('button')){e.preventDefault();card.click()}},true);

  const observer=new MutationObserver(()=>requestAnimationFrame(renderCard));
  const start=()=>{if(!document.body)return;observer.observe(document.body,{childList:true,subtree:true});renderCard()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
