const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),events={},session=new Map(),local=new Map();
const app={innerHTML:'',addEventListener:(name,handler)=>events[name]=handler};
class FormDataMock{constructor(form){this.values=form?.values||{}}get(k){return this.values[k]??null}has(k){return Object.prototype.hasOwnProperty.call(this.values,k)}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}}
const context={
  document:{getElementById:id=>id==='app'?app:{textContent:''},scrollingElement:{scrollTo(){}},createElement(){return {click(){},remove(){}}},body:{appendChild(){}}},
  window:{scrollTo(){},speechSynthesis:{cancel(){},speak(){}}},
  sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  FormData:FormDataMock,SpeechSynthesisUtterance:class{},URL,Date,Number,String,Object,Array,Set,Map,Math,JSON,structuredClone,setTimeout,JSZip:undefined,DOMParser:undefined
};
vm.createContext(context);
for(const file of ['progress.js','content.js','zone.js','import.js','reception-import.js','reception.js','course.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.S=state;',context);
const {P,S}=context;
const click=(key,value)=>events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:String(value)}}:null},preventDefault(){}});
const clickCourse=(action,data={})=>events.click({target:{closest:selector=>selector==='[data-course]'?{dataset:{course:action,...data}}:null},preventDefault(){}});

assert.equal(P.TOTAL_BOXES,1000);
assert.deepEqual({...P.courseLocation(200)},{level:1,box:200});
click('action','auth');click('action','signin');click('action','guest');
const navigation=app.innerHTML.match(/<nav class="mainnav"[\s\S]*?<\/nav>/)[0];
assert.equal((navigation.match(/class="navitem/g)||[]).length,5);
assert.doesNotMatch(navigation,/data-nav="شاهد واقرأ"/);
assert.match(app.innerHTML,/ثلاث مراحل/);

click('nav','الدراسة');
assert.match(app.innerHTML,/خريطة الدراسة الموحّدة/);
assert.equal((app.innerHTML.match(/class="course-level /g)||[]).length,5);
assert.doesNotMatch(app.innerHTML,/خطوة|data-study-step/);
clickCourse('level',{level:'1'});
assert.equal((app.innerHTML.match(/class="course-box /g)||[]).length,200);
assert.match(app.innerHTML,/data-course="box" data-box-id="1"/);
assert.doesNotMatch(app.innerHTML,/data-box-id="2"/);

clickCourse('box',{boxId:'1'});
assert.equal(S.page,'course-zone');
assert.match(app.innerHTML,/المرحلة 01 · العملية 01/);
assert.match(app.innerHTML,/كلمات وصور وأصوات/);
clickCourse('control');
assert.match(app.innerHTML,/liplip-vocabulary\.xlsx/);
assert.match(app.innerHTML,/liplip-grammar\.xlsx/);
assert.match(app.innerHTML,/liplip-watch-read\.xlsx/);
assert.equal((app.innerHTML.match(/data-course-import=/g)||[]).length,3);
clickCourse('control-close');
clickCourse('complete-process');
assert.match(app.innerHTML,/المرحلة 01 · العملية 02/);
events.submit({target:{id:'course-exam-form',dataset:{phase:'vocabulary'},values:{q0:'0'},reportValidity(){return true}},preventDefault(){}});
assert.match(app.innerHTML,/المرحلة 02 · العملية 01/);
assert.match(app.innerHTML,/Normal/);
assert.match(app.innerHTML,/Negative/);
assert.match(app.innerHTML,/Question/);
assert.equal((app.innerHTML.match(/class="easy"|class="medium"|class="difficult"/g)||[]).length,10);
assert.match(app.innerHTML,/data-phase="vocabulary"/,'completed phase remains available from the toggle');
clickCourse('exit');
assert.equal(S.page,'app');
assert.match(app.innerHTML,/اختر الصندوق/);
assert.match(app.innerHTML,/course-box current phase-1/,'box color advances after completing vocabulary');
console.log('Unified Study navigation and phase flow passed');
