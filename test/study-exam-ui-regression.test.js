'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const localExam = fs.readFileSync('frontend/features/study-local-exams-v73.js', 'utf8');
const grammarExam = fs.readFileSync('frontend/features/study-exam-schema-v95.js', 'utf8');
const redesign = fs.readFileSync('frontend/features/study-exam-redesign-v112.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const optionLetter = /<b>\$\{String\.fromCharCode\(65\+i\)\}<\/b>/;
assert.doesNotMatch(localExam, optionLetter, 'Media question options must not show A/B/C/D labels.');
assert.doesNotMatch(grammarExam, optionLetter, 'Grammar question options must not show A/B/C/D labels.');

assert.match(localExam, /v112-pronounce-card/, 'Pronunciation questions must use the redesigned card.');
assert.match(localExam, /v112-sound-stage/, 'Pronunciation questions must render the sound stage.');
assert.doesNotMatch(localExam, /[🎙🔈]/u, 'Pronunciation controls must use accessible icons, not raw emoji.');
assert.match(localExam, /S\.feedback\|\|''/, 'Speech feedback must participate in the render key.');

assert.match(redesign, /\.v112-speech-actions/, 'Pronunciation action styles are required.');
assert.match(redesign, /\.v112-vocab-actions/, 'Vocabulary action styles are required.');
assert.match(redesign, /\.c57-options button>b\{display:none!important\}/, 'Legacy alphabet badges must stay hidden.');
assert.match(redesign, /@media\s*\(max-width:390px\)/, 'Narrow mobile layouts must be covered.');

assert.match(index, /<meta name="liplip-build" content="112" \/>/);
assert.match(index, /assets\/liplip-v112\.css/);
assert.doesNotMatch(index, /\?v=111/);

console.log('Study exam UI regression checks passed.');
