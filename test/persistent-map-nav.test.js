const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),events={},session=new Map(),local=new Map(),scrolls=[];
const app={innerHTML:'',addEventListener:(n,h)=>events[n]=h};
class Params{constructor(q=''){this.m=new Map(q.split('&').filter(Boolean).map(x=>x.split('=')))}get(k){return this.m.get(k)||null}}
class BrowserURL{
  constructor(v){
    const m=/^(https?):\/\/([^/?#]+)([^?#]*)?(?:\?([^#]*))?/i.exec(String(v));
    if(!m)throw Error('bad URL');
    this.protocol=m[1].toLowerCase()+':';this.hostname=m[2].toLowerCase();this.pathname=m[3]||'/';this.username='';this.password='';this.searchParams=new Params(m[4]||'');
  }
}
class FormDataMock{constructor(form){this.values=form?.values||{}}get(k){return this.values[k]??null}has(k){return Object.prototype.hasOwnProperty.call(this.values,k)}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}}
const context={
  document:{
    getElementById:id=>id==='app'?app:{textContent:''},
    scrollingElement:{scrollTo:(x,y)=>scrolls.push(['document',x,y])},
    createElement(){return {click(){},remove(){}}},
    body:{appendChild(){},scrollTop:0},
    documentElement:{scrollTop:0}
  },
  window:{scrollTo:(...args)=>scrolls.push(['window',...args]),speechSynthesis:{cancel(){},speak(){}}},
  sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  FormData:FormDataMock,
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  URL:BrowserURL,Date,Number,String,Object,Set,Map,Math
};
vm.createContext(context);
for(const file of ['progress.js','content.js','zone.js','import.js','reception-import.js','reception.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.S=state;',context);
const S=context.S;
const click=(key,value)=>{const prop=key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[prop]:String(value)}}:null},preventDefault(){}})};

click('action','auth');click('action','signin');click('action','guest');

click('nav','الدراسة');
click('study-level','1');click('study-step','1');
assert.equal(S.studyMapView,'boxes');
assert.equal(S.studyMapLevel,1);assert.equal(S.studyMapStep,1);

click('nav','شاهد واقرأ');
click('reception-level','1');click('reception-step','1');
assert.equal(S.receptionMapView,'boxes');
assert.equal(S.receptionMapLevel,1);assert.equal(S.receptionMapStep,1);

click('nav','الدراسة');
assert.equal(S.studyMapView,'boxes');
assert.match(app.innerHTML,/treasure-status-mini study/);
assert.doesNotMatch(app.innerHTML,/treasure-status-ring/);
assert.match(app.innerHTML,/اختر الصندوق/);

click('nav','شاهد واقرأ');
assert.equal(S.receptionMapView,'boxes');
assert.match(app.innerHTML,/treasure-status-mini reception/);
assert.match(app.innerHTML,/كنوز شاهد واقرأ/);

const topCalls=scrolls.filter(x=>x[0]==='window'&&typeof x[1]==='object'&&x[1].top===0&&x[1].left===0);
assert.ok(topCalls.length>=10,'navigation should reset viewport to top');

console.log('Compact status, per-tab map persistence, and top-of-page navigation passed');
