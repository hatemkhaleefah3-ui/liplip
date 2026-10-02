/* v108: rerender after bundled study content is installed on the device. */
(() => {
  'use strict';
  Promise.resolve(window.LiplipBundledStudyContentReady).then(() => {
    try { window.render?.(false); } catch {}
  });
})();
