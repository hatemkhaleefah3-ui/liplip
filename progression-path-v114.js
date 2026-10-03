/* Build 114: one progression source for literacy, CEFR levels, and Home access gates. */
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI || typeof LiplipProgress === 'undefined' || typeof state === 'undefined') return;

  const STORE = 'liplip-progression-v114';
  const LEGACY = 'liplip-v45-progression';
  const MILESTONES = 'liplip-study-milestones-v113';
  const LEVELS = ['A0','A1','A2','B1','B2','C1','C2'];
  let rerenderQueued = false;

  const t = (ar,en) => UI.t(ar,en);
  const esc = value => UI.escapeHTML(String(value ?? ''));
  const isAdmin = () => sessionStorage.getItem('liplip-admin-v47') === '1';
  const read = (key,fallback) => UI.storage.get(key,fallback);
  const write = (key,value) => UI.storage.set(key,value);
  const course = () => LiplipProgress.courseSnapshot(state.progress);
  const levelFinalId = level => (level - 1) * 200 + 50;

  function legacyMeta() { return read(LEGACY,{literacy:{letters:false,numbers:false},exams:{},notified:{}}); }
  function milestoneMeta() { return read(MILESTONES,{version:1,baseline:{},completed:{}}); }
  function initialState() {
    const legacy = legacyMeta(), milestone = milestoneMeta(), completed = new Set(course().completedBoxes || []);
    const levels = {};
    for (let level=1; level<=5; level++) {
      const finalKey = `${level}:final:50`;
      const migratedFinal = Boolean(milestone.completed?.[finalKey]) || Number(milestone.baseline?.[level] || 1) > 50;
      levels[level] = completed.has(levelFinalId(level)) && (migratedFinal || Boolean(legacy.exams?.[`${level}:50`]));
    }
    return {
      version:1,
      migrated:true,
      literacyLearn:{
        letters:Boolean(legacy.literacy?.letters),
        numbers:Boolean(legacy.literacy?.numbers)
      },
      levels
    };
  }
  function load() {
    const value = read(STORE,null);
    if (!value || value.version !== 1) { const created=initialState(); write(STORE,created); return created; }
    value.literacyLearn = value.literacyLearn || {letters:false,numbers:false};
    value.levels = value.levels || {};
    return value;
  }
  function save(value) { write(STORE,value); }

  function refreshFinals(value=load()) {
    const milestone = milestoneMeta(), legacy = legacyMeta(), completed = new Set(course().completedBoxes || []);
    let changed = false;
    for (let level=1; level<=5; level++) {
      const generated = Boolean(milestone.completed?.[`${level}:final:50`]) || Number(milestone.baseline?.[level] || 1) > 50;
      const done = completed.has(levelFinalId(level)) && (generated || Boolean(legacy.exams?.[`${level}:50`]) || Boolean(value.levels[level]));
      if (Boolean(value.levels[level]) !== done) { value.levels[level]=done; changed=true; }
    }
    if (changed) save(value);
    return value;
  }
  function markLearnCompletion() {
    const literacy = window.LiplipLiteracy;
    if (!literacy || !['letters','numbers'].includes(literacy.mode) || literacy._v74?.phase !== 'complete') return false;
    const value=load();
    if (value.literacyLearn[literacy.mode]) return false;
    value.literacyLearn[literacy.mode]=true; save(value); return true;
  }
  function snapshot() {
    const value=refreshFinals(load());
    const letters=Boolean(value.literacyLearn.letters), numbers=Boolean(value.literacyLearn.numbers);
    let rank=letters&&numbers ? 1 : 0;
    if (rank) for (let level=1;level<=5;level++) { if (value.levels[level]) rank=level+1; else break; }
    if (isAdmin()) rank=99;
    return {
      letters,numbers,rank,
      cefr:rank===99?'ADMIN':LEVELS[Math.max(0,Math.min(6,rank))],
      levels:{...value.levels},
      study:rank>=1,fastWrite:rank>=2,talk:rank>=3
    };
  }
  function syncLegacy() {
    const s=snapshot(), meta=legacyMeta();
    meta.literacy=meta.literacy||{}; meta.exams=meta.exams||{};
    let changed=false;
    for (const mode of ['letters','numbers']) if (Boolean(meta.literacy[mode]) !== Boolean(s[mode])) { meta.literacy[mode]=Boolean(s[mode]); changed=true; }
    for (let level=1;level<=5;level++) if (s.levels[level] && !meta.exams[`${level}:50`]) { meta.exams[`${level}:50`]=true; changed=true; }
    if (changed) write(LEGACY,meta);
    return changed;
  }

  const stepData = s => [
    {n:1,key:'letters',title:t('أكمل تعلّم الحروف','Finish Letters Learn'),detail:t('الحروف الإنجليزية A–Z','English letters A–Z'),done:s.letters,active:!s.letters,reward:'A0'},
    {n:2,key:'numbers',title:t('أكمل تعلّم الأرقام','Finish Numbers Learn'),detail:t('بعدها تنتقل من A0 إلى A1','Then upgrade from A0 to A1'),done:s.numbers,active:s.letters&&!s.numbers,reward:'A1'},
    {n:3,key:'level1',title:t('أكمل مستوى الدراسة 1','Finish Study Level 1'),detail:t('تصل إلى A2 وتفتح الكتابة السريعة','Reach A2 and unlock Fast Write'),done:Boolean(s.levels[1]),active:s.rank===1,reward:'A2'},
    {n:4,key:'level2',title:t('أكمل مستوى الدراسة 2','Finish Study Level 2'),detail:t('تصل إلى B1 وتفتح الدردشة والمكالمة','Reach B1 and unlock Chat and Call'),done:Boolean(s.levels[2]),active:s.rank===2,reward:'B1'},
    {n:5,key:'level3',title:t('أكمل مستوى الدراسة 3','Finish Study Level 3'),detail:t('ترتقي إلى B2','Upgrade to B2'),done:Boolean(s.levels[3]),active:s.rank===3,reward:'B2'},
    {n:6,key:'level4',title:t('أكمل مستوى الدراسة 4','Finish Study Level 4'),detail:t('ترتقي إلى C1','Upgrade to C1'),done:Boolean(s.levels[4]),active:s.rank===4,reward:'C1'},
    {n:7,key:'level5',title:t('أكمل مستوى الدراسة 5','Finish Study Level 5'),detail:t('تكمل المسار عند C2','Complete the path at C2'),done:Boolean(s.levels[5]),active:s.rank===5,reward:'C2'}
  ];
  function progressionMarkup(s) {
    const steps=stepData(s);
    return `<section class="v114-path"><header><div><span>${t('مسارك خطوة بخطوة','YOUR STEP-BY-STEP PATH')}</span><h2>${t('اعرف خطوتك الحالية وما الذي سيفتح بعدها','See your current step and what unlocks next')}</h2></div><strong dir="ltr">${s.cefr}</strong></header><div class="v114-path-steps">${steps.map(step=>`<article class="${step.done?'done':step.active?'active':'locked'}"><span class="v114-step-no">${step.done?'✓':String(step.n).padStart(2,'0')}</span><div><small>${step.active?t('خطوتك الحالية','CURRENT STEP'):step.done?t('مكتمل','COMPLETE'):t('مغلق','LOCKED')}</small><strong>${step.title}</strong><p>${step.detail}</p></div><b dir="ltr">${step.reward}</b></article>`).join('')}</div></section>`;
  }

  function stateBadge(button,locked,label) {
    let badge=button.querySelector('.v114-access-state');
    if(!badge){badge=document.createElement('span');badge.className='v114-access-state';button.appendChild(badge);}
    badge.textContent=locked?`${t('مغلق','Locked')} · ${label}`:t('مفتوح','Open');
    badge.classList.toggle('open',!locked);
  }
  function manageButton(button,{locked,label,available=true}) {
    if(!button)return;
    button.classList.toggle('v114-locked',locked);
    button.classList.toggle('v114-unlocked',!locked&&available);
    button.disabled=locked||!available;
    if(locked){button.dataset.v114Lock=label;button.setAttribute('aria-disabled','true');}
    else{delete button.dataset.v114Lock;button.removeAttribute('aria-disabled');}
    stateBadge(button,locked,label);
  }
  function decorateHome(root,s) {
    const home=root.querySelector('.home-v28,.home-v40');
    if(!home)return;
    if(!home.querySelector('.v114-path')){
      const section=home.querySelector('.home-section');
      section?.insertAdjacentHTML('beforebegin',progressionMarkup(s));
    }
    const current=course(),hasCurrent=Boolean(current.currentBox),hasPrevious=Boolean(current.completedBoxes?.length);
    root.querySelectorAll('[data-v28="study-current"]').forEach(button=>{
      button.classList.remove('v47-home-study-blocked');
      manageButton(button,{locked:!s.study,label:'A1',available:hasCurrent});
    });
    root.querySelectorAll('[data-v28="review-last"]').forEach(button=>{
      button.classList.remove('v47-home-study-blocked');
      manageButton(button,{locked:!s.study,label:'A1',available:hasPrevious});
    });
    const letters=root.querySelector('[data-v45-literacy="letters"],[data-literacy="letters"]');
    if(letters){manageButton(letters,{locked:false,label:'A0'});stateBadge(letters,false,'A0');}
    const numbers=root.querySelector('[data-v45-literacy="numbers"],[data-literacy="numbers"]');
    if(numbers)manageButton(numbers,{locked:!s.letters,label:t('بعد الحروف','After Letters')});
    const fast=root.querySelector('[data-v45-fast],[data-v45-locked="A2"],[data-literacy="fast-write"],[data-feature="fast-write"]');
    if(fast){
      manageButton(fast,{locked:!s.fastWrite,label:'A2'});
      if(s.fastWrite){fast.dataset.v45Fast='1';delete fast.dataset.v45Locked;delete fast.dataset.literacy;delete fast.dataset.v28;fast.classList.remove('soon');}
      else{fast.dataset.v45Locked='A2';delete fast.dataset.v45Fast;delete fast.dataset.literacy;}
    }
    root.querySelectorAll('[data-v28="talk"]').forEach(button=>manageButton(button,{locked:!s.talk,label:'B1'}));
    const shownLevel=home.querySelector('.home-status-mini strong[dir="ltr"],.home-v40-overview article:last-child strong');
    if(shownLevel)shownLevel.textContent=s.cefr;
  }
  function decorateNav(root,s) {
    root.querySelectorAll('[data-nav="الدراسة"]').forEach(button=>{
      button.classList.toggle('v114-nav-locked',!s.study);button.disabled=!s.study;button.dataset.v114Lock=!s.study?'A1':'';
    });
    root.querySelectorAll('[data-nav="تحدّث"]').forEach(button=>{
      button.classList.toggle('v114-nav-locked',!s.talk);button.disabled=!s.talk;button.dataset.v114Lock=!s.talk?'B1':'';
    });
  }
  function queueRerender(){if(rerenderQueued)return;rerenderQueued=true;setTimeout(()=>{rerenderQueued=false;window.render?.(false)},0);}
  function mount({root}) {
    const learned=markLearnCompletion(),synced=syncLegacy(),s=snapshot();
    decorateHome(root,s);decorateNav(root,s);
    if(learned||synced)queueRerender();
  }

  window.LiplipProgression114={snapshot,stepData,markLearnCompletion,syncLegacy};
  UI.registerFeature('progression-path-v114',{mount});
  document.addEventListener('click',event=>{
    const locked=event.target.closest?.('[data-v114-lock]');
    if(!locked||!locked.dataset.v114Lock)return;
    event.preventDefault();event.stopImmediatePropagation();
    alert(t(`تفتح هذه الصفحة عند ${locked.dataset.v114Lock}.`,`This page unlocks at ${locked.dataset.v114Lock}.`));
  },true);
  syncLegacy();
  if(state.page==='app')queueRerender();
})();
