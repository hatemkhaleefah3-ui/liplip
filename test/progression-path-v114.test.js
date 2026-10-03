const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('progression-path-v114.js', 'utf8');
const css = fs.readFileSync('progression-path-v114.css', 'utf8');

function boot(seed = {}) {
  const store = new Map(Object.entries(seed));
  const session = new Map();
  const context = {
    console,
    setTimeout: fn => fn(),
    alert() {},
    sessionStorage: {
      getItem: key => session.get(key) || null,
      setItem: (key, value) => session.set(key, String(value))
    },
    document: { addEventListener() {} },
    state: { page: 'auth', progress: {} },
    LiplipProgress: {
      courseSnapshot(progress) {
        return { currentBox: 1, completedBoxes: progress.completedBoxes || [] };
      }
    },
    window: {
      LiplipFrontend: {
        t: (ar, en) => en,
        escapeHTML: value => value,
        storage: {
          get: (key, fallback) => store.has(key) ? structuredClone(store.get(key)) : structuredClone(fallback),
          set: (key, value) => store.set(key, structuredClone(value))
        },
        registerFeature() {}
      }
    }
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.state = context.state;
  context.window.LiplipProgress = context.LiplipProgress;
  context.window.sessionStorage = context.sessionStorage;
  context.window.setTimeout = context.setTimeout;
  context.window.alert = context.alert;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'progression-path-v114.js' });
  return { context, store, api: context.window.LiplipProgression114 };
}

{
  const { context, api } = boot();
  assert.equal(api.snapshot().cefr, 'A0', 'fresh learner starts at A0');
  context.window.LiplipLiteracy = { mode: 'letters', _v74: { phase: 'complete' } };
  assert.equal(api.markLearnCompletion(), true);
  assert.equal(api.snapshot().cefr, 'A0', 'letters alone do not award A1');
  assert.equal(api.snapshot().study, false);

  context.window.LiplipLiteracy = { mode: 'numbers', _v74: { phase: 'complete' } };
  assert.equal(api.markLearnCompletion(), true);
  assert.equal(api.snapshot().cefr, 'A1', 'both Learn tracks award A1');
  assert.equal(api.snapshot().study, true);
  assert.equal(api.snapshot().fastWrite, false);
}

{
  const { context, store, api } = boot({
    'liplip-v45-progression': { literacy: { letters: true, numbers: true }, exams: {}, notified: {} },
    'liplip-study-milestones-v113': { version: 1, baseline: {}, completed: { '1:final:50': true } }
  });
  context.state.progress.completedBoxes = [50];
  assert.equal(api.snapshot().cefr, 'A2', 'Level 1 final awards A2');
  assert.equal(api.snapshot().fastWrite, true, 'Fast Write opens at A2');
  assert.equal(api.snapshot().talk, false, 'Talk remains locked before B1');

  store.set('liplip-study-milestones-v113', { version: 1, baseline: {}, completed: { '1:final:50': true, '2:final:50': true } });
  context.state.progress.completedBoxes = [50, 250];
  assert.equal(api.snapshot().cefr, 'B1', 'Level 2 final awards B1');
  assert.equal(api.snapshot().talk, true, 'Chat and Call open at B1');
}

{
  const { context, api } = boot({
    'liplip-v45-progression': { literacy: { letters: true, numbers: true }, exams: {}, notified: {} },
    'liplip-study-milestones-v113': { version: 1, baseline: {}, completed: { '2:final:50': true } }
  });
  context.state.progress.completedBoxes = [250];
  assert.equal(api.snapshot().cefr, 'A1', 'levels cannot be skipped');
  const rewards = Array.from(api.stepData(api.snapshot()), step => step.reward).join(',');
  assert.equal(rewards, 'A0,A1,A2,B1,B2,C1,C2');
}

assert.match(css, /\.v114-path\s*\{/);
assert.match(css, /\.v114-locked/);
assert.match(css, /@media \(max-width: 640px\)/);
console.log('progression-path-v114 regression tests passed');
