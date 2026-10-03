/* v121: persistent registered-session restore and profile persistence. */
(() => {
  'use strict';
  if (typeof state === 'undefined' || typeof render !== 'function') return;

  const AUTH_KEY = 'liplip-auth-v1';
  const PROFILE_KEY = 'liplip-profile-v1';
  const META_KEY = 'liplip-backend-meta-v1';
  const USER_STATE_KEYS = ['liplip-progress-v1', 'liplip-v45-progression'];

  const parse = value => {
    try { return value ? JSON.parse(value) : null; }
    catch { return null; }
  };

  const profileFromPreview = () => {
    const preview = parse(sessionStorage.getItem('liplip-preview'));
    const profile = preview?.profile;
    return profile && typeof profile === 'object' ? profile : null;
  };

  const readProfile = () => {
    const stored = parse(localStorage.getItem(PROFILE_KEY));
    if (stored && typeof stored === 'object') return stored;
    return profileFromPreview();
  };

  function persistProfile() {
    const profile = state.profile && typeof state.profile === 'object' ? state.profile : null;
    if (!profile) return;
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
  }

  function markSignedIn(user = {}) {
    const email = String(user?.email || state.profile?.email || '').trim();
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ kind: 'registered', email, signedInAt: Date.now() }));
    } catch {}
    persistProfile();
  }

  function clearAuthMarker() {
    try { localStorage.removeItem(AUTH_KEY); } catch {}
  }

  function clearSignedOutState() {
    clearAuthMarker();
    try { localStorage.removeItem(PROFILE_KEY); } catch {}
    try { localStorage.removeItem(META_KEY); } catch {}
    for (const key of USER_STATE_KEYS) {
      try { localStorage.removeItem(key); } catch {}
    }
    try { sessionStorage.removeItem('liplip-preview'); } catch {}
    if (typeof LiplipProgress !== 'undefined') state.progress = LiplipProgress.hydrate(null);
    state.profile = null;
    state.guest = false;
  }

  function applyRegisteredRoute() {
    const profile = readProfile();
    if (profile) {
      state.profile = profile;
      persistProfile();
    }
    state.guest = false;
    state.page = state.profile && typeof state.profile.name === 'string' && state.profile.name.trim() ? 'app' : 'profile';
    render();
  }

  function restoreFromLocalMarker() {
    const marker = parse(localStorage.getItem(AUTH_KEY));
    if (!marker || marker.kind !== 'registered') return false;
    applyRegisteredRoute();
    return true;
  }

  async function verifyServerSession() {
    try {
      const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401) {
        clearAuthMarker();
        if (!state.guest && (state.page === 'app' || state.page === 'profile')) {
          state.page = 'landing';
          render();
        }
        return;
      }
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      if (data?.user?.kind !== 'registered') return;

      markSignedIn(data.user);
      const result = await window.LiplipBackend?.syncNow?.();
      if (result?.action === 'initial-pull' || result?.action === 'pull') return;
      applyRegisteredRoute();
    } catch {
      // Keep a locally remembered signed-in session usable while temporarily offline.
    }
  }

  restoreFromLocalMarker();
  queueMicrotask(verifyServerSession);

  document.addEventListener('submit', event => {
    if (event.target?.id !== 'profile-form' && event.target?.id !== 'test-form') return;
    setTimeout(() => {
      persistProfile();
      if (parse(localStorage.getItem(AUTH_KEY))?.kind === 'registered') {
        window.LiplipBackend?.syncNow?.();
      }
    }, 0);
  });

  document.addEventListener('click', event => {
    const logout = event.target.closest?.('[data-action="logout"],[data-v28="logout"]');
    if (!logout) return;
    clearSignedOutState();
  }, true);

  window.LiplipSessionPersistence = {
    markSignedIn,
    persistProfile,
    clearSignedOutState,
    verifyServerSession
  };
})();
