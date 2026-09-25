const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const events={},session=new Map(),local=new Map();

local.set('liplip-reception-content-v1',JSON.stringify({
  1:{
    watch:[{id:'v1',type:'video',title:'فيديو البداية',youtube:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',youtubeId:'dQw4w9WgXcQ',english:'Hello there'}],
    watchExam:[
      {id:'w1',type:'textVoice',english:'Hello there',options:['Hello there','Goodbye'],correct:0},
      {id:'w2',type:'imageArabicWrite',image:'https://example.com/cat.jpg',answer:'قطة'}
    ],
    read:[{id:'s1',type:'storyPage',title:'القصة الأولى',page:1,english:'Tom has a red ball.'}],
    readExam:[
      {id:'r1',type:'enToArWrite',english:'red',answer:'أحمر'},
      {id:'r2',type:'arToEnWrite',arabic:'كرة',answer:'ball'}
    ]
  }
}));

const app={innerHTML:'',addEventListener:(name,handler)=>{events[name]=handler}};
class Params{constructor(q=''){this.m=new Map(q.split('&').filter(Boolean).map(x=>x.split('=')))}get(k){return this.m.get(k)||null}}
class BrowserURL{
  constructor(v){
    const m=/^(https?):\/\/([^/?#]+)([^?#]*)?(?:\?([^#]*))?/i.exec(String(v));
    if(!m)throw Error('bad URL');
    this.protocol=m[1].toLowerCase()+':';this.hostname=m[2].toLowerCase();this.pathname=m[3]||'/';this.username='';this.password='';this.searchParams=new Params(m[4]||'');
  }
}
class FormDataMock{
  constructor(form){this.values=form?.values||{}}
  get(k){return this.values[k]??null}
  has(k){return Object.prototype.hasOwnProperty.call(this.values,k)}
  [Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}
}
const context={
  document:{getElementById:id=>id==='app'?app:{textContent:''},createElement(){return {click(){},remove(){}}},body:{appendChild(){}}},
  window:{scrollTo(){},speechSynthesis:{cancel(){},speak(){}}},
  sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  FormData:FormDataMock,
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  URL:BrowserURL,Date,Number,String,Object,Set,Map,Math
};
vm.createContext(context);
for(const file of ['progress.js','content.js','zone.js','import.js','reception-import.js','reception.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.R=LiplipReception;this.S=state;',context);
const {P,R,S}=context;
const click=(key,value)=>{const prop=key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[prop]:String(value)}}:null},preventDefault(){}})};

click('action','auth');click('action','signin');click('action','guest');click('nav','شاهد واقرأ');
assert.match(app.innerHTML,/خريطة كنوز شاهد واقرأ/);
assert.match(app.innerHTML,/treasure-status-box reception/);
assert.match(app.innerHTML,/data-reception-level="1"/);
assert.doesNotMatch(app.innerHTML,/data-reception-level="2"/);

click('reception-level','1');
assert.match(app.innerHTML,/data-reception-step="1"/);
click('reception-step','1');
assert.match(app.innerHTML,/data-reception-box="1"/);
assert.doesNotMatch(app.innerHTML,/data-reception-box="2"/);

click('reception-box','1');
assert.equal(S.page,'reception-zone');
assert.match(app.innerHTML,/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
assert.match(app.innerHTML,/أكملت المشاهدة/);
click('reception','complete-process');
assert.equal(P.receptionSnapshot(S.progress).process,'watchExam');
assert.match(app.innerHTML,/اختبار المشاهدة/);
assert.match(app.innerHTML,/تشغيل الصوت الإنجليزي/);
assert.match(app.innerHTML,/اكتب الإجابة بالعربية/);

click('reception','control');
assert.match(app.innerHTML,/قالب واحد للمشاهدة والقراءة/);
assert.match(app.innerHTML,/4 أعمدة فقط/);
assert.equal((app.innerHTML.match(/data-reception="download-template"/g)||[]).length,1);
assert.match(app.innerHTML,/Read Exam/);
assert.match(app.innerHTML,/Watch Exam/);
assert.match(app.innerHTML,/EN_AR/);
assert.match(app.innerHTML,/VOICE/);

console.log('Watch/Read treasure navigation, status, video, exam, and content control passed');
