const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const events={},sessions=new Map(),drafts=new Map();
let editorForm=null;
const app={innerHTML:'',addEventListener:(name,fn)=>{events[name]=fn}};
const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
const context={
  document:{getElementById:id=>id==='app'?app:id==='lesson-editor-form'?editorForm:{textContent:''}},
  window:{scrollTo(){}},sessionStorage:storage(sessions),localStorage:storage(drafts),
  FormData:class{constructor(form){this.values=form.values||{}}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}get(k){return this.values[k]}},
  Date,Number,String,Object,Set,Math
};
vm.createContext(context);
for(const name of ['progress.js','content.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.C=LiplipContent;',context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const P=context.P,C=context.C;
function click(key,value){const prop=key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[prop]:value}}:null},preventDefault(){}})}
function submit(id,values={},dataset={}){events.submit({target:{id,values,dataset,reportValidity:()=>true},preventDefault(){}})}
click('action','auth');click('action','signin');click('action','guest');click('nav','الدراسة');
click('action','study-box');
assert.ok(app.innerHTML.includes('أول تحية'),'First seeded lesson opens');
assert.equal(P.snapshot(JSON.parse(sessions.get('liplip-preview')).progress).vocabularyCount,0,'Opening does not earn words');
assert.ok(app.innerHTML.includes('data-action="complete-lesson" disabled'),'Completion gated');
click('audio','0');assert.ok(app.innerHTML.includes('الصوت غير متاح'));
let spokenUtterance=null;context.window.speechSynthesis={cancel(){},speak:u=>{spokenUtterance=u}};context.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
click('audio','0');assert.equal(spokenUtterance.text,'hello');assert.equal(spokenUtterance.lang,'en-US');
for(let i=0;i<4;i++)click('review',String(i));
click('lesson-tab','write');
submit('lesson-writing-form',{answer0:'wrong'});
assert.ok(app.innerHTML.includes('تلميح: تبدأ بحرف H'),'Wrong answer produces hint');
submit('lesson-writing-form',{answer0:'Hello',answer1:'goodbye',answer2:'please',answer3:'thank you'});
click('lesson-tab','speak');
for(let i=0;i<4;i++)click('spoken',String(i));
click('rating','70');
assert.ok(!app.innerHTML.includes('data-action="complete-lesson" disabled'),'Completion unlocked');
click('action','complete-lesson');
assert.ok(app.innerHTML.includes('تم إنجاز الصندوق'),'Completion view');
let progress=JSON.parse(sessions.get('liplip-preview')).progress;
assert.equal(P.snapshot(progress).currentBox,2);
assert.equal(P.snapshot(progress).vocabularyCount,4);
assert.equal(P.snapshot(progress).metrics.writing.average,88);
assert.equal(P.snapshot(progress).metrics.pronunciation.average,70);
assert.ok(drafts.has('liplip-progress-v1'),'Progress persists on this device');
click('action','next-lesson');assert.ok(app.innerHTML.includes('تعرّف إلى شخص'));
click('action','toggle-editor');assert.ok(app.innerHTML.includes('استوديو المحتوى'));
const seed=C.get(2);
const formValues={title:seed.title,goal:seed.goal};
seed.words.forEach((w,i)=>{formValues[`term${i}`]=w.term;formValues[`meaning${i}`]=w.meaning;formValues[`example${i}`]=w.example});
editorForm={values:formValues,dataset:{wordCount:'4'}};
click('action','add-word');assert.ok(app.innerHTML.includes('بطاقة 05'));
const extended={...formValues,term4:'friend',meaning4:'صديق',example4:'My friend is kind.'};
editorForm={values:extended,dataset:{wordCount:'5'}};
submit('lesson-editor-form');assert.equal(C.get(2).words.length,5);
assert.ok(drafts.has('liplip-content-v1'),'Editor persisted locally');
click('delete-word','4');assert.ok(app.innerHTML.includes('بطاقة 04'));
editorForm={values:formValues,dataset:{wordCount:'4'}};submit('lesson-editor-form');assert.equal(C.get(2).words.length,4);
click('action','delete-lesson');assert.ok(app.innerHTML.includes('تأكيد الحذف'));
click('action','confirm-delete');assert.equal(C.get(2).words.length,0);
click('action','restore-lesson');assert.equal(C.get(2).words.length,4);
assert.throws(()=>C.save(6,{title:'bad',goal:'goal',words:[{term:'x',meaning:'',example:''}]}),/أكمل الكلمة/);
click('nav','الإعدادات');click('action','reset-progress');assert.ok(app.innerHTML.includes('نعم، امسح التقدّم'));
click('action','confirm-reset');assert.equal(P.snapshot(JSON.parse(drafts.get('liplip-progress-v1'))).vocabularyCount,0);
assert.equal(C.get(2).words.length,4,'Reset does not delete authored content');
console.log('Lesson review, writing, speaking, completion, and content editing passed');
