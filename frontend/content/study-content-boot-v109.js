/* v109: after the workbook bundle installs, restart once so every Study reader initializes from the Excel data. */
(() => {
  'use strict';
  const RELOAD='liplip-study-source-reloaded-v109';
  Promise.resolve(window.LiplipBundledStudyContentReady).then(result => {
    if(result?.error){
      console.error('[liplip] workbook source failed to install', result.error);
      return;
    }
    if(result?.installed && sessionStorage.getItem(RELOAD)!=='1'){
      sessionStorage.setItem(RELOAD,'1');
      location.reload();
      return;
    }
    try { window.render?.(false); } catch {}
  });
})();
