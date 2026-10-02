/* v74: three-phase letters/numbers learning — flashcards, local draw recognition, voice recognition. */
(() => {
  'use strict';
  const L = window.LiplipLiteracy;
  if (!L || typeof window.appView !== 'function') return;

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const NUMBERS = Array.from({length:35},(_,i)=>String(i));
  const AR_LETTER = {
    A:'إيه',B:'بي',C:'سي',D:'دي',E:'إي',F:'إف',G:'جي',H:'إيتش',I:'آي',J:'جاي',K:'كاي',L:'إل',M:'إم',N:'إن',O:'أو',P:'بي',Q:'كيو',R:'آر',S:'إس',T:'تي',U:'يو',V:'في',W:'دبليو',X:'إكس',Y:'واي',Z:'زي'
  };
  const EN_NUMBER = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const AR_NUMBER = ['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر','عشرون','واحد وعشرون','اثنان وعشرون','ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون','ثمانية وعشرون','تسعة وعشرون','ثلاثون','واحد وثلاثون','اثنان وثلاثون','ثلاثة وثلاثون','أربعة وثلاثون'];
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=()=>sessionStorage.getItem('liplip-admin-v47')==='1';
  const symbols=()=>L.mode==='letters'?LETTERS:NUMBERS;
  const current=()=>symbols()[Math.max(0,Math.min(symbols().length-1,Number(L.index)||0))];
  const arabicBack=()=>L.mode==='letters'?(AR_LETTER[current()]||current()):(AR_NUMBER[Number(current())]||current());
  const spokenEnglish=()=>L.mode==='letters'?current():(EN_NUMBER[Number(current())]||current());

  function soundIcon(size=24){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10v4h3l4 3V7L8 10H5Z"/><path d="M15 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>`}
  function micIcon(size=24){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`}
  function backIcon(size=20){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6 6-6-6 6-6"/></svg>`}
  function checkIcon(size=24){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>`}

  const style=document.createElement('style');
  style.textContent=`
    .lit74{max-width:920px;margin:0 auto;padding:18px 14px 34px;color:#271d2e}
    .lit74-top{display:flex;align-items:center;gap:14px;margin-bottom:18px}.lit74-top>button{border:0;background:#fff;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:7px;font:inherit;font-weight:850;box-shadow:0 5px 18px rgba(50,35,62,.08);cursor:pointer}.lit74-top div{flex:1}.lit74-top small{color:#806e89;font-weight:800}.lit74-top h1{margin:2px 0 0;font-size:clamp(25px,5vw,38px)}
    .lit74-phases{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:0 0 18px}.lit74-phase{padding:11px 9px;border-radius:16px;background:#eee7f2;color:#7f6f88;text-align:center;font-weight:900;font-size:13px}.lit74-phase.active{background:#51366d;color:#fff}.lit74-phase.done{background:#e1f4e8;color:#177242}
    .lit74-progress{display:flex;align-items:center;gap:10px;margin-bottom:14px}.lit74-progress span{font-weight:900;min-width:58px}.lit74-progress i{height:8px;flex:1;border-radius:99px;background:#e9e1ed;overflow:hidden}.lit74-progress b{display:block;height:100%;background:#6f4b87;border-radius:inherit}
    .lit74-card,.lit74-panel{border:0;border-radius:30px;background:linear-gradient(145deg,#fffdf8,#f5eefb);box-shadow:0 20px 55px rgba(55,36,70,.13);min-height:510px;padding:26px}
    .lit74-flash{display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden}.lit74-flash .side{display:flex;flex-direction:column;align-items:center;gap:16px}.lit74-flash .side[hidden]{display:none}.lit74-flash small{font-weight:900;letter-spacing:.1em;color:#85738e}.lit74-flash strong{font-size:clamp(120px,31vw,260px);line-height:.82;direction:ltr}.lit74-flash .arabic{font-size:clamp(70px,18vw,150px);direction:rtl}.lit74-audio{width:54px;height:54px;border:1px solid #d8cade;background:#fff;border-radius:50%;display:grid;place-items:center;color:#51366d;cursor:pointer}.lit74-hint{margin:0;color:#75627f;font-weight:800}
    .lit74-actions{display:grid;grid-template-columns:minmax(110px,.38fr) 1fr;gap:12px;margin-top:14px}.lit74-actions button,.lit74-primary{min-height:56px;border-radius:17px;border:1px solid #d5c7dc;background:#fff;color:#51366d;font:inherit;font-weight:900;cursor:pointer}.lit74-actions .primary,.lit74-primary{background:#51366d;color:#fff;border-color:#51366d}.lit74-primary:disabled{opacity:.42;cursor:not-allowed}.lit74-primary.correct{background:#18834b;border-color:#18834b}
    .lit74-draw-head,.lit74-speak-head{text-align:center}.lit74-draw-head small,.lit74-speak-head small{font-weight:900;color:#85738e;letter-spacing:.08em}.lit74-draw-head h2,.lit74-speak-head h2{margin:5px 0;font-size:clamp(31px,7vw,52px)}
    .lit74-canvas-wrap{position:relative;height:390px;margin-top:14px;border:2px dashed #bba8c8;border-radius:25px;background:#fff;overflow:hidden}.lit74-guide{position:absolute;inset:12px;display:grid;place-items:center;pointer-events:none;font-size:clamp(180px,38vw,300px);font-weight:900;line-height:.8;color:rgba(81,54,109,.025);-webkit-text-stroke:4px rgba(81,54,109,.18);direction:ltr}.lit74-canvas{position:relative;width:100%;height:100%;display:block;touch-action:none}.lit74-status{margin-top:12px;padding:12px 14px;border-radius:15px;font-weight:850}.lit74-status.good{background:#e4f7eb;color:#176c40}.lit74-status.bad{background:#fff0ed;color:#8c2c23}.lit74-status.info{background:#fff7d9;color:#6c5708}
    .lit74-speak{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}.lit74-speak-symbol{font-size:clamp(130px,31vw,250px);line-height:.85;font-weight:900;direction:ltr}.lit74-speak-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.lit74-speak-actions button{min-height:56px;border-radius:18px;border:1px solid #d5c7dc;background:#fff;color:#51366d;font:inherit;font-weight:900;padding:0 20px;display:flex;align-items:center;gap:9px;cursor:pointer}.lit74-speak-actions .mic{background:#51366d;color:#fff;border-color:#51366d}.lit74-speak-actions .mic.listening{background:#8b5c9d}.lit74-finish{text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}.lit74-finish .badge{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:#e1f4e8;color:#177242}.lit74-finish h2{font-size:38px;margin:0}.lit74-finish p{color:#75627f;font-weight:750}
    @media(max-width:600px){.lit74{padding:10px 8px 24px}.lit74-card,.lit74-panel{min-height:450px;padding:18px;border-radius:24px}.lit74-phases{gap:5px}.lit74-phase{font-size:11px;padding:9px 4px}.lit74-canvas-wrap{height:340px}.lit74-guide{font-size:clamp(165px,57vw,245px)}.lit74-actions{grid-template-columns:105px 1fr}}
  `;
  document.head.appendChild(style);

  function ensureState(){
    if(!L._v74 || L._v74.mode!==L.mode){L._v74={mode:L.mode,phase:'flashcards',flipped:false,status:'idle',message:'',heard:'',listening:false};L.index=0;}
    if(L.stage==='learn' && L._v74.phase!=='flashcards' && L.index===0 && !L._v74.entered){L._v74.phase='flashcards';}
    L._v74.entered=true;
    return L._v74;
  }
  function phaseNo(p){return p==='flashcards'?0:p==='draw'?1:p==='pronounce'?2:3}
  function phaseBar(f){const n=phaseNo(f.phase),labels=[t('بطاقات','Flashcards'),t('الرسم','Draw'),t('النطق','Pronounce')];return `<div class="lit74-phases">${labels.map((x,i)=>`<div class="lit74-phase ${i<n?'done':i===n?'active':''}">${i<n?'✓ ':''}${i+1}. ${x}</div>`).join('')}</div>`}
  function progress(){const a=symbols();return `<div class="lit74-progress"><span>${L.index+1} / ${a.length}</span><i><b style="width:${((L.index+1)/a.length)*100}%"></b></i></div>`}
  function shell(body,f){return `<main class="lit74"><header class="lit74-top"><button data-v74="exit">${backIcon()} ${t('الرئيسية','Home')}</button><div><small>${L.mode==='letters'?'A–Z':'0–34'}</small><h1>${L.mode==='letters'?t('تعلّم الحروف','Learn letters'):t('تعلّم الأرقام','Learn numbers')}</h1></div></header>${phaseBar(f)}${f.phase!=='complete'?progress():''}${body}</main>`}

  function flashcards(f){const x=current(),back=arabicBack();return shell(`<section class="lit74-card lit74-flash" data-v74="flip" role="button" tabindex="0"><div class="side" ${f.flipped?'hidden':''}><small>${t('الوجه الإنجليزي','ENGLISH FACE')}</small><strong>${esc(x)}</strong><button class="lit74-audio" data-v74="hear" data-lang="en-US" aria-label="${t('استمع','Hear')}">${soundIcon()}</button><p class="lit74-hint">${t('اضغط البطاقة لرؤية العربية','Tap the card to see Arabic')}</p></div><div class="side" ${f.flipped?'':'hidden'}><small>${t('الوجه العربي','ARABIC FACE')}</small><strong class="arabic">${esc(back)}</strong><button class="lit74-audio" data-v74="hear-ar" data-lang="ar-IQ" aria-label="${t('استمع','Hear')}">${soundIcon()}</button><p class="lit74-hint">${t('اضغط البطاقة للعودة','Tap the card to flip back')}</p></div></section><div class="lit74-actions"><button data-v74="prev" ${L.index===0?'disabled':''}>${t('السابق','Previous')}</button><button class="primary" data-v74="flash-next">${L.index===symbols().length-1?t('ابدأ الرسم','Start drawing'):t('التالي','Next')}</button></div>`,f)}

  function draw(f){const x=current(),busy=f.status==='checking',correct=f.status==='correct';return shell(`<section class="lit74-panel"><div class="lit74-draw-head"><small>${t('ارسم داخل الشكل','DRAW INSIDE THE SHAPE')}</small><h2>${L.mode==='letters'?t('ارسم الحرف','Draw the letter'):t('ارسم الرقم','Draw the number')} <span dir="ltr">${esc(x)}</span></h2></div><div class="lit74-canvas-wrap"><span class="lit74-guide">${esc(x)}</span><canvas class="lit74-canvas" data-v74-canvas width="1000" height="680"></canvas></div>${f.message?`<div class="lit74-status ${correct?'good':f.status==='wrong'?'bad':'info'}">${esc(f.message)}</div>`:''}<div class="lit74-actions"><button data-v74="clear">${t('مسح','Clear')}</button><button class="primary lit74-primary ${correct?'correct':''}" data-v74="draw-action" ${busy?'disabled':''}>${busy?t('جارٍ التحقق…','Checking…'):correct?(L.index===symbols().length-1?t('ابدأ النطق','Start pronunciation'):t('التالي','Next')):isAdmin()?t('تحقق / تخطَّ','Check / Skip'):t('تحقق','Check')}</button></div></section>`,f)}

  function pronounce(f){const x=current(),correct=f.status==='correct';return shell(`<section class="lit74-panel lit74-speak"><div class="lit74-speak-head"><small>${t('استمع ثم انطق','LISTEN AND PRONOUNCE')}</small><h2>${L.mode==='letters'?t('انطق اسم الحرف','Say the letter name'):t('انطق الرقم','Say the number')}</h2></div><strong class="lit74-speak-symbol">${esc(x)}</strong><div class="lit74-speak-actions"><button data-v74="hear">${soundIcon()} ${t('استمع','Hear')}</button><button class="mic ${f.listening?'listening':''}" data-v74="mic">${micIcon()} ${f.listening?t('أستمع الآن…','Listening…'):t('انطق الآن','Speak now')}</button></div>${f.message?`<div class="lit74-status ${correct?'good':f.status==='wrong'?'bad':'info'}">${esc(f.message)}</div>`:''}<button class="lit74-primary ${correct?'correct':''}" data-v74="pronounce-next" ${!correct&&!isAdmin()?'disabled':''}>${L.index===symbols().length-1?t('إنهاء','Finish'):t('التالي','Next')}</button></section>`,f)}

  function finish(f){return shell(`<section class="lit74-panel lit74-finish"><span class="badge">${checkIcon(42)}</span><h2>${t('أحسنت!','Well done!')}</h2><p>${t('أنهيت البطاقات والرسم والنطق.','You completed flashcards, drawing, and pronunciation.')}</p><div class="lit74-speak-actions"><button data-v74="restart">${t('إعادة التدريب','Practice again')}</button><button class="mic" data-v74="exit">${t('العودة للرئيسية','Back home')}</button></div></section>`,f)}

  function page(){const f=ensureState();if(f.phase==='flashcards')return flashcards(f);if(f.phase==='draw')return draw(f);if(f.phase==='pronounce')return pronounce(f);return finish(f)}
  const oldAppView=window.appView;
  window.appView=function(){if(window.state?.page==='literacy-v36' && ['letters','numbers'].includes(L.mode))return page();return oldAppView()};

  function rerender(){window.render?.(false)}
  function resetFeedback(f){f.status='idle';f.message='';f.heard='';f.listening=false}
  function nextSymbol(f,nextPhase){if(L.index<symbols().length-1){L.index++;f.flipped=false;resetFeedback(f)}else{L.index=0;f.phase=nextPhase;f.flipped=false;resetFeedback(f)}rerender()}
  function speak(text,lang='en-US',kind='word'){const svc=window.LiplipGeminiSpeech;if(svc?.speak){svc.speak(text,{language:lang,kind,volume:1}).catch(()=>{});return}try{const u=new SpeechSynthesisUtterance(text);u.lang=lang;window.speechSynthesis?.speak(u)}catch{}}

  function canvasImage(c){const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(c,0,0);return out.toDataURL('image/webp',.72)}
  async function checkDraw(){const f=ensureState(),c=document.querySelector('[data-v74-canvas]');if(!c)return;if(isAdmin()&&!f._drawn){nextSymbol(f,'pronounce');return}if(!f._drawn){f.status='wrong';f.message=t('ارسم داخل الحقل أولاً.','Draw in the field first.');rerender();return}f.status='checking';f.message=t('جارٍ فحص الرسم…','Checking your drawing…');rerender();try{const judge=window.LiplipLocalDrawingJudge;if(!judge?.judge)throw new Error('local_draw_judge_unavailable');const result=await judge.judge({target:current(),kind:L.mode==='letters'?'letter':'number',image:canvasImage(c)});if(result.correct){f.status='correct';f.message=t('صحيح! الرسم مقبول.','Correct! The drawing is accepted.')}else{f.status='wrong';f.message=t('ليس تماماً. امسح وحاول مرة أخرى.','Not quite. Clear it and try again.')} }catch(e){f.status='wrong';f.message=t('تعذر فحص الرسم الآن. حاول مرة أخرى.','Could not check the drawing. Try again.');console.error('[liplip] v74 draw recognition',e)}rerender()}

  function startRecognition(){const f=ensureState(),expected=current();f.listening=true;f.status='listening';f.message=t('أستمع الآن…','Listening…');rerender();const service=window.LiplipSpeechRecognition;if(service?.recognize){service.recognize(expected,(ok,heard,error)=>{f.listening=false;f.heard=heard||'';f.status=ok?'correct':'wrong';f.message=error||(ok?t(`صحيح! سمعت: ${heard}`,`Correct! I heard: ${heard}`):t(`سمعت: ${heard||'—'} — حاول مرة أخرى.`,`I heard: ${heard||'—'} — try again.`));rerender()});return}const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){f.listening=false;f.status='wrong';f.message=t('التعرّف الصوتي غير مدعوم في هذا المتصفح.','Speech recognition is not supported in this browser.');rerender();return}const r=new R();r.lang='en-US';r.interimResults=false;r.maxAlternatives=5;r.onresult=e=>{const heard=e.results?.[0]?.[0]?.transcript||'';const ok=String(heard).trim().toLowerCase()===String(expected).trim().toLowerCase();f.listening=false;f.status=ok?'correct':'wrong';f.message=ok?t('نطق صحيح','Correct pronunciation'):t(`سمعت: ${heard} — حاول مرة أخرى.`,`I heard: ${heard} — try again.`);rerender()};r.onerror=()=>{f.listening=false;f.status='wrong';f.message=t('تعذر سماع النطق. حاول مرة أخرى.','Could not hear you. Try again.');rerender()};try{r.start()}catch{f.listening=false;rerender()}}

  let drawing=null;
  document.addEventListener('pointerdown',e=>{const c=e.target.closest?.('[data-v74-canvas]');if(!c)return;e.preventDefault();const f=ensureState(),ctx=c.getContext('2d'),r=c.getBoundingClientRect(),pt=x=>({x:(x.clientX-r.left)*c.width/r.width,y:(x.clientY-r.top)*c.height/r.height}),p=pt(e);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#251b2c';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(p.x,p.y);drawing={c,ctx,r,id:e.pointerId,last:p};f._drawn=true;c.setPointerCapture?.(e.pointerId)},true);
  document.addEventListener('pointermove',e=>{if(!drawing||drawing.id!==e.pointerId)return;e.preventDefault();const p={x:(e.clientX-drawing.r.left)*drawing.c.width/drawing.r.width,y:(e.clientY-drawing.r.top)*drawing.c.height/drawing.r.height};drawing.ctx.lineTo(p.x,p.y);drawing.ctx.stroke();drawing.last=p},true);
  document.addEventListener('pointerup',e=>{if(drawing?.id===e.pointerId)drawing=null},true);
  document.addEventListener('pointercancel',()=>{drawing=null},true);

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('[data-v74]');if(!el)return;const action=el.dataset.v74,f=ensureState();e.preventDefault();e.stopImmediatePropagation();
    if(action==='exit'){L._v74=null;L.mode=null;window.state.page='app';window.state.nav='الرئيسية';rerender();return}
    if(action==='restart'){L.index=0;L.stage='learn';L._v74={mode:L.mode,phase:'flashcards',flipped:false,status:'idle',message:'',heard:'',listening:false,entered:true};rerender();return}
    if(action==='flip'){if(e.target.closest('button'))return;f.flipped=!f.flipped;rerender();return}
    if(action==='hear'){speak(spokenEnglish(),'en-US',L.mode==='letters'?'letter':'number');return}
    if(action==='hear-ar'){speak(arabicBack(),'ar-IQ','word');return}
    if(action==='prev'){if(L.index>0){L.index--;f.flipped=false;resetFeedback(f);rerender()}return}
    if(action==='flash-next'){nextSymbol(f,'draw');return}
    if(action==='clear'){const c=document.querySelector('[data-v74-canvas]');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);f._drawn=false;resetFeedback(f);rerender();return}
    if(action==='draw-action'){if(f.status==='correct'){nextSymbol(f,'pronounce')}else checkDraw();return}
    if(action==='mic'){startRecognition();return}
    if(action==='pronounce-next'){if(f.status==='correct'||isAdmin()){if(L.index<symbols().length-1){L.index++;resetFeedback(f);rerender()}else{L.index=0;f.phase='complete';resetFeedback(f);rerender()}}return}
  },true);

  document.addEventListener('keydown',e=>{const card=e.target.closest?.('[data-v74="flip"]');if(card&&['Enter',' '].includes(e.key)&&!e.target.closest('button')){e.preventDefault();card.click()}},true);
})();