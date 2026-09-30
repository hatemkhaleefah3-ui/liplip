const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=__dirname,storage=new Map();
const context={
  console,URL,Date,Number,String,Object,Array,Set,Map,Math,JSON,structuredClone,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  window:{speechSynthesis:{cancel(){},speak(){}}},SpeechSynthesisUtterance:class{},
  document:{},FormData:class{},JSZip:undefined,DOMParser:undefined,setTimeout
};
vm.createContext(context);
for(const file of ['progress.js','course.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.C=LiplipCourse',context);
const {P,C}=context;

assert.deepEqual({...P.courseLocation(1)},{level:1,box:1});
assert.deepEqual({...P.courseLocation(200)},{level:1,box:200});
assert.deepEqual({...P.courseLocation(201)},{level:2,box:1});
for(const headers of Object.values(C.HEADERS)){
  assert.deepEqual([...headers.slice(0,3)],['Phase','Level','Box']);
  assert.equal(headers.includes('Step'),false);
}

let p=P.hydrate(null);
assert.equal(P.courseSnapshot(p).currentBox,1);
const order=[['vocabulary','content'],['vocabulary','exam'],['grammar','article'],['grammar','exam'],['watchRead','video'],['watchRead','story']];
assert.throws(()=>P.recordCourseProcess(p,{boxId:1,phase:'grammar',process:'article',score:100}),/order/);
for(const [phase,process] of order)p=P.recordCourseProcess(p,{boxId:1,phase,process,score:90,words:[],grammar:[]});
let snap=P.courseSnapshot(p);
assert.equal(snap.currentBox,2);
assert.deepEqual([...snap.completedBoxes],[1]);
assert.deepEqual([...snap.records[0].completedPhases],['vocabulary','grammar','watchRead']);

let legacy=P.hydrate({completedBoxes:[1],receptionBoxes:[{boxId:1,completed:['watch','watchExam','read','readExam'],scores:{watchExam:80,readExam:85}}]});
assert.deepEqual([...P.courseSnapshot(legacy).completedBoxes],[1]);

const initial=C.mapPage(P.hydrate(null));
assert.match(initial,/data-course="level"/);
C.click('level',{dataset:{level:'1'}},P.hydrate(null));
const boxes=C.mapPage(P.hydrate(null));
assert.equal((boxes.match(/class="course-box /g)||[]).length,200);
assert.doesNotMatch(boxes,/data-study-step/);

const source=fs.readFileSync(path.join(root,'course.js'),'utf8');
assert.match(source,/Phase = \$\{PHASE_VALUE\[p\.key\]\}/);
assert.doesNotMatch(source,/\['Phase','Level','Step'/);
console.log('Unified course geometry, progress, migration, map, and Excel schemas passed');
