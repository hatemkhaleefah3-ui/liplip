/* Build 120 corrective patch: preserve workbook question banks and render Story as one readable book page. */
(() => {
  'use strict';

  const Course = window.LiplipCourse;
  const S = window.LiplipCourse57;
  if (!Course || !S || Course.__studyBookQuestionBankV120) return;
  Course.__studyBookQuestionBankV120 = true;

  const STORE = 'liplip-course-content-v2';
  const STYLE_ID = 'liplip-study-book-question-bank-v120-style';
  const UI = window.LiplipFrontend;
  const t = (ar, en) => UI?.t ? UI.t(ar, en) : (localStorage.getItem('liplip-ui-language') === 'en' ? en : ar);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text = value => String(value ?? '').trim();

  function readStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  function rawBox(id) {
    return readStore()[String(id)] || {};
  }

  function arrayOrFallback(primary, fallback) {
    return Array.isArray(primary) ? primary : (Array.isArray(fallback) ? fallback : []);
  }

  const baseGetContent = Course.getContent.bind(Course);
  Course.getContent = id => {
    const base = baseGetContent(id) || {};
    const raw = rawBox(id);
    const baseGrammar = base.grammar || {};
    const baseWatchRead = base.watchRead || {};
    const rawWatchRead = raw.watchRead || {};
    return {
      ...base,
      grammar: {
        ...baseGrammar,
        questions: arrayOrFallback(raw.grammar?.questions, baseGrammar.questions)
      },
      watchRead: {
        ...baseWatchRead,
        story: arrayOrFallback(rawWatchRead.story, baseWatchRead.story),
        questions: arrayOrFallback(rawWatchRead.questions, baseWatchRead.questions),
        videoQuestions: arrayOrFallback(rawWatchRead.videoQuestions, baseWatchRead.videoQuestions),
        storyQuestions: arrayOrFallback(rawWatchRead.storyQuestions, baseWatchRead.storyQuestions)
      }
    };
  };

  function isStoryReading() {
    return Boolean(S.boxId && S.phase === 'watchRead' && Number(S.process) === 1 && Number(S.mediaStep || 0) === 0);
  }

  function storyEntries(content) {
    return arrayOrFallback(content?.watchRead?.story, [])
      .map((entry, index) => ({
        order: Number(entry?.order) || index + 1,
        title: text(entry?.title),
        english: text(entry?.text),
        arabic: text(entry?.arabic)
      }))
      .filter(entry => entry.english || entry.arabic)
      .sort((a, b) => a.order - b.order);
  }

  function paragraphs(value, dir) {
    const blocks = text(value).split(/\n\s*\n|\r?\n/).map(part => part.trim()).filter(Boolean);
    return blocks.map(part => `<p dir="${dir}">${esc(part)}</p>`).join('');
  }

  function storyBookMarkup(content) {
    const entries = storyEntries(content);
    const firstTitle = entries.find(entry => entry.title)?.title || t('قصة هذا الصندوق', 'This box story');
    const hasText = entries.length > 0;
    const body = hasText
      ? entries.map((entry, index) => {
          const showSectionTitle = entry.title && (entries.length > 1 || entry.title !== firstTitle);
          return `<section class="v120-story-section" data-story-order="${entry.order}">
            ${showSectionTitle ? `<h2>${esc(entry.title)}</h2>` : ''}
            ${entry.english ? `<div class="v120-story-copy" lang="en">${paragraphs(entry.english, 'ltr')}</div>` : ''}
            ${entry.arabic ? `<aside class="v120-story-translation" lang="ar" dir="rtl"><small>${t('الترجمة العربية', 'Arabic translation')}</small>${paragraphs(entry.arabic, 'rtl')}</aside>` : ''}
          </section>`;
        }).join('')
      : `<div class="v120-story-empty"><strong>${t('نص القصة غير مضاف بعد.', 'Story text has not been added yet.')}</strong><p>${t('أضف النص في ورقة Watch_Read ثم أعد استيراد ملف Excel.', 'Add the text in the Watch_Read sheet, then import the Excel workbook again.')}</p></div>`;

    return `<section class="c57-study c57-media v120-story-book">
      <header class="v120-story-head">
        <span>03 · ${t('القصة', 'STORY')}</span>
        <h1>${esc(firstTitle)}</h1>
        <p>${t('اقرأ القصة كاملة في صفحة كتاب واحدة، ثم ابدأ أسئلة القصة.', 'Read the whole story on one book page, then start the story questions.')}</p>
      </header>
      <article class="v120-story-book-page" aria-label="${esc(firstTitle)}">
        <span class="v120-story-ribbon" aria-hidden="true">03</span>
        <div class="v120-story-paper">${body}</div>
      </article>
      <button class="primary c57-media-next v120-story-start" data-course="media-exam" data-kind="story" ${hasText ? '' : 'disabled'}>${t('ابدأ أسئلة القصة', 'Start story questions')}</button>
    </section>`;
  }

  function replaceStoryStudy(html, markup) {
    const source = String(html ?? '');
    const re = /<section class="c57-study c57-media">[\s\S]*?<\/section>/;
    return re.test(source) ? source.replace(re, markup) : source;
  }

  const baseRender = Course.render.bind(Course);
  Course.render = progress => {
    const html = baseRender(progress);
    if (!isStoryReading()) return html;
    return replaceStoryStudy(html, storyBookMarkup(Course.getContent(S.boxId)));
  };

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById?.(STYLE_ID)) return;
    const style = document.createElement?.('style');
    if (!style) return;
    style.id = STYLE_ID;
    style.textContent = `
      .v120-story-book{max-width:980px;margin-inline:auto}
      .v120-story-head{text-align:center;margin-bottom:24px}
      .v120-story-head>span{display:inline-block;font-weight:800;letter-spacing:.14em;color:#8056a7}
      .v120-story-head h1{margin:12px 0 8px;font-size:clamp(2rem,6vw,3.6rem);line-height:1.08;color:#281f36}
      .v120-story-head p{max-width:720px;margin:0 auto;color:#756d7f;font-weight:600}
      .v120-story-book-page{position:relative;max-width:860px;margin:0 auto 28px;padding:clamp(26px,5vw,54px);border:1px solid #dccfb4;border-radius:30px;background:#fffdf7;box-shadow:0 18px 0 #e8dcc2,0 32px 56px rgba(54,37,70,.12);overflow:hidden}
      .v120-story-book-page:before{content:"";position:absolute;inset:0 auto 0 0;width:14px;background:linear-gradient(90deg,rgba(113,81,142,.16),rgba(113,81,142,.02));box-shadow:10px 0 20px rgba(70,50,86,.07)}
      [dir="rtl"] .v120-story-book-page:before{left:auto;right:0;background:linear-gradient(270deg,rgba(113,81,142,.16),rgba(113,81,142,.02));box-shadow:-10px 0 20px rgba(70,50,86,.07)}
      .v120-story-ribbon{position:absolute;top:22px;inset-inline-end:24px;display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:#7252a2;color:white;font-weight:900;box-shadow:0 7px 0 #4c376e}
      .v120-story-paper{max-width:720px;margin-inline:auto}
      .v120-story-section+.v120-story-section{margin-top:34px;padding-top:30px;border-top:1px solid #e9dfca}
      .v120-story-section h2{margin:0 0 16px;color:#3b2e4b;font-size:1.3rem}
      .v120-story-copy{direction:ltr;text-align:left;color:#241d2c;font-size:clamp(1.15rem,3.3vw,1.5rem);line-height:1.95;font-weight:600;letter-spacing:.003em}
      .v120-story-copy p{margin:0 0 1.15em}
      .v120-story-translation{margin-top:26px;padding:20px 22px;border-radius:20px;background:#f3f7f2;color:#40524a;font-size:1rem;line-height:1.85}
      .v120-story-translation small{display:block;margin-bottom:8px;font-weight:800;color:#4f806a}
      .v120-story-translation p{margin:0 0 .8em}
      .v120-story-empty{padding:44px 20px;text-align:center;color:#645d6c}
      .v120-story-empty strong{display:block;margin-bottom:8px;color:#33293f;font-size:1.2rem}
      .v120-story-start{display:block;width:min(100%,860px);margin-inline:auto;min-height:64px}
      @media (max-width:640px){.v120-story-book-page{border-radius:24px;padding:72px 24px 30px}.v120-story-ribbon{top:18px;inset-inline-end:18px}.v120-story-copy{line-height:1.85}}
    `;
    document.head?.appendChild?.(style);
  }

  function refreshGrammarExamKey() {
    if (!(S.boxId && S.phase === 'grammar' && Number(S.process) === 1)) return;
    const questions = Course.getContent(S.boxId)?.grammar?.questions || [];
    if (questions.length && (!Array.isArray(S.exam) || !S.exam.length)) S._v95GrammarKey = '';
  }

  installStyles();
  refreshGrammarExamKey();
  UI?.registerFeature?.('study-book-question-bank-v120', {mount() { installStyles(); refreshGrammarExamKey(); }});

  window.LiplipStudyBookQuestionBank120 = {
    readStore,
    rawBox,
    isStoryReading,
    storyEntries,
    storyBookMarkup,
    replaceStoryStudy,
    refreshGrammarExamKey
  };
})();
