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
const heading=[...I.HEADERS.slice(0,5),...I.HEADERS.slice(6),'Image link'];
const vocab=(stage,step,box,en='hello')=>['vocab',stage,step,box,'word',en,'مرحباً','Hello, I am Ali.'];
function menu(box=1){Z.start(box);Z.click('control',{},()=>{});assert.match(Z.render({snapshot:{}}),/id="zone-import-file"/);assert.doesNotMatch(Z.render({snapshot:{}}),/data-zone="import-scope"/)}
async function upload(rows){
 const parsed=I.parseRows([heading,...rows],Z.validateItem);
 I.read=async()=>parsed;
 await Z.importFile({name:'lessons.xlsx',size:400,arrayBuffer:async()=>new ArrayBuffer(1)},()=>{});
 return parsed;
}
async function main(){
 assert.equal(I.parseRows([heading,vocab(1,1,1)],Z.validateItem).count,1);
 const sparseImageRow=['vocab',1,1,1,'imageWord','https://liplip.pages.dev/images/placeholder.svg','pen','قلم','The pen is here.'];
 const sparseImage=I.parseRows([I.HEADERS,sparseImageRow],Z.validateItem);
 assert.equal(sparseImage.count,1,'sparse image-first row imports');
 assert.equal(sparseImage.boxes.get(1).vocab[0].image,'https://liplip.pages.dev/images/placeholder.svg','image URL remains mapped to Image link');
 assert.equal(sparseImage.boxes.get(1).vocab[0].en,'pen');
 const courseRow=values=>I.HEADERS.map(header=>values[header]??'');
 const course=I.parseRows([
  I.HEADERS,
  courseRow({'Item process':'checkpointVocab','Item level':1,'Item step':1,'Item box':1,'Item type':'write','Prompt':"Write the English word for 'سيارة'.",'Explanation':'The translation is car.','Answer':'car'}),
  courseRow({'Item process':'checkpointVocab','Item level':1,'Item step':1,'Item box':1,'Item type':'speak','Prompt':"Say the word 'house'.",'Explanation':'Pronounce house clearly.','Answer':'house'}),
  courseRow({'Item process':'grammar','Item level':1,'Item step':1,'Item box':1,'Item type':'sentenceRule','Title':'Present Simple','Formula':'Subject + Verb(s/es)','Body':'اقرأ وتدرب على القاعدة.'}),
  courseRow({'Item process':'grammar','Item level':1,'Item step':1,'Item box':1,'Item type':'note','Body':'Use for habits and general truths.'}),
  courseRow({'Item process':'checkpointGrammar','Item level':1,'Item step':1,'Item box':1,'Item type':'choice','Prompt':'Select the correct form:','Option 1':'A','Option 2':'B','Option 3':'C','Correct option':1,'Explanation':'Correct form used.'})
 ],Z.validateItem);
 assert.equal(course.count,5,'course workbook compatibility rows parse');
 assert.equal(course.boxes.get(1).checkpointVocab.length,2);
 assert.equal(course.boxes.get(1).checkpointVocab[1].type,'speak');
 assert.equal(course.boxes.get(1).grammar.length,3,'checkpointGrammar is folded into the grammar phase');
 assert.equal(course.boxes.get(1).grammar.at(-1).type,'choice');
 assert.throws(()=>I.parseRows([heading,vocab(1,11,1)],Z.validateItem),/الصف 2/);
 assert.throws(()=>I.parseRows([heading,['exam',1,1,1,'choice','','','','السؤال','','أ','ب','ج',4,'شرح']],Z.validateItem),/الإجابة الصحيحة/);
 assert.throws(()=>I.parseRows([heading,['listen',1,1,1,'word','hello','']],Z.validateItem),/الصف 2/);
 menu(2);await upload([vocab(1,1,1,'first')]);
 assert.match(Z.render({snapshot:{}}),/المستوى 1، الخطوة 1، الصندوق 1/);
 assert.equal(Z.getContent(1).vocab.length,6,'existing seeded vocabulary stays');
 assert.equal(Z.getContent(1).vocab.at(-1).en,'first');
 assert.equal(Z.getContent(2).vocab.length,5,'unlisted box content stays intact');
 Z.click('view-imported',{},()=>{});assert.match(Z.render({snapshot:{}}),/first/,'success link opens a readable preview of the imported box');
 assert.match(Z.render({snapshot:{}}),/معاينة صندوق التعلّم/);
 assert.match(Z.render({snapshot:{}}),/الصندوق الجاري في دراستك هو 2/);
 Z.click('close-preview',{},()=>{});assert.doesNotMatch(Z.render({snapshot:{}}),/معاينة صندوق التعلّم/);
 menu();await upload([vocab(1,1,1,'second'),vocab(2,1,1,'third')]);
 assert.equal(Z.getContent(1).vocab.length,7,'second import only adds to listed box');
 assert.equal(Z.getContent(1).vocab.at(-1).en,'second');
 assert.equal(Z.getContent(201).vocab[0].en,'third');
 assert.equal(Z.getContent(2).vocab.length,5,'unlisted box still intact');
 menu(6);await upload([vocab(1,1,1,'second'),vocab(2,1,1,'third')]);
 assert.match(Z.render({snapshot:{}}),/الدرس المفتوح الآن هو الصندوق 6، والملف يشير إلى الصندوق 1/);
 assert.match(Z.render({snapshot:{}}),/2 عنصر موجود مسبقاً لم يُكرّر/);
 assert.match(Z.render({snapshot:{}}),/المحتوى موجود بالفعل/);
 Z.click('view-imported',{},()=>{});assert.match(Z.render({snapshot:{}}),/second/);
 Z.click('close-preview',{},()=>{});assert.match(Z.render({snapshot:{}}),/هذا الجزء ينتظر بطاقاتك/,'returning to active box does not silently switch lessons');
 Z.click('control',{},()=>{});assert.match(Z.render({snapshot:{}}),/صناديق محفوظة في هذا المتصفح/,'saved-box navigation remains available later');
 assert.equal(Z.getContent(1).vocab.length,7,'repeated import stays idempotent');
 assert.equal(Z.getContent(201).vocab.length,1);
 const before=data.get('liplip-zone-content-v1');
 menu();failWrites=true;await upload([vocab(1,1,1,'fourth')]);failWrites=false;
 assert.match(Z.render({snapshot:{}}),/لم يُضف أي عنصر/);
 assert.equal(data.get('liplip-zone-content-v1'),before,'failed write rolls back everything');
 assert.equal(Z.getContent(1).vocab.at(-1).en,'second');
 menu();I.read=async()=>{throw Error('broken workbook')};await Z.importFile({name:'bad.xlsx'},()=>{});
 assert.match(Z.render({snapshot:{}}),/broken workbook/,'read failure is displayed in sheet');
 const fullBox=Array.from({length:20},(_,index)=>[vocab(1,1,10,`term${index}`),['vocab',1,1,10,'sentence',`I see term${index}.`,'أرى كلمة.','I see a word.'],['listen',1,1,10,'word',`term${index}`,'كلمة'],['listen',1,1,10,'sentence',`I see term${index}.`,'أرى كلمة.']]).flat();
 menu(10);await upload(fullBox);
 assert.equal(Z.getContent(10).vocab.length,40,'20 words and 20 sentences fit when supplied in the workbook');
 assert.equal(Z.getContent(10).listen.length,40);
 assert.throws(()=>I.parseRows([heading,...Array.from({length:61},(_,i)=>vocab(1,1,11,`extra${i}`))],Z.validateItem),/60/);
 console.log('Direct Excel import, additive merge, repeat dedupe, result visibility and rollback passed');
}
main().catch(error=>{console.error(error);process.exitCode=1});
