/* v101: expose the classic-script LiplipCourse binding on window for newer feature modules. */
(() => {
  'use strict';
  try {
    if (typeof LiplipCourse !== 'undefined' && LiplipCourse) {
      window.LiplipCourse = LiplipCourse;
      window.dispatchEvent(new CustomEvent('liplip:course-ready'));
    }
  } catch (error) {
    console.error('[liplip] course global bridge failed', error);
  }
})();
