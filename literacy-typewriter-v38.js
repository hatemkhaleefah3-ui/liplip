/* v38: exact fast-write/typewriter and final pronunciation flow polish. */
(() => {
  const ARTICLES=[
    'Every day is a new chance to learn something useful.',
    'Small steps can build strong habits over time.',
    'I like reading stories and practicing English every day.',
    'Good communication starts with listening carefully and speaking clearly.',
    'Learning a language takes patience, practice, and curiosity.'
  ];
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const punctuation=/[.,?!()\/“”"]/;
  const L=()=>window.LiplipLiteracy;
  let audioCtx=null;

  function target(){const s=L();return ARTICLES[Math.max(0,Math.min(ARTICLES.length-1,Number(s?.article)||0))]}
  function comparable(v){return String(v||'').replace(/[.,?!()\/“”"]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
  function statusFor(targetText,input,i){
    if(punctuation.test(targetText[i]||''))return 'auto';
    if(i>=input.length)return 'pending';
    if(input[i]===targetText[i])return L()?._everWrong?.has(i)?'fixed':'correct';
    return 'wrong';
  }
  function charHTML(ch,cls){return `<span class="fast38-char ${cls}">${ch===' '?'&nbsp;':esc(ch)}</span>`}
  function writeOverlay(targetText,input){return [...targetText].map((ch,i)=>charHTML(ch,statusFor(targetText,input,i))).join('')}

  function speechOverlay(targetText,spoken){
    const spokenText=comparable(spoken),targetTextComparable=comparable(targetText);
    let ci=0;
    return [...targetText].map(ch=>{
      if(punctuation.test(ch))return charHTML(ch,'auto');
      if(ch===' '){const cls=ci<spokenText.length&&spokenText[ci]===' '?'correct':'pending';if(cls==='correct')ci++;return charHTML(ch,cls)}
      const expected=targetTextComparable[ci]||ch.toLowerCase(),got=spokenText[ci]||'';
      const cls=!got?'pending':got===expected?'correct':'wrong';ci++;return charHTML(ch,cls);
    }).join('')
  }

  function playTypeSound(kind='key'){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume();
      const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type=kind==='space'?'triangle':'square';osc.frequency.setValueAtTime(kind==='space'?340:980,now);osc.frequency.exponentialRampToValueAtTime(kind==='space'?180:430,now+.035);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='space'?.025:.042,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.055);
      osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+.06);
    }catch{}
  }

  function machineProgress(inputLength){return Math.max(0,inputLength-7)}
  function challengeMarkup(){
    const s=L(),text=target(),isSpeak=s.fastMode==='speak',input=isSpeak?s.speech:s.input,shownCount=Math.min(String(input||'').length,text.length);
    const canFinish=isSpeak?Boolean(String(s.speech||'').trim()):String(s.input||'').length>=text.length;
    const overlay=isSpeak?speechOverlay(text,s.speech||''):writeOverlay(text,s.input||'');
    const shift=machineProgress(isSpeak?comparable(s.speech||'').length:String(s.input||'').length);
    return `<main class="lit36 fast38-page ${isSpeak?'fast38-speak':'fast38-write'}">
      <header class="lit36-head fast38-head"><button data-lit36="fast-exit">${icon('back',18)} ${t('الرئيسية','Home')}</button><div><small>${isSpeak?t('انطق النص كما يظهر','Speak the article as shown'):t('اكتب على الظل حرفاً بحرف','Type directly over the shadow')}</small><h1>${isSpeak?t('تحدي التحدث','Speaking challenge'):t('الآلة الكاتبة','Typewriter')}</h1></div></header>
      <section class="fast38-machine">
        <div class="fast38-machine-bar"><span class="fast38-reel left"></span><b>${isSpeak?t('SPEAK MODE','SPEAK MODE'):t('TYPEWRITER MODE','TYPEWRITER MODE')}</b><span class="fast38-reel right"></span></div>
        <div class="fast38-paper">
          <div class="fast38-paper-rule" aria-hidden="true"></div>
          <div class="fast38-window">
            <div class="fast38-track" id="fast38-track" style="--shift:${shift}"><div class="fast38-overlay" id="fast38-overlay" dir="ltr">${overlay}</div></div>
            <i class="fast38-caret" aria-hidden="true"></i>
          </div>
          ${isSpeak?`<div class="fast38-speech-controls"><button class="fast38-mic ${s.mic?'active':''}" data-lit36="fast-mic">${icon('phone',25)}<span>${s.mic?t('أستمع الآن…','Listening…'):t('ابدأ التحدث','Start speaking')}</span></button><p dir="ltr">${esc(s.speech||t('سيظهر كلامك هنا أثناء التحدث.','Your recognized speech will appear here.'))}</p><small>${t('علامات الترقيم تُحتسب تلقائياً ولا تحتاج إلى نطقها.','Punctuation is checked automatically; you do not need to say it.')}</small></div>`:`<textarea id="fast38-input" dir="ltr" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="${text.length}" aria-label="${t('حقل الكتابة','Typing field')}">${esc(s.input||'')}</textarea><p class="fast38-tip">${t('كل ضغطة مفتاح لها صوت آلة كاتبة. يمكنك تجاوز الخطأ أو حذفه وتصحيحه.','Every key has a typewriter sound. You can continue past a mistake or delete it and correct it.')}</p>`}
        </div>
      </section>
      <div class="fast38-bottom"><div class="fast38-counter"><b id="fast38-count">${shownCount}</b><span>/ ${text.length}</span></div><button class="primary" data-v38="fast-finish" ${canFinish?'':'disabled'}>${t('إنهاء التحدي','Finish challenge')}</button></div>
    </main>`;
  }

  function finalSpeakMarkup(){
    const s=L(),letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),numbers=Array.from({length:35},(_,i)=>String(i)),arr=s.mode==='letters'?letters:numbers,x=arr[Math.max(0,Math.min(arr.length-1,s.index||0))];
    return `<main class="lit36 lit38-final"><header class="lit36-head"><button data-lit36="exit">${icon('back',18)} ${t('الرئيسية','Home')}</button><div><small>${s.index+1}/${arr.length}</small><h1>${t('اختبار النطق','Speaking practice')}</h1></div></header><section class="lit38-final-card"><span>${t('انظر ثم انطق','Look and pronounce')}</span><strong>${esc(x)}</strong><p>${t('لا يوجد صوت مساعد في هذه الخطوة. انطق الحرف أو الرقم بنفسك.','There is no example audio in this step. Pronounce the letter or number yourself.')}</p><button class="fast38-mic ${s.mic?'active':''}" data-lit36="mic">${icon('phone',26)}<span>${s.mic?t('أستمع الآن…','Listening…'):t('انطق الآن','Speak now')}</span></button><small>${esc(s.speech||'')}</small><button class="primary lit36-stage-next" data-lit36="stage-next" ${String(s.speech||'').trim()?'':'disabled'}>${s.index===arr.length-1?t('إنهاء','Finish'):t('التالي','Next')}</button></section></main>`;
  }

  function apply(){
    const s=L();if(!s)return;
    if(s.mode==='fast-write'&&s.started&&!s.result){const root=document.querySelector('.lit36');if(root)root.outerHTML=challengeMarkup();requestAnimationFrame(()=>{if(s.fastMode==='write'){const el=document.getElementById('fast38-input');el?.focus();if(el)el.setSelectionRange(el.value.length,el.value.length)}});return}
    if((s.mode==='letters'||s.mode==='numbers')&&s.stage==='speak'){const root=document.querySelector('.lit36');if(root)root.outerHTML=finalSpeakMarkup()}
  }

  function updateWriteDOM(){
    const s=L(),text=target(),input=String(s.input||''),overlay=document.getElementById('fast38-overlay'),track=document.getElementById('fast38-track'),count=document.getElementById('fast38-count'),finish=document.querySelector('[data-v38="fast-finish"]');
    if(overlay)overlay.innerHTML=writeOverlay(text,input);if(track)track.style.setProperty('--shift',machineProgress(input.length));if(count)count.textContent=String(Math.min(input.length,text.length));if(finish)finish.disabled=input.length<text.length;
  }

  const previousRender=window.render;
  window.render=function(scroll=true){previousRender(scroll);apply()};

  document.addEventListener('input',e=>{
    if(e.target?.id!=='fast38-input')return;
    const s=L(),text=target(),prev=String(s.input||''),next=String(e.target.value||'').slice(0,text.length);e.target.value=next;
    s._everWrong=s._everWrong||new Set();for(let i=0;i<next.length;i++)if(next[i]!==text[i])s._everWrong.add(i);
    if(next.length>prev.length)playTypeSound(next.at(-1)===' '?'space':'key');
    s.input=next;updateWriteDOM();
  },true);

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-v38]');if(!b)return;
    if(b.dataset.v38==='fast-finish'){e.preventDefault();const s=L();if(!s)return;s.result=true;render();}
  },true);

  const observer=new MutationObserver(()=>apply());observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  apply();
})();
