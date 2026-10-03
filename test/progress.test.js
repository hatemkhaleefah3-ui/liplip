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
vm.runInContext('this.P=LiplipProgress;this.C=LiplipCourse;this.S=state;',context);
const {P,C,S}=context;
const click=(key,value)=>events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:String(value)}}:null},preventDefault(){}});
const clickCourse=(action,data={})=>events.click({target:{closest:selector=>selector==='[data-course]'?{dataset:{course:action,...data}}:null},preventDefault(){}});

assert.equal(P.TOTAL_BOXES,1000);
assert.deepEqual({...P.courseLocation(200)},{level:1,box:200});
click('action','auth');click('action','signin');click('action','guest');
const navigation=app.innerHTML.match(/<nav class="mainnav"[\s\S]*?<\/nav>/)[0];
assert.equal((navigation.match(/class="navitem/g)||[]).length,5);
assert.doesNotMatch(navigation,/data-nav="شاهد واقرأ"/);
assert.match(navigation,/data-nav="الملف الشخصي"/);
assert.doesNotMatch(navigation,/data-nav="الإعدادات"/);
assert.match(app.innerHTML,/ثلاث مراحل/);

click('nav','الدراسة');
assert.doesNotMatch(app.innerHTML,/course-map-hero|خريطة الدراسة الموحّدة/);
assert.equal((app.innerHTML.match(/class="course-level /g)||[]).length,5);
assert.doesNotMatch(app.innerHTML,/خطوة|data-study-step/);
assert.doesNotMatch(app.innerHTML,/الصندوق الحالي/,'Study map status card is removed');
assert.match(app.innerHTML,/course-control-fab/);
clickCourse('manager-open');
assert.match(app.innerHTML,/إضافة محتوى/);
assert.match(app.innerHTML,/تعديل المحتوى/);
clickCourse('manager-mode',{mode:'add'});
assert.match(app.innerHTML,/إضافة يدوية/);
assert.match(app.innerHTML,/استيراد/);
clickCourse('manager-mode',{mode:'manual'});
assert.match(app.innerHTML,/course-manager-selectors/);
assert.match(app.innerHTML,/id="course-manager-add"/);
events.submit({target:{id:'course-manager-add',dataset:{},values:{kind:'word',en:'manual word',ar:'كلمة يدوية',image:'',voice:'manual word'},reportValidity(){return true}},preventDefault(){}});
assert.equal(C.getContent(1).vocabulary.items.at(-1).en,'manual word');
assert.match(app.innerHTML,/تمت إضافة العنصر/);
clickCourse('manager-back');
clickCourse('manager-mode',{mode:'import'});
assert.match(app.innerHTML,/data-course-manager-import/);
assert.match(app.innerHTML,/data-course="manager-template-zip"/);
assert.match(app.innerHTML,/liplip-content-templates/);
clickCourse('manager-close');

clickCourse('manager-open');
clickCourse('manager-mode',{mode:'edit'});
assert.match(app.innerHTML,/id="course-manager-edit"/);
events.submit({target:{id:'course-manager-edit',dataset:{kind:'vocab-item',index:'0'},values:{kind:'word',en:'edited word',ar:'كلمة معدلة',image:'',voice:'edited word'},reportValidity(){return true}},preventDefault(){}});
assert.equal(C.getContent(1).vocabulary.items[0].en,'edited word');
assert.match(app.innerHTML,/تم حفظ التعديل/);
clickCourse('manager-close');

clickCourse('level',{level:'1'});
assert.equal((app.innerHTML.match(/class="course-box /g)||[]).length,200);
assert.doesNotMatch(app.innerHTML,/course-map-title|course-phase-key|خريطة المستوى/);
assert.match(app.innerHTML,/data-course="box" data-box-id="1"/);
assert.doesNotMatch(app.innerHTML,/data-box-id="2"/);

clickCourse('box',{boxId:'1'});
assert.equal(S.page,'course-zone');
assert.match(app.innerHTML,/المرحلة 01 · العملية 01/);
assert.match(app.innerHTML,/كلمات وصور وأصوات/);
assert.doesNotMatch(app.innerHTML,/data-course="control"|course-control-fab|course-manager-sheet/,'content control is available only from the Study map');
clickCourse('complete-process');
assert.match(app.innerHTML,/المرحلة 01 · العملية 02/);
events.submit({target:{id:'course-exam-form',dataset:{phase:'vocabulary'},values:{q0:'0'},reportValidity(){return true}},preventDefault(){}});
assert.match(app.innerHTML,/المرحلة 02 · العملية 01/);
assert.match(app.innerHTML,/grammar-step-card law normal/,'grammar article opens on its first paginated law');
const grammarItems=C.grammarItems(C.getContent(1).grammar.article);
assert.equal(JSON.stringify([...grammarItems.filter(x=>x.kind==='law').map(x=>x.type)]),JSON.stringify(['normal','negative','question']));
assert.equal(grammarItems.filter(x=>x.kind==='example').length,10);
assert.ok(grammarItems.filter(x=>x.kind==='example').every(x=>['easy','medium','difficult'].includes(x.difficulty)));
assert.match(app.innerHTML,/data-phase="vocabulary"/,'completed phase remains available from the toggle');
clickCourse('complete-process');
assert.match(app.innerHTML,/اختبار القواعد/);
events.submit({target:{id:'course-exam-form',dataset:{phase:'grammar'},values:{q0:'0'},reportValidity(){return true}},preventDefault(){}});
assert.match(app.innerHTML,/watch-video-player/,'watch & read starts on the video page');
clickCourse('item-next',{total:'2'});
assert.match(app.innerHTML,/أنهيت أسئلة الفيديو/);
events.submit({target:{id:'course-exam-form',dataset:{phase:'watchRead',process:'video'},values:{q0:'0'},reportValidity(){return true}},preventDefault(){}});
assert.match(app.innerHTML,/story-page-player/,'story process starts on the story page');
clickCourse('item-next',{total:'2'});
assert.match(app.innerHTML,/أنهيت القصة والأسئلة/);
events.submit({target:{id:'course-exam-form',dataset:{phase:'watchRead',process:'story'},values:{q0:'0'},reportValidity(){return true}},preventDefault(){}});
assert.match(app.innerHTML,/درجة الصندوق/);
assert.match(app.innerHTML,/>100%<\/strong>/);
assert.equal((app.innerHTML.match(/33\.333%/g)||[]).length,3);
assert.match(app.innerHTML,/data-course="result-close"/);
assert.match(app.innerHTML,/data-course="result-next"/);
assert.match(app.innerHTML,/data-course="result-repeat"/);
clickCourse('result-repeat');
assert.match(app.innerHTML,/المرحلة 01 · العملية 01/);
assert.match(app.innerHTML,/مرحلة مكتملة مفتوحة للمراجعة/);
context.C.afterProgress(S.progress);
app.innerHTML=context.C.render(S.progress);
clickCourse('result-next');
assert.match(app.innerHTML,/المستوى 1 · الصندوق 2/);
assert.match(app.innerHTML,/المرحلة 01 · العملية 01/);
clickCourse('exit');
assert.equal(S.page,'app');
assert.match(app.innerHTML,/class="course-boxes"/);
assert.match(app.innerHTML,/course-box complete phase-3/,'completed box keeps its final color');

click('nav','تحدّث');
assert.match(app.innerHTML,/talk-select/);
assert.doesNotMatch(app.innerHTML,/talk-intro|status-strip/);

click('nav','خزانتي');
assert.match(app.innerHTML,/closet-shelves/);
assert.doesNotMatch(app.innerHTML,/closet-hero/);

click('nav','الملف الشخصي');
assert.match(app.innerHTML,/مساحتك في لُبلُب/);
assert.match(app.innerHTML,/data-action="open-settings"/);
click('action','open-settings');
assert.match(app.innerHTML,/بيانات التعلّم المحلية/);
assert.match(app.innerHTML,/data-action="close-settings"/);
click('action','close-settings');
assert.match(app.innerHTML,/مساحتك في لُبلُب/);
console.log('Unified Study results and profile navigation passed');
