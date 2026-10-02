/* v56: keep literacy entry points active across initial render, navigation, and bfcache restores. */
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI) return;

  const metadata = {
    letters: ['letters', ['تعلّم الحروف', 'Learn letters'], ['بطاقات وصوت وكتابة ونطق', 'Cards, sound, handwriting and speaking']],
    numbers: ['numbers', ['تعلّم الأرقام', 'Learn numbers'], ['الأرقام من 0 إلى 34 مع الكتابة والنطق', 'Numbers 0–34 with writing and speaking']],
    'fast-write': ['fast-write', ['الكتابة السريعة', 'Fast writing'], ['اكتب أو تكلّم وتابع التصحيح مباشرة', 'Type or speak with live correction']]
  };

  function activate(root) {
    root.querySelectorAll?.('[data-feature]').forEach(button => {
      const item = metadata[button.dataset.feature];
      if (!item) return;
      button.dataset.literacy = item[0];
      delete button.dataset.v28;
      button.classList.remove('soon');
      const strong = button.querySelector('strong');
      const small = button.querySelector('small');
      if (strong) strong.textContent = UI.t(...item[1]);
      if (small) small.textContent = UI.t(...item[2]);
      button.querySelector('.soon-pill')?.remove();
      button.removeAttribute('disabled');
    });
    return root;
  }

  const previousDashboard = window.dashboard;
  if (typeof previousDashboard === 'function' && !previousDashboard.__liplipStableLiteracy) {
    function stableDashboard(...args) {
      const template = document.createElement('template');
      template.innerHTML = previousDashboard.apply(this, args);
      activate(template.content);
      return template.innerHTML;
    }
    Object.defineProperty(stableDashboard, '__liplipStableLiteracy', { value: true });
    window.dashboard = stableDashboard;
  }

  const activateCurrent = () => activate(document.getElementById('app') || document);
  UI.onRender(activateCurrent);
  window.addEventListener('pageshow', activateCurrent);
  activateCurrent();
})();
