/* v36: letters, numbers, handwriting practice, speaking practice, and fast writing challenge. */
(() => {
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const NUMBERS=Array.from({length:35},(_,i)=>String(i));
  const ARTICLES=[
    'Every day is a new chance to learn something useful.',
    'Small steps can build strong habits over time.',
    'I like reading stories and practicing English every day.',
    'Good communication starts with listening carefully and speaking clearly.',
    'Learning a language takes patience, practice, and curiosity.'
  ];
  const L={mode:null,stage:'learn',index:0,face:true,drawn:false,article:0,fastMode:'write',started:false,input:'',speech:'',result:null,mic:false};
  window.LiplipLiteracy=L;

  function esc2(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function symbols(){return L.mode==='letters'?LETTERS:NUMBERS}
  function current(){return symbols()[Math.max(0,Math.min(symbols().length-1,L.index))]}
  function say(text){
    if(!('speechSynthesis' in window)||!text)return;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));u.lang='en-US';u.rate=.82;u.pitch=1.04;speechSynthesis.speak(u)}catch{}
  }
  function letterName(x){return L.mode==='letters'?x:`${x}`}
  function resetDraw(){L.drawn=false}
  function openMode(mode){L.mode=mode;L.stage='learn';L.index=0;L.face=true;resetDraw();state.page='literacy-v36';render();requestAnimationFrame(()=>say(letterName(current())))}
  function closeMode(){L.mode=null;L.started=false;L.mic=false;state.page='app';state.nav='الرئيسية';render()}

  const oldDashboard=dashboard;
  dashboard=function(){
    const html=oldDashboard(),tpl=document.createElement('template');tpl.innerHTML=html;
    const root=tpl.content;
    const replacements={letters:['letters',t('تعلّم الحروف','Learn letters'),t('بطاقات وصوت وكتابة ونطق','Cards, sound, handwriting and speaking')],numbers:['numbers',t('تعلّم الأرقام','Learn numbers'),t('الأرقام من 0 إلى 34 مع الكتابة والنطق','Numbers 0–34 with writing and speaking')],'fast-write':['fast-write',t('الكتابة السريعة','Fast writing'),t('اكتب أو تكلّم وتابع التصحيح مباشرة','Type or speak with live correction')]};
    root.querySelectorAll('[data-v28="soon"][data-feature]').forEach(btn=>{
      const meta=replacements[btn.dataset.feature];if(!meta)return;
      btn.dataset.literacy=meta[0];delete btn.dataset.v28;btn.classList.remove('soon');
      const strong=btn.querySelector('strong'),small=btn.querySelector('small'),pill=btn.querySelector('.soon-pill');
      if(strong)strong.textContent=meta[1];if(small)small.textContent=meta[2];pill?.remove();
    });
    return tpl.innerHTML;
  };

  const oldAppView=appView;
  appView=function(){if(state.page==='literacy-v36')return literacyPage();return oldAppView()};

  function shell(inner,title,sub){return `<main class="lit36"><header class="lit36-head"><button data-lit36="exit">${icon('back',18)} ${t('الرئيسية','Home')}</button><div><small>${esc2(sub||'')}</small><h1>${esc2(title)}</h1></div></header>${inner}</main>`}

  function learnPage(){
    const arr=symbols(),x=current(),isLetter=L.mode==='letters';
    const back=isLetter?`${x} · ${x.toLowerCase()}`:`${x} · ${numberWord(Number(x))}`;
    return shell(`<section class="lit36-progress"><span>${L.index+1}/${arr.length}</span><i><b style="width:${((L.index+1)/arr.length)*100}%"></b></i></section>
      <section class="lit36-card-wrap"><button class="lit36-flip ${L.face?'':'flipped'}" data-lit36="flip" aria-label="flashcard"><span class="lit36-face front"><b>${esc2(x)}</b><small>${t('اضغط لقلب البطاقة','Tap to flip')}</small></span><span class="lit36-face back"><b>${esc2(back)}</b><small>${t('استمع وكرّر','Listen and repeat')}</small></span></button><button class="lit36-sound" data-lit36="sound">${icon('sound',22)} ${t('استمع','Hear')}</button></section>
      <nav class="lit36-nav"><button data-lit36="prev" ${L.index===0?'disabled':''}>${t('السابق','Previous')}</button><button class="primary" data-lit36="next">${L.index===arr.length-1?t('ابدأ التمرين','Start practice'):t('التالي','Next')}</button></nav>`,isLetter?t('الحروف الإنجليزية','English letters'):t('الأرقام الإنجليزية','English numbers'),isLetter?'A–Z':'0–34');
  }

  function numberWord(n){const w=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];return w[n]||String(n)}

  function drawStage(shadow=true,free=false){
    const x=current();
    const helper=free?'':shadow?`<span class="lit36-shadow">${esc2(x)}</span>`:'';
    const hint=free?t('استمع ثم ارسم من الذاكرة','Listen, then draw from memory'):shadow?t('تتبّع الظل ثم اكتب بنفسك','Trace the shadow, then write it yourself'):t('اكتب بدون ظل مساعد','Write without a guide');
    return shell(`<section class="lit36-practice-head"><button class="lit36-sound" data-lit36="sound">${icon('sound',22)} ${t('استمع','Hear')}</button><strong>${esc2(x)}</strong><p>${hint}</p></section><div class="lit36-canvas-card">${helper}<canvas id="lit36-canvas" width="720" height="720"></canvas></div><div class="lit36-draw-actions"><button data-lit36="clear-draw">${t('مسح','Clear')}</button><button class="primary" data-lit36="finish-draw">${t('انتهيت','Done')}</button></div>`,t('تدريب الكتابة','Writing practice'),`${L.index+1}/${symbols().length}`);
  }

  function hearDrawPage(){return drawStage(false,true)}

  function micPractice(){const x=current();return shell(`<section class="lit36-one-card"><button class="lit36-sound big" data-lit36="sound">${icon('sound',30)}</button><strong>${esc2(x)}</strong><p>${t('استمع، ثم اضغط الميكروفون وقل الحرف أو الرقم','Listen, then tap the microphone and say the letter or number')}</p><button class="lit36-mic ${L.mic?'active':''}" data-lit36="mic">${icon('phone',24)} ${L.mic?t('أستمع الآن…','Listening…'):t('تحدث','Speak')}</button><small>${esc2(L.speech||'')}</small><button class="primary lit36-stage-next" data-lit36="stage-next">${t('التالي','Next')}</button></section>`,t('تدريب الاستماع والنطق','Listen and speak'),`${L.index+1}/${symbols().length}`)}
  function speakFromCard(){const x=current();return shell(`<section class="lit36-one-card final"><strong>${esc2(x)}</strong><p>${t('انظر إلى الرمز ثم اضغط الميكروفون وانطقه بدون سماع المثال','Look at the symbol, then use the microphone to pronounce it without an audio example')}</p><button class="lit36-mic ${L.mic?'active':''}" data-lit36="mic">${icon('phone',24)} ${L.mic?t('أستمع الآن…','Listening…'):t('انطق الآن','Speak now')}</button><small>${esc2(L.speech||'')}</small><button class="primary lit36-stage-next" data-lit36="stage-next">${t('إنهاء','Finish')}</button></section>`,t('اختبار النطق','Speaking practice'),`${L.index+1}/${symbols().length}`)}
  function literacyComplete(){return shell(`<section class="lit36-finish"><span>★</span><h2>${t('أحسنت!','Well done!')}</h2><p>${t('أنهيت سلسلة التعلم والتدريب كاملة.','You completed the full learning and practice sequence.')}</p><div><button data-lit36="restart">${t('إعادة','Retry')}</button><button class="primary" data-lit36="exit">${t('العودة للرئيسية','Back home')}</button></div></section>`,t('اكتمل التدريب','Practice complete'),'')}

  function letterNumberPage(){if(L.stage==='learn')return learnPage();if(L.stage==='trace')return drawStage(true,false);if(L.stage==='draw')return drawStage(false,false);if(L.stage==='hear-draw')return hearDrawPage();if(L.stage==='listen-speak')return micPractice();if(L.stage==='speak')return speakFromCard();return literacyComplete()}

  function fastSelect(){return shell(`<section class="fast36-picker"><div class="fast36-articles">${ARTICLES.map((a,i)=>`<button class="${L.article===i?'active':''}" data-lit36="article" data-index="${i}"><span>0${i+1}</span><p>${esc2(a)}</p></button>`).join('')}</div><div class="fast36-mode"><button class="${L.fastMode==='write'?'active':''}" data-lit36="fast-mode" data-mode="write">${icon('keyboard',22)} ${t('كتابة','Write')}</button><button class="${L.fastMode==='speak'?'active':''}" data-lit36="fast-mode" data-mode="speak">${icon('sound',22)} ${t('تحدث','Speak')}</button></div><button class="primary fast36-start" data-lit36="fast-start">${t('ابدأ التحدي','Start challenge')}</button></section>`,t('الكتابة السريعة','Fast writing'),t('اختر النص وطريقة التحدي','Choose an article and challenge mode'))}

  function charClass(target,input,i){if(i>=input.length)return 'pending';return input[i]===target[i]?(L._everWrong?.has(i)?'fixed':'correct'):'wrong'}
  function fastChallenge(){const target=ARTICLES[L.article],typed=L.fastMode==='speak'?L.speech:L.input;return shell(`<section class="fast36-challenge"><div class="fast36-target" dir="ltr">${[...target].map((ch,i)=>`<span class="${charClass(target,typed,i)}">${esc2(ch===' '?'·':ch)}</span>`).join('')}</div>${L.fastMode==='write'?`<textarea id="fast36-input" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('ابدأ الكتابة هنا…','Start typing here…')}">${esc2(L.input)}</textarea>`:`<div class="fast36-speech-box"><button class="lit36-mic ${L.mic?'active':''}" data-lit36="fast-mic">${icon('phone',24)} ${L.mic?t('أستمع…','Listening…'):t('ابدأ التحدث','Start speaking')}</button><p dir="ltr">${esc2(L.speech||t('سيظهر كلامك هنا','Your speech will appear here'))}</p></div>`}<div class="fast36-count"><b>${typed.length}</b><span>/ ${target.length}</span></div><button class="primary" data-lit36="fast-finish" ${typed.length<target.length?'disabled':''}>${t('إنهاء التحدي','Finish challenge')}</button></section>`,t('التحدي','Challenge'),L.fastMode==='write'?t('اكتب النص كما يظهر','Type the text exactly'):t('انطق النص كما يظهر','Speak the text'))}
  function fastResult(){const target=ARTICLES[L.article],value=L.fastMode==='speak'?L.speech:L.input,correct=[...target].filter((c,i)=>value[i]===c).length,score=Math.round(correct/target.length*100);return shell(`<section class="fast36-result"><strong>${score}%</strong><h2>${t('انتهى التحدي','Challenge complete')}</h2><p>${t('نسبة المطابقة','Match score')}: ${correct}/${target.length}</p><div><button data-lit36="fast-exit">${t('خروج','Exit')}</button><button data-lit36="fast-retry">${t('إعادة','Retry')}</button><button class="primary" data-lit36="fast-another">${t('نص آخر','Try another article')}</button></div></section>`,t('النتيجة','Result'),'')}
  function fastPage(){if(!L.started)return fastSelect();return L.result?fastResult():fastChallenge()}
  function literacyPage(){return L.mode==='fast-write'?fastPage():letterNumberPage()}

  function setupCanvas(){const c=document.getElementById('lit36-canvas');if(!c)return;const ctx=c.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#17131f';ctx.lineWidth=18;let down=false,last=null;const pos=e=>{const r=c.getBoundingClientRect(),p=e.touches?.[0]||e;return {x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}};const start=e=>{down=true;last=pos(e);e.preventDefault()};const move=e=>{if(!down)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;L.drawn=true;e.preventDefault()};const end=()=>{down=false;last=null};c.addEventListener('pointerdown',start);c.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:false})}

  function afterRender(){if(['trace','draw','hear-draw'].includes(L.stage))setupCanvas();if(L.mode&&L.mode!=='fast-write'&&['learn','trace','draw','hear-draw'].includes(L.stage))setTimeout(()=>say(letterName(current())),80);if(L.mode==='fast-write'&&L.started&&!L.result&&L.fastMode==='write')setTimeout(()=>document.getElementById('fast36-input')?.focus(),50)}
  const baseRender=render;render=function(scroll=true){baseRender(scroll);afterRender()};

  function recognize(onText){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert(t('التعرّف على الصوت غير مدعوم في هذا المتصفح.','Speech recognition is not supported in this browser.'));return}const r=new SR();r.lang='en-US';r.interimResults=true;r.continuous=false;L.mic=true;render(false);r.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript;onText(text.trim());};r.onend=()=>{L.mic=false;render(false)};r.onerror=()=>{L.mic=false;render(false)};try{r.start()}catch{L.mic=false;render(false)}}

  document.addEventListener('click',e=>{
    const launch=e.target.closest?.('[data-literacy]');if(launch){e.preventDefault();e.stopImmediatePropagation();openMode(launch.dataset.literacy);return}
    const b=e.target.closest?.('[data-lit36]');if(!b)return;e.preventDefault();const a=b.dataset.lit36;
    if(a==='exit'||a==='fast-exit'){closeMode();return}
    if(a==='flip'){L.face=!L.face;render(false);if(!L.face)say(letterName(current()));return}
    if(a==='sound'){say(letterName(current()));return}
    if(a==='prev'){L.index=Math.max(0,L.index-1);L.face=true;render(false);return}
    if(a==='next'){if(L.index<symbols().length-1){L.index++;L.face=true;render(false)}else{L.index=0;L.stage='trace';render()}return}
    if(a==='clear-draw'){const c=document.getElementById('lit36-canvas');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);L.drawn=false;return}
    if(a==='finish-draw'){if(!L.drawn){alert(t('ارسم أولاً داخل البطاقة.','Draw inside the card first.'));return}if(L.index<symbols().length-1){L.index++;resetDraw();render(false)}else{L.index=0;resetDraw();L.stage=L.stage==='trace'?'draw':L.stage==='draw'?'hear-draw':'listen-speak';render()}return}
    if(a==='mic'){recognize(text=>{L.speech=text;render(false)});return}
    if(a==='stage-next'){if(L.index<symbols().length-1){L.index++;L.speech='';render(false)}else{L.index=0;L.speech='';L.stage=L.stage==='listen-speak'?'speak':'complete';render()}return}
    if(a==='restart'){L.stage='learn';L.index=0;L.face=true;render();return}
    if(a==='article'){L.article=Number(b.dataset.index)||0;render(false);return}
    if(a==='fast-mode'){L.fastMode=b.dataset.mode;render(false);return}
    if(a==='fast-start'){L.started=true;L.result=null;L.input='';L.speech='';L._everWrong=new Set();render();return}
    if(a==='fast-mic'){recognize(text=>{L.speech=text;render(false)});return}
    if(a==='fast-finish'){L.result=true;render();return}
    if(a==='fast-retry'){L.result=null;L.input='';L.speech='';L._everWrong=new Set();render();return}
    if(a==='fast-another'){L.started=false;L.result=null;L.input='';L.speech='';L.article=(L.article+1)%ARTICLES.length;render();return}
  },true);

  document.addEventListener('input',e=>{if(e.target?.id!=='fast36-input')return;const target=ARTICLES[L.article],prev=L.input,next=e.target.value;L._everWrong=L._everWrong||new Set();for(let i=0;i<next.length;i++)if(next[i]!==target[i])L._everWrong.add(i);L.input=next;const pane=document.querySelector('.fast36-target');if(pane)pane.innerHTML=[...target].map((ch,i)=>`<span class="${charClass(target,L.input,i)}">${esc2(ch===' '?'·':ch)}</span>`).join('');const count=document.querySelector('.fast36-count b');if(count)count.textContent=String(next.length);document.querySelector('[data-lit36="fast-finish"]')?.toggleAttribute('disabled',next.length<target.length)},true);
})();