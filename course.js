/* Unified Study course: level -> box -> vocabulary, grammar, watch & read. */
const LiplipCourse = (() => {
  const PHASES = [
    {key:'vocabulary',label:'المفردات',short:'كلمات وصور وأصوات',processes:['content','exam']},
    {key:'grammar',label:'القواعد',short:'شرح وتطبيق',processes:['article','exam']},
    {key:'watchRead',label:'شاهد واقرأ',short:'فيديو وقصة',processes:['video','story']}
  ];
  const PHASE_FILE = {vocabulary:'liplip-vocabulary.xlsx',grammar:'liplip-grammar.xlsx',watchRead:'liplip-watch-read.xlsx'};
  const PHASE_VALUE = {vocabulary:'vocabulary',grammar:'grammar',watchRead:'watch&read'};
  const STORE_KEY='liplip-course-content-v2';
  const LEVEL_BOXES=200;
  let edits={};
  try{const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');if(raw&&typeof raw==='object')edits=raw}catch{}
  let ui={view:'levels',level:null,boxId:null,phase:null,review:false,results:false,control:false,notice:'',error:'',storyPage:0,processView:0,itemIndex:0,flipped:false,answers:{},micActive:false,micMessage:'',micTranscript:'',manager:false,managerMode:'home',managerLevel:null,managerBox:1,managerPhase:'vocabulary',managerProcess:'content'};

  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').trim().toLocaleLowerCase().replace(/[\s\u064B-\u065F]+/g,' ');
  const location=id=>LiplipProgress.courseLocation(id);
  const globalId=(level,box)=>(level-1)*LEVEL_BOXES+box;
  const phaseDef=key=>PHASES.find(x=>x.key===key)||PHASES[0];
  const icon=(path,size=20)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const icons={back:'<path d="M19 12H5m6 6-6-6 6-6"/>',lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 4 4L19 6"/>',book:'<path d="M4 5c4 0 6 1 8 3 2-2 4-3 8-3v14c-4 0-6 1-8 3-2-2-4-3-8-3V5Z"/>',play:'<path d="m8 5 11 7-11 7V5Z"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5 21 12l-2-1.5-.4-2.1-2.4-.4L15 5l-3-1-3 1-1.2 3-2.4.4L5 10.5 3 12l2 1.5.4 2.1 2.4.4L9 19l3 1 3-1 1.2-3 2.4-.4.4-2.1Z"/>'};

  function defaultContent(id){
    const loc=location(id),n=loc.box;
    return {
      vocabulary:{items:[
        {type:'word',order:1,en:`word ${n}`,ar:`كلمة ${n}`,voice:`word ${n}`},
        {type:'sentence',order:2,en:`This is example sentence ${n}.`,ar:'جملة تدريبية بسيطة.',voice:`This is example sentence ${n}.`}
      ],questions:[{type:'mcq',prompt:`اختر معنى word ${n}`,options:[`كلمة ${n}`,'جملة','صورة','قصة'],correct:0,answer:`كلمة ${n}`,explanation:'راجع بطاقة الكلمة.'}]},
      grammar:{article:{title:`قاعدة الصندوق ${n}`,rule:'استخدم ترتيب الجملة الواضح: فاعل ثم فعل ثم مفعول به.',normal:'Subject + verb + object.',negative:'Subject + do/does not + base verb + object.',question:'Do/Does + subject + base verb + object?',notes:['يتغير does مع he / she / it.','بعد do أو does يعود الفعل إلى صورته الأساسية.'],examples:Array.from({length:10},(_,i)=>({text:`Example ${i+1}: I use the word in a clear sentence.`,difficulty:i<4?'easy':i<8?'medium':'difficult'}))},questions:[{type:'mcq',prompt:'اختر ترتيب الجملة العادية.',options:['Subject + verb + object','Verb + subject + object','Object + verb + subject','Do + object'],correct:0,answer:'Subject + verb + object',explanation:'الجملة العادية تبدأ بالفاعل.'}]},
      watchRead:{video:{title:`فيديو الصندوق ${n}`,youtube:'dQw4w9WgXcQ'},videoQuestions:[{type:'mcq',prompt:'ما الفكرة الأساسية؟',options:['الفكرة الأولى','الفكرة الثانية','الفكرة الثالثة','الفكرة الرابعة'],correct:0,answer:'الفكرة الأولى',explanation:'شاهد المقطع مرة أخرى.'}],story:[{order:1,title:`قصة الصندوق ${n}`,text:`This is a short story for box ${n}. Read it carefully and notice the new vocabulary.`,arabic:'اقرأ القصة ولاحظ المفردات الجديدة.',image:''}],storyQuestions:[{type:'mcq',prompt:'ماذا قرأت؟',options:['قصة قصيرة','رسالة','إعلان','قائمة'],correct:0,answer:'قصة قصيرة',explanation:'النص قصة قصيرة.'}]}
    };
  }
  function cleanContent(value,id){
    const base=defaultContent(id),out=value&&typeof value==='object'?value:{};
    for(const key of ['vocabulary','grammar','watchRead'])if(!out[key]||typeof out[key]!=='object')out[key]=base[key];
    const a=out.grammar.article||base.grammar.article;
    a.notes=Array.isArray(a.notes)?a.notes:[];
    a.examples=Array.isArray(a.examples)?a.examples:[];
    a.laws=Array.isArray(a.laws)&&a.laws.length?a.laws:[
      {type:'normal',title:a.title||'Normal sentence',rule:a.rule||'',formula:a.normal||''},
      {type:'negative',title:'Negative sentence',rule:a.rule||'',formula:a.negative||''},
      {type:'question',title:'Question sentence',rule:a.rule||'',formula:a.question||''}
    ].filter(x=>x.formula||x.rule);
    out.grammar.article=a;
    return out;
  }
  function getContent(id){return cleanContent(structuredClone(edits[String(id)]||defaultContent(id)),id)}
  function storeBox(id,content){const next=structuredClone(edits);next[String(id)]=content;localStorage.setItem(STORE_KEY,JSON.stringify(next));edits=next}

  function model(progress){
    const snap=LiplipProgress.courseSnapshot(progress),records=new Map(snap.records.map(x=>[x.boxId,x]));
    const phaseCount=id=>records.get(id)?.completedPhases?.length||0;
    const statusBox=id=>snap.completedBoxes.includes(id)?'complete':id===snap.currentBox?'current':'locked';
    const levelStat=level=>{const ids=Array.from({length:LEVEL_BOXES},(_,i)=>globalId(level,i+1)),complete=ids.filter(id=>statusBox(id)==='complete').length,units=ids.reduce((sum,id)=>sum+phaseCount(id),0);return {complete,percent:Math.round(units/(LEVEL_BOXES*3)*100)}};
    const currentLevel=snap.currentBox?location(snap.currentBox).level:5;
    const statusLevel=level=>snap.currentBox===null||level<currentLevel?'complete':level===currentLevel?'current':'locked';
    return {snap,records,phaseCount,statusBox,levelStat,currentLevel,statusLevel};
  }
  function phaseClass(count,status){if(status==='complete')return 'phase-3';return `phase-${Math.max(0,Math.min(2,count))}`}
  function chest(status){return `<span class="course-chest ${status}">${icon(status==='locked'?icons.lock:status==='complete'?icons.check:icons.book,18)}</span>`}
  function progressBar(percent){return `<span class="course-progress"><i style="width:${percent}%"></i></span>`}
  function levelsMap(m){return `<section class="course-map-panel"><div class="course-levels">${Array.from({length:5},(_,i)=>{const level=i+1,s=m.statusLevel(level),stat=m.levelStat(level);return `<button class="course-level ${s}" ${s==='locked'?'disabled':`data-course="level" data-level="${level}"`}><span>0${level}</span>${chest(s)}<div><small>المستوى ${level}</small><strong>${safe(LiplipProgress.STAGES[i])}</strong><p>${s==='locked'?'يفتح بعد إنهاء المستوى السابق':`${stat.complete} / ${LEVEL_BOXES} صندوق مكتمل`}</p>${progressBar(stat.percent)}</div><b>${stat.percent}%</b></button>`}).join('')}</div></section>`}
  function boxesMap(m,level){return `<section class="course-map-panel"><div class="course-breadcrumb"><button data-course="levels">${icon(icons.back,17)} المستويات</button><span>المستوى ${level} · ${safe(LiplipProgress.STAGES[level-1])}</span></div><div class="course-boxes">${Array.from({length:LEVEL_BOXES},(_,i)=>{const box=i+1,id=globalId(level,box),s=m.statusBox(id),count=m.phaseCount(id),record=m.records.get(id),phase=s==='complete'?3:count,label=s==='locked'?'مغلق':s==='complete'?'مراجعة':`${phaseDef(record?.currentPhase||m.snap.phase).label} · ${record?.processIndex===1?'العملية الثانية':'العملية الأولى'}`;return `<button class="course-box ${s} ${phaseClass(count,s)}" ${s==='locked'?'disabled':`data-course="box" data-box-id="${id}"`} aria-label="الصندوق ${box}: ${label}">${chest(s)}<b>${String(box).padStart(3,'0')}</b><small>${label}</small><span>${PHASES.map((_,j)=>`<i class="${j<count||s==='complete'?'done':j===count&&s==='current'?'active':''}"></i>`).join('')}</span></button>`}).join('')}</div></section>`}
  function mapPage(progress){const m=model(progress);if(!ui.level||ui.level<1||ui.level>5)ui.level=m.currentLevel;if(!ui.managerLevel)ui.managerLevel=m.currentLevel;return `<main class="course-map">${ui.view==='boxes'?boxesMap(m,ui.level):levelsMap(m)}<p class="course-map-note">${icon(icons.lock,15)} الصندوق التالي يفتح بعد إكمال المراحل الثلاث للصندوق الحالي. الصناديق المكتملة متاحة دائماً للمراجعة.</p><button class="course-control-fab" data-course="manager-open">${icon(icons.settings,20)}<span>إدارة المحتوى</span></button>${ui.manager?managerSheet():''}</main>`}

  function start(boxId,progress,{review=false}={}){const snap=LiplipProgress.courseSnapshot(progress),record=snap.records.find(x=>x.boxId===boxId);ui.boxId=boxId;ui.review=review;ui.results=false;ui.control=false;ui.storyPage=0;ui.processView=0;resetPlayer();ui.notice=review?'وضع المراجعة: لن يتغير تقدمك.':'';ui.error='';ui.phase=review?(record?.completedPhases?.at(-1)||'vocabulary'):(record?.currentPhase||snap.phase||'vocabulary')}
  function recordFor(progress){return LiplipProgress.courseSnapshot(progress).records.find(x=>x.boxId===ui.boxId)||{completedPhases:[],currentPhase:'vocabulary',processIndex:0}}
  function availablePhase(progress,key){const r=recordFor(progress),target=PHASES.findIndex(x=>x.key===key),current=PHASES.findIndex(x=>x.key===r.currentPhase);return ui.review?r.completedPhases.includes(key):target<=current||r.completedPhases.includes(key)}
  function zoneHeader(progress){const loc=location(ui.boxId),r=recordFor(progress);return `<header class="course-zone-head"><button data-course="exit">${icon(icons.back,17)} العودة للخريطة</button><div><span>المستوى ${loc.level} · الصندوق ${loc.box}</span><strong>${phaseDef(ui.phase).label}</strong></div></header>${ui.notice?`<p class="course-notice">${safe(ui.notice)}</p>`:''}<nav class="course-phase-toggle" aria-label="مراحل الصندوق">${PHASES.map((p,i)=>{const enabled=availablePhase(progress,p.key),done=r.completedPhases.includes(p.key);return `<button ${enabled?`data-course="phase" data-phase="${p.key}"`:'disabled'} class="${ui.phase===p.key?'active':''} ${done?'done':''}"><b>0${i+1}</b><span>${p.label}<small>${p.short}</small></span>${done?icon(icons.check,16):''}</button>`}).join('')}</nav>`}
  function resetPlayer(){ui.itemIndex=0;ui.flipped=false;ui.answers={};ui.micActive=false;ui.micMessage='';ui.micTranscript=''}
  function playerIndex(total){const max=Math.max(0,total-1);ui.itemIndex=Math.max(0,Math.min(max,ui.itemIndex||0));return ui.itemIndex}
  function playerHead(index,total,label){const count=Math.max(1,total),percent=Math.round((Math.min(index+1,count)/count)*100);return `<div class="course-item-progress"><div><span>${safe(label)}</span><b>${index+1} / ${count}</b></div><i><u style="width:${percent}%"></u></i></div>`}
  function playerNav(index,total,{submitLabel='',completeLabel='',review=false}={}){const last=index>=Math.max(0,total-1);return `<nav class="course-item-nav"><button type="button" data-course="item-prev" ${index===0?'disabled':''}>${icon(icons.back,18)} السابق</button>${last?(submitLabel?`<button class="primary" type="submit">${safe(submitLabel)}</button>`:`<button class="primary" type="button" data-course="complete-process">${safe(review?'انتهت المراجعة':completeLabel||'إكمال العملية')}</button>`):`<button class="primary" type="button" data-course="item-next" data-total="${total}">التالي ${icon(icons.back,18)}</button>`}</nav>`}
  function captureForm(form){if(!form||form.id!=='course-exam-form')return;try{for(const [key,value] of new FormData(form))ui.answers[key]=String(value)}catch{}}
  const answerValue=name=>String(ui.answers[name]??'');
  function micPractice(expected='',input=''){return `<div class="course-mic-practice"><button type="button" data-course="mic-start" data-expected="${safe(expected)}" data-input="${safe(input)}" class="${ui.micActive?'listening':''}"><span class="course-mic-icon">●</span><b>${ui.micActive?'أستمع الآن…':'افتح الميكروفون وتكلّم'}</b></button>${ui.micMessage?`<p class="${ui.micTranscript?'has-result':''}">${safe(ui.micMessage)}${ui.micTranscript?`<strong dir="ltr">${safe(ui.micTranscript)}</strong>`:''}</p>`:''}</div>`}
  async function startMic(expected,input,onUpdate){
    ui.micMessage='';ui.micTranscript='';ui.micActive=true;onUpdate?.();
    try{
      if(typeof navigator!=='undefined'&&navigator.mediaDevices?.getUserMedia){const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop())}
      const Recognition=typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
      if(!Recognition){ui.micActive=false;ui.micMessage='تم فتح الميكروفون، لكن التعرّف على الكلام غير مدعوم في هذا المتصفح.';onUpdate?.();return}
      const recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;recognition.maxAlternatives=1;
      recognition.onresult=event=>{const transcript=String(event.results?.[0]?.[0]?.transcript||'').trim();ui.micTranscript=transcript;if(input)ui.answers[input]=transcript;const matched=expected&&norm(transcript)===norm(expected);ui.micMessage=expected?(matched?'نطق ممتاز!':'سمعتُ هذا. حاول مرة أخرى أو انتقل عندما تكون جاهزاً.'):'تم تسجيل إجابتك الصوتية.';onUpdate?.()};
      recognition.onerror=event=>{ui.micActive=false;ui.micMessage=event.error==='not-allowed'?'اسمح باستخدام الميكروفون من إعدادات المتصفح ثم حاول مجدداً.':'تعذّر سماع الصوت. حاول مرة أخرى.';onUpdate?.()};
      recognition.onend=()=>{ui.micActive=false;onUpdate?.()};recognition.start()
    }catch{ui.micActive=false;ui.micMessage='لم يُسمح باستخدام الميكروفون. فعّل الإذن ثم حاول مجدداً.';onUpdate?.()}
  }
  function vocabKind(type){return ({word:'flashcardWord',sentence:'flashcardSentence',image:'imageToWord',voice:'voiceToSpeak'})[type]||type||'flashcardWord'}
  function vocabSpeak(item,label='تشغيل الصوت'){return item.voice?`<button type="button" class="vocab-speak" data-course="speak" data-text="${safe(item.voice)}">${icon(icons.play,18)}<span>${label}</span></button>`:''}
  function itemCard(item,i){
    const kind=vocabKind(item.type),number=String(i+1).padStart(2,'0'),en=safe(item.en),ar=safe(item.ar),image=item.image?`<img src="${safe(item.image)}" alt="${safe(item.ar||item.en)}">`:`<div class="vocab-image-placeholder">${icon(icons.book,34)}<span>أضف صورة لهذا العنصر</span></div>`;
    if(kind==='flashcardWord'){const flipped=ui.flipped===i;return `<article class="vocab-card vocab-flashcard-word" data-vocab-type="flashcardWord"><header><span>${number}</span><em>بطاقة كلمة</em></header><button type="button" class="vocab-flip-card ${flipped?'is-flipped':''}" data-course="vocab-flip" data-index="${i}" aria-pressed="${flipped}"><span class="vocab-flip-inner"><span class="vocab-flip-face"><small>اضغط لقلب البطاقة</small><strong dir="ltr">${en}</strong></span><span class="vocab-flip-back"><small>اضغط للعودة إلى الوجه</small><strong>${ar}</strong></span></span></button>${vocabSpeak(item,'استمع إلى الكلمة')}</article>`}
    if(kind==='flashcardSentence')return `<article class="vocab-card vocab-sentence-card" data-vocab-type="flashcardSentence"><header><span>${number}</span><em>بطاقة جملة</em></header><div class="vocab-sentence-en"><small>English</small><p dir="ltr">${en}</p></div><div class="vocab-sentence-ar"><small>العربية</small><p>${ar}</p></div>${vocabSpeak(item,'استمع إلى الجملة')}</article>`;
    if(kind==='imageToWord')return `<figure class="vocab-card vocab-image-word" data-vocab-type="imageToWord"><header><span>${number}</span><em>صورة إلى كلمة</em></header>${image}<figcaption><small>الكلمة</small><strong dir="ltr">${en}</strong><span>${ar}</span></figcaption>${vocabSpeak(item,'استمع إلى الكلمة')}</figure>`;
    if(kind==='voiceToSpeak')return `<article class="vocab-card vocab-voice-speak" data-vocab-type="voiceToSpeak"><header><span>${number}</span><em>اسمع وتكلّم</em></header><div class="vocab-speak-steps"><span><b>1</b> استمع</span><span><b>2</b> افتح الميكروفون وكرّر</span></div>${vocabSpeak(item,'شغّل الصوت')}<blockquote dir="ltr">${en}</blockquote>${ar?`<p>${ar}</p>`:''}${micPractice(item.en)}</article>`;
    if(kind==='imageToSpeak')return `<figure class="vocab-card vocab-image-speak" data-vocab-type="imageToSpeak"><header><span>${number}</span><em>شاهد وتكلّم</em></header>${image}<figcaption><strong>ماذا ترى؟ قل الإجابة بالإنجليزية.</strong><details><summary>اكشف الإجابة</summary><p dir="ltr">${en}</p><span>${ar}</span></details></figcaption>${micPractice(item.en)}${vocabSpeak(item,'استمع بعد المحاولة')}</figure>`;
    return `<article class="vocab-card vocab-unknown" data-vocab-type="${safe(kind)}"><header><span>${number}</span><em>${safe(kind)}</em></header><strong dir="ltr">${en}</strong><p>${ar}</p>${vocabSpeak(item)}</article>`
  }
  const VOCAB_GROUPS=[
    {key:'flashcardWord',title:'بطاقات الكلمات',hint:'اقلب البطاقة لتكشف معناها.'},
    {key:'flashcardSentence',title:'بطاقات الجمل',hint:'اقرأ الجملة وقارنها بالترجمة.'},
    {key:'imageToWord',title:'الصورة إلى كلمة',hint:'اربط الصورة بالكلمة ومعناها.'},
    {key:'voiceToSpeak',title:'اسمع وتكلّم',hint:'استمع ثم كرّر العبارة بصوت واضح.'},
    {key:'imageToSpeak',title:'شاهد وتكلّم',hint:'صف الصورة باستخدام الميكروفون.'}
  ];
  function vocabularyDeck(items){return VOCAB_GROUPS.map(group=>{const entries=items.map((item,index)=>({item,index})).filter(x=>vocabKind(x.item.type)===group.key);if(!entries.length)return '';return `<section class="vocab-group ${group.key}" data-vocab-group="${group.key}"><header><div><small>نوع النشاط</small><h2>${group.title}</h2><p>${group.hint}</p></div><b>${entries.length}</b></header><div class="vocab-group-grid">${entries.map(x=>itemCard(x.item,x.index)).join('')}</div></section>`}).join('')}
  function questions(items,prefix,startIndex=0){
    return items.map((q,offset)=>{const i=startIndex+offset,name=prefix+i,image=q.image?`<img src="${safe(q.image)}" alt="صورة السؤال">`:'',voice=q.voice?`<button type="button" data-course="speak" data-text="${safe(q.voice)}">تشغيل الصوت</button>`:'',spoken=['voiceToSpeak','imageToVoice'].includes(q.type);let control='';
      if(q.type==='match')control=`<div class="course-match" dir="auto">${(q.matches||[]).map((pair,j)=>{const field=name+':'+j;return `<label><span>${safe(pair.left)}</span><select name="${field}" required><option value="">اختر المطابقة</option>${(q.matches||[]).map((x,k)=>`<option value="${k}" ${answerValue(field)===String(k)?'selected':''}>${safe(x.right)}</option>`).join('')}</select></label>`}).join('')}</div>`;
      else if(['mcq','trueFalse'].includes(q.type)&&Array.isArray(q.options)&&q.options.length)control=`<div class="course-options" dir="auto">${q.options.map((x,j)=>`<label><input type="radio" name="${name}" value="${j}" ${answerValue(name)===String(j)?'checked':''} required>${safe(x)}</label>`).join('')}</div>`;
      else control=`<label class="course-written"><span>${spoken?'انطق الإجابة أو اكتبها':'اكتب الإجابة'}</span><input name="${name}" value="${safe(answerValue(name))}" required autocomplete="off"></label>${spoken?micPractice('',name):''}`;
      return `<article class="course-question ${safe(q.type||'fillBlank')}"><div class="course-question-title"><b>${String(i+1).padStart(2,'0')}</b><div><small>${safe(q.type||'fillBlank')}</small><h2>${safe(q.prompt)}</h2></div></div>${image}${voice}${control}</article>`
    }).join('')
  }
  function examPlayer({phase,process='exam',items,title,subtitle,submitLabel}){
    const total=Math.max(1,items.length),index=playerIndex(total),question=items[index],body=question?questions([question],'q',index):'<div class="course-empty">لا توجد أسئلة في هذه العملية.</div>';
    return `<section class="course-exam-player"><header><span>${safe(title)}</span><h1>${safe(subtitle)}</h1></header>${playerHead(index,total,'سؤال')}<form id="course-exam-form" data-phase="${phase}" data-process="${process}">${body}${playerNav(index,total,{submitLabel})}</form></section>`
  }
  function vocabulary(progress,content,processIndex){
    if(processIndex===1)return examPlayer({phase:'vocabulary',items:content.questions||[],title:'المرحلة 01 · العملية 02',subtitle:'اختبار المفردات والصوت والصورة',submitLabel:'تحقق من الإجابات'});
    const total=Math.max(1,content.items.length),index=playerIndex(total),item=content.items[index],kind=item?vocabKind(item.type):'flashcardWord',group=VOCAB_GROUPS.find(x=>x.key===kind)||VOCAB_GROUPS[0];
    return `<section class="phase-vocabulary"><header><span>المرحلة 01 · العملية 01</span><h1>${group.title}</h1><p>${group.hint}</p></header>${playerHead(index,total,group.title)}<div class="vocab-deck vocab-single">${item?itemCard(item,index):'<div class="course-empty">لا توجد عناصر مفردات.</div>'}</div>${playerNav(index,total,{completeLabel:'ابدأ اختبار المفردات',review:ui.review})}</section>`
  }
  function grammarItems(article){return [...(article.laws||[]).map(x=>({kind:'law',...x})),...(article.notes||[]).map((text,i)=>({kind:'note',text,index:i})),...(article.examples||[]).map((x,i)=>({kind:'example',...x,index:i}))]}
  function grammarItem(item,index){
    if(item.kind==='law')return `<article class="grammar-step-card law ${safe(item.type)}"><span>قانون بناء الجملة</span><h2>${safe(item.title)}</h2><p>${safe(item.rule)}</p><strong dir="ltr">${safe(item.formula)}</strong></article>`;
    if(item.kind==='note')return `<article class="grammar-step-card note"><span>ملاحظة مهمّة ${index+1}</span><div>!</div><p>${safe(item.text)}</p></article>`;
    return `<article class="grammar-step-card example ${safe(item.difficulty)}"><span>مثال · ${safe(item.difficulty)}</span><b>${String(index+1).padStart(2,'0')}</b><p dir="ltr">${safe(item.text)}</p></article>`
  }
  function grammar(progress,content,processIndex){
    if(processIndex===1)return examPlayer({phase:'grammar',items:content.questions||[],title:'المرحلة 02 · العملية 02',subtitle:'اختبار القواعد',submitLabel:'تحقق من الإجابات'});
    const a=content.article||{},items=grammarItems(a),total=Math.max(1,items.length),index=playerIndex(total);
    return `<article class="phase-grammar"><header><span>المرحلة 02 · العملية 01</span><h1>${safe(a.title||'مقال القاعدة')}</h1><p>${safe(a.rule)}</p></header>${playerHead(index,total,'شرح القاعدة')}${items[index]?grammarItem(items[index],index):'<div class="course-empty">لا توجد عناصر قواعد.</div>'}${playerNav(index,total,{completeLabel:'ابدأ اختبار القواعد',review:ui.review})}</article>`
  }
  function youtubeId(value){const s=String(value||'').trim();if(/^[\w-]{6,20}$/.test(s))return s;try{const u=new URL(s);if(u.hostname==='youtu.be')return u.pathname.slice(1);if(/(^|\.)youtube\.com$/.test(u.hostname))return u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()||''}catch{}return ''}
  function watchRead(progress,content,processIndex){
    if(processIndex===0){
      const questionsList=content.videoQuestions||[],total=Math.max(1,1+questionsList.length),index=playerIndex(total),video=content.video||{},id=youtubeId(video.youtube);
      if(index===0)return `<section class="phase-watch watch-video-player"><header><span>المرحلة 03 · العملية 01</span><h1>${safe(video.title||'شاهد الفيديو ثم أجب')}</h1><p>ركّز في التفاصيل. بعد الفيديو ستظهر الأسئلة واحداً واحداً.</p></header>${playerHead(index,total,'الفيديو')}${id?`<div class="course-video"><iframe src="https://www.youtube-nocookie.com/embed/${safe(id)}?rel=0" title="${safe(video.title)}" allowfullscreen></iframe></div>`:'<div class="course-empty">أضف رابط YouTube من إدارة المحتوى.</div>'}${playerNav(index,total,{completeLabel:'انتقل إلى أسئلة الفيديو',review:ui.review})}</section>`;
      const qIndex=index-1,q=questionsList[qIndex];return `<section class="phase-watch watch-exam-player"><header><span>المرحلة 03 · العملية 01</span><h1>اختبار الفيديو</h1><p>سؤال واحد في كل خطوة حتى يبقى تركيزك على الإجابة.</p></header>${playerHead(index,total,'الفيديو والأسئلة')}<form id="course-exam-form" data-phase="watchRead" data-process="video">${questions(q?[q]:[],'q',qIndex)}${playerNav(index,total,{submitLabel:'أنهيت أسئلة الفيديو'})}</form></section>`
    }
    const pages=content.story||[],questionsList=content.storyQuestions||[],total=Math.max(1,pages.length+questionsList.length),index=playerIndex(total);
    if(index<pages.length){const page=pages[index];return `<section class="phase-story story-page-player"><header><span>المرحلة 03 · العملية 02</span><h1>${safe(page?.title||'اقرأ القصة')}</h1><p>اقرأ على راحتك. الترجمة موجودة تحت النص لمساعدتك.</p></header>${playerHead(index,total,'القصة والأسئلة')}<article class="story-spread">${page.image?`<figure><img src="${safe(page.image)}" alt="صورة القصة"><figcaption>مشهد من القصة</figcaption></figure>`:''}<div><span>صفحة ${index+1} من ${pages.length}</span><p dir="ltr">${safe(page.text)}</p><aside><small>المعنى بالعربية</small>${safe(page.arabic)}</aside></div></article>${playerNav(index,total,{completeLabel:'انتقل إلى أسئلة القصة',review:ui.review})}</section>`}
    const qIndex=index-pages.length,q=questionsList[qIndex];return `<section class="phase-story story-exam-player"><header><span>المرحلة 03 · العملية 02</span><h1>اختبار القصة</h1><p>تذكّر الأحداث واختر إجابتك قبل الانتقال للسؤال التالي.</p></header>${playerHead(index,total,'القصة والأسئلة')}<form id="course-exam-form" data-phase="watchRead" data-process="story">${questions(q?[q]:[],'q',qIndex)}${playerNav(index,total,{submitLabel:'أنهيت القصة والأسئلة'})}</form></section>`
  }
  function resultScore(record){const vocabulary=record.scores?.['vocabulary:exam']??0,grammar=record.scores?.['grammar:exam']??0,video=record.scores?.['watchRead:video']??0,story=record.scores?.['watchRead:story']??0,watchRead=Math.round((video+story)/2),total=Math.round((vocabulary+grammar+watchRead)/3);return {vocabulary,grammar,watchRead,total}}
  function boxResult(progress){const loc=location(ui.boxId),record=recordFor(progress),score=resultScore(record),next=LiplipProgress.courseSnapshot(progress).currentBox;return `<main class="course-result"><section class="course-result-card"><span class="course-result-kicker">اكتمل الصندوق ${String(loc.box).padStart(3,'0')}</span><div class="course-result-score"><strong>${score.total}%</strong><small>درجة الصندوق</small></div><h1>أحسنت! أكملت المراحل الثلاث.</h1><p>الدرجة تعتمد على إجابات الاختبارات فقط. لكل مرحلة ثلث الدرجة النهائية.</p><div class="course-result-phases"><article><b>33.333%</b><span>المفردات</span><strong>${score.vocabulary}%</strong></article><article><b>33.333%</b><span>القواعد</span><strong>${score.grammar}%</strong></article><article><b>33.333%</b><span>شاهد واقرأ</span><strong>${score.watchRead}%</strong><small>متوسط أسئلة الفيديو والقصة</small></article></div><div class="course-result-actions"><button data-course="result-close">إغلاق</button><button class="primary" data-course="result-next" ${next===null?'disabled':''}>التالي</button><button data-course="result-repeat">تكرار</button></div></section></main>`}
  function learning(progress){if(ui.results)return boxResult(progress);const content=getContent(ui.boxId),r=recordFor(progress),phase=phaseDef(ui.phase),isCompleted=r.completedPhases.includes(ui.phase),processIndex=isCompleted?ui.processView:(ui.phase===r.currentPhase?r.processIndex:0),body=ui.phase==='vocabulary'?vocabulary(progress,content.vocabulary,processIndex):ui.phase==='grammar'?grammar(progress,content.grammar,processIndex):watchRead(progress,content.watchRead,processIndex),reviewNav=isCompleted?`<nav class="course-process-review"><span>مراجعة عمليات ${phase.label}</span>${phase.processes.map((_,i)=>`<button data-course="review-process" data-process="${i}" class="${processIndex===i?'active':''}">العملية ${i+1}</button>`).join('')}</nav>`:'';return `<main class="course-zone ${ui.phase}">${zoneHeader(progress)}${reviewNav}<div class="course-zone-body">${body}</div>${isCompleted?'<p class="course-review-note">هذه مرحلة مكتملة مفتوحة للمراجعة. الإجابات هنا لا تغيّر التقدّم.</p>':''}${ui.control?controlPanel():''}</main>`}


  const PROCESS_LABELS={vocabulary:{content:'الكلمات والجمل والصور والأصوات',exam:'اختبار المفردات'},grammar:{article:'مقال القواعد',exam:'اختبار القواعد'},watchRead:{video:'الفيديو وأسئلته',story:'القصة وأسئلتها'}};
  const managerId=()=>globalId(ui.managerLevel,ui.managerBox);
  const managerValue=(data,key)=>safe(data?.[key]||'');
  function managerSelectors(){
    const processes=phaseDef(ui.managerPhase).processes;
    if(!processes.includes(ui.managerProcess))ui.managerProcess=processes[0];
    return `<div class="course-manager-selectors"><label>المستوى<select data-course-manager-field="level">${Array.from({length:5},(_,i)=>`<option value="${i+1}" ${ui.managerLevel===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label><label>الصندوق<select data-course-manager-field="box">${Array.from({length:LEVEL_BOXES},(_,i)=>`<option value="${i+1}" ${ui.managerBox===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label><label>المرحلة<select data-course-manager-field="phase">${PHASES.map(p=>`<option value="${p.key}" ${ui.managerPhase===p.key?'selected':''}>${p.label}</option>`).join('')}</select></label><label>العملية<select data-course-manager-field="process">${processes.map(p=>`<option value="${p}" ${ui.managerProcess===p?'selected':''}>${PROCESS_LABELS[ui.managerPhase][p]}</option>`).join('')}</select></label></div>`
  }
  const managerField=(label,name,value='',type='text',required=false)=>`<label>${label}<input type="${type}" name="${name}" value="${safe(value)}" ${required?'required':''}></label>`;
  const managerArea=(label,name,value='',required=false)=>`<label class="wide">${label}<textarea name="${name}" rows="3" ${required?'required':''}>${safe(value)}</textarea></label>`;
  function questionFields(q={}){
    const options=q.options||[],matches=q.matches||[];
    return `<label>نوع السؤال<select name="questionType">${QUESTION_TYPES.map(type=>`<option value="${type}" ${(q.type||'mcq')===type?'selected':''}>${type}</option>`).join('')}</select></label>${managerArea('السؤال','prompt',q.prompt,true)}${managerField('الخيار 1','option1',options[0]||'')}${managerField('الخيار 2','option2',options[1]||'')}${managerField('الخيار 3','option3',options[2]||'')}${managerField('الخيار 4','option4',options[3]||'')}<label>الخيار الصحيح<select name="correct">${[1,2,3,4].map(n=>`<option value="${n}" ${(q.correct??0)===n-1?'selected':''}>${n}</option>`).join('')}</select></label>${managerField('الإجابة النصية','answer',q.answer||'')}${[1,2,3,4].map((n,i)=>managerField('مطابقة يسار '+n,'matchLeft'+n,matches[i]?.left||'')+managerField('مطابقة يمين '+n,'matchRight'+n,matches[i]?.right||'')).join('')}${managerArea('شرح الإجابة','explanation',q.explanation||'')}${managerField('رابط الصورة','image',q.image||'','url')}${managerField('نص الصوت','voice',q.voice||'')}`
  }
  function manualForm(){
    const phase=ui.managerPhase,process=ui.managerProcess;
    let fields='';
    if(phase==='vocabulary'&&process==='content')fields=`<label>نوع العنصر<select name="kind"><option value="flashcardWord">بطاقة كلمة</option><option value="flashcardSentence">بطاقة جملة</option><option value="imageToWord">صورة إلى كلمة</option><option value="voiceToSpeak">صوت إلى نطق</option><option value="imageToSpeak">صورة إلى نطق</option></select></label>${managerField('English','en','', 'text',true)}${managerField('العربية','ar')}${managerField('رابط الصورة','image','','url')}${managerField('نص الصوت','voice')}`;
    else if((phase==='vocabulary'||phase==='grammar')&&process==='exam')fields=questionFields();
    else if(phase==='grammar'&&process==='article')fields=`<label>نوع العنصر<select name="kind"><option value="article">القانون والصيغ</option><option value="note">ملاحظة</option><option value="example">مثال</option></select></label>${managerField('العنوان','title')}${managerArea('القانون أو النص','text')}${managerField('الصيغة العادية','normal')}${managerField('صيغة النفي','negative')}${managerField('صيغة السؤال','question')}${managerField('الصعوبة','difficulty','easy')}`;
    else if(phase==='watchRead'&&process==='video')fields=`<label>نوع العنصر<select name="kind"><option value="video">فيديو</option><option value="question">سؤال الفيديو</option></select></label>${managerField('العنوان','title')}${managerField('رابط YouTube','youtube')}${questionFields()}`;
    else fields=`<label>نوع العنصر<select name="kind"><option value="story">صفحة قصة</option><option value="question">سؤال القصة</option></select></label>${managerField('العنوان','title')}${managerArea('نص القصة','text')}${managerArea('النص العربي','arabic')}${managerField('رابط الصورة','image','','url')}${questionFields()}`;
    return `<form id="course-manager-add" class="course-manager-form"><div class="course-manager-fields">${fields}</div><button type="submit">إضافة العنصر</button></form>`
  }
  function editForm(kind,index,title,fields,fixed=false){return `<form id="course-manager-edit" class="course-manager-item" data-kind="${kind}" data-index="${index}"><header><strong>${safe(title)}</strong>${fixed?'':`<button type="button" data-course="manager-delete" data-kind="${kind}" data-index="${index}">حذف</button>`}</header><div class="course-manager-fields">${fields}</div><button type="submit">حفظ التعديل</button></form>`}
  function editItems(){
    const content=getContent(managerId()),phase=ui.managerPhase,process=ui.managerProcess;let forms=[];
    if(phase==='vocabulary'&&process==='content')forms=content.vocabulary.items.map((x,i)=>editForm('vocab-item',i,`عنصر ${i+1}`,`<label>النوع<select name="kind">${['flashcardWord','flashcardSentence','imageToWord','voiceToSpeak','imageToSpeak'].map(k=>`<option value="${k}" ${x.type===k?'selected':''}>${k}</option>`).join('')}</select></label>${managerField('English','en',x.en)}${managerField('العربية','ar',x.ar)}${managerField('رابط الصورة','image',x.image,'url')}${managerField('نص الصوت','voice',x.voice)}`));
    else if(phase==='vocabulary'&&process==='exam')forms=content.vocabulary.questions.map((x,i)=>editForm('vocab-question',i,`سؤال ${i+1}`,questionFields(x)));
    else if(phase==='grammar'&&process==='article'){
      const a=content.grammar.article||{};forms.push(editForm('grammar-article',0,'القانون والصيغ',`${managerField('العنوان','title',a.title)}${managerArea('القانون','text',a.rule)}${managerField('الصيغة العادية','normal',a.normal)}${managerField('صيغة النفي','negative',a.negative)}${managerField('صيغة السؤال','question',a.question)}`,true));
      forms.push(...(a.notes||[]).map((x,i)=>editForm('grammar-note',i,`ملاحظة ${i+1}`,managerArea('النص','text',x,true))));
      forms.push(...(a.examples||[]).map((x,i)=>editForm('grammar-example',i,`مثال ${i+1}`,`${managerArea('المثال','text',x.text,true)}${managerField('الصعوبة','difficulty',x.difficulty)}`)));
    } else if(phase==='grammar'&&process==='exam')forms=content.grammar.questions.map((x,i)=>editForm('grammar-question',i,`سؤال ${i+1}`,questionFields(x)));
    else if(phase==='watchRead'&&process==='video'){
      forms.push(editForm('watch-video',0,'الفيديو',`${managerField('العنوان','title',content.watchRead.video?.title)}${managerField('رابط YouTube','youtube',content.watchRead.video?.youtube)}`,true));
      forms.push(...(content.watchRead.videoQuestions||[]).map((x,i)=>editForm('video-question',i,`سؤال الفيديو ${i+1}`,questionFields(x))));
    } else {
      forms.push(...(content.watchRead.story||[]).map((x,i)=>editForm('story-page',i,`صفحة ${i+1}`,`${managerField('العنوان','title',x.title)}${managerArea('نص القصة','text',x.text)}${managerArea('النص العربي','arabic',x.arabic)}${managerField('رابط الصورة','image',x.image,'url')}`)));
      forms.push(...(content.watchRead.storyQuestions||[]).map((x,i)=>editForm('story-question',i,`سؤال القصة ${i+1}`,questionFields(x))));
    }
    return forms.length?forms.join(''):'<p class="course-manager-empty">لا توجد عناصر في هذه العملية بعد.</p>'
  }
  function managerBody(){
    if(ui.managerMode==='home')return `<div class="course-manager-home"><button data-course="manager-mode" data-mode="add"><b>1</b><span><strong>إضافة محتوى</strong><small>إضافة يدوية أو استيراد ملف</small></span></button><button data-course="manager-mode" data-mode="edit"><b>2</b><span><strong>تعديل المحتوى</strong><small>اختر الموقع وعدّل عناصره</small></span></button></div>`;
    if(ui.managerMode==='add')return `<div class="course-manager-home"><button data-course="manager-mode" data-mode="manual"><b>A</b><span><strong>إضافة يدوية</strong><small>اختر المستوى والصندوق والمرحلة والعملية</small></span></button><button data-course="manager-mode" data-mode="import"><b>B</b><span><strong>استيراد</strong><small>ملف Excel أو حزمة القوالب</small></span></button></div>`;
    if(ui.managerMode==='manual')return `${managerSelectors()}${manualForm()}`;
    if(ui.managerMode==='import')return `<div class="course-manager-import"><label>استيراد ملف Excel<input type="file" data-course-manager-import accept=".xlsx"></label><button data-course="manager-template-zip">تنزيل حزمة القوالب ZIP<code>liplip-content-templates.zip</code></button><p>تحتوي الحزمة على <code>liplip-vocabulary.xlsx</code> و<code>liplip-grammar.xlsx</code> و<code>liplip-watch-read.xlsx</code>. يحدد عمود Phase نوع الملف.</p></div>`;
    return `${managerSelectors()}<div class="course-manager-items">${editItems()}</div>`
  }
  function managerSheet(){return `<div class="course-manager-overlay"><button class="course-manager-backdrop" data-course="manager-close" aria-label="إغلاق"></button><section class="course-manager-sheet" role="dialog" aria-modal="true"><header><div><small>إدارة محتوى الدراسة</small><h2>${ui.managerMode==='home'?'إدارة المحتوى':ui.managerMode==='edit'?'تعديل المحتوى':ui.managerMode==='import'?'استيراد المحتوى':'إضافة محتوى'}</h2></div><div>${ui.managerMode!=='home'?'<button data-course="manager-back">رجوع</button>':''}<button data-course="manager-close">إغلاق</button></div></header>${ui.error?`<p class="course-control-error">${safe(ui.error)}</p>`:ui.notice?`<p class="course-control-success">${safe(ui.notice)}</p>`:''}<div class="course-manager-body">${managerBody()}</div></section></div>`}
  const managerText=(form,name)=>String(new FormData(form).get(name)||'').trim();
  function managerQuestion(form){
    const data=new FormData(form),type=String(data.get('questionType')||'mcq'),options=[1,2,3,4].map(i=>String(data.get('option'+i)||'').trim()).filter(Boolean),matches=[1,2,3,4].map(i=>({left:String(data.get('matchLeft'+i)||'').trim(),right:String(data.get('matchRight'+i)||'').trim()})).filter(x=>x.left&&x.right);
    return {type,prompt:String(data.get('prompt')||'').trim(),options:type==='trueFalse'&&options.length<2?['True','False']:options,correct:Math.max(0,Math.min(Math.max(0,options.length-1),Number(data.get('correct')||1)-1)),answer:String(data.get('answer')||'').trim(),matches,explanation:String(data.get('explanation')||'').trim(),image:String(data.get('image')||'').trim(),voice:String(data.get('voice')||'').trim()}
  }
  function managerSubmit(form){
    ui.error='';ui.notice='';const id=managerId(),content=getContent(id),phase=ui.managerPhase,process=ui.managerProcess,data=new FormData(form);
    try{
      if(form.id==='course-manager-add'){
        const kind=String(data.get('kind')||'');
        if(phase==='vocabulary'&&process==='content')content.vocabulary.items.push({type:kind,order:content.vocabulary.items.length+1,en:managerText(form,'en'),ar:managerText(form,'ar'),image:managerText(form,'image'),voice:managerText(form,'voice')});
        else if((phase==='vocabulary'||phase==='grammar')&&process==='exam')(phase==='vocabulary'?content.vocabulary.questions:content.grammar.questions).push(managerQuestion(form));
        else if(phase==='grammar'&&process==='article'){
          const a=content.grammar.article;
          if(kind==='article')Object.assign(a,{title:managerText(form,'title'),rule:managerText(form,'text'),normal:managerText(form,'normal'),negative:managerText(form,'negative'),question:managerText(form,'question')});
          else if(kind==='note')a.notes.push(managerText(form,'text'));
          else a.examples.push({text:managerText(form,'text'),difficulty:managerText(form,'difficulty')||'easy'});
        } else if(phase==='watchRead'&&process==='video'){
          if(kind==='video')content.watchRead.video={title:managerText(form,'title'),youtube:managerText(form,'youtube')};
          else content.watchRead.videoQuestions.push(managerQuestion(form));
        } else {
          if(kind==='story')content.watchRead.story.push({order:content.watchRead.story.length+1,title:managerText(form,'title'),text:managerText(form,'text'),arabic:managerText(form,'arabic'),image:managerText(form,'image')});
          else content.watchRead.storyQuestions.push(managerQuestion(form));
        }
        storeBox(id,content);ui.notice='تمت إضافة العنصر وحفظه.';return true
      }
      if(form.id==='course-manager-edit'){
        const kind=form.dataset.kind,index=Number(form.dataset.index),q=()=>managerQuestion(form);
        if(kind==='vocab-item')content.vocabulary.items[index]={type:managerText(form,'kind'),order:index+1,en:managerText(form,'en'),ar:managerText(form,'ar'),image:managerText(form,'image'),voice:managerText(form,'voice')};
        if(kind==='vocab-question')content.vocabulary.questions[index]=q();
        if(kind==='grammar-article')Object.assign(content.grammar.article,{title:managerText(form,'title'),rule:managerText(form,'text'),normal:managerText(form,'normal'),negative:managerText(form,'negative'),question:managerText(form,'question')});
        if(kind==='grammar-note')content.grammar.article.notes[index]=managerText(form,'text');
        if(kind==='grammar-example')content.grammar.article.examples[index]={text:managerText(form,'text'),difficulty:managerText(form,'difficulty')||'easy'};
        if(kind==='grammar-question')content.grammar.questions[index]=q();
        if(kind==='watch-video')content.watchRead.video={title:managerText(form,'title'),youtube:managerText(form,'youtube')};
        if(kind==='video-question')content.watchRead.videoQuestions[index]=q();
        if(kind==='story-page')content.watchRead.story[index]={order:index+1,title:managerText(form,'title'),text:managerText(form,'text'),arabic:managerText(form,'arabic'),image:managerText(form,'image')};
        if(kind==='story-question')content.watchRead.storyQuestions[index]=q();
        storeBox(id,content);ui.notice='تم حفظ التعديل.';return true
      }
    }catch(e){ui.error=e.message||'تعذّر حفظ المحتوى.'}return false
  }
  function managerDelete(kind,index){
    const content=getContent(managerId()),lists={ 'vocab-item':content.vocabulary.items,'vocab-question':content.vocabulary.questions,'grammar-note':content.grammar.article.notes,'grammar-example':content.grammar.article.examples,'grammar-question':content.grammar.questions,'video-question':content.watchRead.videoQuestions,'story-page':content.watchRead.story,'story-question':content.watchRead.storyQuestions};
    const list=lists[kind];if(!list||!Number.isInteger(index)||index<0||index>=list.length)return false;list.splice(index,1);storeBox(managerId(),content);ui.notice='تم حذف العنصر.';ui.error='';return true
  }
  function managerChange(target){
    const field=target.dataset.courseManagerField;if(!field)return false;
    if(field==='level')ui.managerLevel=Math.max(1,Math.min(5,Number(target.value)||1));
    if(field==='box')ui.managerBox=Math.max(1,Math.min(LEVEL_BOXES,Number(target.value)||1));
    if(field==='phase'){ui.managerPhase=PHASES.some(p=>p.key===target.value)?target.value:'vocabulary';ui.managerProcess=phaseDef(ui.managerPhase).processes[0]}
    if(field==='process'&&phaseDef(ui.managerPhase).processes.includes(target.value))ui.managerProcess=target.value;
    ui.notice='';ui.error='';return true
  }

  const QUESTION_TYPES=['mcq','fillBlank','voiceToSpeak','imageToVoice','match','trueFalse'];
  const HEADERS={
    vocabulary:['Phase','Level','Box','Process','Feature','Order','Item Type','English','Arabic','Sentence','Image URL','Voice Text','Question Type','Question Prompt','Option 1','Option 2','Option 3','Option 4','Correct Option','Answer','Match Left 1','Match Right 1','Match Left 2','Match Right 2','Match Left 3','Match Right 3','Match Left 4','Match Right 4','Explanation'],
    grammar:['Phase','Level','Box','Process','Feature','Order','Law Type','Title','Grammar Law','Formula','Important Note','Example','Difficulty','Question Type','Question Prompt','Voice Text','Image URL','Option 1','Option 2','Option 3','Option 4','Correct Option','Answer','Match Left 1','Match Right 1','Match Left 2','Match Right 2','Match Left 3','Match Right 3','Match Left 4','Match Right 4','Explanation'],
    watchRead:['Phase','Level','Box','Process','Feature','Order','Title','Video URL','Story Text','Arabic Text','Image URL','Voice Text','Question Type','Question Prompt','Option 1','Option 2','Option 3','Option 4','Correct Option','Answer','Match Left 1','Match Right 1','Match Left 2','Match Right 2','Match Left 3','Match Right 3','Match Left 4','Match Right 4','Explanation']
  };
  const FEATURE_HELP={vocabulary:'flashcardWord · flashcardSentence · imageToWord · voiceToSpeak · imageToSpeak · examQuestion',grammar:'sentenceBuildLaw · importantNote · example · examQuestion',watchRead:'video · videoExamQuestion · storyPage · storyExamQuestion'};
  function controlPanel(){const loc=location(ui.boxId);return `<div class="course-control-overlay"><button class="course-control-backdrop" data-course="control-close" aria-label="إغلاق"></button><section class="course-control" role="dialog" aria-modal="true"><header><div><small>المستوى ${loc.level} · الصندوق ${loc.box}</small><h2>إدارة محتوى المراحل</h2></div><button data-course="control-close">إغلاق</button></header><p>لكل مرحلة ملف Excel مستقل. عمود Phase يقبل قيمة واحدة فقط، ولا يوجد عمود Step.</p><div class="course-template-grid">${PHASES.map(p=>`<article class="${p.key}"><span>${p.label}</span><h3>${PHASE_FILE[p.key]}</h3><code>Phase = ${PHASE_VALUE[p.key]}</code><small>${FEATURE_HELP[p.key]}</small><div><button data-course="download-template" data-phase="${p.key}">تنزيل القالب</button><label>استيراد الملف<input type="file" data-course-import="${p.key}" accept=".xlsx"></label></div></article>`).join('')}</div>${ui.error?`<p class="course-control-error">${safe(ui.error)}</p>`:ui.notice?`<p class="course-control-success">${safe(ui.notice)}</p>`:''}</section></div>`}

  function xmlEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  function colName(i){let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s}
  function worksheet(rows){return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows.map((row,ri)=>`<row r="${ri+1}">${row.map((v,ci)=>`<c r="${colName(ci)}${ri+1}" t="inlineStr"${ri===0?' s="1"':''}><is><t>${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:${colName(rows[0].length-1)}${rows.length}"/></worksheet>`}
  function rowFrom(phase,values){return HEADERS[phase].map(h=>values[h]??'')}
  function examExamples(phase,process,feature,start=1){
    const base={Phase:PHASE_VALUE[phase],Level:1,Box:1,Process:process,Feature:feature};
    return [
      {...base,Order:start,'Question Type':'mcq','Question Prompt':'Choose the correct answer.','Option 1':'correct','Option 2':'option B','Option 3':'option C','Option 4':'option D','Correct Option':1,Answer:'correct',Explanation:'Option 1 is correct.'},
      {...base,Order:start+1,'Question Type':'fillBlank','Question Prompt':'Complete: I ___ English every day.',Answer:'study',Explanation:'Use the base verb after I.'},
      {...base,Order:start+2,'Question Type':'voiceToSpeak','Question Prompt':'Listen, say the sentence, then type what you said.','Voice Text':'How are you today?',Answer:'How are you today?',Explanation:'Repeat the complete sentence.'},
      {...base,Order:start+3,'Question Type':'imageToVoice','Question Prompt':'Look at the image, say the word, then type it.','Image URL':'https://example.com/images/apple.jpg',Answer:'apple',Explanation:'The image shows an apple.'},
      {...base,Order:start+4,'Question Type':'match','Question Prompt':'Match each English item with its meaning.','Match Left 1':'book','Match Right 1':'كتاب','Match Left 2':'water','Match Right 2':'ماء','Match Left 3':'school','Match Right 3':'مدرسة','Match Left 4':'friend','Match Right 4':'صديق',Explanation:'Match every item once.'},
      {...base,Order:start+5,'Question Type':'trueFalse','Question Prompt':'The sentence "She reads every day" is in the present simple.','Option 1':'True','Option 2':'False','Correct Option':1,Answer:'True',Explanation:'It describes a repeated action.'}
    ].map(x=>rowFrom(phase,x))
  }
  function templateRows(phase){
    const p=PHASE_VALUE[phase],rows=[HEADERS[phase]];
    if(phase==='vocabulary'){
      const words=[['hello','مرحباً'],['family','عائلة'],['market','سوق'],['teacher','معلّم'],['water','ماء']];
      words.forEach(([en,ar],i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'content',Feature:'flashcardWord',Order:i+1,'Item Type':'word',English:en,Arabic:ar,'Voice Text':en})));
      const sentences=[['Hello, how are you?','مرحباً، كيف حالك؟'],['My family lives in Baghdad.','عائلتي تعيش في بغداد.'],['The market is open today.','السوق مفتوح اليوم.'],['The teacher explains the lesson.','المعلّم يشرح الدرس.'],['I drink water every morning.','أشرب الماء كل صباح.']];
      sentences.forEach(([en,ar],i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'content',Feature:'flashcardSentence',Order:6+i,'Item Type':'sentence',Sentence:en,Arabic:ar,'Voice Text':en})));
      ['apple','book','car','house'].forEach((en,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'content',Feature:'imageToWord',Order:11+i,'Item Type':'imageWord',English:en,Arabic:['تفاحة','كتاب','سيارة','بيت'][i],'Image URL':`https://example.com/images/${en}.jpg`,'Voice Text':en})));
      ['Good morning.','Please help me.','Thank you very much.','See you tomorrow.'].forEach((en,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'content',Feature:'voiceToSpeak',Order:15+i,'Item Type':'voiceSpeak',English:en,'Voice Text':en})));
      ['cat','phone','chair','tree'].forEach((en,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'content',Feature:'imageToSpeak',Order:19+i,'Item Type':'imageSpeak',English:en,'Image URL':`https://example.com/images/${en}.jpg`,'Voice Text':en})));
      rows.push(...examExamples(phase,'exam','examQuestion',23));return rows
    }
    if(phase==='grammar'){
      const laws=[
        ['normal','Present simple: normal sentence','Use subject + base verb for routines and facts.','Subject + verb + object'],
        ['negative','Present simple: negative sentence','Use do not or does not before the base verb.','Subject + do/does not + base verb + object'],
        ['question','Present simple: question','Move do or does before the subject.','Do/Does + subject + base verb + object?']
      ];
      laws.forEach(([type,title,law,formula],i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'article',Feature:'sentenceBuildLaw',Order:i+1,'Law Type':type,Title:title,'Grammar Law':law,Formula:formula})));
      ['Use does with he, she, and it.','After does, use the base verb.','Adverbs of frequency usually come before the main verb.','Use do with I, you, we, and they.','Do not add -s after does.','Short answers use do or does.'].forEach((note,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'article',Feature:'importantNote',Order:4+i,'Important Note':note})));
      Array.from({length:15},(_,i)=>({text:i<5?`I study English every day. Example ${i+1}`:i<10?`She does not watch television before school. Example ${i+1}`:`Does your brother usually walk to work in the morning? Example ${i+1}`,difficulty:i<5?'easy':i<10?'medium':'difficult'})).forEach((x,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'article',Feature:'example',Order:10+i,Example:x.text,Difficulty:x.difficulty})));
      rows.push(...examExamples(phase,'exam','examQuestion',25));return rows
    }
    rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'video',Feature:'video',Order:1,Title:'Daily routines','Video URL':'https://www.youtube.com/watch?v=VIDEO_ID'}));
    rows.push(...examExamples(phase,'video','videoExamQuestion',2));
    Array.from({length:5},(_,i)=>({title:`A Busy Morning — Page ${i+1}`,text:`Story page ${i+1}: Ali gets ready for school and uses the target vocabulary in context.`,arabic:`صفحة القصة ${i+1}: يستعد علي للمدرسة ويستخدم المفردات المستهدفة.`})).forEach((x,i)=>rows.push(rowFrom(phase,{Phase:p,Level:1,Box:1,Process:'story',Feature:'storyPage',Order:8+i,Title:x.title,'Story Text':x.text,'Arabic Text':x.arabic,'Image URL':`https://example.com/story/page-${i+1}.jpg`})));
    rows.push(...examExamples(phase,'story','storyExamQuestion',13));return rows
  }
  function guideRows(phase){return [
    ['Field','Allowed values / purpose'],
    ['Phase',PHASE_VALUE[phase]+' (use this value in every data row)'],
    ['Level','1 to 5'],
    ['Box','1 to '+LEVEL_BOXES],
    ['Process',phaseDef(phase).processes.join(' · ')],
    ['Feature',FEATURE_HELP[phase]],
    ['Question Type',QUESTION_TYPES.join(' · ')],
    ['Important','Do not rename headers, add Step, or mix phases in one file.']
  ]}
  async function templateFile(phase,type='blob'){
    if(typeof JSZip==='undefined')throw Error('JSZip غير متاح.');
    const zip=new JSZip(),rows=templateRows(phase),guide=guideRows(phase);
    zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    const xl=zip.folder('xl');
    xl.file('workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Content" sheetId="1" r:id="rId1"/><sheet name="Guide" sheetId="2" r:id="rId2"/></sheets></workbook>');
    xl.folder('_rels').file('workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    xl.file('styles.xml','<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font/><font><b/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF65538E"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>');
    const sheets=xl.folder('worksheets');sheets.file('sheet1.xml',worksheet(rows));sheets.file('sheet2.xml',worksheet(guide));
    return zip.generateAsync({type})
  }
  function saveDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0)}
  async function downloadTemplate(phase){saveDownload(await templateFile(phase),PHASE_FILE[phase])}
  async function downloadTemplateBundle(){if(typeof JSZip==='undefined')throw Error('JSZip غير متاح.');const bundle=new JSZip();for(const p of PHASES)bundle.file(PHASE_FILE[p.key],await templateFile(p.key,'uint8array'));saveDownload(await bundle.generateAsync({type:'blob'}),'liplip-content-templates.zip')}
  function xmlNodes(root,name){
    if(!root)return [];
    if(typeof root.getElementsByTagNameNS==='function'){
      const found=[...root.getElementsByTagNameNS('*',name)];
      if(found.length)return found;
    }
    const plain=typeof root.getElementsByTagName==='function'?[...root.getElementsByTagName(name)]:[];
    if(plain.length)return plain;
    return typeof root.getElementsByTagName==='function'?[...root.getElementsByTagName('x:'+name)]:[]
  }
  function cellText(cell,shared){const type=cell.getAttribute('t'),v=xmlNodes(cell,'v')[0]?.textContent||'';if(type==='s')return shared[Number(v)]||'';if(type==='inlineStr')return xmlNodes(cell,'t').map(x=>x.textContent||'').join('');return v}
  async function xlsxRows(file){
    if(typeof JSZip==='undefined')throw Error('قارئ Excel غير متاح.');
    const zip=await JSZip.loadAsync(await file.arrayBuffer()),sharedFile=zip.file('xl/sharedStrings.xml'),shared=[];
    if(sharedFile){const doc=new DOMParser().parseFromString(await sharedFile.async('text'),'application/xml');for(const si of xmlNodes(doc,'si'))shared.push(xmlNodes(si,'t').map(x=>x.textContent||'').join(''))}
    const sheet=zip.file('xl/worksheets/sheet1.xml');if(!sheet)throw Error('ورقة Content غير موجودة.');
    const doc=new DOMParser().parseFromString(await sheet.async('text'),'application/xml'),out=[];
    for(const row of xmlNodes(doc,'row')){
      const values=[];
      for(const c of xmlNodes(row,'c')){const ref=c.getAttribute('r')||'',letters=(ref.match(/[A-Z]+/)||['A'])[0];let index=0;for(const ch of letters)index=index*26+ch.charCodeAt(0)-64;values[index-1]=cellText(c,shared)}
      out.push(values)
    }
    if(!out.length)throw Error('تعذّر قراءة صفوف ورقة Content.');
    return out
  }
  const n=(v,min,max)=>{const x=Number(v);return Number.isInteger(x)&&x>=min&&x<=max?x:null};
  const opts=(row,start)=>row.slice(start,start+4).map(x=>String(x||'').trim()).filter(Boolean);
  function rowObject(headers,row){const out={};headers.forEach((h,i)=>out[h]=String(row[i]??'').trim());return out}
  function examQuestion(o){
    const type=String(o['Question Type']||'mcq').trim();
    if(!QUESTION_TYPES.includes(type))throw Error('Question Type غير صالح: '+type);
    const options=[1,2,3,4].map(i=>o['Option '+i]).filter(Boolean);
    const matches=[1,2,3,4].map(i=>({left:o['Match Left '+i],right:o['Match Right '+i]})).filter(x=>x.left&&x.right);
    const correct=n(o['Correct Option'],1,4);
    return {type,prompt:o['Question Prompt'],options:type==='trueFalse'&&options.length<2?['True','False']:options,correct:correct===null?0:correct-1,answer:o.Answer||'',explanation:o.Explanation||'',voice:o['Voice Text']||'',image:o['Image URL']||'',matches};
  }
  function importRows(phase,rows){
    const expected=HEADERS[phase];
    if(!rows.length||expected.some((h,i)=>String(rows[0]?.[i]||'').trim()!==h))throw Error('عناوين الأعمدة لا تطابق قالب '+phaseDef(phase).label+'.');
    let count=0;const touched=new Set();
    for(let ri=1;ri<rows.length;ri++){
      const row=rows[ri]||[];if(!row.some(x=>String(x||'').trim()))continue;
      const o=rowObject(expected,row);
      if(o.Phase.toLowerCase()!==PHASE_VALUE[phase])throw Error(`الصف ${ri+1}: Phase يجب أن يكون ${PHASE_VALUE[phase]} فقط.`);
      const level=n(o.Level,1,5),box=n(o.Box,1,LEVEL_BOXES);if(!level||!box)throw Error(`الصف ${ri+1}: Level أو Box غير صالح.`);
      const id=globalId(level,box),content=getContent(id),feature=o.Feature,process=o.Process,order=n(o.Order,1,999)||ri;
      if(!touched.has(id)){
        if(phase==='vocabulary')content.vocabulary={items:[],questions:[]};
        if(phase==='grammar')content.grammar={article:{title:'',rule:'',normal:'',negative:'',question:'',laws:[],notes:[],examples:[]},questions:[]};
        if(phase==='watchRead')content.watchRead={video:{title:'',youtube:''},videoQuestions:[],story:[],storyQuestions:[]};
        touched.add(id);
      }
      if(phase==='vocabulary'){
        if(process==='content'&&['flashcardWord','flashcardSentence','imageToWord','voiceToSpeak','imageToSpeak'].includes(feature))content.vocabulary.items.push({type:feature,order,en:o.English||o.Sentence,ar:o.Arabic,image:o['Image URL'],voice:o['Voice Text']||o.English||o.Sentence});
        else if(process==='exam'&&feature==='examQuestion')content.vocabulary.questions.push(examQuestion(o));
        else throw Error(`الصف ${ri+1}: Process أو Feature غير صالح.`);
      }
      if(phase==='grammar'){
        const a=content.grammar.article;
        if(process==='article'&&feature==='sentenceBuildLaw'){
          const law={type:o['Law Type']||'normal',title:o.Title,rule:o['Grammar Law'],formula:o.Formula};a.laws.push(law);
          if(!a.title)a.title=o.Title;if(!a.rule)a.rule=o['Grammar Law'];
          if(['normal','negative','question'].includes(law.type))a[law.type]=law.formula;
        }else if(process==='article'&&feature==='importantNote')a.notes.push(o['Important Note']);
        else if(process==='article'&&feature==='example')a.examples.push({text:o.Example,difficulty:o.Difficulty||'easy'});
        else if(process==='exam'&&feature==='examQuestion')content.grammar.questions.push(examQuestion(o));
        else throw Error(`الصف ${ri+1}: Process أو Feature غير صالح.`);
      }
      if(phase==='watchRead'){
        if(process==='video'&&feature==='video')content.watchRead.video={title:o.Title,youtube:o['Video URL']};
        else if(process==='video'&&feature==='videoExamQuestion')content.watchRead.videoQuestions.push(examQuestion(o));
        else if(process==='story'&&feature==='storyPage')content.watchRead.story.push({order,title:o.Title,text:o['Story Text'],arabic:o['Arabic Text'],image:o['Image URL']});
        else if(process==='story'&&feature==='storyExamQuestion')content.watchRead.storyQuestions.push(examQuestion(o));
        else throw Error(`الصف ${ri+1}: Process أو Feature غير صالح.`);
      }
      storeBox(id,content);count++;
    }
    return count
  }
  async function importFile(phase,file){ui.error='';ui.notice='';try{const rows=await xlsxRows(file),count=importRows(phase,rows);ui.notice=`تم استيراد ${count} صفاً لمرحلة ${phaseDef(phase).label}.`;return true}catch(e){ui.error=e.message||'تعذّر استيراد الملف.';return false}}
  async function importAnyFile(file){ui.error='';ui.notice='';try{const rows=await xlsxRows(file),headers=rows[0]||[],phaseColumn=headers.findIndex(x=>String(x||'').trim().toLowerCase()==='phase'),firstData=rows.slice(1).find(row=>row.some(x=>String(x||'').trim())),value=String(firstData?.[phaseColumn]||'').trim().toLowerCase(),phase=Object.keys(PHASE_VALUE).find(k=>PHASE_VALUE[k]===value);if(!phase)throw Error('تعذّر تحديد المرحلة من عمود Phase.');const count=importRows(phase,rows);ui.notice=`تم استيراد ${count} صفاً لمرحلة ${phaseDef(phase).label}.`;return true}catch(e){ui.error=e.message||'تعذّر استيراد الملف.';return false}}

  function grade(items,form){
    if(!items.length)return 100;let correct=0;
    items.forEach((q,i)=>{
      if(q.type==='match'){const ok=(q.matches||[]).every((_,j)=>Number(form.get('q'+i+':'+j))===j);if(ok)correct++;return}
      const answer=String(form.get('q'+i)||'').trim();
      if(['mcq','trueFalse'].includes(q.type)&&q.options?.length){if(Number(answer)===q.correct)correct++}
      else if(norm(answer)===norm(q.answer))correct++;
    });
    return Math.round(correct/items.length*100)
  }
  function currentQuestions(content,phase,process){if(phase==='vocabulary')return content.vocabulary.questions;if(phase==='grammar')return content.grammar.questions;return process==='video'?content.watchRead.videoQuestions:content.watchRead.storyQuestions}
  function speak(text){if(!text||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return;try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.86;window.speechSynthesis.speak(u)}catch{}}
  function click(action,target,progress,onUpdate){
    if(action==='manager-open'){ui.manager=true;ui.managerMode='home';ui.notice='';ui.error='';return {}}
    if(action==='manager-close'){ui.manager=false;return {}}
    if(action==='manager-back'){ui.managerMode=['manual','import'].includes(ui.managerMode)?'add':'home';ui.notice='';ui.error='';return {}}
    if(action==='manager-mode'){const mode=target.dataset.mode;if(['add','manual','import','edit'].includes(mode))ui.managerMode=mode;ui.notice='';ui.error='';return {}}
    if(action==='manager-template-zip'){downloadTemplateBundle().catch(e=>{ui.error=e.message});return {noRender:true}}
    if(action==='manager-delete'){managerDelete(target.dataset.kind,Number(target.dataset.index));return {}}
    if(action==='level'){const level=Number(target.dataset.level),m=model(progress);if(m.statusLevel(level)==='locked')return {};ui.level=level;ui.view='boxes';return {}}
    if(action==='levels'){ui.view='levels';return {}}
    if(action==='box'){const id=Number(target.dataset.boxId),m=model(progress),status=m.statusBox(id);if(status==='locked')return {};start(id,progress,{review:status==='complete'});return {open:true}}
    if(action==='exit'||action==='result-close'){ui.control=false;ui.results=false;ui.view='boxes';return {exit:true}}
    if(action==='result-next'){const next=LiplipProgress.courseSnapshot(progress).currentBox;if(next===null)return {};start(next,progress);return {open:true}}
    if(action==='result-repeat'){const boxId=ui.boxId;start(boxId,progress,{review:true});ui.phase='vocabulary';ui.processView=0;return {open:true}}
    if(action==='control'){ui.control=true;ui.error='';return {}}
    if(action==='control-close'){ui.control=false;return {}}
    if(action==='phase'){const key=target.dataset.phase;if(availablePhase(progress,key)){ui.phase=key;ui.storyPage=0;ui.processView=0;resetPlayer()}return {}}
    if(action==='review-process'){const value=Number(target.dataset.process);if(recordFor(progress).completedPhases.includes(ui.phase)&&[0,1].includes(value)){ui.processView=value;ui.storyPage=0;resetPlayer()}return {}}
    if(action==='speak'){speak(target.dataset.text);return {}}
    if(action==='vocab-flip'){ui.flipped=ui.flipped===Number(target.dataset.index)?false:Number(target.dataset.index);return {}}
    if(action==='item-prev'){captureForm(target.closest?.('form'));ui.itemIndex=Math.max(0,ui.itemIndex-1);ui.flipped=false;ui.micMessage='';ui.micTranscript='';return {}}
    if(action==='item-next'){captureForm(target.closest?.('form'));ui.itemIndex=Math.min(Math.max(0,Number(target.dataset.total||1)-1),ui.itemIndex+1);ui.flipped=false;ui.micMessage='';ui.micTranscript='';return {}}
    if(action==='mic-start'){startMic(target.dataset.expected||'',target.dataset.input||'',onUpdate);return {noRender:true}}
    if(action==='story-prev'){ui.storyPage=Math.max(0,ui.storyPage-1);return {}}
    if(action==='story-next'){ui.storyPage++;return {}}
    if(action==='download-template'){downloadTemplate(target.dataset.phase).catch(e=>{ui.error=e.message});return {noRender:true}}
    if(action==='complete-process'){resetPlayer();const r=recordFor(progress);if(ui.review||r.completedPhases.includes(ui.phase))return {};try{return {progress:LiplipProgress.recordCourseProcess(progress,{boxId:ui.boxId,phase:ui.phase,process:phaseDef(ui.phase).processes[r.processIndex],score:100}),completed:true}}catch(e){ui.error=e.message;return {}}}
    return {}
  }
  function submit(form,progress){if(form.id!=='course-exam-form')return {};captureForm(form);const phase=form.dataset.phase,process=form.dataset.process||'exam',content=getContent(ui.boxId),items=currentQuestions(content,phase,process),answers={get:key=>ui.answers[key]??null},score=grade(items,answers);ui.notice=`النتيجة: ${score}%`;if(score<70){ui.notice+=` · تحتاج ٧٠٪. راجع المحتوى وحاول مرة أخرى.`;return {}}const r=recordFor(progress);if(ui.review||r.completedPhases.includes(phase)){ui.notice+=` · مراجعة فقط.`;return {}}try{const result={progress:LiplipProgress.recordCourseProcess(progress,{boxId:ui.boxId,phase,process:phaseDef(phase).processes[r.processIndex],score,words:content.vocabulary.items.filter(x=>['word','flashcardWord','imageToWord'].includes(x.type)).map(x=>({word:x.en,ar:x.ar,image:x.image||'',example:content.vocabulary.items.find(y=>['sentence','flashcardSentence'].includes(y.type))?.en||''})),grammar:[content.grammar.article]}),completed:true};resetPlayer();return result}catch(e){ui.error=e.message;return {}}}
  function afterProgress(progress){const r=recordFor(progress);ui.processView=0;resetPlayer();if(r.completedPhases.length===3){ui.results=true;ui.review=false;ui.phase='watchRead';ui.notice=''}else{ui.phase=r.currentPhase;ui.notice=`اكتملت العملية. التالي: ${phaseDef(r.currentPhase).label} · ${r.processIndex===0?'العملية الأولى':'العملية الثانية'}.`}}
  function render(progress){return learning(progress)}
  return {PHASES,HEADERS,QUESTION_TYPES,LEVEL_BOXES,templateRows,grade,xmlNodes,cellText,vocabKind,itemCard,vocabularyDeck,grammarItems,playerNav,questions,mapPage,start,render,click,submit,afterProgress,managerSubmit,managerChange,importFile,importAnyFile,downloadTemplate,downloadTemplateBundle,getContent,model};
})();
