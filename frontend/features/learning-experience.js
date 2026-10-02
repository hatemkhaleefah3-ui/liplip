/* Frontend learning-experience feature: fast write/speak, literacy cards, map rail, story media. */
(() => {
  'use strict';

  const ui = window.LiplipFrontend;
  if (!ui) return;

  const literacy = () => window.LiplipLiteracy;
  const comparable = value => String(value || '')
    .replace(/[.,?!()\/“”"'‘’…:;—–-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const formatElapsed = ms => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  function visibleArticleSpans(root) {
    const overlay = root.querySelector('#fast38-overlay');
    if (!overlay) return [];
    return Array.from(overlay.querySelectorAll('.fast38-char')).filter(span => {
      const style = getComputedStyle(span);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function alignTypewriterCaret(root) {
    const page = root.querySelector('.fast38-page');
    const track = root.querySelector('#fast38-track');
    const win = root.querySelector('.fast38-window');
    const caret = root.querySelector('.fast38-caret');
    if (!page || !track || !win || !caret) return;

    const s = literacy();
    if (!s) return;
    const spans = visibleArticleSpans(root);
    if (!spans.length) return;

    const progress = page.classList.contains('fast38-speak')
      ? Math.min(comparable(s.speech).length, spans.length)
      : Math.min(String(s.input || '').length, spans.length);

    const currentX = Number(track.dataset.fastTrackX || 0);
    const winRect = win.getBoundingClientRect();
    const targetX = winRect.left + (winRect.width / 2);
    const markerX = progress < spans.length
      ? spans[progress].getBoundingClientRect().left
      : spans[spans.length - 1].getBoundingClientRect().right;

    const nextX = currentX + (targetX - markerX);
    track.dataset.fastTrackX = String(nextX);
    track.style.setProperty('--fast-track-x', `${nextX}px`);
  }

  function cleanSpeakingMode(root) {
    const page = root.querySelector('.fast38-page.fast38-speak');
    if (!page) return;

    page.querySelectorAll('#fast38-overlay .fast38-char.auto').forEach(span => span.remove());

    const controls = page.querySelector('.fast38-speech-controls');
    if (controls) {
      controls.classList.add('fast43-speech-controls');
      controls.querySelector('p')?.remove();
      controls.querySelector('small')?.remove();
    }

    const s = literacy();
    const spans = visibleArticleSpans(root);
    const count = page.querySelector('#fast38-count');
    const total = page.querySelector('.fast38-counter span');
    if (count && s) count.textContent = String(Math.min(comparable(s.speech).length, spans.length));
    if (total) total.textContent = `/ ${spans.length}`;
  }

  function ensureWriteTimer(root) {
    const page = root.querySelector('.fast38-page.fast38-write');
    const s = literacy();
    if (!page || !s) return;

    if (!Number.isFinite(s._fastTimerStartedAt)) s._fastTimerStartedAt = Date.now();

    const bottom = page.querySelector('.fast38-bottom');
    if (!bottom) return;
    let timer = bottom.querySelector('.fast43-timer');
    if (!timer) {
      timer = document.createElement('div');
      timer.className = 'fast43-timer';
      timer.innerHTML = `<span>${ui.t('الوقت', 'TIME')}</span><b>00:00</b>`;
      bottom.insertBefore(timer, bottom.firstChild);
    }

    const end = Number.isFinite(s._fastTimerEndedAt) ? s._fastTimerEndedAt : Date.now();
    const label = timer.querySelector('b');
    if (label) label.textContent = formatElapsed(end - s._fastTimerStartedAt);
  }

  function decorateFlashcards(root) {
    const s = literacy();
    const page = root.querySelector('.lit36');
    if (!s || !page) return;

    const active = (s.mode === 'letters' || s.mode === 'numbers') && s.stage === 'learn';
    page.classList.toggle('lit43-flashcards', active);
    if (!active) {
      page.removeAttribute('data-lit43-deck');
      return;
    }
    page.dataset.lit43Deck = s.mode;
  }

  function mount({ root }) {
    decorateFlashcards(root);
    cleanSpeakingMode(root);
    ensureWriteTimer(root);
    requestAnimationFrame(() => alignTypewriterCaret(root));
  }

  ui.registerFeature('learning-experience-v43', { mount });

  ui.delegate('input', '#fast38-input', () => {
    requestAnimationFrame(() => alignTypewriterCaret(document));
  });

  ui.delegate('click', '[data-lit36="fast-start"], [data-lit36="fast-retry"]', () => {
    queueMicrotask(() => {
      const s = literacy();
      if (!s) return;
      s._fastTimerStartedAt = Date.now();
      delete s._fastTimerEndedAt;
      ui.refresh();
    });
  });

  ui.delegate('click', '[data-v38="fast-finish"]', () => {
    const s = literacy();
    if (s?.fastMode === 'write' && Number.isFinite(s._fastTimerStartedAt)) s._fastTimerEndedAt = Date.now();
  });

  setInterval(() => {
    const page = document.querySelector('.fast38-page.fast38-write');
    if (!page) return;
    ensureWriteTimer(document);
  }, 250);

  window.addEventListener('resize', () => requestAnimationFrame(() => alignTypewriterCaret(document)), { passive: true });
})();
