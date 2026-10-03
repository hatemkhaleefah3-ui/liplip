const fs = require('node:fs');
const assert = require('node:assert/strict');

const index = fs.readFileSync('index.html', 'utf8');
const headers = fs.readFileSync('_headers', 'utf8');
const runtime = fs.readFileSync('frontend/core/runtime.js', 'utf8');
const tokens = fs.readFileSync('frontend/styles/tokens.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('assets/styles.manifest.json', 'utf8'));
const build = index.match(/<meta name="liplip-build" content="(\d+)" \/>/)?.[1];

assert.ok(build, 'index declares a numeric build');
assert.equal(String(manifest.build), build, 'stylesheet manifest follows the active build');
assert.match(index, new RegExp(`assets/liplip-v${build}\\.css`));
assert.match(index, new RegExp(`frontend/core/runtime\\.js\\?v=${build}`));
assert.match(index, new RegExp(`backend-client\\.js\\?v=${build}`));
assert.ok(manifest.sources.includes('frontend/styles/tokens.css'), 'design tokens are bundled into the active stylesheet');

const runtimePos = index.indexOf(`frontend/core/runtime.js?v=${build}`);
const legacyPos = index.indexOf(`home-literacy-redesign-v40.js?v=${build}`);
const backendPos = index.indexOf(`backend-client.js?v=${build}`);
assert.ok(runtimePos > legacyPos, 'frontend runtime must load after legacy frontend scripts');
assert.ok(backendPos > runtimePos, 'backend sync bridge must load after the frontend runtime');

assert.match(headers, /\/\*\.js/);
assert.match(headers, /\/\*\.css/);
assert.match(headers, /X-Content-Type-Options: nosniff/);
assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);

assert.match(tokens, /--ui-accent:/);
assert.match(tokens, /--ui-space-4:/);
assert.match(tokens, /prefers-reduced-motion/);

new Function(runtime);

console.log('frontend architecture checks passed', { build, stylesheetSources: manifest.sources.length });
