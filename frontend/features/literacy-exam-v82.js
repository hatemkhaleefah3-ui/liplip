/* v82: literacy Study/Exam choice. Exam = 15 random letters/numbers, each drawn then pronounced. */
(() => {
  'use strict';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin=()=>sessionStorage.getItem('liplip-admin-v47')==='1';
  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const NUMBERS=Array.from({length:35},(_,i)=>String(i));
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const LETTER_SPEAK={A:'eigh',B:'bee',C:'see',D:'dee',E:'ee',F:'eff',G:'gee',H:'aitch',I:'eye',J:'jay',K:'kay',L:'el',M:'em',N:'en',O:'oh',P:'pee',Q:'cue',R:'are',S:'ess',T:'tee',U:'you',V:'vee',W:'double you',X:'ex',Y:'why',Z:'zee'};
  const META='liplip-v45-progression';
  const X={mode:null,items:[],index:0,step:'draw',status:'idle',message:'',heard:'',drawn:false,results:[]};
  window.LiplipLiteracyExam82=X;

  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function pool(mode){return mode==='letters'?LETTERS:NUMBERS}
  function current(){return X.items[X.index]||''}
  function spokenTarget(){const x=current();return X.mode==='letters'?x:String(x)}
  function spokenAudio(){const x=current();return X.mode==='letters'?(LETTER_SPEAK[x]||x):(NUMBER_NAMES[Number(x)]||x)}
  function soundIcon(size=24){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 10v4h3l4 3V7L8 10H5Z"/><path d="M15 9a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>`}
  function micIcon(size=24){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`}
  function backIcon(size=20){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6 6-6-6 6-6"/></svg>`}
  function checkIcon(size=32){return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>`}

  const style=document.createElement('style');
  style.textContent=`
    .v82-exam{max-width:920px;margin:0 auto;padding:18px 14px 34px;color:#271d2e}.v82-head{display:flex;align-items:center;gap:14px;margin-bottom:15px}.v82-head>button{border:0;background:#fff;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:7px;font:inherit;font-weight:850;box-shadow:0 5px 18px rgba(50,35,62,.08)}.v82-head div{flex:1}.v82-head small{font-weight:900;color:#806e89;letter-spacing:.08em}.v82-head h1{margin:2px 0;font-size:clamp(25px,5vw,38px)}.v82-head p{margin:2px 0;color:#75627f;font-weight:750}
    .v82-progress{display:flex;align-items:center;gap:10px;margin-bottom:12px}.v82-progress span{font-weight:900;min-width:58px}.v82-progress i{height:8px;flex:1;border-radius:99px;background:#e9e1ed;overflow:hidden}.v82-progress b{display:block;height:100%;background:#6f4b87;border-radius:inherit}.v82-mini{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.v82-mini span{padding:10px;border-radius:14px;text-align:center;background:#eee7f2;color:#7f6f88;font-size:12px;font-weight:900}.v82-mini .active{background:#51366d;color:#fff}.v82-mini .done{background:#e1f4e8;color:#177242}
    .v82-card{border-radius:30px;background:linear-gradient(145deg,#fffdf8,#f5eefb);box-shadow:0 20px 55px rgba(55,36,70,.13);padding:24px;min-height:510px}.v82-title{text-align:center}.v82-title small{font-weight:900;letter-spacing:.08em;color:#85738e}.v82-title h2{margin:5px 0;font-size:clamp(30px,7vw,50px)}.v82-symbol{font-size:clamp(115px,30vw,235px);line-height:.86;font-weight:900;text-align:center;direction:ltr;margin:14px 0}
    .v82-canvas-wrap{position:relative;height:365px;border:2px dashed #bba8c8;border-radius:25px;background:#fff;overflow:hidden}.v82-guide{position:absolute;inset:10px;display:grid;place-items:center;pointer-events:none;font-size:clamp(175px,38vw,285px);font-weight:900;line-height:.8;color:rgba(81,54,109,.02);-webkit-text-stroke:4px rgba(81,54,109,.17);direction:ltr}.v82-canvas{position:relative;width:100%;height:100%;display:block;touch-action:none}.v82-actions{display:grid;grid-template-columns:115px 1fr;gap:12px;margin-top:14px}.v82-actions button,.v82-button{min-height:56px;border-radius:17px;border:1px solid #d5c7dc;background:#fff;color:#51366d;font:inherit;font-weight:900}.v82-actions .primary,.v82-button.primary{background:#51366d;color:#fff;border-color:#51366d}.v82-button:disabled{opacity:.42}.v82-button.good{background:#18834b!important;border-color:#18834b!important;color:#fff!important}.v82-status{margin-top:12px;padding:12px 14px;border-radius:15px;font-weight:850}.v82-status.good{background:#e4f7eb;color:#176c40}.v82-status.bad{background:#fff0ed;color:#8c2c23}.v82-status.info{background:#fff7d9;color:#6c5708}
    .v82-speak{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center}.v82-speak-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}.v82-speak-actions button{min-height:56px;border-radius:18px;border:1px solid #d5c7dc;background:#fff;color:#51366d;font:inherit;font-weight:900;padding:0 20px;display:flex;align-items:center;gap:9px}.v82-speak-actions .mic{background:#51366d;color:#fff;border-color:#51366d}.v82-result{text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}.v82-result .badge{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:#e1f4e8;color:#177242}.v82-result h2{font-size:38px;margin:0}.v82-result strong{font-size:54px;color:#51366d}.v82-result p{max-width:520px;color:#75627f;font-weight:750}
    .v45-sheet .v82-sheet-note{margin-top:8px;padding:10px 12px;border-radius:14px;background:#f4eef8;color:#604d6c;font-weight:750}.v45-choice-grid [data-v45-literacy-choice="exam"] small::after{content:' · 15';font-weight:900}
    @media(max-width:600px){.v82-exam{padding:10px 8px 24px}.v82-card{min-height:450px;padding:18px;border-radius:24px}.v82-canvas-wrap{height:330px}.v82-guide{font-size:clamp(160px,56vw,235px)}}
  `;
  document.head.appendChild(style);

  function start(mode){X.mode=mode;X.items=shuffle(pool(mode)).slice(0,15);X.index=0;X.step='draw';X.status='idle';X.message='';X.heard='';X.drawn=false;X.results=[];document.querySelector('.v45-sheet-layer')?.remove();window.state.page='literacy-exam-v82';window.render?.(false)}
  function exit(){X.mode=null;X.items=[];window.state.page='app';window.state.nav='الرئيسية';window.render?.()}
  function resetCurrent(step='draw'){X.step=step;X.status='idle';X.message='';X.heard='';X.drawn=false}
  function next(){X.results.push({symbol:current(),draw:true,voice:true});if(X.index<X.items.length-1){X.index++;resetCurrent('draw')}else{X.step='complete';X.status='idle';markPassed()}window.render?.(false)}
  function markPassed(){try{const m=JSON.parse(localStorage.getItem(META)||'{}');m.literacy=m.literacy||{};m.literacy[X.mode]=true;localStorage.setItem(META,JSON.stringify(m))}catch{}}
  function progress(){return `<div class="v82-progress"><span>${Math.min(X.index+1,15)} / 15</span><i><b style="width:${((Math.min(X.index+1,15))/15)*100}%"></b></i></div>`}
  function mini(){return `<div class="v82-mini"><span class="${X.step==='draw'?'active':X.step==='pronounce'||X.step==='complete'?'done':''}">1. ${t('ارسم','Draw')}</span><span class="${X.step==='pronounce'?'active':X.step==='complete'?'done':''}">2. ${t('انطق','Pronounce')}</span></div>`}
  function shell(body){return `<main class="v82-exam"><header class="v82-head"><button data-v82="exit">${backIcon()} ${t('الرئيسية','Home')}</button><div><small>${t('اختبار الحروف والأرقام','LITERACY EXAM')}</small><h1>${X.mode==='letters'?t('اختبار الحروف','Letters exam'):t('اختبار الأرقام','Numbers exam')}</h1><p>${t('15 سؤالاً عشوائياً — ارسم ثم انطق كل عنصر','15 random items — draw, then pronounce each one')}</p></div></header>${X.step!=='complete'?progress()+mini():''}${body}</main>`}
  function status(){if(!X.message)return'';return `<div class="v82-status ${X.status==='correct'?'good':X.status==='wrong'?'bad':'info'}">${esc(X.message)}</div>`}
  function drawPage(){const x=current(),busy=X.status==='checking';return shell(`<section class="v82-card"><div class="v82-title"><small>${t('السؤال','QUESTION')} ${X.index+1}</small><h2>${X.mode==='letters'?t('ارسم الحرف','Draw the letter'):t('ارسم الرقم','Draw the number')} <span dir="ltr">${esc(x)}</span></h2></div><div class="v82-canvas-wrap"><span class="v82-guide">${esc(x)}</span><canvas class="v82-canvas" data-v82-canvas width="1000" height="680"></canvas></div>${status()}<div class="v82-actions"><button data-v82="clear">${t('مسح','Clear')}</button><button class="primary v82-button" data-v82="check-draw" ${busy?'disabled':''}>${busy?t('جارٍ التحقق…','Checking…'):t('تحقق من الرسم','Check drawing')}</button></div></section>`)}
  function speakPage(){const x=current();return shell(`<section class="v82-card v82-speak"><div class="v82-title"><small>${t('نجح الرسم','DRAW PASSED')}</small><h2>${X.mode==='letters'?t('انطق اسم الحرف','Say the letter name'):t('انطق الرقم','Say the number')}</h2></div><strong class="v82-symbol">${esc(x)}</strong><div class="v82-speak-actions"><button data-v82="hear">${soundIcon()} ${t('استمع','Hear')}</button><button class="mic" data-v82="mic">${micIcon()} ${t('انطق الآن','Speak now')}</button></div>${status()}${X.status==='correct'?`<button class="v82-button primary good" data-v82="next">${X.index===14?t('عرض النتيجة','Finish exam'):t('السؤال التالي','Next question')}</button>`:''}</section>`)}
  function complete(){return shell(`<section class="v82-card v82-result"><span class="badge">${checkIcon()}</span><h2>${t('اكتمل الاختبار','Exam complete')}</h2><strong>15 / 15</strong><p>${t('أكملت 15 عنصراً عشوائياً بالرسم والنطق بنجاح.','You completed 15 random items by drawing and pronouncing each one successfully.')}</p><div class="v82-speak-actions"><button data-v82="retry">${t('اختبار جديد','New exam')}</button><button class="mic" data-v82="exit">${t('العودة للرئيسية','Back home')}</button></div></section>`)}
  function page(){if(X.step==='complete')return complete();if(X.step==='pronounce')return speakPage();return drawPage()}

  const oldAppView=window.appView;
  window.appView=function(){if(window.state?.page==='literacy-exam-v82')return page();return oldAppView()};
  window.LiplipSyncLiteracyGlobals?.();

  function canvasImage(c){const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(c,0,0);return out.toDataURL('image/webp',.72)}
  async function checkDraw(){const c=document.querySelector('[data-v82-canvas]');if(!c)return;if(isAdmin()&&!X.drawn){X.step='pronounce';X.status='idle';X.message='';window.render?.(false);return}if(!X.drawn){X.status='wrong';X.message=t('ارسم داخل الحقل أولاً.','Draw in the field first.');window.render?.(false);return}const img=canvasImage(c);X.status='checking';X.message=t('جارٍ فحص الرسم…','Checking your drawing…');window.render?.(false);try{const judge=window.LiplipLocalDrawingJudge;if(!judge?.judge)throw new Error('judge unavailable');const r=await judge.judge({target:current(),kind:X.mode==='letters'?'letter':'number',image:img});if(r.correct){X.step='pronounce';X.status='idle';X.message='';X.drawn=false}else{X.status='wrong';X.message=t('الرسم لا يطابق المطلوب. حاول مرة أخرى.','That drawing does not match. Try again.')}}catch(e){console.error('[liplip] v82 exam draw',e);X.status='wrong';X.message=t('تعذر فحص الرسم. حاول مرة أخرى.','Could not check the drawing. Try again.')}window.render?.(false)}
  function nativeSpeak(){const value=spokenAudio();if(!value||!window.SpeechSynthesisUtterance)return;try{window.speechSynthesis?.cancel();const u=new SpeechSynthesisUtterance(value);u.lang='en-US';u.rate=.86;u.pitch=1.02;window.speechSynthesis?.speak(u)}catch{}}
  function recognize(){X.status='listening';X.message=t('أستمع الآن…','Listening…');window.render?.(false);const svc=window.LiplipSpeechRecognition;if(!svc?.recognize){X.status='wrong';X.message=t('التعرّف الصوتي غير متاح على هذا الجهاز.','Speech recognition is unavailable on this device.');window.render?.(false);return}svc.recognize(spokenTarget(),(ok,heard,error)=>{X.heard=heard||'';X.status=ok?'correct':'wrong';X.message=error||(ok?t('نطق صحيح.','Correct pronunciation.'):t(`سمعت: ${heard||'—'} — حاول مرة أخرى.`,`I heard: ${heard||'—'} — try again.`));window.render?.(false)})}

  let drawing=null;
  document.addEventListener('pointerdown',e=>{const c=e.target.closest?.('[data-v82-canvas]');if(!c)return;e.preventDefault();const ctx=c.getContext('2d'),r=c.getBoundingClientRect(),p={x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#251b2c';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(p.x,p.y);drawing={c,ctx,r,id:e.pointerId};X.drawn=true;c.setPointerCapture?.(e.pointerId)},true);
  document.addEventListener('pointermove',e=>{if(!drawing||drawing.id!==e.pointerId)return;e.preventDefault();const p={x:(e.clientX-drawing.r.left)*drawing.c.width/drawing.r.width,y:(e.clientY-drawing.r.top)*drawing.c.height/drawing.r.height};drawing.ctx.lineTo(p.x,p.y);drawing.ctx.stroke()},true);
  document.addEventListener('pointerup',e=>{if(drawing?.id===e.pointerId)drawing=null},true);document.addEventListener('pointercancel',()=>{drawing=null},true);

  document.addEventListener('click',e=>{
    const examChoice=e.target.closest?.('[data-v45-literacy-choice="exam"]');
    if(examChoice){e.preventDefault();e.stopImmediatePropagation();start(examChoice.dataset.mode);return}
    const b=e.target.closest?.('[data-v82]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const a=b.dataset.v82;
    if(a==='exit'){exit();return}
    if(a==='retry'){start(X.mode);return}
    if(a==='clear'){const c=document.querySelector('[data-v82-canvas]');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);X.drawn=false;X.status='idle';X.message='';return}
    if(a==='check-draw'){checkDraw();return}
    if(a==='hear'){nativeSpeak();return}
    if(a==='mic'){recognize();return}
    if(a==='next'&&(X.status==='correct'||isAdmin())){next();return}
  },true);

  const decorateSheet=()=>{const sheet=document.querySelector('.v45-sheet');if(!sheet||sheet.dataset.v82Decorated)return;sheet.dataset.v82Decorated='1';const p=sheet.querySelector('p');if(p)p.textContent=t('اختر الدراسة للمسار الكامل، أو الاختبار لـ 15 عنصراً عشوائياً تُرسم وتُنطق واحداً تلو الآخر.','Choose Study for the full learning path, or Exam for 15 random items that you draw and pronounce one by one.');const grid=sheet.querySelector('.v45-choice-grid');if(grid&&!sheet.querySelector('.v82-sheet-note')){const note=document.createElement('div');note.className='v82-sheet-note';note.textContent=t('الاختبار يستخدم نفس تصميم الدراسة ونفس التعرّف على الرسم والنطق.','The exam uses the same study design and the same drawing and pronunciation recognition.');sheet.appendChild(note)}};
  new MutationObserver(decorateSheet).observe(document.body,{childList:true,subtree:true});
  decorateSheet();
})();
