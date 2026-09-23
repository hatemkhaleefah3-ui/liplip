const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const data=new Map();
let failWrites=false;
const localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>{if(failWrites)throw Error('quota');data.set(key,value)},removeItem:key=>data.delete(key)};
const context={localStorage,window:{speechSynthesis:{cancel(){}}},document:{},Date,Number,Object,Math,Set,Map};
vm.createContext(context);
for(const file of ['progress.js','content.js','zone.js','import.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
vm.runInContext('this.P=LiplipProgress;this.Z=LiplipZone;this.I=LiplipImporter;',context);
const {Z,I}=context;
const heading=Array.from(I.HEADERS);
const vocab=(stage,step,box,en='hello')=>['vocab',stage,step,box,'word',en,'مرحباً','Hello, I am Ali.'];
function menu(){Z.start(1);Z.click('control',{},()=>{});Z.click('menu-import',{},()=>{})}
function choose(scope,stage=1,step=1,box=1){
 Z.click('import-scope',{dataset:{value:scope}},()=>{});
 if(scope!=='language')Z.click('import-stage',{dataset:{value:String(stage)}},()=>{});
 if(scope==='step'||scope==='box')Z.click('import-step',{dataset:{value:String(step)}},()=>{});
 if(scope==='box')Z.click('import-box',{dataset:{value:String(box)}},()=>{});
}
async function upload(rows){
 const parsed=I.parseRows([heading,...rows],Z.validateItem);
 context.XLSX={read:()=>({Sheets:{Content:{'!ref':'A1:S15'}}}),utils:{decode_range:()=>({e:{r:rows.length}}),sheet_to_json:()=>[heading,...rows]}};
 await Z.importFile({name:'lessons.xlsx',size:400,arrayBuffer:async()=>new ArrayBuffer(1)},()=>{});
 return parsed;
}
async function main(){
 assert.equal(I.parseRows([heading,vocab(1,1,1)],Z.validateItem).count,1);
 assert.throws(()=>I.parseRows([heading,vocab(1,11,1)],Z.validateItem),/الصف 2/);
 assert.throws(()=>I.parseRows([heading,['exam',1,1,1,'choice','','','','السؤال','','أ','ب','ج',4,'شرح']],Z.validateItem),/الإجابة الصحيحة/);
 assert.throws(()=>I.parseRows([heading,['listen',1,1,1,'word','hello','']],Z.validateItem),/الصف 2/);
 menu();choose('box',1,1,2);await upload([vocab(1,1,2,'first')]);Z.click('import-apply',{},()=>{});
 assert.equal(Z.getContent(2).vocab[0].en,'first');
 menu();choose('box',1,1,2);await upload([vocab(1,1,2,'second')]);Z.click('import-apply',{},()=>{});
 assert.equal(Z.getContent(2).vocab.length,1,'replace does not append');
 assert.equal(Z.getContent(2).vocab[0].en,'second');
 menu();choose('step',1,1);await upload([vocab(1,1,1)]);Z.click('import-apply',{},()=>{});
 assert.equal(Z.getContent(2).vocab.length,0,'unlisted box is cleared in step');
 assert.equal(Z.getContent(1).vocab.length,1);
 menu();choose('level',2);await upload([vocab(2,1,1)]);Z.click('import-apply',{},()=>{});
 assert.equal(Z.getContent(201).vocab.length,1);
 assert.equal(Z.getContent(1).vocab.length,1,'other level untouched');
 menu();choose('language');await upload([vocab(5,10,20)]);Z.click('import-apply',{},()=>{});
 assert.equal(Z.getContent(1000).vocab.length,1);
 assert.equal(Z.getContent(1).vocab.length,0,'whole language clears unlisted boxes');
 menu();choose('box',1,1,1);await upload([vocab(2,1,1)]);
 assert.match(Z.render({snapshot:{}}),/خارج النطاق/);
 const before=data.get('liplip-zone-content-v1');
 menu();choose('box',5,10,20);await upload([vocab(5,10,20,'third')]);failWrites=true;Z.click('import-apply',{},()=>{});failWrites=false;
 assert.equal(data.get('liplip-zone-content-v1'),before,'failed write rolls back everything');
 assert.equal(Z.getContent(1000).vocab[0].en,'hello');
 console.log('Excel import scopes, validation and rollback passed');
}
main().catch(error=>{console.error(error);process.exitCode=1});
