/* v109: force one clean reinstall of the bundled Excel study source per browser session. */
(() => {
  'use strict';
  const SESSION='liplip-study-source-force-v109';
  if(sessionStorage.getItem(SESSION)==='1') return;
  sessionStorage.setItem(SESSION,'1');
  try { localStorage.removeItem('liplip-bundled-study-content-version'); } catch {}
})();
