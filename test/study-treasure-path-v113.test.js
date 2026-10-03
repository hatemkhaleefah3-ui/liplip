'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const memory = new Map([['liplip-ui-language','en']]);
global.window = global;
global.localStorage = {
  getItem:key => memory.has(key) ? memory.get(key) : null,
  setItem:(key,value) => memory.set(key,String(value))
};

const progress = { currentBox:1, completedBoxes:[] };
global.LiplipProgress = {
  STAGES:['Starter','Explorer','Speaker','Navigator','Master'],
  courseSnapshot:() => ({currentBox:progress.currentBox,completedBoxes:[...progress.completedBoxes],records:[]})
};
const words = Array.from({length:20},(_,i)=>({en:`word-${i+1}`,ar:`معنى-${i+1}`}));
global.LiplipCourse = {
  mapPage:() => '<main class="c57-map"><section class="c57-box-page"></section></main>',
  render:() => '<main>base</main>',
  click:() => ({base:true}),
  getContent:id => ({vocabulary:{items:words.map((x,i)=>({...x,en:`${x.en}-${id}`,ar:`${x.ar}-${id}`,order:i+1}))}})
};
global.LiplipCourse57 = {level:1};

vm.runInThisContext(fs.readFileSync('study-treasure-path-v113.js','utf8'),{filename:'study-treasure-path-v113.js'});

const count = (text,pattern) => (text.match(pattern)||[]).length;
let map = LiplipCourse.mapPage({});
assert.equal(count(map,/v113-stop v113-normal/g),50,'keeps all 50 authored learning boxes');
assert.equal(count(map,/v113-stop v113-special v113-review/g),12,'adds one review after each four boxes through box 48');
assert.equal(count(map,/v113-stop v113-special v113-exam/g),4,'adds exams after boxes 12, 24, 36, and 48');
assert.equal(count(map,/v113-stop v113-special v113-final/g),1,'adds one final exam after box 50');
assert.match(map,/15 words per box · 20 questions/);
assert.match(map,/12 boxes of words · 50 questions/);
assert.match(map,/All 50 boxes · 100 questions/);

const reviewTarget={dataset:{type:'review',level:'1',after:'4',questions:'20'}};
assert.deepEqual(LiplipCourse.click('v113-open',reviewTarget,{}),{open:true});
let review=LiplipCourse.render({});
assert.match(review,/1 \/ 60/,'review contains 15 words from each of four boxes');
for(let i=1;i<60;i++)LiplipCourse.click('v113-study-next',{dataset:{}},{});
LiplipCourse.click('v113-start-exam',{dataset:{}},{});
review=LiplipCourse.render({});
assert.match(review,/Question 1 \/ 20/,'review exam contains 20 generated questions');
for(let i=0;i<20;i++){
  LiplipCourse.click('v113-answer',{dataset:{index:'0'}},{});
  LiplipCourse.click('v113-check',{dataset:{}},{});
  LiplipCourse.click('v113-next',{dataset:{}},{});
}
assert.match(LiplipCourse.render({}),/TREASURE COMPLETE/);
assert.ok(JSON.parse(memory.get('liplip-study-milestones-v113')).completed['1:review:4']);

LiplipCourse.click('v113-exit',{dataset:{}},{});
const examTarget={dataset:{type:'exam',level:'1',after:'12',questions:'50'}};
LiplipCourse.click('v113-open',examTarget,{});
assert.match(LiplipCourse.render({}),/Question 1 \/ 50/,'twelve-box exam contains 50 generated questions');
LiplipCourse.click('v113-exit',{dataset:{}},{});
const finalTarget={dataset:{type:'final',level:'1',after:'50',questions:'100'}};
LiplipCourse.click('v113-open',finalTarget,{});
assert.match(LiplipCourse.render({}),/Question 1 \/ 100/,'level final contains 100 generated questions');

const css=fs.readFileSync('study-treasure-path-v113.css','utf8');
for(const selector of ['.v113-normal','.v113-review','.v113-exam','.v113-final','.c57-zone-top','.c57-stage-nav']) assert.ok(css.includes(selector),`missing ${selector}`);

console.log('Study treasure path regression checks passed.');
