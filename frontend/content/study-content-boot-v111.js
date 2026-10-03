/* Build 111: activate a newly installed study bundle once, without per-session overwrites. */
(() => {
  'use strict';
  const RELOAD_PREFIX='liplip-study-source-reloaded:';

  Promise.resolve(window.LiplipBundledStudyContentReady).then(result => {
    if(result?.error){
      console.error('[liplip] workbook source failed to install',result.error);
      return;
    }
    const reloadKey=RELOAD_PREFIX+String(result?.version||'unknown');
    if(result?.installed && sessionStorage.getItem(reloadKey)!=='1'){
      sessionStorage.setItem(reloadKey,'1');
      location.reload();
      return;
    }
    try{window.render?.(false)}catch{}
  });
})();
