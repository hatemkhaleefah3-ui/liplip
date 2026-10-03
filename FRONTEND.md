# Frontend architecture

liplip is deployed as a static Cloudflare Pages site with no frontend build step. Legacy files remain compatibility surfaces, while newer work should use the frontend platform under `frontend/` instead of adding unrelated global listeners or render wrappers.

## Runtime invariants

1. Feature mounts must be idempotent; repeated renders or DOM mutations must not duplicate handlers or markup.
2. New behavior should use the shared runtime rather than wrapping `window.render` or installing broad duplicate document listeners.
3. CSS should be scoped and consume shared design tokens.
4. RTL/LTR direction must be explicit where content language differs from the UI language.
5. Presentation, local persistence, and backend transport are separate concerns.
6. **Active JavaScript and CSS URLs are immutable deployment artifacts.** `_headers` currently gives `/*.js` and `/*.css` a one-year immutable cache lifetime. If the bytes of a deployed asset change, publish it at a new URL (normally a new versioned filename or a coordinated build/asset version bump). Do not rely on changing bytes behind an existing URL.

## Stable frontend API

`frontend/core/runtime.js` exposes `window.LiplipFrontend` after the legacy application scripts have loaded.

Available primitives:

- `registerFeature(name, { mount, unmount })` — registers an idempotent feature enhancement.
- `onRender(handler)` — runs a callback after the central renderer.
- `delegate(eventType, selector, handler)` — shared delegated event handling for newer features.
- `render(scroll)` — requests an application render.
- `qs`, `qsa` — scoped DOM query helpers.
- `escapeHTML` — HTML escaping for interpolated strings.
- `language()` / `t(ar, en)` — current UI language helpers.
- `storage.get/set/remove` — guarded JSON storage operations.
- `refresh()` — schedules feature mounts without forcing a full render.

### Feature pattern

New feature JS belongs under `frontend/features/<feature>.js`:

```js
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI) throw new Error('LiplipFrontend runtime is required');

  const offClick = UI.delegate('click', '[data-ui-action="example"]', (event, button) => {
    event.preventDefault();
    // update feature state; call UI.render(false) only when needed
  });

  UI.registerFeature('example', {
    mount({ root }) {
      const screen = root.querySelector('[data-screen="example"]');
      if (!screen || screen.dataset.exampleMounted === '1') return;
      screen.dataset.exampleMounted = '1';
    },
    unmount() {
      offClick();
    }
  });
})();
```

`mount()` may execute many times and must produce the same effective DOM state as executing once.

## CSS rules

New feature CSS belongs under `frontend/features/<feature>.css`.

- Scope selectors below a feature root.
- Consume variables from `frontend/styles/tokens.css` instead of duplicating colors, radii, spacing, shadows, and z-index values.
- Prefer logical properties such as `margin-inline` and `inset-inline-start` where direction is not intentionally physical.
- Use explicit `dir="ltr"` on English-only surfaces and `dir="rtl"` on Arabic-only surfaces.
- Use `!important` only at a deliberate legacy compatibility boundary.
- Respect `prefers-reduced-motion`.

The production stylesheet is generated from the ordered sources in `assets/styles.manifest.json`. Do not edit `assets/liplip-vNN.css` directly; edit the source stylesheet and regenerate the bundle exactly as CI does.

## State and transport boundaries

- **View-local ephemeral state:** feature-module state.
- **Durable browser state:** existing compatibility keys in `localStorage`/`sessionStorage` or a feature-specific adapter.
- **Server-synchronized learner state:** `backend-client.js` communicates with `/api/session` and `/api/state` and uses optimistic revisions.
- **Published shared content:** `frontend/features/backend-content-v49.js` communicates with `/api/content` and the admin publishing endpoint.

`backend-client.js` **is active in `index.html`**. It performs initial/session synchronization, periodic synchronization, and a visibility-change synchronization attempt. UI modules should not directly depend on D1 schemas or authentication cookie internals.

## DOM contracts

Use `data-*` attributes as behavior contracts and classes primarily for styling. Preferred namespaces:

- `data-screen="..."` — screen identity.
- `data-feature="..."` — feature root.
- `data-ui-action="..."` — delegated action.
- `data-ui-state="..."` — rendered state needed by CSS.

Avoid coupling behavior to visual class names when a stable data attribute can express the contract.

## Study runtime compatibility

The active Study deployment uses **5 levels × 50 authored boxes**. Internal IDs retain a legacy stride of 200 (`level 1: 1–50`, `level 2: 201–250`, etc.) so old stored progress/content IDs remain stable. Build 113 adds generated review/exam/final milestones to each 50-box level without replacing authored boxes.

The active unified workbook parser is `frontend/features/study-workbook-importer-v114.js`; it intentionally exports `window.LiplipStudyWorkbookImporter104` because the v107 UI controller consumes that compatibility API.

## Required checks

Before shipping a frontend change, verify at minimum:

- first load and reload;
- narrow mobile and desktop viewports;
- Arabic UI and English-content directionality;
- repeated renders do not duplicate DOM/handlers;
- navigation away/back restores the correct view;
- local progress survives refresh;
- backend synchronization does not silently overwrite a concurrent revision;
- no console errors;
- keyboard focus remains usable;
- every changed immutable asset is referenced by a **new cache key/URL**;
- generated stylesheet bundle exactly matches its manifest sources.

Run the complete JavaScript suite from the repository root:

```bash
for test_file in test/*.test.js; do node "$test_file"; done
```

GitHub Actions performs the same regression sweep plus active-asset syntax, version, payload, existence, and stylesheet-reproducibility checks.
