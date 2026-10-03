const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');

const html = fs.readFileSync('index.html', 'utf8');
const build = html.match(/<meta name="liplip-build" content="(\d+)" \/>/)?.[1];
assert.ok(build, 'numeric site build is declared');
assert.doesNotMatch(html, /study-content-force|study-workbook-importer-fix/);

const parserRef = `frontend/features/study-workbook-importer-v114.js?v=${build}`;
const controllerRef = `frontend/features/study-local-cpu-controller-v107.js?v=${build}`;
assert.ok(html.indexOf(parserRef) >= 0, 'hardened parser is referenced');
assert.ok(html.indexOf(controllerRef) > html.indexOf(parserRef), 'parser loads before the sole UI controller');

const parser = fs.readFileSync('frontend/features/study-workbook-importer-v114.js', 'utf8');
assert.doesNotMatch(parser, /new MutationObserver\(schedule\)/, 'parser must not own a competing UI observer');
assert.match(parser, /window\.LiplipStudyWorkbookImporter104=\{importWorkbook\}/, 'controller-compatible importer API is preserved');
assert.match(parser, /storeCacheRaw/, 'large content store reads are memoized');
assert.match(parser, /const store=clone\(readStore\(\)\)/, 'imports mutate a clone so failed writes cannot poison the memoized store');
assert.match(parser, /Correct Answer must match one option/, 'question answer keys must match an authored option');
assert.match(parser, /20\*1024\*1024/, 'oversized workbooks are rejected before decompression');

const controller = fs.readFileSync('frontend/features/study-local-cpu-controller-v107.js', 'utf8');
assert.match(controller, /after===before/);
assert.match(controller, /Content already matched the saved copy/);
assert.match(controller, /\.v100-import-status,.v103-import-status,.v104-import-status/);

const bundle = fs.readFileSync('frontend/content/study-content-bundle-v111.js', 'utf8');
const version = bundle.match(/const VERSION='([^']+)'/)?.[1];
const encoded = bundle.match(/const DATA='([^']+)'/)?.[1];
assert.equal(version, '111-36be59269c35');
assert.ok(encoded, 'bundle payload exists');

const data = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
assert.equal(Object.keys(data).length, 50);

const totals = Object.values(data).reduce((sum, box) => {
  sum.vocabulary += box.vocabulary?.items?.length || 0;
  sum.grammar += Object.keys(box.grammar?.article || {}).length ? 1 : 0;
  sum.grammarQuestions += box.grammar?.questions?.length || 0;
  sum.watchRead += box.watchRead?.story?.length || 0;
  sum.videoQuestions += box.watchRead?.videoQuestions?.length || 0;
  sum.storyQuestions += box.watchRead?.storyQuestions?.length || 0;
  return sum;
}, { vocabulary: 0, grammar: 0, grammarQuestions: 0, watchRead: 0, videoQuestions: 0, storyQuestions: 0 });

assert.deepEqual(totals, {
  vocabulary: 1906,
  grammar: 50,
  grammarQuestions: 300,
  watchRead: 50,
  videoQuestions: 250,
  storyQuestions: 250
});

console.log('study import regression checks passed', { version, boxes: Object.keys(data).length, ...totals });
