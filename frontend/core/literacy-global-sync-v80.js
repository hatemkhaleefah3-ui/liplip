/* v80: make the final literacy appView wrapper authoritative for legacy global callers. */
(() => {
  'use strict';
  try {
    if (typeof window.appView === 'function') appView = window.appView;
  } catch {}
  try {
    if (typeof state !== 'undefined') window.state = state;
  } catch {}
  try {
    if (typeof render === 'function') window.render = render;
  } catch {}
})();
