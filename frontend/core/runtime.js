/* Liplip frontend platform v1.
 * Stable extension surface for all new UI work. Keep feature code out of this file.
 */
(() => {
  'use strict';

  if (window.LiplipFrontend) return;

  const features = new Map();
  const renderHooks = new Set();
  const delegated = new Map();
  let mountScheduled = false;
  let observer = null;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const language = () => localStorage.getItem('liplip-ui-language') === 'en' ? 'en' : 'ar';
  const t = (ar, en) => language() === 'en' ? en : ar;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const storage = {
    get(key, fallback = null, area = localStorage) {
      try {
        const raw = area.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value, area = localStorage) {
      try {
        area.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key, area = localStorage) {
      try {
        area.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  function report(scope, error) {
    console.error(`[liplip frontend] ${scope}`, error);
  }

  function runMounts() {
    mountScheduled = false;
    const root = document.getElementById('app') || document;
    for (const [name, feature] of features) {
      try {
        feature.mount?.({ root, ui: api });
      } catch (error) {
        report(`feature ${name}`, error);
      }
    }
  }

  function scheduleMount() {
    if (mountScheduled) return;
    mountScheduled = true;
    queueMicrotask(() => requestAnimationFrame(runMounts));
  }

  function registerFeature(name, feature) {
    if (!name || typeof name !== 'string') throw new TypeError('feature name must be a non-empty string');
    if (!feature || typeof feature !== 'object') throw new TypeError(`feature ${name} must be an object`);
    if (features.has(name)) throw new Error(`feature already registered: ${name}`);
    features.set(name, feature);
    scheduleMount();
    return () => {
      const current = features.get(name);
      if (!current) return;
      try { current.unmount?.({ root: document.getElementById('app') || document, ui: api }); } catch (error) { report(`unmount ${name}`, error); }
      features.delete(name);
    };
  }

  function onRender(handler) {
    if (typeof handler !== 'function') throw new TypeError('render hook must be a function');
    renderHooks.add(handler);
    return () => renderHooks.delete(handler);
  }

  function afterRender() {
    for (const handler of renderHooks) {
      try { handler(api); } catch (error) { report('render hook', error); }
    }
    scheduleMount();
  }

  function installRenderBridge() {
    const current = window.render;
    if (typeof current !== 'function' || current.__liplipFrontendBridge) return;
    function bridgedRender(...args) {
      const result = current.apply(this, args);
      afterRender();
      return result;
    }
    Object.defineProperty(bridgedRender, '__liplipFrontendBridge', { value: true });
    Object.defineProperty(bridgedRender, '__liplipFrontendPrevious', { value: current });
    window.render = bridgedRender;
  }

  function delegate(eventType, selector, handler) {
    if (!eventType || !selector || typeof handler !== 'function') throw new TypeError('delegate(eventType, selector, handler)');
    let entry = delegated.get(eventType);
    if (!entry) {
      const rules = new Set();
      const listener = event => {
        for (const rule of Array.from(rules)) {
          const origin = event.target instanceof Element ? event.target : event.target?.parentElement;
          const match = origin?.closest?.(rule.selector);
          if (!match || !document.documentElement.contains(match)) continue;
          try { rule.handler(event, match, api); } catch (error) { report(`delegated ${eventType} ${rule.selector}`, error); }
        }
      };
      document.addEventListener(eventType, listener, true);
      entry = { rules, listener };
      delegated.set(eventType, entry);
    }
    const rule = { selector, handler };
    entry.rules.add(rule);
    return () => entry.rules.delete(rule);
  }

  function render(scroll = true) {
    if (typeof window.render !== 'function') return false;
    window.render(scroll);
    return true;
  }

  const api = Object.freeze({
    version: 1,
    escapeHTML,
    language,
    t,
    qs,
    qsa,
    storage,
    registerFeature,
    onRender,
    delegate,
    render,
    refresh: scheduleMount
  });

  Object.defineProperty(window, 'LiplipFrontend', {
    value: api,
    writable: false,
    configurable: false
  });

  const boot = () => {
    installRenderBridge();
    const app = document.getElementById('app');
    if (app && !observer) {
      observer = new MutationObserver(scheduleMount);
      observer.observe(app, { childList: true, subtree: true });
    }
    afterRender();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
