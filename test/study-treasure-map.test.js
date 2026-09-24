const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const events={},sessionStore=new Map(),localStore=new Map();
localStore.set('liplip-progress-v1',JSON.stringify({completedBoxes:[1,2],vocabulary:[],grammar:[],ratings:{pronunciation:[],writing:[],listening:[],reading:[],communication:[],accent:[],fluency:[]}}));
localStore.set('liplip-zone-state-v1',JSON.stringify({boxId:3,phase:3,card:0,flipped:false,reviewed:[],spoken:{},imageSpoken:{},answers:{},attempts:{},feedback:'',revision:0}));
const app={innerHTML:'',addEventListener:(name,handler)=>{events[name]=handler}};
const context={
 document:{getElementById:id=>id==='app'?app:{textContent:''}},
 window:{scrollTo(){},speechSynthesis:{cancel(){},speak(){}}},
 sessionStorage:{getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v),removeItem:k=>sessionStore.delete(k)},
 localStorage:{getItem:k=>localStore.get(k)||null,setItem:(k,v)=>localStore.set(k,v),removeItem:k=>localStore.delete(k)},
 FormData:class{constructor(form){this.values=form?.values||{}}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}get(k){return this.values[k]}has(k){return Object.prototype.hasOwnProperty.call(this.values,k)}},
 SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
 URL,Date,Number,String,Object,Set,Map,Math
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'progress.js'),'utf8')+'\nthis.P=LiplipProgress;',context);
vm.runInContext(fs.readFileSync(path.join(root,'content.js'),'utf8')+'\nthis.C=LiplipContent;',context);
vm.runInContext(fs.readFileSync(path.join(root,'zone.js'),'utf8')+'\nthis.Z=LiplipZone;',context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const click=(key,value)=>events.click({target:{closest:selector=>selector===`[data-${key}]`?{dataset:{[key]:value}}:null},preventDefault(){}});
click('action','auth');click('action','signin');click('action','guest');click('nav','الدراسة');
assert.match(app.innerHTML,/خريطة كنوز الدراسة/);
assert.match(app.innerHTML,/data-study-level="1"/);
assert.doesNotMatch(app.innerHTML,/data-study-level="2"/,'future level stays locked');
click('study-level','1');
assert.match(app.innerHTML,/data-study-step="1"/);
assert.doesNotMatch(app.innerHTML,/data-study-step="2"/,'future step stays locked');
click('study-step','1');
assert.match(app.innerHTML,/data-study-box="1"/,'completed box is reopenable');
assert.match(app.innerHTML,/data-study-box="2"/,'completed box is reopenable');
assert.match(app.innerHTML,/data-study-box="3"/,'current box is openable');
assert.doesNotMatch(app.innerHTML,/data-study-box="4"/,'future box stays locked');
const currentCard=app.innerHTML.match(/<button class="treasure-box current"[^>]*data-study-box="3"[\s\S]*?<\/button>/)?.[0]||'';
assert.equal((currentCard.match(/class="filled"/g)||[]).length,3,'phase 3 maps to three completed learning processes');
assert.match(currentCard,/التالي: اختبار الاستماع/);
assert.equal(context.Z.progressInfo(3).phase,3);
const savedBefore=localStore.get('liplip-zone-state-v1');
click('study-box','1');
assert.match(app.innerHTML,/data-zone="exit"/);
click('zone','exit');
assert.equal(localStore.get('liplip-zone-state-v1'),savedBefore,'reviewing an old box must not overwrite current-box resume state');
assert.match(app.innerHTML,/اختر الصندوق/);
assert.equal(context.Z.progressInfo(3).phase,3,'current box resume phase remains intact after review');
console.log('Study treasure map hierarchy, locks, partial progress, and safe review passed');
