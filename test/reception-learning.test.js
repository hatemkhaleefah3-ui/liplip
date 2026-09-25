const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');

class Params{
  constructor(q=''){this.m=new Map(q.split('&').filter(Boolean).map(x=>x.split('=')))}
  get(k){return this.m.get(k)||null}
}
class BrowserURL{
  constructor(v){
    const m=/^(https?):\/\/([^/?#]+)([^?#]*)?(?:\?([^#]*))?/i.exec(String(v));
    if(!m)throw Error('bad URL');
    this.protocol=m[1].toLowerCase()+':';
    this.hostname=m[2].toLowerCase();
    this.pathname=m[3]||'/';
    this.username='';this.password='';
    this.searchParams=new Params(m[4]||'');
  }
}
const local=new Map(),events={};
const context={
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  window:{speechSynthesis:{cancel(){},speak(){}}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  URL:BrowserURL,
  FormData:class{},
  document:{getElementById(){return null}},
  Date,Number,String,Object,Set,Map,Math
};
vm.createContext(context);
for(const file of ['progress.js','reception-import.js','reception.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.I=LiplipReceptionImporter;this.R=LiplipReception;',context);
const {P,I,R}=context;

const watch=[
 I.WATCH_HEADERS,
 ['watch',1,1,1,'video','فيديو الترحيب','https://www.youtube.com/watch?v=dQw4w9WgXcQ','Hello there','استمع للتحية','','','','','','','','',''],
 ['watchExam',1,1,1,'textVoice','','','Hello there','','','استمع ثم اختر','Hello there','Goodbye','Thank you','',1,'','اختر النص المطابق للصوت'],
 ['watchExam',1,1,1,'imageArabicWrite','','','','','https://example.com/cat.jpg','اكتب اسم الصورة بالعربية','','','','','','قطة',''],
 ['watchExam',1,1,1,'mcq','','','','','','اختر المعنى الصحيح','نعم','لا','ربما','',1,'','']
];
const w=I.parseRows(watch,R.validate);
assert.equal(w.format,'watch');
assert.equal(w.count,4);
assert.equal(w.boxes.get(1).watch[0].youtubeId,'dQw4w9WgXcQ');
assert.equal(w.boxes.get(1).watchExam.length,3);

const read=[
 I.READ_HEADERS,
 ['read',1,1,1,'storyPage','القصة الأولى',1,'Tom has a red ball.','','','','','','','','','',''],
 ['readExam',1,1,1,'enToArWrite','',1,'red','','','','','','','','','أحمر',''],
 ['readExam',1,1,1,'arToEnWrite','',1,'','كرة','','','','','','','','ball',''],
 ['readExam',1,1,1,'mcq','',1,'','','','من لديه كرة؟','Tom','Sara','Ali','',1,'','']
];
const r=I.parseRows(read,R.validate);
assert.equal(r.format,'read');
assert.equal(r.count,4);
assert.equal(r.boxes.get(1).read[0].page,1);
assert.equal(r.boxes.get(1).readExam.length,3);

assert.throws(()=>I.parseRows([I.WATCH_HEADERS,['read',1,1,1,'storyPage','x','', 'Story','','','','','','','','','','']],R.validate),/لهذا القالب/);

let p=P.hydrate(null);
assert.equal(P.receptionSnapshot(p).currentBox,1);
for(const [process,score] of [['watch',100],['watchExam',80],['read',100],['readExam',90]])p=P.recordReceptionProcess(p,{boxId:1,process,score});
const snap=P.receptionSnapshot(p);
assert.equal(snap.currentBox,2);
assert.deepEqual([...snap.completedBoxes],[1]);
assert.equal(P.snapshot(p).metrics.listening.count,1);
assert.equal(P.snapshot(p).metrics.reading.count,1);
assert.throws(()=>P.recordReceptionProcess(p,{boxId:3,process:'watch',score:100}),/in order/);

console.log('Watch/Read formats, validation, four-process progression, and metrics passed');
