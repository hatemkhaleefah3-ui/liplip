# Frontend architecture

This project is still deployed as a static Cloudflare Pages site with no frontend build step. The existing files are legacy and remain supported, but **all new frontend work should use the frontend platform described here instead of adding another `*-vNN.js` / `*-vNN.css` patch layer**.

## Goals

1. A new feature should be isolated enough to add, remove, or redesign without editing unrelated screens.
2. Render lifecycle behavior should be deterministic. New code must not wrap `window.render` or attach duplicate document listeners.
3. CSS should be scoped and use shared design tokens so visual changes propagate consistently.
4. RTL/LTR behavior must be explicit and use logical properties where possible.
5. Frontend persistence and backend transport must stay separate from presentation code.
6. A browser receiving a new deployment must revalidate changed JS/CSS instead of remaining on a stale patch.

## Stable frontend API

`frontend/core/runtime.js` exposes `window.LiplipFrontend` after the legacy application scripts have loaded.

Available primitives:

- `registerFeature(name, { mount, unmount })` — registers an idempotent feature enhancement. `mount()` runs after renders and relevant DOM mutations.
- `onRender(handler)` — runs a callback after the central renderer. Use this only for lifecycle work that cannot be expressed as an idempotent mount.
- `delegate(eventType, selector, handler)` — one delegated event system for future features. Do not create broad feature-specific `document.addEventListener(...)` handlers.
- `render(scroll)` — safely requests an application render.
- `qs`, `qsa` — scoped DOM query helpers.
- `escapeHTML` — HTML escaping for interpolated strings.
- `language()` / `t(ar, en)` — current UI language helpers.
- `storage.get/set/remove` — guarded JSON storage operations.
- `refresh()` — schedules feature mounts without forcing a full application render.

### Feature pattern

New feature JS belongs under `frontend/features/<feature>.js` and should look like this:

```js
(() => {
  'use strict';
  const UI = window.LiplipFrontend;
  if (!UI) throw new Error('LiplipFrontend runtime is required');

  const offClick = UI.delegate('click', '[data-ui-action="example"]', (event, button) => {
    event.preventDefault();
    // update feature state, then UI.render(false) when needed
  });

  UI.registerFeature('example', {
    mount({ root }) {
      const screen = root.querySelector('[data-screen="example"]');
      if (!screen || screen.dataset.exampleMounted === '1') return;
      screen.dataset.exampleMounted = '1';
      // idempotent DOM enhancement
    },
    unmount() {
      offClick();
    }
  });
})();
```

The important invariant is that `mount()` may execute many times and must produce the same DOM result as executing once.

## CSS rules

New feature CSS belongs under `frontend/features/<feature>.css`.

- Scope every selector below one feature root such as `[data-feature="typewriter"]` or `.feature-typewriter`.
- Consume variables from `frontend/styles/tokens.css` instead of copying colors, radii, spacing, shadows, and z-index values.
- Prefer `margin-inline`, `padding-inline`, `inset-inline-start`, etc. over physical left/right properties unless the direction is intentionally physical.
- Use an explicit `dir="ltr"` on English-only text surfaces and `dir="rtl"` on Arabic-only surfaces.
- Do not use `!important` except at a compatibility boundary with legacy CSS.
- New UI must respect `prefers-reduced-motion`; the shared token stylesheet already provides a safety baseline.

## State boundaries

For new work, separate state into these categories:

- **View-local ephemeral state:** held inside the feature module.
- **Durable learner state:** written through a feature-specific adapter and later through the backend client, never directly from rendering functions.
- **Server state:** accessed only through the backend transport layer. UI code should not know D1/R2 schemas or authentication cookies.

The current legacy globals and localStorage keys remain compatibility surfaces until they are migrated. New code must not add more implicit global variables.

## DOM contracts

Use `data-*` attributes as stable behavior contracts and classes for styling. Preferred namespaces:

- `data-screen="..."` — page/screen identity.
- `data-feature="..."` — feature root.
- `data-ui-action="..."` — delegated user action.
- `data-ui-state="..."` — rendered state when CSS needs it.

Do not couple behavior to visual class names.

## Migration strategy

Do not rewrite the entire frontend at once. Migrate one feature whenever that feature is materially changed:

1. Move its new CSS to `frontend/features/<feature>.css` and adopt tokens.
2. Move behavior to `frontend/features/<feature>.js` using `LiplipFrontend` lifecycle/delegation.
3. Preserve existing localStorage/progress contracts during the migration.
4. Remove the superseded legacy patch only after the migrated feature passes mobile, desktop, Arabic, English, reload, and progress-persistence checks.

This avoids a high-risk big-bang rewrite while making every subsequent change reduce legacy complexity.

## Required checks for frontend changes

Before shipping a feature change, verify at minimum:

- first load and reload;
- iPhone-width viewport and desktop viewport;
- Arabic UI plus English content directionality;
- repeated renders do not duplicate DOM or handlers;
- navigation away/back restores the correct view;
- local progress survives refresh;
- no console errors;
- keyboard focus remains usable;
- the changed asset is covered by `_headers` revalidation rules.

Run:

```bash
node test/frontend-architecture.test.js
```

alongside the existing project tests.

## Backend pause

The backend foundation files may remain in the repository, but `backend-client.js` is intentionally not loaded by `index.html` while the frontend migration surface is being stabilized. Re-enable backend synchronization only after its data contracts are finalized against this frontend boundary.
