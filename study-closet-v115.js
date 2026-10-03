/* Build 115: hard Study gate, word-only Closet, and milestone pass policies. */
(() => {
  'use strict';
  if (typeof LiplipCourse === 'undefined' || typeof LiplipProgress === 'undefined' || typeof state === 'undefined') return;

  const UI = window.LiplipFrontend;
  const MILESTONE_STORE = 'liplip-study-milestones-v113';
  const milestoneState = window.LiplipStudyMilestones113 = window.LiplipStudyMilestones113 || {
    active:null, stage:'study', item:0, answer:null, revealed:false, results:[]
  };
  const closetState = window.LiplipCloset115 = window.LiplipCloset115 || {
    mode:'list', deck:[], index:0, viewed:[], result:0, error:''
  };
  const publicAPI = window.LiplipStudyCloset115 = window.LiplipStudyCloset115 || {};
  const baseMapPage = LiplipCourse.mapPage.bind(LiplipCourse);
  const baseRender = LiplipCourse.render.bind(LiplipCourse);
  const baseClick = LiplipCourse.click.bind(LiplipCourse);
  let renderQueued = false;

  const t = (ar,en) => localStorage.getItem('liplip-ui-language') === 'en' ? en : ar;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const icon = (name,size=24) => {
    const paths={
      back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
      box:'<path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5v-9Z"/><path d="m4 8.5 8 4.5 8-4.5M12 13v9"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/>',
      refresh:'<path d="M20 6v5h-5"/><path d="M18.2 9A7 7 0 1 0 19 15"/>',
      sound:'<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/>',
      star:'<path d="m12 3 2.6 5.3 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3Z"/>'
    };
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.star}</svg>`;
  };
  const studyOpen = () => Boolean(window.LiplipProgression114?.snapshot?.().study);
  const queueRender = () => { if(renderQueued)return; renderQueued=true; setTimeout(()=>{renderQueued=false;window.render?.(false)},0); };
  const readMilestones = () => {
    try { const value=JSON.parse(localStorage.getItem(MILESTONE_STORE)||'null'); return value?.version===1?value:{version:1,baseline:{},completed:{}}; }
    catch { return {version:1,baseline:{},completed:{}}; }
  };
  const writeMilestones = value => { try { localStorage.setItem(MILESTONE_STORE,JSON.stringify(value)); } catch {} };
  const milestoneKey = m => `${m.level}:${m.type}:${m.after}`;
  const passMark = type => type==='final'?85:type==='exam'?70:0;
  const score = () => milestoneState.results.length ? Math.round(milestoneState.results.filter(Boolean).length/milestoneState.results.length*100) : 0;
  function grade(value){
    if(value<50)return {key:'bad',ar:'يحتاج تدريباً',en:'Bad'};
    if(value<60)return {key:'good',ar:'جيد',en:'Good'};
    if(value<70)return {key:'very-good',ar:'جيد جداً',en:'Very good'};
    if(value<80)return {key:'excellent',ar:'ممتاز',en:'Excellent'};
    if(value<90)return {key:'incredible',ar:'مذهل',en:'Incredible'};
    return {key:'master',ar:'متقن',en:'Master'};
  }
  function markMilestone(milestone,value,extra={}){
    if(milestone.type!=='review' && value<passMark(milestone.type))return false;
    const saved=readMilestones();saved.completed=saved.completed||{};
    saved.completed[milestoneKey(milestone)]={score:value,completedAt:new Date().toISOString(),...extra};
    writeMilestones(saved);return true;
  }

  const gid=(level,box)=>(level-1)*200+box;
  function wordsForBox(level,box){
    const items=LiplipCourse.getContent(gid(level,box))?.vocabulary?.items||[];
    return items.filter(x=>x?.en&&x?.ar).map(x=>({en:String(x.en).trim(),ar:String(x.ar).trim(),box}));
  }
  function uniqueWords(words){const seen=new Set();return words.filter(w=>{const k=w.en.toLocaleLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true})}
  function sourceWords(m){
    const out=[];
    if(m.type==='review'){for(let box=m.after-3;box<=m.after;box++)out.push(...wordsForBox(m.level,box).slice(0,15));}
    else {const first=m.type==='final'?1:m.after-11;for(let box=first;box<=m.after;box++)out.push(...wordsForBox(m.level,box));}
    return uniqueWords(out);
  }
  function hash(text){let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){return()=>{seed+=0x6D2B79F5;let x=seed;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296}}
  function shuffle(list,random=Math.random){const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
  function buildQuestions(m,words){
    if(!words.length)return[];const random=rng(hash(milestoneKey(m))),ordered=shuffle(words,random),questions=[];
    for(let i=0;i<m.questions;i++){
      const word=ordered[i%ordered.length],reverse=i%2===1,correct=reverse?word.en:word.ar;
      const values=[...new Set(words.map(x=>String(reverse?x.en:x.ar).trim()).filter(Boolean))];
      const distractors=shuffle(values.filter(x=>x!==correct),random).slice(0,3);
      while(distractors.length<3)distractors.push(`${t('خيار','Option')} ${distractors.length+1}`);
      const options=shuffle([correct,...distractors],random);
      questions.push({prompt:reverse?word.ar:word.en,hint:reverse?t('اختر الكلمة الإنجليزية','Choose the English word'):t('اختر المعنى بالعربية','Choose the Arabic meaning'),options,correct:options.indexOf(correct)});
    }
    return questions;
  }
  function activeData(){const milestone=milestoneState.active,words=sourceWords(milestone);return{milestone,words,questions:milestone.type==='review'?[]:buildQuestions(milestone,words)}}
  function challengeTop(m){
    const type=m.type==='review'?t('مراجعة الكلمات','WORD REVIEW'):m.type==='final'?t('الاختبار النهائي','FINAL EXAM'):t('صندوق اختبار','EXAM CHEST');
    const amount=m.type==='review'?`${sourceWords(m).length} ${t('كلمة','words')}`:`${m.questions} ${t('سؤالاً','questions')}`;
    return `<header class="v113-challenge-top"><button data-course="v113-exit">${icon('back',18)} ${t('الخريطة','Map')}</button><div><small>${type} · ${t('المستوى','Level')} ${m.level}</small><strong>${m.type==='review'?t(`مراجعة الصناديق ${m.after-3}–${m.after}`,`Review boxes ${m.after-3}–${m.after}`):m.type==='final'?t('الاختبار النهائي للمستوى','Level final exam'):t(`اختبار الصناديق ${m.after-11}–${m.after}`,`Exam boxes ${m.after-11}–${m.after}`)}</strong></div><span>${amount}</span></header>`;
  }
  function emptyView(data){return `<main class="v113-challenge">${challengeTop(data.milestone)}<section class="v113-empty"><span>${icon('box',40)}</span><h1>${t('لا توجد كلمات كافية بعد','Not enough words yet')}</h1><p>${t('أضف مفردات إلى الصناديق المطلوبة ثم أعد فتح هذا الكنز.','Add vocabulary to the required boxes, then reopen this treasure.')}</p><button data-course="v113-exit">${t('العودة للخريطة','Back to map')}</button></section></main>`}
  function reviewView(data){
    const total=data.words.length,index=Math.min(milestoneState.item,total-1),word=data.words[index];
    return `<main class="v113-challenge">${challengeTop(data.milestone)}<section class="v113-review-study"><header><span>${t('مراجعة كلمات فقط','WORDS-ONLY REVIEW')}</span><h1>${t('راجع الكلمات على راحتك','Review the words at your pace')}</h1><p>${t('لا توجد أسئلة في صندوق المراجعة. اضغط تم عند الانتهاء.','There are no exam questions in a review chest. Press Done when finished.')}</p></header><div class="v113-progress"><span>${index+1} / ${total}</span><i><b style="width:${(index+1)/total*100}%"></b></i></div><article class="v113-review-card"><small>${t('الصندوق','BOX')} ${String(word.box).padStart(2,'0')}</small><strong dir="ltr">${esc(word.en)}</strong><span>${esc(word.ar)}</span><i aria-hidden="true">✦</i></article><nav class="v115-review-nav"><button data-course="v113-study-prev" ${index===0?'disabled':''}>${t('السابق','Previous')}</button><button data-course="v113-study-next" ${index===total-1?'disabled':''}>${t('التالي','Next')}</button><button class="primary" data-course="v115-finish-review">${t('تم · إنهاء المراجعة','Done · Finish review')}</button></nav></section></main>`;
  }
  function examView(data){
    const total=data.questions.length,index=Math.min(milestoneState.item,total-1),q=data.questions[index],pct=(index+1)/total*100,required=passMark(data.milestone.type);
    return `<main class="v113-challenge">${challengeTop(data.milestone)}<section class="v113-exam-player"><header><span>${esc(q.hint)}</span><h1>${esc(q.prompt)}</h1><p>${t(`درجة النجاح ${required}%`,`Pass mark: ${required}%`)}</p></header><div class="v113-progress"><span>${t('سؤال','Question')} ${index+1} / ${total}</span><i><b style="width:${pct}%"></b></i></div><div class="v113-answer-grid">${q.options.map((option,i)=>`<button data-course="v113-answer" data-index="${i}" class="${milestoneState.answer===i?'selected':''} ${milestoneState.revealed?i===q.correct?'correct':milestoneState.answer===i?'wrong':'':''}" ${milestoneState.revealed?'disabled':''}><span>${esc(option)}</span></button>`).join('')}</div>${milestoneState.revealed?`<div class="v113-answer-feedback ${milestoneState.results[index]?'correct':'wrong'}"><strong>${milestoneState.results[index]?t('إجابة صحيحة!','Correct!'):t('ليست صحيحة هذه المرة','Not correct this time')}</strong><span>${t('الإجابة','Answer')}: ${esc(q.options[q.correct])}</span></div>`:''}<nav class="v113-challenge-actions"><button data-course="v113-exit">${t('حفظ والخروج','Save and exit')}</button><button class="primary" data-course="${milestoneState.revealed?'v113-next':'v113-check'}" ${milestoneState.answer==null?'disabled':''}>${milestoneState.revealed?(index===total-1?t('عرض النتيجة','Show result'):t('السؤال التالي','Next question')):t('تحقق','Check')}</button></nav></section></main>`;
  }
  function resultView(data){
    if(data.milestone.type==='review')return `<main class="v113-challenge">${challengeTop(data.milestone)}<section class="v113-result v115-review-result"><span>${icon('check',50)}</span><small>${t('اكتملت المراجعة','REVIEW COMPLETE')}</small><h1>${milestoneState.reviewedCount||data.words.length}</h1><p>${t('كلمة راجعتها في هذا الصندوق.','words reviewed in this chest.')}</p><div><button class="primary" data-course="v113-exit">${t('العودة للخريطة','Back to map')}</button></div></section></main>`;
    const value=score(),required=passMark(data.milestone.type),passed=value>=required,band=grade(value);
    return `<main class="v113-challenge">${challengeTop(data.milestone)}<section class="v113-result v115-result ${band.key} ${passed?'passed':'failed'}"><span>${icon(passed?'crown':'star',50)}</span><small>${passed?t('نجحت وفتحت الكنز التالي','PASSED · NEXT TREASURE UNLOCKED'):t(`تحتاج ${required}% للنجاح`,`PASS MARK ${required}%`)}</small><h1>${value}%</h1><h2>${t(band.ar,band.en)}</h2><p>${t(`أجبت عن ${milestoneState.results.filter(Boolean).length} من ${milestoneState.results.length} بشكل صحيح.`,`You answered ${milestoneState.results.filter(Boolean).length} of ${milestoneState.results.length} correctly.`)}</p><div><button data-course="v113-retry">${t('إعادة المحاولة','Try again')}</button><button class="primary" data-course="v113-exit">${t('العودة للخريطة','Back to map')}</button></div></section></main>`;
  }
  function challengeRender(){
    const data=activeData();if(!data.words.length||data.milestone.type!=='review'&&!data.questions.length)return emptyView(data);
    if(milestoneState.stage==='result')return resultView(data);
    return data.milestone.type==='review'?reviewView(data):examView(data);
  }
  function resetChallenge(stage){Object.assign(milestoneState,{stage,item:0,answer:null,revealed:false,results:[],reviewedCount:0})}
  function challengeClick(action,target){
    if(action==='v113-open'){
      milestoneState.active={type:target.dataset.type,level:Number(target.dataset.level),after:Number(target.dataset.after),questions:Number(target.dataset.questions)};
      resetChallenge(milestoneState.active.type==='review'?'study':'exam');return{open:true};
    }
    if(action==='v113-exit'){milestoneState.active=null;return{exit:true}};
    if(!milestoneState.active)return null;
    if(action==='v113-study-prev')milestoneState.item=Math.max(0,milestoneState.item-1);
    else if(action==='v113-study-next')milestoneState.item=Math.min(sourceWords(milestoneState.active).length-1,milestoneState.item+1);
    else if(action==='v115-finish-review'){
      const reviewed=Math.min(sourceWords(milestoneState.active).length,milestoneState.item+1);milestoneState.reviewedCount=reviewed;
      markMilestone(milestoneState.active,100,{reviewed});milestoneState.stage='result';
    } else if(action==='v113-answer'&&!milestoneState.revealed)milestoneState.answer=Number(target.dataset.index);
    else if(action==='v113-check'&&milestoneState.answer!=null){const q=activeData().questions[milestoneState.item];milestoneState.results[milestoneState.item]=milestoneState.answer===q.correct;milestoneState.revealed=true}
    else if(action==='v113-next'&&milestoneState.revealed){const data=activeData();if(milestoneState.item>=data.questions.length-1){markMilestone(milestoneState.active,score());milestoneState.stage='result'}else{milestoneState.item++;milestoneState.answer=null;milestoneState.revealed=false}}
    else if(action==='v113-retry')resetChallenge(milestoneState.active.type==='review'?'study':'exam');
    else return null;
    return{};
  }

  function completedWords(){
    const progress=LiplipProgress.hydrate(state.progress),seen=new Set();
    return (progress.vocabulary||[]).filter(item=>{const key=String(item.word||'').trim().toLocaleLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true}).map(item=>({word:item.word,ar:item.ar||'',example:item.example||'',boxId:item.boxId}));
  }
  function startClosetReview(){
    closetState.deck=shuffle(completedWords());closetState.index=0;closetState.viewed=closetState.deck.length?[0]:[];closetState.result=0;closetState.error='';closetState.mode='review';
  }
  function closetHeader(words){return `<header class="v115-closet-head"><div><span>${t('خزانة المفردات','VOCABULARY CLOSET')}</span><h1>${t('كلماتك المكتملة فقط','Only your completed vocabulary')}</h1><p>${t('الخزانة منفصلة عن صفحات الدراسة وتُعاد قراءتها بأمان من تقدّمك المحفوظ.','The Closet reloads safely from your saved progress, independently of Study pages.')}</p></div><div><button data-v115="closet-reload">${icon('refresh',18)} ${t('إعادة تحميل الخزانة','Reload Closet')}</button><b>${words.length}</b></div></header>`}
  function closetList(){
    const words=completedWords();return `<main class="dashboard v115-closet">${closetHeader(words)}<section class="v115-closet-actions"><button class="primary" data-v115="closet-review" ${words.length?'':'disabled'}>${icon('star',22)}<span><strong>${t('مراجعة عشوائية','Random review')}</strong><small>${t('بطاقات مفردات مع نتيجة بعد الضغط على تم','Vocabulary flashcards with a reviewed-word count')}</small></span></button></section><section class="v115-word-grid">${words.map((word,i)=>`<article><small>${t('كلمة مكتملة','COMPLETED WORD')} · ${String(i+1).padStart(2,'0')}</small><strong dir="ltr">${esc(word.word)}</strong><span>${esc(word.ar||t('لا يوجد معنى محفوظ','No saved meaning'))}</span>${word.example?`<p dir="ltr">${esc(word.example)}</p>`:''}</article>`).join('')||`<div class="v115-closet-empty"><span>${icon('box',42)}</span><h2>${t('لا توجد كلمات مكتملة بعد','No completed vocabulary yet')}</h2><p>${t('أكمل اختبار مفردات صندوق دراسة لتظهر كلماته هنا.','Complete a Study box vocabulary exam to add its words here.')}</p></div>`}</section></main>`;
  }
  function closetReview(){
    const total=closetState.deck.length;if(!total){closetState.mode='list';return closetList()};const index=Math.min(closetState.index,total-1),word=closetState.deck[index];
    return `<main class="dashboard v115-closet v115-closet-review"><header><button data-v115="closet-review-exit">${icon('back',18)} ${t('الخزانة','Closet')}</button><div><span>${t('مراجعة عشوائية','RANDOM REVIEW')}</span><strong>${index+1} / ${total}</strong></div></header><div class="v115-review-progress"><i style="width:${(index+1)/total*100}%"></i></div><article class="v115-flashcard"><small>${t('بطاقة مفردات','VOCABULARY FLASHCARD')}</small><strong dir="ltr">${esc(word.word)}</strong><span>${esc(word.ar||t('لا يوجد معنى محفوظ','No saved meaning'))}</span>${word.example?`<p dir="ltr">${esc(word.example)}</p>`:''}<button data-v115="closet-sound" aria-label="${t('استمع','Listen')}">${icon('sound',24)}</button></article><nav><button data-v115="closet-prev" ${index===0?'disabled':''}>${t('السابق','Previous')}</button><button data-v115="closet-next" ${index===total-1?'disabled':''}>${t('التالي','Next')}</button></nav><button class="v115-done" data-v115="closet-done">${icon('check',20)} ${t('تم · إنهاء المراجعة','Done · Finish review')}</button></main>`;
  }
  function closetResult(){return `<main class="dashboard v115-closet v115-closet-result"><section><span>${icon('crown',54)}</span><small>${t('اكتملت المراجعة','REVIEW COMPLETE')}</small><h1>${closetState.result}</h1><p>${t('كلمة مفردات راجعتها.','vocabulary words reviewed.')}</p><div><button data-v115="closet-review">${t('مراجعة عشوائية جديدة','New random review')}</button><button class="primary" data-v115="closet-review-exit">${t('العودة للخزانة','Back to Closet')}</button></div></section></main>`}
  function closetPage115(){try{return closetState.mode==='review'?closetReview():closetState.mode==='result'?closetResult():closetList()}catch(error){closetState.error=String(error?.message||error);return `<main class="dashboard v115-closet"><div class="v115-closet-empty"><h2>${t('تعذر تحميل الخزانة','Closet could not load')}</h2><p>${t('بقيت بيانات الدراسة محفوظة. أعد تحميل الخزانة فقط.','Study data is still safe. Reload only the Closet.')}</p><button data-v115="closet-reload">${t('إعادة تحميل الخزانة','Reload Closet')}</button></div></main>`}}

  LiplipCourse.mapPage = progress => baseMapPage(progress)
    .replace(t('15 كلمة من كل صندوق · 20 سؤالاً','15 words per box · 20 questions'),t('15 كلمة من كل صندوق · مراجعة بلا أسئلة','15 words per box · review without questions'))
    .replaceAll(t('اجمع الكلمات قبل الاختبار','Collect the words before the quiz'),t('راجع الكلمات فقط','Review words only'))
    .replace(/(<article class="v113-stop v113-special v113-review[^]*?<span class="v113-node-badge"><b>60<\/b><small>)[^<]*(<\/small>)/g,`$1${t('كلمة','WORDS')}$2`);
  LiplipCourse.render = progress => {
    if(!studyOpen())return `<main class="v115-study-locked"><span>${icon('box',46)}</span><h1>${t('الدراسة مقفلة الآن','Study is locked')}</h1><p>${t('أكمل تعلّم الحروف ثم الأرقام لفتح صفحة الدراسة عند A1.','Finish Letters Learn, then Numbers Learn, to unlock Study at A1.')}</p><button data-nav="الرئيسية">${t('العودة للرئيسية','Back to Home')}</button></main>`;
    return milestoneState.active?challengeRender():baseRender(progress);
  };
  LiplipCourse.click = (action,target,progress,rerender) => challengeClick(action,target) ?? baseClick(action,target,progress,rerender);
  window.closetPage = closetPage = closetPage115;
  Object.assign(publicAPI,{grade,passMark,completedWords,sourceWords,challengeRender,startClosetReview});

  document.addEventListener('click',event=>{
    const studyTarget=event.target.closest?.('[data-nav="الدراسة"],[data-v28="study-current"],[data-v28="review-last"]');
    if(studyTarget&&!studyOpen()){event.preventDefault();event.stopImmediatePropagation();alert(t('أكمل تعلّم الحروف والأرقام أولاً لفتح الدراسة.','Complete Letters Learn and Numbers Learn first to unlock Study.'));return}
    const target=event.target.closest?.('[data-v115]');if(!target)return;event.preventDefault();event.stopImmediatePropagation();
    const action=target.dataset.v115;
    if(action==='closet-reload'){Object.assign(closetState,{mode:'list',deck:[],index:0,viewed:[],result:0,error:''})}
    else if(action==='closet-review')startClosetReview();
    else if(action==='closet-review-exit')Object.assign(closetState,{mode:'list',deck:[],index:0,viewed:[],result:0});
    else if(action==='closet-prev')closetState.index=Math.max(0,closetState.index-1);
    else if(action==='closet-next'){closetState.index=Math.min(closetState.deck.length-1,closetState.index+1);if(!closetState.viewed.includes(closetState.index))closetState.viewed.push(closetState.index)}
    else if(action==='closet-done'){closetState.result=closetState.viewed.length;closetState.mode='result'}
    else if(action==='closet-sound'){const word=closetState.deck[closetState.index]?.word;if(word&&'speechSynthesis'in window&&typeof SpeechSynthesisUtterance!=='undefined'){try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word);utterance.lang='en-US';utterance.rate=.86;speechSynthesis.speak(utterance)}catch{}}}
    queueRender();
  },true);
  UI?.registerFeature?.('study-closet-v115',{mount(){if((state.nav==='الدراسة'||state.page==='course-zone')&&!studyOpen()){state.page='app';state.nav='الرئيسية';queueRender()}}});
  if(state.page==='app')queueRender();
})();
