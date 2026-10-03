/* Build 120: Excel-backed video/story exams. Gemini exam generation is retired from Study. */
(() => {
  'use strict';

  const Course = window.LiplipCourse;
  const S = window.LiplipCourse57;
  if (!Course || !S || Course.__staticMediaExamsV120) return;
  Course.__staticMediaExamsV120 = true;

  const UI = window.LiplipFrontend;
  const t = (ar, en) => UI?.t ? UI.t(ar, en) : (localStorage.getItem('liplip-ui-language') === 'en' ? en : ar);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text = value => String(value ?? '').trim();
  const norm = value => text(value).toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/[.,?!؟؛:()"'’“”\-_]/g, '').replace(/\s+/g, ' ');

  const active = () => Boolean(S.boxId && S.phase === 'watchRead' && Number(S.mediaStep || 0) === 1);
  const kind = () => Number(S.process) === 0 ? 'video' : 'story';
  const sheetName = value => value === 'video' ? 'Video_Questions' : 'Story_Questions';

  function sourceQuestions(value = kind()) {
    const wr = Course.getContent(S.boxId)?.watchRead || {};
    const list = value === 'video' ? wr.videoQuestions : wr.storyQuestions;
    return Array.isArray(list) ? list : [];
  }

  function normalizeQuestion(raw, index, value = kind()) {
    const prompt = text(raw?.prompt || raw?.title || raw?.question);
    const answer = text(raw?.answer || raw?.correctAnswer);
    let options = Array.isArray(raw?.options)
      ? raw.options.map(text).filter(Boolean)
      : [raw?.option1, raw?.option2, raw?.option3, raw?.option4].map(text).filter(Boolean);
    if (!prompt || !answer) return null;
    if (!options.some(option => norm(option) === norm(answer))) options = [answer, ...options];
    const deduped = [];
    const seen = new Set();
    for (const option of options) {
      const key = norm(option);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(option);
    }
    if (deduped.length < 2) return null;
    let correctIndex = deduped.findIndex(option => norm(option) === norm(answer));
    if (correctIndex < 0) correctIndex = 0;
    return {
      kind: `${value}-excel-v120`,
      type: 'mcq',
      order: Number(raw?.order) || index + 1,
      prompt,
      title: prompt,
      answer,
      options: deduped,
      correct: correctIndex,
      correctIndex,
      explanation: text(raw?.explanation)
    };
  }

  function questionBank(value = kind()) {
    return sourceQuestions(value)
      .map((question, index) => normalizeQuestion(question, index, value))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }

  function resetQuestion() {
    S.answer = null;
    S.revealed = false;
    S.feedback = '';
  }

  function startExam(value) {
    const exam = questionBank(value);
    Object.assign(S, {
      mediaStep: 1,
      exam,
      item: 0,
      answer: null,
      revealed: false,
      feedback: '',
      results: [],
      loading: false,
      error: exam.length ? '' : t(`لا توجد أسئلة صالحة في ورقة ${sheetName(value)} لهذا الصندوق.`, `No valid questions were found in the ${sheetName(value)} sheet for this box.`)
    });
    return exam;
  }

  function score() {
    const total = S.exam?.length || 0;
    return total ? Math.round((S.results || []).filter(Boolean).length / total * 100) : 0;
  }

  function pager(total) {
    const current = Math.min((Number(S.item) || 0) + 1, Math.max(1, total));
    const pct = total ? current / total * 100 : 0;
    return `<div class="c57-pager"><span>${t('سؤال','Question')}</span><b>${current} / ${Math.max(1,total)}</b><i><u style="width:${pct}%"></u></i></div>`;
  }

  function resultMarkup(value) {
    const total = S.exam?.length || 0;
    const correct = (S.results || []).filter(Boolean).length;
    const valueScore = score();
    return `<section class="c57-summary pass v120-static-media-result">
      <span>✓</span>
      <small>${t('أسئلة من ملف Excel','EXCEL QUESTION BANK')}</small>
      <h1>${value === 'video' ? t('نتيجة اختبار الفيديو','Video exam result') : t('نتيجة اختبار القصة','Story exam result')}</h1>
      <strong>${valueScore}%</strong>
      <p>${t(`أجبت عن ${correct} من ${total} بشكل صحيح.`,`You answered ${correct} of ${total} correctly.`)}</p>
      <div class="c57-complete-actions">
        <button data-v120-media-retry>${t('إعادة الاختبار','Retry exam')}</button>
        <button class="primary" data-course="finish-exam" data-kind="${value}" data-score="${valueScore}">${t('إنهاء والمتابعة','Finish and continue')}</button>
      </div>
    </section>`;
  }

  function missingMarkup(value) {
    const sheet = sheetName(value);
    return `<section class="c57-ai-start v120-static-media-empty">
      <span aria-hidden="true">!</span>
      <h1>${value === 'video' ? t('أضف أسئلة الفيديو','Add video questions') : t('أضف أسئلة القصة','Add story questions')}</h1>
      <p>${t(`املأ ورقة ${sheet} في ملف Excel ثم أعد استيراده.`,`Fill the ${sheet} sheet in the Excel workbook, then import it again.`)}</p>
    </section>`;
  }

  function examMarkup(value) {
    const list = Array.isArray(S.exam) ? S.exam : [];
    if (!list.length) return missingMarkup(value);
    if (S.answer === 'summary') return resultMarkup(value);
    const index = Math.min(Number(S.item) || 0, list.length - 1);
    const question = list[index];
    const selected = typeof S.answer === 'number' ? S.answer : null;
    const correct = Boolean(S.results?.[index]);
    const feedback = S.revealed
      ? `<div class="c57-feedback ${correct ? 'correct' : 'wrong'}"><strong>${correct ? t('صحيح','Correct') : t('غير صحيح — صحح إجابتك','Not correct — correct your answer')}</strong>${!correct ? `<p>${t('اختر إجابة أخرى ثم تحقق مرة ثانية.','Choose another answer, then check again.')}</p>` : ''}</div>`
      : '';
    const action = S.revealed && correct
      ? `<button class="primary" data-v120-media-next>${index >= list.length - 1 ? t('عرض النتيجة','Show result') : t('التالي','Next')}</button>`
      : `<button class="primary" data-v120-media-check ${selected == null ? 'disabled' : ''}>${S.revealed ? t('تحقق مرة أخرى','Check again') : t('تحقق','Check')}</button>`;
    return `<section class="c57-exam c57-ai-exam v120-static-media-exam" data-source-sheet="${sheetName(value)}">
      <header>
        <span>03 · ${t('أسئلة من Excel','EXCEL QUESTION BANK')}</span>
        <h1>${value === 'video' ? t('اختبار الفيديو','Video exam') : t('اختبار القصة','Story exam')}</h1>
        <p>${t(`الأسئلة مأخوذة مباشرة من ورقة ${sheetName(value)} في ملف Excel.`,`Questions come directly from the ${sheetName(value)} sheet in the Excel workbook.`)}</p>
      </header>
      ${pager(list.length)}
      <article class="c57-question">
        <small>${t('اختيار من متعدد','MULTIPLE CHOICE')}</small>
        <h2 dir="auto">${esc(question.prompt)}</h2>
        <div class="c57-options">${question.options.map((option, optionIndex) => `<button data-v120-media-option data-index="${optionIndex}" class="${selected === optionIndex ? 'selected v120-selected' : ''}" aria-pressed="${selected === optionIndex}"><span>${esc(option)}</span></button>`).join('')}</div>
        ${feedback}
      </article>
      <nav class="c57-question-next">${action}</nav>
    </section>`;
  }

  function replaceWorkspace(html, body) {
    const source = String(html ?? '');
    const start = source.indexOf('<section class="c57-workspace">');
    const marker = '</section></div></main>';
    const end = source.lastIndexOf(marker);
    if (start < 0 || end < start) return source;
    return source.slice(0, start) + `<section class="c57-workspace">${body}</section>` + source.slice(end + '</section>'.length);
  }

  function decorateManager() {
    const root = document.querySelector?.('.c57-manager,.v97-content-control');
    if (!root) return;
    const paragraph = root.querySelector?.('section > p,.v97-cc-body > p,.v97-cc-copy');
    if (paragraph && /Gemini/i.test(paragraph.textContent || '')) {
      paragraph.textContent = t(
        'المفردات تُنشئ أسئلتها من الكلمات. أسئلة القواعد والفيديو والقصة تأتي من أوراق الأسئلة المخصصة داخل ملف Excel.',
        'Vocabulary builds its exam from the words. Grammar, video, and story exams use their dedicated question sheets in the Excel workbook.'
      );
    }
  }

  const baseRender = Course.render.bind(Course);
  const baseClick = Course.click.bind(Course);

  Course.render = progress => {
    const html = baseRender(progress);
    decorateManager();
    if (!active()) return html;
    if (!Array.isArray(S.exam) || !S.exam.every(question => String(question?.kind || '').endsWith('-excel-v120'))) {
      S.exam = questionBank(kind());
      S.item = 0;
      S.results = [];
      resetQuestion();
    }
    return replaceWorkspace(html, examMarkup(kind()));
  };

  Course.click = (action, target, progress, rerender) => {
    if (action === 'media-exam' && S.phase === 'watchRead') {
      const requested = target?.dataset?.kind === 'video' ? 'video' : 'story';
      startExam(requested);
      return {};
    }
    return baseClick(action, target, progress, rerender);
  };

  document.addEventListener('click', event => {
    const option = event.target.closest?.('[data-v120-media-option]');
    if (option && active()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      S.answer = Number(option.dataset.index);
      if (S.revealed && S.results?.[S.item] === false) {
        S.revealed = false;
        S.feedback = '';
        delete S.results[S.item];
      }
      window.render?.(false);
      return;
    }

    const check = event.target.closest?.('[data-v120-media-check]');
    if (check && active()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const question = S.exam?.[S.item];
      if (!question || typeof S.answer !== 'number') return;
      const ok = Number(S.answer) === Number(question.correctIndex);
      S.results[S.item] = ok;
      S.revealed = true;
      S.feedback = '';
      window.render?.(false);
      return;
    }

    const next = event.target.closest?.('[data-v120-media-next]');
    if (next && active()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!S.results?.[S.item]) return;
      if (S.item >= S.exam.length - 1) S.answer = 'summary';
      else {
        S.item++;
        resetQuestion();
      }
      window.render?.(false);
      return;
    }

    const retry = event.target.closest?.('[data-v120-media-retry]');
    if (retry && active()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startExam(kind());
      window.render?.(false);
    }
  }, true);

  const schedule = () => requestAnimationFrame(() => decorateManager());
  new MutationObserver(schedule).observe(document.getElementById('app') || document.body, {childList:true, subtree:true});
  UI?.registerFeature?.('study-static-media-exams-v120', {mount: decorateManager});

  window.LiplipStaticMediaExams120 = {
    active,
    kind,
    sourceQuestions,
    normalizeQuestion,
    questionBank,
    startExam,
    examMarkup,
    resultMarkup,
    missingMarkup,
    replaceWorkspace,
    score
  };
})();
