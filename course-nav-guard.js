/* Course navigation guards: require the current activity before advancing. */
(() => {
  const app = document.getElementById('app');
  if (!app) return;

  function setDisabled(button, disabled) {
    if (!button) return;
    if (button.disabled !== disabled) button.disabled = disabled;
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    button.classList.toggle('course-nav-locked', disabled);
  }

  function questionAnswered(form) {
    if (!form) return true;

    const selects = [...form.querySelectorAll('select[required]')];
    if (selects.some(select => !String(select.value || '').trim())) return false;

    const radios = [...form.querySelectorAll('input[type="radio"][required]')];
    const radioNames = [...new Set(radios.map(input => input.name).filter(Boolean))];
    if (radioNames.some(name => !radios.some(input => input.name === name && input.checked))) return false;

    const textInputs = [...form.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]')];
    if (textInputs.some(input => !String(input.value || '').trim())) return false;

    return true;
  }

  function updateCourseNavigation() {
    const navs = app.querySelectorAll('.course-item-nav');
    navs.forEach(nav => {
      const primary = nav.querySelector('button.primary');
      if (!primary) return;

      const form = nav.closest('form#course-exam-form');
      if (form) {
        setDisabled(primary, !questionAnswered(form));
        return;
      }

      const section = nav.closest('.phase-vocabulary');
      const flashcard = section?.querySelector('.vocab-single .vocab-flip-card');
      if (flashcard) {
        setDisabled(primary, flashcard.getAttribute('aria-pressed') !== 'true');
        return;
      }

      setDisabled(primary, false);
    });
  }

  app.addEventListener('input', updateCourseNavigation, true);
  app.addEventListener('change', updateCourseNavigation, true);
  app.addEventListener('click', event => {
    const guarded = event.target.closest?.('.course-item-nav button.primary.course-nav-locked');
    if (guarded) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    queueMicrotask(updateCourseNavigation);
  }, true);

  const observer = new MutationObserver(updateCourseNavigation);
  observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  updateCourseNavigation();
})();
