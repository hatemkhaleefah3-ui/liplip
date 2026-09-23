const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const events = {};
const store = new Map();
const app = {innerHTML:'', addEventListener:(name,handler)=>{events[name]=handler}};
const context = {
  document:{getElementById:id=>id==='app'?app:{textContent:''}},
  window:{scrollTo(){}},
  sessionStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)},
  FormData:class {constructor(form){this.values=form.values||{}}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}get(key){return this.values[key]}},
  Date,Number,String,Object,Set,Math
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'progress.js'),'utf8')+'\nthis.P=LiplipProgress;',context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const P = context.P;
const click = (key,value) => events.click({
  target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[key]:value}}:null},
  preventDefault(){}
});
assert.equal(P.TOTAL_BOXES,1000);
assert.deepEqual(JSON.parse(JSON.stringify(P.location(1))),{stage:1,step:1,box:1});
assert.deepEqual(JSON.parse(JSON.stringify(P.location(21))),{stage:1,step:2,box:1});
assert.deepEqual(JSON.parse(JSON.stringify(P.location(201))),{stage:2,step:1,box:1});
assert.deepEqual(JSON.parse(JSON.stringify(P.location(1000))),{stage:5,step:10,box:20});
let progress=P.hydrate(null);
assert.equal(P.snapshot(progress).level,'A0');
assert.equal(P.snapshot(progress).currentBox,1);
assert.doesNotMatch(app.innerHTML,/[\u{1F300}-\u{1FAFF}]/u);
click('action','auth');click('action','signin');click('action','guest');
assert.match(app.innerHTML,/مستواك الحالي في liplip/);
assert.match(app.innerHTML,/A0/);
assert.ok(app.innerHTML.includes('مسار واحد، أربع طرق للتعلّم.'));
const navigation=app.innerHTML.match(/<nav class=\"mainnav\"[\s\S]*?<\/nav>/)[0];
assert.equal((navigation.match(/class=\"navitem/g)||[]).length,6);
assert.ok(!navigation.includes('<span>'),'Navigation has icons without visible labels');
assert.ok(navigation.indexOf('data-nav=\"شاهد واقرأ\"')<navigation.indexOf('data-nav=\"خزانتي\"'));
click('nav','الدراسة');
assert.ok(!app.innerHTML.includes('مسار واحد، أربع طرق للتعلّم.'));
assert.ok(app.innerHTML.includes('أول الطريق')&&app.innerHTML.includes('البداية'));
assert.match(app.innerHTML,/ادرس الصندوق الحالي/);
click('action','study-box');assert.ok(app.innerHTML.includes('درس الصندوق 1 · قريباً'));
click('action','return-section');assert.match(app.innerHTML,/ادرس الصندوق الحالي/);
click('nav','شاهد واقرأ');assert.ok(app.innerHTML.includes('ابدأ المشاهدة')&&app.innerHTML.includes('ابدأ القراءة'));
assert.ok(app.innerHTML.includes('أول الطريق')&&app.innerHTML.includes('البداية'));
click('experience','watching');assert.ok(app.innerHTML.includes('قريباً · مشاهدة')&&app.innerHTML.includes('أول الطريق'));
click('action','return-section');click('experience','reading');assert.ok(app.innerHTML.includes('قريباً · قراءة')&&app.innerHTML.includes('البداية'));
click('action','return-section');
click('nav','تحدّث');assert.match(app.innerHTML,/توجيه/);assert.match(app.innerHTML,/تدريب/);
click('mode','supervise');assert.match(app.innerHTML,/محادثة كتابية/);assert.match(app.innerHTML,/مكالمة صوتية/);assert.doesNotMatch(app.innerHTML,/تدرّب بحرّية/);
click('channel','text');assert.match(app.innerHTML,/التوجيه · محادثة كتابية/);
click('action','return-section');click('action','mode-reset');assert.match(app.innerHTML,/توجيه/);assert.match(app.innerHTML,/تدريب/);
click('mode','practice');click('channel','call');assert.match(app.innerHTML,/التدريب · مكالمة صوتية/);
click('nav','خزانتي');assert.match(app.innerHTML,/كلمة محفوظة/);
progress=P.recordStudy(progress,{boxId:1,words:['hello','Hello','world'],pronunciation:70,writing:80});
assert.equal(P.snapshot(progress).vocabularyCount,2);
assert.equal(P.snapshot(progress).currentBox,2);
assert.throws(()=>P.recordStudy(progress,{boxId:3,words:[],pronunciation:70,writing:80}),/in order/);
progress=P.recordChat(progress,{communication:65,accent:60,fluency:70});
progress=P.recordReception(progress,{kind:'watching',score:72});
progress=P.recordReception(progress,{kind:'reading',score:81});
assert.equal(P.snapshot(progress).metrics.communication.average,65);
assert.equal(P.snapshot(progress).metrics.listening.average,72);
assert.equal(P.snapshot(progress).metrics.reading.average,81);
assert.throws(()=>P.recordReception(progress,{kind:'watching',score:101}),/Invalid reception rating/);
assert.equal(P.snapshot(progress).level,'A0');
const raw={completedBoxes:Array.from({length:50},(_,i)=>i+1),vocabulary:Array.from({length:100},(_,i)=>({word:`word${i}`})),ratings:Object.fromEntries(P.METRICS.map(key=>[key,[20]]))};
assert.equal(P.snapshot(raw).level,'A1');
raw.ratings.accent=[];
assert.equal(P.snapshot(raw).level,'A0');
const mastered={completedBoxes:Array.from({length:1000},(_,i)=>i+1),vocabulary:Array.from({length:7000},(_,i)=>({word:`term${i}`})),ratings:Object.fromEntries(P.METRICS.map(key=>[key,Array(30).fill(90)]))};
assert.equal(P.snapshot(mastered).level,'C2');
assert.equal(P.snapshot(mastered).currentBox,null);
console.log('Progress model and navigation flows passed');
