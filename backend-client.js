/* Backend sync bridge for Cloudflare Pages Functions + D1. */
(() => {
  const META_KEY = 'liplip-backend-meta-v1';
  /* Only user-owned data belongs here. Course/fast-practice content is global and
     is synchronized separately by backend-content-v49.js. */
  const KEYS = ['liplip-progress-v1', 'liplip-v45-progression', 'liplip-ui-language'];
  let activeSync = null;
  const stateFromStorage = () => {
    const out = {};
    for (const key of KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
    const preview = sessionStorage.getItem('liplip-preview');
    if (preview !== null) out['liplip-preview'] = preview;
    return out;
  };
  const applyState = data => {
    if (!data || typeof data !== 'object') return;
    for (const key of KEYS) {
      if (Object.prototype.hasOwnProperty.call(data, key)) localStorage.setItem(key, String(data[key]));
      else localStorage.removeItem(key);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'liplip-preview')) sessionStorage.setItem('liplip-preview', String(data['liplip-preview']));
    else sessionStorage.removeItem('liplip-preview');
  };
  const fingerprint = value => JSON.stringify(Object.keys(value).sort().reduce((o,k)=>(o[k]=value[k],o),{}));
  const readMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; } };
  const writeMeta = meta => localStorage.setItem(META_KEY, JSON.stringify(meta));
  async function request(path, init = {}) {
    const res = await fetch(path, { ...init, credentials: 'same-origin', headers: { 'content-type': 'application/json', ...(init.headers || {}) } });
    let body = {}; try { body = await res.json(); } catch {}
    return { res, body };
  }
  async function ensureSession() {
    let r = await request('/api/session');
    if (r.res.status === 401) r = await request('/api/session', { method: 'POST', body: '{}' });
    return r.res.ok;
  }
  async function runSync() {
    try {
      if (!(await ensureSession())) return { ok: false, reason: 'session' };
      const remote = await request('/api/state');
      if (!remote.res.ok) return { ok: false, reason: 'load', status: remote.res.status };
      const meta = readMeta(), local = stateFromStorage(), localFp = fingerprint(local), lastFp = meta.fingerprint || '';
      const lastRevision = Number.isInteger(meta.revision) ? meta.revision : null;
      const remoteRevision = Number(remote.body.revision) || 0;
      const remoteData = remote.body.data && typeof remote.body.data === 'object' ? remote.body.data : {};
      const remoteFp = fingerprint(remoteData);
      if (lastRevision === null) {
        if (remoteRevision === 0 && Object.keys(local).length) {
          const pushed = await request('/api/state', { method: 'PUT', body: JSON.stringify({ revision: 0, data: local }) });
          if (pushed.res.ok) writeMeta({ revision: pushed.body.revision, fingerprint: localFp });
          return { ok: pushed.res.ok, action: 'initial-push' };
        }
        if (remoteRevision > 0) {
          applyState(remoteData); writeMeta({ revision: remoteRevision, fingerprint: remoteFp }); location.reload();
          return { ok: true, action: 'initial-pull' };
        }
        writeMeta({ revision: remoteRevision, fingerprint: localFp });
        return { ok: true, action: 'initialized' };
      }
      const localChanged = localFp !== lastFp, remoteChanged = remoteRevision !== lastRevision;
      if (localChanged && remoteChanged) return { ok: false, reason: 'conflict', remoteRevision, localRevision: lastRevision };
      if (remoteChanged) { applyState(remoteData); writeMeta({ revision: remoteRevision, fingerprint: remoteFp }); location.reload(); return { ok: true, action: 'pull' }; }
      if (localChanged) {
        const pushed = await request('/api/state', { method: 'PUT', body: JSON.stringify({ revision: lastRevision, data: local }) });
        if (pushed.res.ok) writeMeta({ revision: pushed.body.revision, fingerprint: localFp });
        return { ok: pushed.res.ok, action: pushed.res.ok ? 'push' : 'conflict', status: pushed.res.status };
      }
      return { ok: true, action: 'noop' };
    } catch (error) { console.warn('[liplip backend] sync unavailable', error); return { ok: false, reason: 'network' }; }
  }
  function syncNow() {
    if (activeSync) return activeSync;
    activeSync = runSync().finally(() => { activeSync = null; });
    return activeSync;
  }
  window.LiplipBackend = { syncNow, resetIdentity(){ localStorage.removeItem(META_KEY); } };
  window.addEventListener('load', () => setTimeout(syncNow, 400), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow(); });
  setInterval(syncNow, 15000);
})();
