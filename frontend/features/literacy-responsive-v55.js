/* v55: responsive structure and mobile drawing-field controller. */
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI) return;

  const drawingStages = new Set(['trace', 'draw', 'hear-draw']);
  const mobile = () => window.matchMedia('(max-width: 767px)').matches;
  const state = () => window.LiplipLiteracy;

  function setActiveField(page, index) {
    const s = state();
    const fields = [...page.querySelectorAll('.lit48-draw-field')];
    if (!fields.length) return;
    const active = Math.max(0, Math.min(fields.length - 1, Number(index) || 0));
    if (s) s._v55ActiveField = active;
    fields.forEach((field, i) => field.classList.toggle('lit55-active-field', i === active));
    page.querySelectorAll('[data-v55-field]').forEach((button, i) => {
      button.classList.toggle('active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
  }

  function ensureFieldSwitcher(page) {
    const grid = page.querySelector('.lit48-draw-grid');
    const fields = [...page.querySelectorAll('.lit48-draw-field')];
    if (!grid || fields.length < 2) return;
    let switcher = page.querySelector('.lit55-field-switch');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'lit55-field-switch';
      switcher.setAttribute('role', 'tablist');
      switcher.setAttribute('aria-label', UI.t('اختيار حقل الرسم', 'Choose drawing field'));
      switcher.innerHTML = fields.map((field, i) => {
        const label = field.querySelector('header b')?.textContent?.trim() || `${i + 1}`;
        return `<button type="button" role="tab" data-v55-field="${i}"><span>${String(i + 1).padStart(2, '0')}</span> ${UI.escapeHTML(label)}</button>`;
      }).join('');
      grid.before(switcher);
    }
    setActiveField(page, state()?._v55ActiveField || 0);
  }

  function decorate({ root }) {
    const s = state();
    const page = root.querySelector('.lit36');
    if (!s || !page || !['letters', 'numbers'].includes(s.mode)) return;
    [...page.classList].filter(name => name.startsWith('lit55-stage-')).forEach(name => page.classList.remove(name));
    page.classList.add('lit55-literacy', `lit55-stage-${s.stage}`);
    page.dataset.lit55Mode = s.mode;
    if (!drawingStages.has(s.stage)) return;
    ensureFieldSwitcher(page);
    const actions = page.querySelector('.lit36-draw-actions');
    if (actions) actions.classList.add('lit55-draw-actions');
  }

  UI.registerFeature('literacy-responsive-v55', { mount: decorate });

  UI.delegate('click', '[data-v55-field]', (event, button) => {
    event.preventDefault();
    const page = button.closest('.lit55-literacy');
    if (page) setActiveField(page, Number(button.dataset.v55Field));
  });

  document.addEventListener('click', event => {
    const clear = event.target.closest?.('[data-lit36="clear-draw"]');
    if (!clear) return;
    const page = clear.closest('.lit55-literacy');
    const s = state();
    const canvases = [...(page?.querySelectorAll('[data-v48-canvas]') || [])];
    if (!page || !s || !canvases.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const indexes = mobile() ? [Math.max(0, Math.min(canvases.length - 1, Number(s._v55ActiveField) || 0))] : canvases.map((_, i) => i);
    indexes.forEach(index => {
      const canvas = canvases[index];
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      if (Array.isArray(s._v48Drawn)) s._v48Drawn[index] = false;
    });
    s.drawn = false;
    s._v54ApprovedDrawing = '';
    const check = page.querySelector('[data-v54-check-drawing]');
    if (check) {
      check.dataset.state = '';
      check.textContent = UI.t('تحقق من الرسم بواسطة Gemini', 'Check drawing with Gemini');
    }
  }, true);

  const media = window.matchMedia('(max-width: 767px)');
  media.addEventListener?.('change', () => UI.refresh());
})();
