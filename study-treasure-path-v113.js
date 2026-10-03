/* Build 113: vertical Study treasure path with generated review, exam, and final-exam milestones. */
(() => {
  if (typeof LiplipCourse === 'undefined' || typeof LiplipProgress === 'undefined') return;

  const STRIDE = 200;
  const BOXES = 50;
  const STORE = 'liplip-study-milestones-v113';
  const state = window.LiplipStudyMilestones113 = window.LiplipStudyMilestones113 || {
    active: null, stage: 'study', item: 0, answer: null, revealed: false, results: []
  };
  const baseMapPage = LiplipCourse.mapPage.bind(LiplipCourse);
  const baseRender = LiplipCourse.render.bind(LiplipCourse);
  const baseClick = LiplipCourse.click.bind(LiplipCourse);

  const t = (ar, en) => localStorage.getItem('liplip-ui-language') === 'en' ? en : ar;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gid = (level, box) => (level - 1) * STRIDE + box;
  const localBox = id => ((Number(id) - 1) % STRIDE) + 1;
  const levelOf = id => Math.floor((Number(id) - 1) / STRIDE) + 1;
  const icon = (name, size = 24) => {
    const paths = {
      box:'<path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5v-9Z"/><path d="m4 8.5 8 4.5 8-4.5M12 13v9"/>',
      review:'<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8 8h8M8 12h6M8 16h4"/><path d="m17 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/>',
      exam:'<path d="M7 3h10v4H7V3Z"/><path d="M5 5h2v2h10V5h2a2 2 0 0 1 2 2v14H3V7a2 2 0 0 1 2-2Z"/><path d="m8 14 2 2 5-6"/>',
      crown:'<path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
      back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
      star:'<path d="m12 3 2.6 5.3 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3Z"/>'
    };
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.star}</svg>`;
  };

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE) || 'null');
      return value && value.version === 1 ? value : {version:1, baseline:{}, completed:{}};
    } catch { return {version:1, baseline:{}, completed:{}}; }
  }
  function writeStore(value) { try { localStorage.setItem(STORE, JSON.stringify(value)); } catch {} }
  function initializeMigration(progress) {
    const saved = readStore();
    if (Object.keys(saved.baseline || {}).length === 5) return saved;
    const snap = LiplipProgress.courseSnapshot(progress);
    const currentLevel = snap.currentBox ? levelOf(snap.currentBox) : 6;
    const currentLocal = snap.currentBox ? localBox(snap.currentBox) : 51;
    for (let level = 1; level <= 5; level++) {
      if (saved.baseline[level] != null) continue;
      saved.baseline[level] = level < currentLevel ? 51 : level === currentLevel ? currentLocal : 1;
    }
    writeStore(saved);
    return saved;
  }
  const milestoneKey = ({type, level, after}) => `${level}:${type}:${after}`;
  const milestoneComplete = (milestone, saved) => Boolean(saved.completed?.[milestoneKey(milestone)]) || milestone.after < Number(saved.baseline?.[milestone.level] || 1);
  function markComplete(milestone) {
    const saved = readStore();
    saved.completed = saved.completed || {};
    saved.completed[milestoneKey(milestone)] = {score:score(), completedAt:new Date().toISOString()};
    writeStore(saved);
  }

  function milestones(level) {
    const list = [];
    for (let after = 4; after <= 48; after += 4) {
      list.push({type:'review', level, after, questions:20});
      if (after % 12 === 0) list.push({type:'exam', level, after, questions:50});
    }
    list.push({type:'final', level, after:50, questions:100});
    return list;
  }
  function prerequisiteMilestones(level, beforeBox) { return milestones(level).filter(x => x.after < beforeBox); }
  function previousMilestones(milestone) {
    const all = milestones(milestone.level), index = all.findIndex(x => milestoneKey(x) === milestoneKey(milestone));
    return all.slice(0, Math.max(0, index));
  }
  function normalDone(snap, level, box) { return snap.completedBoxes.includes(gid(level, box)); }
  function specialStatus(progress, milestone, saved) {
    if (milestoneComplete(milestone, saved)) return 'complete';
    const snap = LiplipProgress.courseSnapshot(progress);
    const priorDone = previousMilestones(milestone).every(x => milestoneComplete(x, saved));
    return normalDone(snap, milestone.level, milestone.after) && priorDone ? 'current' : 'locked';
  }
  function boxStatus(progress, level, box, saved) {
    const snap = LiplipProgress.courseSnapshot(progress);
    if (normalDone(snap, level, box)) return 'complete';
    const base = snap.currentBox === gid(level, box) ? 'current' : 'locked';
    const gatesOpen = prerequisiteMilestones(level, box).every(x => milestoneComplete(x, saved));
    return gatesOpen ? base : 'locked';
  }

  function normalNode(progress, level, box, index, saved) {
    const status = boxStatus(progress, level, box, saved);
    const action = status === 'locked' ? 'disabled' : `data-course="box" data-box-id="${gid(level, box)}"`;
    const label = status === 'complete' ? t('مكتمل · افتحه للمراجعة','Complete · open for review') : status === 'current' ? t('أنت هنا الآن','You are here') : t('أكمل الكنز السابق لفتحه','Finish the previous treasure to unlock');
    return `<article class="v113-stop v113-normal ${index % 2 ? 'right' : 'left'} ${status}"><span class="v113-route-dot"></span><button class="v113-node" ${action}><span class="v113-node-art">${status === 'locked' ? icon('lock',24) : status === 'complete' ? icon('check',24) : icon('box',28)}</span><span class="v113-node-copy"><small>${t('صندوق تعلّم','LEARNING BOX')} ${String(box).padStart(2,'0')}</small><strong>${t('كنز الكلمات','Word treasure')} ${box}</strong><em>${label}</em></span><span class="v113-node-badge">${String(box).padStart(2,'0')}</span></button></article>`;
  }
  function specialCopy(m) {
    if (m.type === 'review') return {icon:'review', kicker:t('صندوق مراجعة','REVIEW CHEST'), title:t(`مراجعة الصناديق ${m.after-3}–${m.after}`,`Review boxes ${m.after-3}–${m.after}`), detail:t('15 كلمة من كل صندوق · 20 سؤالاً','15 words per box · 20 questions'), badge:'60'};
    if (m.type === 'exam') return {icon:'exam', kicker:t('صندوق اختبار','EXAM CHEST'), title:t(`اختبار الصناديق ${m.after-11}–${m.after}`,`Exam boxes ${m.after-11}–${m.after}`), detail:t('كلمات 12 صندوقاً · 50 سؤالاً','12 boxes of words · 50 questions'), badge:'50'};
    return {icon:'crown', kicker:t('الكنز النهائي','FINAL TREASURE'), title:t('الاختبار النهائي للمستوى','Level final exam'), detail:t('كلمات الصناديق الخمسين · 100 سؤال','All 50 boxes · 100 questions'), badge:'100'};
  }
  function specialNode(progress, milestone, index, saved) {
    const status = specialStatus(progress, milestone, saved), copy = specialCopy(milestone);
    const data = status === 'locked' ? 'disabled' : `data-course="v113-open" data-type="${milestone.type}" data-level="${milestone.level}" data-after="${milestone.after}" data-questions="${milestone.questions}"`;
    return `<article class="v113-stop v113-special v113-${milestone.type} ${index % 2 ? 'right' : 'left'} ${status}"><span class="v113-route-dot"></span><button class="v113-node" ${data}><span class="v113-node-art">${status === 'locked' ? icon('lock',27) : icon(copy.icon,34)}</span><span class="v113-node-copy"><small>${copy.kicker}</small><strong>${copy.title}</strong><em>${status === 'complete' ? t('مكتمل · يمكنك إعادته','Complete · replay anytime') : copy.detail}</em></span><span class="v113-node-badge"><b>${copy.badge}</b><small>${t('سؤال','Q')}</small></span></button></article>`;
  }
  function routeNodes(progress, level, saved) {
    const out = []; let index = 0;
    const byAfter = new Map();
    for (const milestone of milestones(level)) {
      const list = byAfter.get(milestone.after) || []; list.push(milestone); byAfter.set(milestone.after, list);
    }
    for (let box = 1; box <= BOXES; box++) {
      out.push(normalNode(progress, level, box, index++, saved));
      for (const milestone of byAfter.get(box) || []) out.push(specialNode(progress, milestone, index++, saved));
    }
    return out.join('');
  }
  function mapPage(progress) {
    const original = baseMapPage(progress);
    if (!original.includes('c57-box-page')) return original;
    const saved = initializeMigration(progress);
    const level = Math.max(1, Math.min(5, Number(window.LiplipCourse57?.level) || 1));
    const snap = LiplipProgress.courseSnapshot(progress);
    const done = Array.from({length:BOXES}, (_, i) => gid(level, i + 1)).filter(id => snap.completedBoxes.includes(id)).length;
    const completedMilestones = milestones(level).filter(x => milestoneComplete(x, saved)).length;
    const title = LiplipProgress.STAGES?.[level - 1] || `${t('المستوى','Level')} ${level}`;
    return `<main class="c57-map v113-map"><div class="v113-map-sky" aria-hidden="true"><i></i><i></i><i></i><i></i></div><header class="v113-map-hero"><button data-course="levels">${icon('back',18)} ${t('المستويات','Levels')}</button><div><span>${icon('map',19)} ${t('مسار كنوز المستوى','LEVEL TREASURE PATH')} ${String(level).padStart(2,'0')}</span><h1>${esc(title)}</h1><p>${t('خمسون صندوق تعلّم، وبينها مراجعات واختبارات يصنعها الموقع تلقائياً من كلماتك.','Fifty learning boxes with reviews and exams generated automatically from your words.')}</p></div><aside><strong>${done}<small>/50</small></strong><span>${completedMilestones}/17 ${t('كنزاً خاصاً','special treasures')}</span></aside></header><section class="v113-legend"><span class="normal">${icon('box',18)} ${t('تعلّم','Learn')}</span><span class="review">${icon('review',18)} ${t('مراجعة كل 4','Review every 4')}</span><span class="exam">${icon('exam',18)} ${t('اختبار كل 12','Exam every 12')}</span><span class="final">${icon('crown',18)} ${t('نهائي بعد 50','Final after 50')}</span></section><section class="v113-road">${routeNodes(progress, level, saved)}<div class="v113-finish">${icon('crown',30)}<strong>${t('نهاية كنز المستوى','Level treasure complete')}</strong></div></section></main>`;
  }

  function wordsForBox(level, box) {
    const items = LiplipCourse.getContent(gid(level, box))?.vocabulary?.items || [];
    return items.filter(x => x?.en && x?.ar).map(x => ({en:String(x.en).trim(), ar:String(x.ar).trim(), box}));
  }
  function uniqueWords(words) {
    const seen = new Set();
    return words.filter(word => { const key = word.en.toLocaleLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; });
  }
  function sourceWords(milestone) {
    if (milestone.type === 'review') {
      const out = [];
      for (let box = milestone.after - 3; box <= milestone.after; box++) out.push(...wordsForBox(milestone.level, box).slice(0, 15));
      return uniqueWords(out);
    }
    const first = milestone.type === 'final' ? 1 : milestone.after - 11;
    const out = [];
    for (let box = first; box <= milestone.after; box++) out.push(...wordsForBox(milestone.level, box));
    return uniqueWords(out);
  }
  function hash(text) { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return () => { seed += 0x6D2B79F5; let x = seed; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(list, random) { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }
  function buildQuestions(milestone, words) {
    if (!words.length) return [];
    const random = rng(hash(milestoneKey(milestone)));
    const ordered = shuffle(words, random), questions = [];
    for (let i = 0; i < milestone.questions; i++) {
      const word = ordered[i % ordered.length], reverse = i % 2 === 1;
      const correct = reverse ? word.en : word.ar;
      const values = uniqueValues(words.map(x => reverse ? x.en : x.ar));
      const distractors = shuffle(values.filter(x => x !== correct), random).slice(0, 3);
      while (distractors.length < 3) distractors.push(`${t('خيار','Option')} ${distractors.length + 1}`);
      const options = shuffle([correct, ...distractors], random);
      questions.push({prompt:reverse ? word.ar : word.en, hint:reverse ? t('اختر الكلمة الإنجليزية','Choose the English word') : t('اختر المعنى بالعربية','Choose the Arabic meaning'), options, correct:options.indexOf(correct)});
    }
    return questions;
  }
  function uniqueValues(values) { return [...new Set(values.map(x => String(x).trim()).filter(Boolean))]; }
  function activeData() {
    const milestone = state.active, words = sourceWords(milestone);
    return {milestone, words, questions:buildQuestions(milestone, words), copy:specialCopy(milestone)};
  }
  function score() { return state.results.length ? Math.round(state.results.filter(Boolean).length / state.results.length * 100) : 0; }
  function challengeTop(copy, milestone) {
    return `<header class="v113-challenge-top"><button data-course="v113-exit">${icon('back',18)} ${t('الخريطة','Map')}</button><div><small>${copy.kicker} · ${t('المستوى','Level')} ${milestone.level}</small><strong>${copy.title}</strong></div><span>${copy.badge} ${t('سؤالاً','questions')}</span></header>`;
  }
  function emptyChallenge(copy, milestone) {
    return `<main class="v113-challenge">${challengeTop(copy,milestone)}<section class="v113-empty"><span>${icon('box',40)}</span><h1>${t('لا توجد كلمات كافية بعد','Not enough words yet')}</h1><p>${t('أضف مفردات إلى الصناديق المطلوبة ثم أعد فتح هذا الكنز.','Add vocabulary to the required boxes, then reopen this treasure.')}</p><button data-course="v113-exit">${t('العودة للخريطة','Back to map')}</button></section></main>`;
  }
  function reviewStudy(data) {
    const total = data.words.length, index = Math.min(state.item, Math.max(0, total - 1)), word = data.words[index];
    return `<main class="v113-challenge">${challengeTop(data.copy,data.milestone)}<section class="v113-review-study"><header><span>${t('مراجعة الكلمات','WORD REVIEW')}</span><h1>${t('اجمع الكلمات قبل الاختبار','Collect the words before the quiz')}</h1><p>${t('اختيرت 15 كلمة من كل صندوق من الصناديق الأربعة السابقة.','Fifteen words were selected from each of the previous four boxes.')}</p></header><div class="v113-progress"><span>${index+1} / ${total}</span><i><b style="width:${total ? (index+1)/total*100 : 0}%"></b></i></div><article class="v113-review-card"><small>${t('الصندوق','BOX')} ${String(word?.box || '').padStart(2,'0')}</small><strong dir="ltr">${esc(word?.en || '')}</strong><span>${esc(word?.ar || '')}</span><i aria-hidden="true">✦</i></article><nav class="v113-challenge-actions"><button data-course="v113-study-prev" ${index === 0 ? 'disabled' : ''}>${t('السابق','Previous')}</button><button class="primary" data-course="${index === total-1 ? 'v113-start-exam' : 'v113-study-next'}">${index === total-1 ? t('ابدأ أسئلة المراجعة','Start review questions') : t('الكلمة التالية','Next word')}</button></nav></section></main>`;
  }
  function examView(data) {
    const total = data.questions.length, index = Math.min(state.item, Math.max(0, total - 1)), q = data.questions[index], pct = total ? (index + 1) / total * 100 : 0;
    return `<main class="v113-challenge">${challengeTop(data.copy,data.milestone)}<section class="v113-exam-player"><header><span>${q?.hint || ''}</span><h1>${esc(q?.prompt || '')}</h1><p>${t('اختر الإجابة ثم تحقق قبل الانتقال.','Choose an answer, then check it before moving on.')}</p></header><div class="v113-progress"><span>${t('سؤال','Question')} ${index+1} / ${total}</span><i><b style="width:${pct}%"></b></i></div><div class="v113-answer-grid">${(q?.options || []).map((option,i)=>`<button data-course="v113-answer" data-index="${i}" class="${state.answer===i?'selected':''} ${state.revealed ? i===q.correct?'correct':state.answer===i?'wrong':'' : ''}" ${state.revealed?'disabled':''}><span>${esc(option)}</span></button>`).join('')}</div>${state.revealed?`<div class="v113-answer-feedback ${state.results[index]?'correct':'wrong'}"><strong>${state.results[index]?t('إجابة صحيحة!','Correct!'):t('ليست صحيحة هذه المرة','Not correct this time')}</strong><span>${t('الإجابة','Answer')}: ${esc(q?.options?.[q.correct] || '')}</span></div>`:''}<nav class="v113-challenge-actions"><button data-course="v113-exit">${t('حفظ والخروج','Save and exit')}</button><button class="primary" data-course="${state.revealed?'v113-next':'v113-check'}" ${state.answer==null?'disabled':''}>${state.revealed?(index===total-1?t('عرض النتيجة','Show result'):t('السؤال التالي','Next question')):t('تحقق','Check')}</button></nav></section></main>`;
  }
  function resultView(data) {
    const value = score();
    return `<main class="v113-challenge">${challengeTop(data.copy,data.milestone)}<section class="v113-result"><span>${icon(value >= 60 ? 'crown' : 'review',50)}</span><small>${t('اكتمل الكنز','TREASURE COMPLETE')}</small><h1>${value}%</h1><p>${t(`أجبت عن ${state.results.filter(Boolean).length} من ${state.results.length} بشكل صحيح.`,`You answered ${state.results.filter(Boolean).length} of ${state.results.length} correctly.`)}</p><div><button data-course="v113-retry">${t('إعادة المحاولة','Try again')}</button><button class="primary" data-course="v113-exit">${t('العودة للخريطة','Back to map')}</button></div></section></main>`;
  }
  function challengeRender() {
    const data = activeData();
    if (!data.words.length || !data.questions.length) return emptyChallenge(data.copy,data.milestone);
    if (state.stage === 'result') return resultView(data);
    if (data.milestone.type === 'review' && state.stage === 'study') return reviewStudy(data);
    return examView(data);
  }
  function resetChallenge(stage) { Object.assign(state,{stage,item:0,answer:null,revealed:false,results:[]}); }
  function challengeClick(action, target) {
    if (action === 'v113-open') {
      state.active = {type:target.dataset.type, level:Number(target.dataset.level), after:Number(target.dataset.after), questions:Number(target.dataset.questions)};
      resetChallenge(state.active.type === 'review' ? 'study' : 'exam');
      return {open:true};
    }
    if (action === 'v113-exit') { state.active = null; return {exit:true}; }
    if (!state.active) return null;
    if (action === 'v113-study-prev') state.item = Math.max(0,state.item-1);
    else if (action === 'v113-study-next') state.item++;
    else if (action === 'v113-start-exam') resetChallenge('exam');
    else if (action === 'v113-answer' && !state.revealed) state.answer = Number(target.dataset.index);
    else if (action === 'v113-check' && state.answer != null) {
      const data=activeData(),q=data.questions[state.item]; state.results[state.item]=state.answer===q.correct; state.revealed=true;
    } else if (action === 'v113-next' && state.revealed) {
      const data=activeData();
      if (state.item >= data.questions.length-1) { markComplete(state.active); state.stage='result'; }
      else { state.item++; state.answer=null; state.revealed=false; }
    } else if (action === 'v113-retry') resetChallenge(state.active.type === 'review' ? 'study' : 'exam');
    else return null;
    return {};
  }

  LiplipCourse.mapPage = mapPage;
  LiplipCourse.render = progress => state.active ? challengeRender() : baseRender(progress);
  LiplipCourse.click = (action,target,progress,rerender) => challengeClick(action,target) ?? baseClick(action,target,progress,rerender);
})();
