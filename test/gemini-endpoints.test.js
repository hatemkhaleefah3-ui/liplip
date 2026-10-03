const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

function loadEndpoint(relativePath, extraExpose = '') {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
    .replace('export async function onRequestPost', 'async function onRequestPost');
  const context = {
    Response,
    Headers,
    URL,
    URLSearchParams,
    TextEncoder,
    Object,
    Array,
    Number,
    String,
    Set,
    Math,
    JSON,
    encodeURIComponent,
    console,
    fetch: null
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.handler = onRequestPost;${extraExpose}`, context);
  return context;
}

(async () => {
  const exam = loadEndpoint('functions/api/gemini/course-exam.js', 'this.cleanQuestions = cleanQuestions;');
  const questions = [
    { type:'fill_blank', prompt:'p1', options:['a','b','c','d'], correctIndex:0, answer:'a', explanation:'e' },
    { type:'fill_blank', prompt:'p2', options:['a','b','c','d'], correctIndex:1, answer:'b', explanation:'e' },
    { type:'reorder', prompt:'p3', options:['I','am','here'], correctIndex:0, answer:'I am here', explanation:'e' },
    { type:'reorder', prompt:'p4', options:['You','are','here'], correctIndex:0, answer:'You are here', explanation:'e' },
    { type:'correct_error', prompt:'I is here', options:['subject','verb'], correctIndex:0, answer:'I am here', explanation:'e' }
  ];
  let examFetches = 0;
  exam.fetch = async () => {
    examFetches += 1;
    return { ok:true, json:async()=>({ candidates:[{ content:{ parts:[{ text:JSON.stringify(questions) }] } }] }) };
  };
  const validRequest = {
    headers: new Headers(),
    json: async () => ({ kind:'grammar', source:'A grammar source.', level:5, box:50 })
  };
  const validResponse = await exam.handler({ request:validRequest, env:{ GEMINI_API_KEY:'test' } });
  assert.equal(validResponse.status, 200, 'box 50 must be valid in each active Study level');
  assert.equal((await validResponse.json()).questions.length, 5);
  assert.equal(examFetches, 1);

  const invalidLocation = await exam.handler({
    request:{ headers:new Headers(), json:async()=>({ kind:'grammar', source:'x', level:5, box:51 }) },
    env:{ GEMINI_API_KEY:'test' }
  });
  assert.equal(invalidLocation.status, 400, 'box 51 must be rejected by the active 50-box curriculum');
  assert.equal(examFetches, 1, 'invalid locations must not call Gemini');

  const badIndex = structuredClone(questions);
  badIndex[0].correctIndex = -1;
  assert.equal(exam.cleanQuestions(badIndex, 'grammar'), null, 'negative correctIndex must be rejected');
  const badDistribution = structuredClone(questions);
  badDistribution[4] = { ...badDistribution[4], type:'reorder', prompt:'p5', options:['They','are','here'], answer:'They are here' };
  assert.equal(exam.cleanQuestions(badDistribution, 'grammar'), null, 'grammar must preserve the requested 2/2/1 type distribution');

  const drawing = loadEndpoint('functions/api/gemini/drawing.js');
  let drawingFetches = 0;
  drawing.fetch = async () => {
    drawingFetches += 1;
    return { ok:true, json:async()=>({ candidates:[{ content:{ parts:[{ text:JSON.stringify({ correct:true, confidence:0.9, feedback:'ok' }) }] } }] }) };
  };
  const image = 'data:image/png;base64,AA==';
  const tooMany = await drawing.handler({
    request:{ headers:new Headers(), json:async()=>({ items:[
      { kind:'letter', target:'A', image },
      { kind:'letter', target:'B', image },
      { kind:'letter', target:'C', image }
    ] }) },
    env:{ GEMINI_API_KEY:'test' }
  });
  assert.equal(tooMany.status, 400, 'more than two drawing items must be rejected rather than truncated');
  assert.equal(drawingFetches, 0);

  const outOfCurriculumNumber = await drawing.handler({
    request:{ headers:new Headers(), json:async()=>({ kind:'number', target:'99', image }) },
    env:{ GEMINI_API_KEY:'test' }
  });
  assert.equal(outOfCurriculumNumber.status, 400, 'drawing numbers are limited to the 0–34 literacy curriculum');
  assert.equal(drawingFetches, 0);

  const validNumber = await drawing.handler({
    request:{ headers:new Headers(), json:async()=>({ kind:'number', target:'34', image }) },
    env:{ GEMINI_API_KEY:'test' }
  });
  assert.equal(validNumber.status, 200);
  assert.equal(drawingFetches, 1);

  console.log('Gemini endpoint bounds and response contracts passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
