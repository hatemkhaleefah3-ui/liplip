const fs = require('node:fs');
const assert = require('node:assert/strict');

const index = fs.readFileSync('index.html', 'utf8');
const headers = fs.readFileSync('_headers', 'utf8');
const runtime = fs.readFileSync('frontend/core/runtime.js', 'utf8');
const tokens = fs.readFileSync('frontend/styles/tokens.css', 'utf8');

assert.match(index, /frontend\/styles\/tokens\.css\?v=42/);
assert.match(index, /frontend\/core\/runtime\.js\?v=42/);
assert.doesNotMatch(index, /<script[^>]+backend-client\.js/);

const runtimePos = index.indexOf('frontend/core/runtime.js?v=42');
const legacyPos = index.indexOf('home-literacy-redesign-v40.js?v=40');
assert.ok(runtimePos > legacyPos, 'frontend runtime must load after legacy frontend scripts');

assert.match(headers, /\/frontend\/\*/);
assert.match(headers, /\/\*\.js/);
assert.match(headers, /\/\*\.css/);

assert.match(tokens, /--ui-accent:/);
assert.match(tokens, /--ui-space-4:/);
assert.match(tokens, /prefers-reduced-motion/);

new Function(runtime);

console.log('frontend architecture checks passed');
