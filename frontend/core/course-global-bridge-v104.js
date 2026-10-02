/* v104: expose the canonical course object to window after deferred course.js has executed. */
(() => {
  'use strict';
  try {
    if (typeof LiplipCourse !== 'undefined') window.LiplipCourse = LiplipCourse;
    if (typeof LiplipProgress !== 'undefined') window.LiplipProgress = LiplipProgress;
  } catch (error) {
    console.error('[liplip] course global bridge failed', error);
  }
})();
