/* v45 progression, fast practice, milestone exams, and profile experience. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;
  if(!UI||typeof LiplipProgress==='undefined')return;

  const STORE='liplip-v45-progression';
  const ARTICLE_STORE='liplip-v45-fast-articles';
  const DEFAULT_ARTICLES=[
    {title:'A New Day',paragraphs:['Every day gives us another chance to learn something useful and improve one small part of our lives.','A short walk, a few pages of reading, or ten minutes of practice can become a strong habit when we repeat it.','Progress does not need to be dramatic. Small actions done consistently can change what we are able to do.']},
    {title:'Learning Together',paragraphs:['People learn faster when they can ask questions, make mistakes, and try again without feeling embarrassed.','A helpful classmate can explain an idea in a different way, while teaching someone else can make our own understanding stronger.','Learning together turns difficult work into a shared process and gives everyone more reasons to continue.']},
    {title:'The City Morning',paragraphs:['The city wakes slowly before the streets become busy. Shops open, buses arrive, and people begin moving toward work and school.','At a small café, someone orders breakfast while another person checks the time and plans the rest of the day.','These ordinary moments are useful language practice because they contain the words and actions we use again and again.']},
    {title:'A Useful Conversation',paragraphs:['Good communication starts with listening carefully enough to understand what the other person actually means.','Clear questions help when something is uncertain, and simple answers are often better than long answers that hide the main point.','A useful conversation is not about speaking perfectly. It is about exchanging meaning and correcting misunderstandings when they happen.']},
    {title:'Building Confidence',paragraphs:['Confidence grows after repeated experience, not before it. The first attempt at a new skill often feels slower than expected.','Practice makes familiar actions require less attention, leaving more mental space for difficult decisions and new ideas.','When we notice improvement over time, the next challenge becomes easier to approach because we already have evidence that practice works.']}
  ];

  const loadMeta=()=>UI.storage.get(STORE,{literacy:{letters:false,numbers:false},exams:{}});
  const saveMeta=m=>UI.storage.set(STORE,m);
  const loadArticles=()=>{
    const v=UI.storage.get(ARTICLE_STORE,null);
    if(!Array.isArray(v))return structuredClone(DEFAULT_ARTICLES);
    return v.slice(0,5).map((a,i)=>({title:String(a?.title||`Article ${i+1}`).slice(0,80),paragraphs:(Array.isArray(a?.paragraphs)?a.paragraphs:[]).map(x=>String(x).trim()).filter(Boolean).slice(0,8)})).filter(a=>a.paragraphs.length);
  };
  const saveArticles=a=>UI.storage.set(ARTICLE_STORE,a.slice(0,5));
  const t=(ar,en)=>UI.t(ar,en);
  const esc=UI.escapeHTML;
  const course=()=>LiplipProgress.courseSnapshot(state.progress);
  const loc=id=>LiplipProgress.courseLocation(id);
  const localBox=id=>loc(id).box;
  const levelIds=level=>Array.from({length:50},(_,i)=>(level-1)*200+i+1);
  const completedSet=()=>new Set(course().completedBoxes||[]);
  const examKey=(level,end)=>`${level}:${end}`;
  const examPassed=(level,end)=>!!loadMeta().exams?.[examKey(level,end)];
  const levelFinalPassed=level=>examPassed(level,50);

  function cefr(){
    const m=loadMeta();
    if(!m.literacy?.letters||!m.literacy?.numbers)return 'A0';
    const map=['A1','A2','B1','B2','C1','C2'];
    let n=0;
    for(let level=1;level<=5;level++){if(levelFinalPassed(level))n=level;else break;}
    return map[n];
  }
  const rank=()=>['A0','A1','A2','B1','B2','C1','C2'].indexOf(cefr());

  function milestoneStatus(level){
    const done=completedSet();
    for(const end of [15,30,45,50]){
      const id=(level-1)*200+end;
      if(done.has(id)&&!examPassed(level,end))return end;
    }
    return null;
  }

  /* Review boxes cannot complete below Very Good. The final process is held until the aggregate clears 60%. */
  if(!LiplipProgress.__v45ReviewGate){
    const base=LiplipProgress.recordCourseProcess.bind(LiplipProgress);
    LiplipProgress.recordCourseProcess=function(raw,payload){
      const box=localBox(payload.boxId);
      if(box%5===0&&payload.phase==='watchRead'&&payload.process==='story'){
        const snap=LiplipProgress.courseSnapshot(raw),r=snap.records.find(x=>x.boxId===payload.boxId),scores={...(r?.scores||{}),['watchRead:story']:payload.score};
        const v=scores['vocabulary:exam']??100,g=scores['grammar:exam']??100,video=scores['watchRead:video']??100,story=scores['watchRead:story']??100;
        const total=Math.round((v+g+Math.round((video+story)/2))/3);
        if(total<60)throw new Error(t('المراجعة تحتاج نتيجة «جيد جداً» أو أعلى.','Review requires Very Good or higher.'));
      }
      return base(raw,payload);
    };
    Object.defineProperty(LiplipProgress,'__v45ReviewGate',{value:true});
  }

  function markLiteracy(mode){
    if(!['letters','numbers'].includes(mode))return;
    const m=loadMeta();m.literacy=m.literacy||{};m.literacy[mode]=true;saveMeta(m);
  }

  function literacySheet(mode){
    document.querySelector('.v45-sheet-layer')?.remove();
    const label=mode==='letters'?t('الحروف','Letters'):t('الأرقام','Numbers');
    const layer=document.createElement('div');layer.className='v45-sheet-layer';
    layer.innerHTML=`<button class="v45-sheet-backdrop" data-v45-close aria-label="${t('إغلاق','Close')}"></button><section class="v45-sheet"><div class="v45-sheet-handle"></div><span class="v45-kicker">${label}</span><h2>${t('كيف تريد أن تبدأ؟','How do you want to start?')}</h2><p>${t('الدراسة تفتح المسار الكامل. الاختبار يفتح تمرين الاستماع ثم الرسم فقط.','Study opens the full learning flow. Examine opens only the listen-and-draw phase.')}</p><div class="v45-choice-grid"><button data-v45-literacy-choice="study" data-mode="${mode}"><b>${t('دراسة','Study')}</b><small>${t('بطاقات، كتابة، استماع ونطق','Cards, writing, listening and speaking')}</small></button><button data-v45-literacy-choice="exam" data-mode="${mode}"><b>${t('اختبار','Examine')}</b><small>${t('اسمع ثم ارسم من الذاكرة','Listen, then draw from memory')}</small></button></div></section>`;
    document.body.appendChild(layer);
  }

  function launchLegacyLiteracy(mode,exam=false){
    document.querySelector('.v45-sheet-layer')?.remove();
    const fake=document.createElement('button');fake.hidden=true;fake.dataset.literacy=mode;document.body.appendChild(fake);fake.click();fake.remove();
    if(exam&&window.LiplipLiteracy){LiplipLiteracy.stage='hear-draw';LiplipLiteracy.index=0;LiplipLiteracy._v45Exam=true;render();}
  }

  function decorateLiteracyLaunchers(root){
    root.querySelectorAll('[data-literacy="letters"],[data-literacy="numbers"]').forEach(btn=>{btn.dataset.v45Literacy=btn.dataset.literacy;delete btn.dataset.literacy;});
    root.querySelectorAll('[data-literacy="fast-write"]').forEach(btn=>{
      if(rank()<2){delete btn.dataset.literacy;btn.dataset.v45Locked='A2';btn.classList.add('v45-locked');btn.setAttribute('aria-disabled','true');}
      else{btn.dataset.v45Fast='1';delete btn.dataset.literacy;btn.classList.remove('v45-locked');btn.removeAttribute('aria-disabled');}
    });
  }

  /* Fast practice is independent from the legacy typewriter renderer. */
  const F={view:'select',article:0,mode:'write',startedAt:0,endedAt:0,input:'',speech:'',rec:null,restart:null,inactivity:null,result:null,editing:null};
  const stripPunct=s=>String(s||'').replace(/[.,?!()\/“”"'‘’…:;—–-]/g,'').replace(/\s+/g,' ').trim();
  const articleText=a=>a.paragraphs.join('\n\n');
  const firstPara=a=>a.paragraphs[0]||'';
  const fmt=ms=>{const sec=Math.max(0,Math.floor(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`};
  function stopRecognizer(){clearTimeout(F.restart);clearTimeout(F.inactivity);F.restart=F.inactivity=null;if(F.rec){try{F.rec.onend=null;F.rec.stop()}catch{}F.rec=null;}}
  function resetInactivity(){clearTimeout(F.inactivity);F.inactivity=setTimeout(()=>{if(F.view==='challenge'&&F.mode==='speak'){try{F.rec?.stop()}catch{}setTimeout(startRecognizer,200)}},5000);}
  function startRecognizer(){
    if(F.view!=='challenge'||F.mode!=='speak')return;stopRecognizer();
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;
    const r=new SR();F.rec=r;r.lang='en-US';r.continuous=true;r.interimResults=true;
    let base=F.speech;
    r.onresult=e=>{let interim='',final='';for(let i=e.resultIndex;i<e.results.length;i++){const s=e.results[i][0].transcript;if(e.results[i].isFinal)final+=s+' ';else interim+=s;}if(final){base=(base+' '+final).trim();F.speech=base;}renderFastSpeakProgress(base+' '+interim);resetInactivity();};
    r.onend=()=>{F.rec=null;if(F.view==='challenge'&&F.mode==='speak')F.restart=setTimeout(startRecognizer,300);};
    r.onerror=()=>{};
    try{r.start();resetInactivity()}catch{F.restart=setTimeout(startRecognizer,1000)}
  }
  function renderFastSpeakProgress(value){
    const status=document.querySelector('#v45-speak-status');if(status)status.textContent=t('الميكروفون يعمل تلقائياً','Microphone stays active automatically');
    const count=document.querySelector('#v45-speak-progress');const target=stripPunct(articleText(loadArticles()[F.article]||loadArticles()[0]));if(count)count.textContent=`${Math.min(stripPunct(value).length,target.length)} / ${target.length}`;
  }

  function fastShell(body,title,sub='') {return `<main class="lit36 v45-fast"><header class="lit36-head"><button data-v45-fast-exit>${icon('back',18)} ${t('الرئيسية','Home')}</button><div><small>${esc(sub)}</small><h1>${esc(title)}</h1></div></header>${body}</main>`}
  function articleSelector(){
    const arr=loadArticles();F.article=Math.min(F.article,Math.max(0,arr.length-1));
    return fastShell(`<section class="v45-fast-select"><div class="v45-fast-select-top"><div><span>${t('خمسة نصوص قابلة للتعديل','Five editable articles')}</span><p>${t('تظهر هنا الفقرة الأولى فقط. النص الكامل يظهر داخل التحدي.','Only the first paragraph is shown here. The full article appears in the challenge.')}</p></div><button data-v45-content>${icon('settings',19)} ${t('إدارة المحتوى','Content control')}</button></div><div class="v45-article-list">${arr.map((a,i)=>`<button class="${F.article===i?'active':''}" data-v45-article="${i}"><span>0${i+1}</span><div><strong>${esc(a.title)}</strong><p dir="ltr">${esc(firstPara(a))}</p></div></button>`).join('')}</div><div class="v45-mode"><button class="${F.mode==='write'?'active':''}" data-v45-mode="write">${icon('keyboard',21)} ${t('كتابة','Write')}</button><button class="${F.mode==='speak'?'active':''}" data-v45-mode="speak">${icon('sound',21)} ${t('تحدث','Speak')}</button></div><button class="primary v45-start" data-v45-fast-start>${t('ابدأ التحدي','Start challenge')}</button></section>`,t('الكتابة السريعة','Fast practice'),t('اختر النص وطريقة التدريب','Choose an article and mode'));
  }
  function writeChallenge(a){
    return fastShell(`<section class="v45-write-challenge"><div class="v45-fast-metrics"><span>${t('الوقت','Time')} <b id="v45-time">${fmt(Date.now()-F.startedAt)}</b></span><span>${t('الأحرف','Characters')} <b id="v45-count">${F.input.length}</b></span></div><article class="v45-write-paper" dir="ltr">${a.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</article><textarea id="v45-write-input" dir="ltr" autocomplete="off" spellcheck="false" placeholder="${t('ابدأ الكتابة هنا…','Start typing here…')}">${esc(F.input)}</textarea><button class="primary" data-v45-fast-finish>${t('إنهاء','Finish')}</button></section>`,t('الكتابة السريعة','Fast write'),t('اكتب النص كما يظهر، بدون صوت آلة كاتبة أو اهتزاز','Type the text as shown — no typewriter sound or vibration'));
  }
  function speakChallenge(a){
    const clean=a.paragraphs.map(p=>stripPunct(p));
    const target=stripPunct(articleText(a));
    return fastShell(`<section class="v45-speak-page"><div class="v45-speak-top"><span class="v45-live-dot"></span><div><b id="v45-speak-status">${t('الميكروفون يعمل تلقائياً','Microphone stays active automatically')}</b><small>${t('إذا توقف الصوت أو الميكروفون، يعاد تشغيله تلقائياً.','If speech or the microphone stops, it restarts automatically.')}</small></div><strong id="v45-speak-progress">${Math.min(stripPunct(F.speech).length,target.length)} / ${target.length}</strong></div><article class="v45-speak-article" dir="ltr">${clean.map(p=>`<p>${esc(p)}</p>`).join('')}</article><div class="v45-speak-actions"><span>${t('الوقت','Time')} <b id="v45-time">${fmt(Date.now()-F.startedAt)}</b></span><button class="primary" data-v45-fast-finish>${t('إنهاء التحدث','Finish speaking')}</button></div></section>`,t('التحدث السريع','Fast speak'),t('النص الكامل ظاهر طوال التحدي','The full article stays visible'));
  }
  const bands=[
    {max:40,key:'bad',ar:'سيئ — يجب الإعادة',en:'Bad — must repeat'},
    {max:60,key:'good',ar:'جيد',en:'Good'},
    {max:70,key:'very-good',ar:'جيد جداً',en:'Very good'},
    {max:80,key:'excellent',ar:'ممتاز',en:'Excellent'},
    {max:90,key:'incredible',ar:'مذهل',en:'Incredible'},
    {max:101,key:'master',ar:'متقن',en:'Master'}
  ];
  function rating(score){return bands.find(x=>score<=x.max)||bands.at(-1)}
  function fastResult(a){
    const target=F.mode==='speak'?stripPunct(articleText(a)):articleText(a),value=F.mode==='speak'?stripPunct(F.speech):F.input;
    let hit=0;const n=Math.max(target.length,value.length,1);for(let i=0;i<Math.min(target.length,value.length);i++)if(target[i].toLowerCase()===value[i].toLowerCase())hit++;
    const score=Math.round(hit/n*100),r=rating(score),elapsed=(F.endedAt||Date.now())-F.startedAt;
    return fastShell(`<section class="v45-fast-result ${r.key}"><span>${t(r.ar,r.en)}</span><h2>${esc(a.title)}</h2><div class="v45-result-time"><small>${t('الوقت','Time')}</small><strong>${fmt(elapsed)}</strong></div><div class="v45-result-actions"><button data-v45-fast-again>${t('إعادة','Retry')}</button><button class="primary" data-v45-fast-another>${t('نص آخر','Another article')}</button></div></section>`,t('النتيجة','Result'));
  }
  function fastMarkup(){const arr=loadArticles(),a=arr[F.article]||arr[0]||DEFAULT_ARTICLES[0];if(F.view==='select')return articleSelector();if(F.view==='result')return fastResult(a);return F.mode==='speak'?speakChallenge(a):writeChallenge(a)}
  function mountFast(root){
    const s=window.LiplipLiteracy;if(!s||s.mode!=='fast-write'||state.page!=='literacy-v36')return;
    const current=root.querySelector('.lit36');if(!current||current.classList.contains('v45-fast'))return;
    current.outerHTML=fastMarkup();if(F.view==='challenge'&&F.mode==='speak')setTimeout(startRecognizer,50);if(F.view==='challenge'&&F.mode==='write')setTimeout(()=>document.querySelector('#v45-write-input')?.focus(),50);
  }
  function redrawFast(){const old=document.querySelector('.v45-fast');if(old)old.outerHTML=fastMarkup();else render(false);if(F.view==='challenge'&&F.mode==='speak')setTimeout(startRecognizer,50);}
  function openFast(){stopRecognizer();const s=window.LiplipLiteracy;if(!s)return;s.mode='fast-write';s.started=false;s.result=null;state.page='literacy-v36';F.view='select';F.input='';F.speech='';render();}

  function contentSheet(){
    document.querySelector('.v45-sheet-layer')?.remove();const arr=loadArticles(),layer=document.createElement('div');layer.className='v45-sheet-layer';layer.innerHTML=`<button class="v45-sheet-backdrop" data-v45-close></button><section class="v45-sheet v45-content-sheet"><div class="v45-sheet-handle"></div><span class="v45-kicker">${t('إدارة المحتوى','Content control')}</span><h2>${t('اختر النص الذي تريد تعديله','Choose an article to edit')}</h2><div class="v45-content-list">${arr.map((a,i)=>`<button data-v45-edit-article="${i}"><b>0${i+1}</b><span>${esc(a.title)}</span></button>`).join('')}</div></section>`;document.body.appendChild(layer);
  }
  function editArticleSheet(i){
    const arr=loadArticles(),a=arr[i];if(!a)return;const layer=document.querySelector('.v45-sheet-layer')||document.createElement('div');layer.className='v45-sheet-layer';layer.innerHTML=`<button class="v45-sheet-backdrop" data-v45-close></button><section class="v45-sheet v45-edit-sheet"><div class="v45-sheet-handle"></div><span class="v45-kicker">${t('النص','Article')} ${i+1}</span><h2>${t('تعديل النص','Edit article')}</h2><form id="v45-article-form" data-index="${i}"><label>${t('العنوان','Title')}<input name="title" maxlength="80" value="${esc(a.title)}" required></label><label>${t('المحتوى — ثلاث فقرات على الأقل','Content — at least three paragraphs')}<textarea name="body" rows="12" required>${esc(a.paragraphs.join('\n\n'))}</textarea></label><div><button type="button" class="danger" data-v45-remove-article="${i}">${t('حذف النص','Remove article')}</button><button class="primary" type="submit">${t('حفظ','Save')}</button></div></form></section>`;if(!layer.isConnected)document.body.appendChild(layer);
  }

  function profileMarkup(){
    const p=state.profile||{},name=state.guest?t('ضيف لُبلُب','Liplip Guest'):(p.name||t('متعلّم لُبلُب','Liplip Learner')),level=cefr(),c=course(),m=loadMeta(),done=c.completedBoxes.length;
    const levels=['A0','A1','A2','B1','B2','C1','C2'],idx=levels.indexOf(level);
    const next=idx<6?levels[idx+1]:null;
    const milestone=level==='A0'?t('أكمل تعلّم الحروف والأرقام للوصول إلى A1.','Complete letters and numbers to reach A1.'):level==='A1'?t('أكمل المستوى 1 للوصول إلى A2.','Complete Level 1 to reach A2.'):level==='A2'?t('أكمل المستوى 2 للوصول إلى B1.','Complete Level 2 to reach B1.'):level==='B1'?t('أكمل المستوى 3 للوصول إلى B2.','Complete Level 3 to reach B2.'):level==='B2'?t('أكمل المستوى 4 للوصول إلى C1.','Complete Level 4 to reach C1.'):level==='C1'?t('أكمل المستوى 5 للوصول إلى C2.','Complete Level 5 to reach C2.'):t('اكتمل مسار المستويات.','Level path complete.');
    return `<main class="dashboard profile-v45"><section class="profile45-hero"><div class="profile45-avatar">${esc(String(name).trim().charAt(0)||'L')}</div><div><span>${t('ملف التعلّم','LEARNING PROFILE')}</span><h1>${esc(name)}</h1><p>${milestone}</p></div><div class="profile45-level"><small>${t('المستوى','LEVEL')}</small><strong dir="ltr">${level}</strong>${next?`<span>${t('التالي','Next')} ${next}</span>`:''}</div></section><section class="profile45-track">${levels.map((x,i)=>`<div class="${i<idx?'done':i===idx?'current':'locked'}"><b>${x}</b><i></i></div>`).join('')}</section><section class="profile45-grid"><article><small>${t('الحروف','Letters')}</small><strong>${m.literacy?.letters?t('مكتمل','Complete'):t('غير مكتمل','Pending')}</strong></article><article><small>${t('الأرقام','Numbers')}</small><strong>${m.literacy?.numbers?t('مكتمل','Complete'):t('غير مكتمل','Pending')}</strong></article><article><small>${t('الصناديق المكتملة','Completed boxes')}</small><strong>${done}</strong></article><article><small>${t('المستويات المكتملة','Completed levels')}</small><strong>${[1,2,3,4,5].filter(levelFinalPassed).length}/5</strong></article></section><section class="profile45-actions"><button data-action="open-settings">${icon('settings',20)}<span><b>${t('الإعدادات','Settings')}</b><small>${t('اللغة، البيانات والتقدّم','Language, data and progress')}</small></span>${icon('arrow',18)}</button><button data-action="logout">${icon('logout',20)}<span><b>${t('تسجيل الخروج','Sign out')}</b><small>${t('العودة إلى شاشة البداية','Return to start')}</small></span>${icon('arrow',18)}</button></section></main>`;
  }
  try{accountProfilePage=function(){if(state.profileSettings)return settingsPage();return profileMarkup()}}catch{}

  function enforceNav(root){
    const r=rank();
    root.querySelectorAll('[data-nav]').forEach(btn=>{
      const n=btn.dataset.nav,need=n==='الدراسة'?1:n==='تحدّث'?3:null;if(need===null)return;
      btn.classList.toggle('v45-nav-locked',r<need);btn.dataset.v45Need=r<need?['A0','A1','A2','B1'][need]:'';
    });
    root.querySelectorAll('[data-v28="talk"],[data-talk]').forEach(btn=>btn.classList.toggle('v45-nav-locked',r<3));
  }

  function decorateMap(root){
    const map=root.querySelector('.treasure-box-map-page');if(!map)return;const level=Number(window.LiplipTreasureMap?.level)||loc(course().currentBox||1).level,pending=milestoneStatus(level);map.querySelector('.v45-exam-banner')?.remove();if(!pending)return;
    map.querySelectorAll('[data-local-box]').forEach(btn=>{if(Number(btn.dataset.localBox)>pending){btn.disabled=true;btn.closest('.treasure-box-stop')?.classList.add('v45-exam-blocked')}});
    const banner=document.createElement('section');banner.className='v45-exam-banner';banner.innerHTML=`<div><span>${pending===50?t('الامتحان النهائي','FINAL EXAM'):t('امتحان المرحلة','MILESTONE EXAM')}</span><h2>${pending===50?t('أكمل امتحان المستوى قبل الانتقال.','Complete the level final exam before moving on.'):t('أنهيت 12 صندوق تعلّم. حان وقت الامتحان.','You completed 12 learning boxes. It is exam time.')}</h2><p>${pending===50?t('سؤالان من كل مرحلة من كل صندوق في المستوى.','Two questions from every phase of every box in the level.'):t('3 أسئلة من كل مرحلة من كل صندوق من صناديق التعلّم الاثني عشر.','3 questions from every phase of each of the twelve learning boxes.')}</p></div><button data-v45-open-exam data-level="${level}" data-end="${pending}">${t('ابدأ الامتحان','Start exam')}</button>`;map.prepend(banner);
  }

  const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
  function phasePool(content,phase){if(phase==='vocabulary')return content.vocabulary?.questions||[];if(phase==='grammar')return content.grammar?.questions||[];return [...(content.watchRead?.videoQuestions||[]),...(content.watchRead?.storyQuestions||[])];}
  function normalizeQuestion(q,boxId,phase,n){
    const options=Array.isArray(q.options)?q.options.map(String):[];let correct=Number.isInteger(q.correct)?q.correct:Number(q.correctOption);
    if(!Number.isInteger(correct)||correct<0||correct>=options.length)correct=0;
    return {id:`${boxId}-${phase}-${n}-${Math.random().toString(36).slice(2)}`,boxId,phase,prompt:String(q.prompt||q.question||q.title||`${phase} — box ${localBox(boxId)}`),options,correct,answer:String(q.answer||'')};
  }
  function examSources(level,end){
    const ids=levelIds(level);if(end===50)return ids;
    const start=end===15?1:end===30?16:31;return ids.filter(id=>{const b=localBox(id);return b>=start&&b<end&&b%5!==0;});
  }
  function buildExam(level,end){
    const per=end===50?2:3,out=[];for(const id of examSources(level,end)){const content=LiplipCourse.getContent(id);for(const phase of ['vocabulary','grammar','watchRead']){const pool=shuffle(phasePool(content,phase));if(!pool.length)continue;for(let i=0;i<per;i++)out.push(normalizeQuestion(pool[i%pool.length],id,phase,i));}}return shuffle(out);
  }
  function openExam(level,end){
    const questions=buildExam(level,end),layer=document.createElement('div');layer.className='v45-exam-layer';layer.dataset.level=level;layer.dataset.end=end;layer._questions=questions;
    layer.innerHTML=`<section class="v45-exam"><header><div><span>${end===50?t('الامتحان النهائي','FINAL EXAM'):t('امتحان المرحلة','MILESTONE EXAM')}</span><h1>${t('المستوى','Level')} ${level}</h1><p>${questions.length} ${t('سؤالاً — تتغير الأسئلة في كل مرة تفتح فيها الامتحان.','questions — selection changes every time the exam opens.')}</p></div><button data-v45-exam-close>${t('إغلاق','Close')}</button></header><form id="v45-exam-form">${questions.map((q,i)=>`<fieldset><legend><b>${i+1}</b><span>${t('صندوق','Box')} ${localBox(q.boxId)} · ${esc(q.phase)}</span><strong>${esc(q.prompt)}</strong></legend>${q.options.length?`<div>${q.options.map((o,j)=>`<label><input type="radio" name="q${i}" value="${j}" required><span>${esc(o)}</span></label>`).join('')}</div>`:`<input class="v45-written" name="q${i}" required autocomplete="off">`}</fieldset>`).join('')}<button class="primary" type="submit">${t('إنهاء وتصحيح الامتحان','Finish and grade exam')}</button></form></section>`;document.body.appendChild(layer);layer.scrollTop=0;
  }
  function gradeExam(layer,form){const qs=layer._questions||[];let good=0;qs.forEach((q,i)=>{const fd=new FormData(form),v=fd.get(`q${i}`);const ok=q.options.length?Number(v)===q.correct:String(v||'').trim().toLowerCase()===q.answer.trim().toLowerCase();if(ok)good++;form.querySelectorAll('fieldset')[i]?.classList.add(ok?'correct':'wrong');});return Math.round(good/Math.max(1,qs.length)*100)}
  function examResult(layer,score){
    const level=Number(layer.dataset.level),end=Number(layer.dataset.end),r=rating(score),pass=score>=70;if(pass){const m=loadMeta();m.exams=m.exams||{};m.exams[examKey(level,end)]=true;saveMeta(m);}
    layer.innerHTML=`<section class="v45-exam-result ${r.key}"><span>${t(r.ar,r.en)}</span><h1>${pass?t('تم اجتياز الامتحان','Exam passed'):t('أعد المحاولة','Try again')}</h1><p>${pass?t('يمكنك متابعة المسار الآن.','You can continue the path now.'):t('تحتاج إلى ممتاز أو أعلى لاجتياز الامتحان.','Excellent or higher is required to pass.')}</p><div><button data-v45-exam-close>${t('العودة للخريطة','Back to map')}</button>${pass?'':`<button class="primary" data-v45-exam-retry data-level="${level}" data-end="${end}">${t('إعادة بأسئلة جديدة','Retry with new questions')}</button>`}</div></section>`;
  }

  function decorateBoxResult(root){
    const card=root.querySelector('.course-result-card');if(!card||card.dataset.v45)return;const raw=card.querySelector('.course-result-score strong')?.textContent||'0',score=Number(raw.replace(/[^0-9.]/g,''))||0,r=rating(score);card.dataset.v45='1';card.classList.add('v45-box-result',r.key);card.innerHTML=`<span class="v45-result-label">${t(r.ar,r.en)}</span><h1>${r.key==='bad'?t('هذا الصندوق يحتاج محاولة جديدة','This box needs another try'):t('أنهيت الصندوق','Box complete')}</h1><p>${r.key==='bad'?t('أعد الصندوق قبل المتابعة.','Repeat the box before continuing.'):t('تابع عندما تكون جاهزاً.','Continue when you are ready.')}</p><div class="course-result-actions">${r.key==='bad'?`<button class="primary" data-course="result-repeat">${t('إعادة الصندوق','Repeat box')}</button>`:`<button data-course="result-close">${t('إغلاق','Close')}</button><button class="primary" data-course="result-next">${t('التالي','Next')}</button>`}</div>`;
  }

  function mount({root}){
    decorateLiteracyLaunchers(root);enforceNav(root);mountFast(root);decorateMap(root);decorateBoxResult(root);
    const s=window.LiplipLiteracy;
    if(s?._v45Exam&&s.stage==='listen-speak'){markLiteracy(s.mode);s._v45Exam=false;s.stage='complete';render(false);return;}
    if(s&&(s.mode==='letters'||s.mode==='numbers')&&s.stage==='complete')markLiteracy(s.mode);
  }
  UI.registerFeature('progression-experience-v45',{mount});

  UI.delegate('click','[data-v45-literacy]',(e,b)=>{e.preventDefault();e.stopImmediatePropagation();literacySheet(b.dataset.v45Literacy)});
  UI.delegate('click','[data-v45-literacy-choice]',(e,b)=>{e.preventDefault();launchLegacyLiteracy(b.dataset.mode,b.dataset.v45LiteracyChoice==='exam')});
  UI.delegate('click','[data-v45-fast]',e=>{e.preventDefault();e.stopImmediatePropagation();openFast()});
  UI.delegate('click','[data-v45-locked]',(e,b)=>{e.preventDefault();e.stopImmediatePropagation();alert(t(`يفتح عند المستوى ${b.dataset.v45Locked}.`,`Unlocks at ${b.dataset.v45Locked}.`))});
  UI.delegate('click','[data-v45-close]',()=>document.querySelector('.v45-sheet-layer')?.remove());
  UI.delegate('click','[data-v45-fast-exit]',()=>{stopRecognizer();const s=window.LiplipLiteracy;if(s)s.mode=null;state.page='app';state.nav='الرئيسية';render()});
  UI.delegate('click','[data-v45-article]',(e,b)=>{F.article=Number(b.dataset.v45Article)||0;redrawFast()});
  UI.delegate('click','[data-v45-mode]',(e,b)=>{F.mode=b.dataset.v45Mode;redrawFast()});
  UI.delegate('click','[data-v45-fast-start]',()=>{F.view='challenge';F.startedAt=Date.now();F.endedAt=0;F.input='';F.speech='';redrawFast()});
  UI.delegate('input','#v45-write-input',(e,el)=>{F.input=el.value;document.querySelector('#v45-count').textContent=String(F.input.length)});
  UI.delegate('click','[data-v45-fast-finish]',()=>{stopRecognizer();F.endedAt=Date.now();F.view='result';redrawFast()});
  UI.delegate('click','[data-v45-fast-again]',()=>{F.view='challenge';F.startedAt=Date.now();F.endedAt=0;F.input='';F.speech='';redrawFast()});
  UI.delegate('click','[data-v45-fast-another]',()=>{F.view='select';F.article=(F.article+1)%Math.max(1,loadArticles().length);F.input='';F.speech='';redrawFast()});
  UI.delegate('click','[data-v45-content]',()=>contentSheet());
  UI.delegate('click','[data-v45-edit-article]',(e,b)=>editArticleSheet(Number(b.dataset.v45EditArticle)));
  UI.delegate('click','[data-v45-remove-article]',(e,b)=>{const arr=loadArticles();if(arr.length<=1)return alert(t('يجب إبقاء نص واحد على الأقل.','Keep at least one article.'));arr.splice(Number(b.dataset.v45RemoveArticle),1);saveArticles(arr);F.article=Math.min(F.article,arr.length-1);document.querySelector('.v45-sheet-layer')?.remove();redrawFast()});
  document.addEventListener('submit',e=>{if(e.target?.id!=='v45-article-form')return;e.preventDefault();const f=e.target,arr=loadArticles(),i=Number(f.dataset.index),paras=String(f.body.value||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);if(paras.length<3)return alert(t('يجب أن يحتوي النص على ثلاث فقرات على الأقل.','The article must contain at least three paragraphs.'));arr[i]={title:f.title.value.trim(),paragraphs:paras};saveArticles(arr);document.querySelector('.v45-sheet-layer')?.remove();redrawFast();},true);

  /* Lock navigation before app.js handles it. */
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-nav]');if(!b)return;const need=b.dataset.nav==='الدراسة'?1:b.dataset.nav==='تحدّث'?3:null;if(need!==null&&rank()<need){e.preventDefault();e.stopImmediatePropagation();alert(t(`هذه الصفحة تفتح عند ${['A0','A1','A2','B1'][need]}.`,`This page unlocks at ${['A0','A1','A2','B1'][need]}.`));}},true);

  UI.delegate('click','[data-v45-open-exam]',(e,b)=>openExam(Number(b.dataset.level),Number(b.dataset.end)));
  UI.delegate('click','[data-v45-exam-close]',()=>{document.querySelector('.v45-exam-layer')?.remove();render(false)});
  UI.delegate('click','[data-v45-exam-retry]',(e,b)=>{document.querySelector('.v45-exam-layer')?.remove();openExam(Number(b.dataset.level),Number(b.dataset.end))});
  document.addEventListener('submit',e=>{if(e.target?.id!=='v45-exam-form')return;e.preventDefault();const layer=e.target.closest('.v45-exam-layer'),score=gradeExam(layer,e.target);setTimeout(()=>examResult(layer,score),250);},true);

  setInterval(()=>{if(F.view!=='challenge')return;const el=document.querySelector('#v45-time');if(el)el.textContent=fmt(Date.now()-F.startedAt)},500);
})();
