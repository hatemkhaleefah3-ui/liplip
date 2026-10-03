/* Build 117: temporary guests, clean new learners, and explicit wrong-answer flags. */
(() => {
  'use strict';
  if (typeof state === 'undefined' || typeof LiplipProgress === 'undefined') return;

  const UI = window.LiplipFrontend;
  const PROGRESS_KEYS = new Set([
    'liplip-progress-v1',
    'liplip-progression-v114',
    'liplip-v45-progression',
    'liplip-study-milestones-v113'
  ]);
  const transient = new Map();
  const nativeStorage = {
    get: Storage.prototype.getItem,
    set: Storage.prototype.setItem,
    remove: Storage.prototype.removeItem
  };
  let guestActive = false;
  let pendingNewAccount = false;
  let renderQueued = false;

  const t = (ar, en) => localStorage.getItem('liplip-ui-language') === 'en' ? en : ar;
  const freshProgression = () => ({
    version: 1,
    migrated: true,
    literacyLearn: {letters: false, numbers: false},
    levels: {1: false, 2: false, 3: false, 4: false, 5: false}
  });
  const freshLegacy = () => ({literacy: {letters: false, numbers: false}, exams: {}, notified: {}});
  const freshMilestones = () => ({version: 1, baseline: {}, completed: {}});
  const encode = value => JSON.stringify(value);

  function isProgressStorage(storage, key) {
    return storage === localStorage && PROGRESS_KEYS.has(String(key)) || storage === sessionStorage && String(key) === 'liplip-preview';
  }
  Storage.prototype.getItem = function(key) {
    if (guestActive && isProgressStorage(this, key)) return transient.has(String(key)) ? transient.get(String(key)) : null;
    return nativeStorage.get.call(this, key);
  };
  Storage.prototype.setItem = function(key, value) {
    if (guestActive && isProgressStorage(this, key)) { transient.set(String(key), String(value)); return; }
    return nativeStorage.set.call(this, key, value);
  };
  Storage.prototype.removeItem = function(key) {
    if (guestActive && isProgressStorage(this, key)) { transient.delete(String(key)); return; }
    return nativeStorage.remove.call(this, key);
  };

  function resetLiteracy() {
    const literacy = window.LiplipLiteracy;
    if (!literacy) return;
    Object.assign(literacy, {
      mode: null, stage: 'learn', index: 0, face: true, drawn: false,
      started: false, input: '', speech: '', result: null, mic: false, _v74: null
    });
  }
  function resetViewState() {
    Object.assign(state, {
      nav: 'الرئيسية', studyMapView: 'levels', studyMapLevel: null, studyMapStep: null,
      studyReviewBox: null, justCompleted: null, closetView: null, closetIndex: 0
    });
  }
  function seedFreshStores(writer) {
    writer('liplip-progress-v1', encode(state.progress));
    writer('liplip-progression-v114', encode(freshProgression()));
    writer('liplip-v45-progression', encode(freshLegacy()));
    writer('liplip-study-milestones-v113', encode(freshMilestones()));
  }
  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    setTimeout(() => { renderQueued = false; window.render?.(false); }, 0);
  }

  function enterGuest() {
    guestActive = true;
    transient.clear();
    state.progress = LiplipProgress.hydrate(null);
    seedFreshStores((key, value) => transient.set(key, value));
    resetLiteracy();
    resetViewState();
    Object.assign(state, {guest: true, profile: null, page: 'app', mode: 'signin'});
    try { sessionStorage.removeItem('liplip-preview'); } catch {}
    try { nativeStorage.remove.call(localStorage, 'liplip-backend-meta-v1'); } catch {}
    fetch('/api/auth/logout', {method: 'POST', credentials: 'same-origin', keepalive: true}).catch(() => {});
    queueRender();
  }

  function resetNewUser() {
    guestActive = false;
    transient.clear();
    state.guest = false;
    state.progress = LiplipProgress.hydrate(null);
    resetLiteracy();
    resetViewState();
    seedFreshStores((key, value) => nativeStorage.set.call(localStorage, key, value));
    try { sessionStorage.removeItem('liplip-preview'); } catch {}
    if (typeof window.save === 'function') window.save();
    return LiplipProgress.courseSnapshot(state.progress);
  }

  const originalSave = window.save;
  if (typeof originalSave === 'function') {
    window.save = function(...args) {
      if (guestActive || state.guest) return;
      return originalSave.apply(this, args);
    };
  }

  window.addEventListener('submit', event => {
    if (event.target?.id === 'auth-form' && state.mode === 'signup') pendingNewAccount = true;
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-action="signin"]')) pendingNewAccount = false;
    const guest = event.target.closest?.('[data-action="guest"]');
    if (!guest) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterGuest();
  }, true);

  function mountAccountState() {
    if (guestActive && !state.guest) { guestActive = false; transient.clear(); }
    if (pendingNewAccount && state.page === 'profile' && state.profile?.email) {
      pendingNewAccount = false;
      resetNewUser();
      queueRender();
      setTimeout(() => window.LiplipBackend?.syncNow?.(), 200);
    }
    const home = document.querySelector('.home-v116');
    if (home && state.guest && !home.querySelector('.v117-guest-note')) {
      home.insertAdjacentHTML('afterbegin', `<div class="v117-guest-note"><b>⚑ ${t('وضع الضيف','Guest mode')}</b><span>${t('لن يُحفظ أي تقدّم، وستبدأ من الحروف والأرقام في كل زيارة.','Progress is not saved. Every guest visit starts with Letters and Numbers.')}</span></div>`);
    }
  }

  /* Practice exams: flag a wrong answer and keep the learner on the same question. */
  const Course = window.LiplipCourse;
  const study = window.LiplipCourse57;
  const milestone = window.LiplipStudyMilestones113;
  if (Course && study) {
    const baseRender = Course.render.bind(Course);
    const baseClick = Course.click.bind(Course);
    const studyFlags = study._v117Flags = study._v117Flags || new Set();
    const milestoneFlags = milestone ? (milestone._v117Flags = milestone._v117Flags || new Set()) : new Set();
    const key = () => `${study.boxId}:${study.phase}:${study.process}:${study.item}`;
    const normalWrong = () => Boolean(study.boxId && !milestone?.active && study.revealed && study.results?.[study.item] === false);
    const milestoneWrong = () => Boolean(milestone?.active && milestone.revealed && milestone.results?.[milestone.item] === false);
    const nextActions = new Set(['exam-next', 'ai-next', 'finish-vocab-attempt', 'finish-exam']);

    function practiceCorrection(html) {
      studyFlags.add(key());
      const withoutNext = html.replace(/<button\b[^>]*data-course="(?:exam-next|ai-next|finish-vocab-attempt|finish-exam)"[^>]*>[\s\S]*?<\/button>/gi, '');
      const panel = `<div class="v117-study-correction" role="alert"><span>⚑</span><div><strong>${t('تم وضع علامة على الإجابة','This answer is flagged')}</strong><p>${t('صحّح الإجابة نفسها قبل الانتقال إلى السؤال التالي.','Correct this same answer before moving to the next question.')}</p></div><button class="primary" data-course="v117-correct-study">${t('صحّح الآن','Correct now')}</button></div>`;
      if (withoutNext.includes('</section>')) return withoutNext.replace(/<\/section>(?![\s\S]*<\/section>)/, `${panel}</section>`);
      return `${withoutNext}${panel}`;
    }
    function milestoneFlag(html) {
      milestoneFlags.add(`${milestone.active.level}:${milestone.active.type}:${milestone.active.after}:${milestone.item}`);
      return html.replace('<div class="v113-answer-feedback wrong">', `<div class="v113-answer-feedback wrong"><div class="v117-exam-flag"><b>⚑ ${t('إجابة معلّمة','Answer flagged')}</b><span>${t('تم تسجيل اختيارك الأول. لا يمكن تغييره في الاختبار.','Your first choice is recorded and cannot be changed in this exam.')}</span></div>`);
    }
    Course.render = progress => {
      let html = baseRender(progress);
      if (normalWrong()) html = practiceCorrection(html);
      else if (milestoneWrong()) html = milestoneFlag(html);
      return html;
    };
    Course.click = (action, target, progress, rerender) => {
      if (normalWrong() && nextActions.has(action)) return {};
      if (action === 'v117-correct-study' && normalWrong()) {
        study.revealed = false;
        study.answer = null;
        study.feedback = '';
        study.drawn = false;
        study.order = [];
        if (Array.isArray(study._v95Order)) study._v95Order = [];
        return {};
      }
      const result = baseClick(action, target, progress, rerender);
      if (action === 'v113-open' || action === 'v113-retry') milestoneFlags.clear();
      return result;
    };
  }

  function decorateGrammarFlag() {
    const wrong = document.querySelector('.v95-grammar-exam .c57-feedback.wrong');
    if (wrong && !wrong.querySelector('.v117-inline-flag')) {
      wrong.insertAdjacentHTML('afterbegin', `<span class="v117-inline-flag">⚑ ${t('إجابة معلّمة — صحّحها للمتابعة','Flagged — correct it to continue')}</span>`);
    }
  }

  const api = window.LiplipGuestStudy117 = window.LiplipGuestStudy117 || {};
  Object.assign(api, {enterGuest, resetNewUser, resetLiteracy, freshProgression, isGuestActive: () => guestActive, transient});
  UI?.registerFeature?.('guest-study-corrections-v117', {mount() { mountAccountState(); decorateGrammarFlag(); }});

  if (state.guest) enterGuest();
  else mountAccountState();
})();
