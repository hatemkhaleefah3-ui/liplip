/* v80: bridge legacy global lexical bindings to the newer literacy module on Safari. */
(() => {
  'use strict';
  try {
    if (typeof appView === 'function') window.appView = appView;
  } catch {}
  try {
    if (typeof render === 'function') window.render = render;
  } catch {}
  try {
    if (typeof state !== 'undefined') window.state = state;
  } catch {}

  window.LiplipSyncLiteracyGlobals = () => {
    try {
      if (typeof window.appView === 'function') appView = window.appView;
    } catch {}
    try {
      if (typeof window.render === 'function' && typeof render !== 'undefined') window.render = render;
    } catch {}
    try {
      if (typeof state !== 'undefined') window.state = state;
    } catch {}
  };
})();
