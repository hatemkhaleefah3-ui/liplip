const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');

const root=path.join(__dirname,'..');
const data=new Map();
let failWrites=false;
const localStorage={
  getItem:key=>data.get(key)||null,
  setItem:(key,value)=>{if(failWrites)throw Error('quota');data.set(key,value)},
  removeItem:key=>data.delete(key)
};
const context={
  localStorage,
  window:{speechSynthesis:{cancel(){}}},
  document:{},
  Date,Number,Object,Math,Set,Map
};
vm.createContext(context);
for(const file of ['progress.js','content.js','zone.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.Z=LiplipZone;',context);
const {Z}=context;
const click=(action,value)=>Z.click(action,{dataset:value===undefined?{}:{value:String(value)}},()=>{});
const html=()=>Z.render({snapshot:{}});

Z.start(1);
click('control');
assert.match(html(),/تحكّم بالمحتوى/);
assert.match(html(),/مسح المحتوى/);
assert.match(html(),/>English</);
assert.match(html(),/المستوى/);
assert.match(html(),/الخطوة/);
assert.match(html(),/الصندوق/);

click('menu-clear');
assert.match(html(),/مسح اللغة/);
assert.match(html(),/مسح مستوى/);
assert.match(html(),/مسح خطوة/);
assert.match(html(),/مسح صندوق/);

click('clear-scope','box');
click('clear-pick-level',1);
assert.match(html(),/الخطوة 10/,'step selector follows the existing 10-step curriculum geometry');
click('clear-pick-step',1);
assert.match(html(),/الصندوق 20/);
click('clear-pick-box',2);
assert.match(html(),/تأكيد مسح/);
assert.equal(Z.getContent(1).vocab.length,6);
assert.equal(Z.getContent(2).vocab.length,6);
click('confirm-clear-content');
assert.match(html(),/اكتملت عملية المسح/);
assert.equal(Z.getContent(2).vocab.length,0,'selected box is blanked');
assert.equal(Z.getContent(1).vocab.length,6,'neighboring box is untouched');

click('menu-clear');
click('clear-scope','level');
click('clear-pick-level',1);
failWrites=true;
click('confirm-clear-content');
failWrites=false;
assert.match(html(),/تعذّر حفظ عملية المسح/);
assert.equal(Z.getContent(1).vocab.length,6,'failed storage write does not mutate in-memory content');

click('clear-back');
click('clear-back');
click('clear-scope','language');
click('clear-pick-language','en');
assert.match(html(),/1000/);
click('confirm-clear-content');
assert.equal(Z.getContent(1).vocab.length,0);
assert.equal(Z.getContent(201).vocab.length,0);
assert.match(html(),/1000 صندوقاً/);

console.log('Hierarchical content clear controls and rollback passed');
