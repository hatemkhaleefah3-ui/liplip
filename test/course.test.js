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
const prefixedRoot={getElementsByTagNameNS:(ns,name)=>name==='row'?['prefixed-row']:[],getElementsByTagName:()=>[]};
assert.deepEqual([...C.xmlNodes(prefixedRoot,'row')],['prefixed-row']);
const prefixedCell={getAttribute:()=> 'str',getElementsByTagNameNS:(ns,name)=>name==='v'?[{textContent:'vocabulary'}]:[],getElementsByTagName:()=>[]};
assert.equal(C.cellText(prefixedCell,[]),'vocabulary');

assert.deepEqual({...P.courseLocation(1)},{level:1,box:1});
assert.deepEqual({...P.courseLocation(200)},{level:1,box:200});
assert.deepEqual({...P.courseLocation(201)},{level:2,box:1});
for(const headers of Object.values(C.HEADERS)){
  assert.deepEqual([...headers.slice(0,3)],['Phase','Level','Box']);
  assert.equal(headers.includes('Step'),false);
  assert.equal(headers.includes('Process'),true);
  assert.equal(headers.includes('Feature'),true);
  assert.equal(headers.includes('Question Type'),true);
}
assert.deepEqual([...C.QUESTION_TYPES],['mcq','fillBlank','voiceToSpeak','imageToVoice','match','trueFalse']);
const phaseRows=Object.fromEntries(['vocabulary','grammar','watchRead'].map(phase=>[phase,C.templateRows(phase)]));
assert.ok(phaseRows.vocabulary.length>=29);
assert.ok(phaseRows.grammar.length>=31);
assert.ok(phaseRows.watchRead.length>=19);
const vocabSamples=[
  {type:'flashcardWord',en:'hello',ar:'مرحباً',voice:'hello'},
  {type:'flashcardSentence',en:'Hello there.',ar:'مرحباً.',voice:'Hello there.'},
  {type:'imageToWord',en:'apple',ar:'تفاحة',image:'https://example.com/apple.jpg',voice:'apple'},
  {type:'voiceToSpeak',en:'How are you?',voice:'How are you?'},
  {type:'imageToSpeak',en:'cat',ar:'قطة',image:'https://example.com/cat.jpg',voice:'cat'}
];
const vocabDeck=C.vocabularyDeck(vocabSamples);
for(const type of ['flashcardWord','flashcardSentence','imageToWord','voiceToSpeak','imageToSpeak']){
  assert.match(vocabDeck,new RegExp('data-vocab-group="'+type+'"'));
  assert.match(vocabDeck,new RegExp('data-vocab-type="'+type+'"'));
}
assert.match(C.itemCard(vocabSamples[0],0),/vocab-flip-card/);
assert.match(C.itemCard(vocabSamples[0],0),/data-course="vocab-flip"/);
C.click('vocab-flip',{dataset:{index:'0'}},P.hydrate(null));
assert.match(C.itemCard(vocabSamples[0],0),/is-flipped/);
C.click('vocab-flip',{dataset:{index:'0'}},P.hydrate(null));
assert.doesNotMatch(C.itemCard(vocabSamples[0],0),/is-flipped/);
assert.match(C.itemCard(vocabSamples[3],3),/vocab-speak-steps/);
assert.match(C.itemCard(vocabSamples[3],3),/data-course="mic-start"/);
assert.match(C.itemCard(vocabSamples[4],4),/ماذا ترى/);
assert.match(C.itemCard(vocabSamples[4],4),/data-course="mic-start"/);
assert.match(C.playerNav(0,3),/data-course="item-next"/);
assert.match(C.playerNav(2,3,{submitLabel:'Finish'}),/type="submit"/);
assert.equal(C.grammarItems({laws:[{title:'Law'}],notes:['Note'],examples:[{text:'Example'}]}).length,3);
for(const feature of ['flashcardWord','flashcardSentence','imageToWord','voiceToSpeak','imageToSpeak'])assert.ok(phaseRows.vocabulary.some(row=>row[C.HEADERS.vocabulary.indexOf('Feature')]===feature));
for(const feature of ['sentenceBuildLaw','importantNote','example'])assert.ok(phaseRows.grammar.some(row=>row[C.HEADERS.grammar.indexOf('Feature')]===feature));
for(const [phase,rows] of Object.entries(phaseRows)){
  const header=C.HEADERS[phase],index=header.indexOf('Question Type'),types=new Set(rows.slice(1).map(row=>row[index]).filter(Boolean));
  for(const type of C.QUESTION_TYPES)assert.ok(types.has(type),phase+' template is missing '+type);
}
const answers=new Map([['q0','0'],['q1','study'],['q2','How are you today?'],['q3','apple'],['q4:0','0'],['q4:1','1'],['q4:2','2'],['q4:3','3'],['q5','0']]);
const form={get:key=>answers.get(key)??null};
const sampleQuestions=[
  {type:'mcq',options:['yes','no'],correct:0},{type:'fillBlank',answer:'study'},{type:'voiceToSpeak',answer:'How are you today?'},
  {type:'imageToVoice',answer:'apple'},{type:'match',matches:[1,2,3,4].map((_,i)=>({left:String(i),right:String(i)}))},{type:'trueFalse',options:['True','False'],correct:0}
];
assert.equal(C.grade(sampleQuestions,form),100);
const questionCard=C.questions([{type:'mcq',prompt:'Choose one',options:['A','B'],correct:0}],'q');
assert.match(questionCard,/course-question-title/);
assert.match(questionCard,/<h2>Choose one<\/h2>/);
assert.doesNotMatch(questionCard,/<legend>/);

let p=P.hydrate(null);
assert.equal(P.courseSnapshot(p).currentBox,1);
const order=[['vocabulary','content'],['vocabulary','exam'],['grammar','article'],['grammar','exam'],['watchRead','video'],['watchRead','story']];
assert.throws(()=>P.recordCourseProcess(p,{boxId:1,phase:'grammar',process:'article',score:100}),/order/);
const scores=[100,90,100,75,80,100];
order.forEach(([phase,process],i)=>{p=P.recordCourseProcess(p,{boxId:1,phase,process,score:scores[i],words:[],grammar:[]})});
let snap=P.courseSnapshot(p);
assert.equal(snap.currentBox,2);
assert.deepEqual([...snap.completedBoxes],[1]);
assert.deepEqual([...snap.records[0].completedPhases],['vocabulary','grammar','watchRead']);
C.start(1,p,{review:true});C.afterProgress(p);
const result=C.render(p);
assert.match(result,/>85%<\/strong>/,'box score gives one third to each phase and averages video/story');
assert.equal((result.match(/33\.333%/g)||[]).length,3);
assert.match(result,/data-course="result-close"/);
assert.match(result,/data-course="result-next"/);
assert.match(result,/data-course="result-repeat"/);

let legacy=P.hydrate({completedBoxes:[1],receptionBoxes:[{boxId:1,completed:['watch','watchExam','read','readExam'],scores:{watchExam:80,readExam:85}}]});
assert.deepEqual([...P.courseSnapshot(legacy).completedBoxes],[1]);

const initial=C.mapPage(P.hydrate(null));
assert.match(initial,/data-course="level"/);
assert.match(initial,/course-control-fab/);
assert.doesNotMatch(initial,/course-map-title|اختر المستوى/);
C.click('manager-open',{dataset:{}},P.hydrate(null));
assert.match(C.mapPage(P.hydrate(null)),/إضافة محتوى/);
assert.match(C.mapPage(P.hydrate(null)),/تعديل المحتوى/);
assert.doesNotMatch(initial,/الصندوق الحالي/);
C.click('level',{dataset:{level:'1'}},P.hydrate(null));
const boxes=C.mapPage(P.hydrate(null));
assert.equal((boxes.match(/class="course-box /g)||[]).length,200);
assert.doesNotMatch(boxes,/data-study-step/);

const source=fs.readFileSync(path.join(root,'course.js'),'utf8');
assert.match(source,/Phase = \$\{PHASE_VALUE\[p\.key\]\}/);
assert.doesNotMatch(source,/\['Phase','Level','Step'/);
assert.match(source,/liplip-content-templates\.zip/);
assert.match(source,/bundle\.file\(PHASE_FILE\[p\.key\]/);
assert.match(source,/getElementsByTagNameNS/);
assert.match(source,/getUserMedia\(\{audio:true\}\)/);
assert.match(source,/SpeechRecognition\|\|window\.webkitSpeechRecognition/);
assert.match(source,/watch-exam-player/);
assert.match(source,/story-page-player/);
assert.match(source,/story-exam-player/);
C.start(1,P.hydrate(null));
assert.doesNotMatch(C.render(P.hydrate(null)),/data-course="control"|course-control-fab/);
console.log('Unified course geometry, progress, migration, map, and Excel schemas passed');
