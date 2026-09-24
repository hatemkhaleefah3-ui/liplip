const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');

const data=new Map();
const examples=Array.from({length:8},(_,i)=>({
  id:'ex'+(i+1),type:'example',
  en:[
    'I can swim.','Sara can read.','Ali is ready.','The books are here.',
    'I was tired.','They were late.','We can study.','My brother is at home.'
  ][i],
  ar:[
    'أنا أستطيع السباحة.','سارة تستطيع القراءة.','علي مستعد.','الكتب هنا.',
    'كنت متعباً.','كانوا متأخرين.','نحن نستطيع الدراسة.','أخي في المنزل.'
  ][i],
  body:'قارن ترتيب الكلمات بالقاعدة.'
}));
const questions=Array.from({length:5},(_,i)=>({
  id:'q'+(i+1),type:'choice',
  prompt:'اختر الجملة الصحيحة '+(i+1),
  options:['Can you swim?','You can swim?','Can swim you?'],
  correct:0,
  explanation:'للسؤال بـ can نضع can قبل الفاعل.'
}));
const grammar=[
  {
    id:'normal',type:'sentenceRule',title:'قانون الجملة العادية',
    formula:'Subject + can + base verb + complement',
    ar:'ضع الفاعل أولاً، ثم can، ثم الفعل بصيغته الأساسية، ثم التكملة.',
    en:'Put the subject first, then can, then the base verb, then the complement.',
    example:'I can swim.'
  },
  {
    id:'question',type:'questionRule',title:'قاعدة تكوين السؤال',
    formula:'Can + subject + base verb + complement?',
    ar:'قم بإضافة الفعل المساعد can في بداية الجملة لعمل سؤال.',
    en:'Move can to the beginning of the sentence to make a question.',
    example:'Can you swim?'
  },
  {
    id:'negative',type:'negativeRule',title:'قاعدة تكوين الجملة المنفية',
    formula:'Subject + cannot / can not + base verb + complement',
    ar:'قم بإضافة not بعد can لعمل جملة منفية.',
    en:'Add not after can to make the sentence negative.',
    example:'I cannot swim.'
  },
  {
    id:'subject',type:'subjectGuide',title:'دليل الفاعل والفعل المساعد',
    ar:'اختر صيغة be حسب الفاعل.',
    en:'Choose the form of be according to the subject.',
    body:'I → am / was\nHe / She / It → is / was\nYou / We / They → are / were'
  },
  {
    id:'agreement',type:'agreementGuide',title:'دليل المفرد والجمع والفاعل المركب',
    ar:'الفاعل المفرد يأخذ الصيغة المفردة، والفاعل الجمع أو المركب يأخذ الصيغة الجمع.',
    en:'A singular subject takes the singular form; plural or compound subjects take the plural form.',
    body:'Singular noun → is / was\nPlural noun → are / were\nAli and Sara → are / were'
  },
  {
    id:'note',type:'note',title:'ترتيب الكلمات',
    ar:'لا تغيّر ترتيب الفاعل والفعل من دون سبب نحوي.',
    en:'Do not change subject and verb order without a grammatical reason.'
  },
  {
    id:'exception',type:'exceptionNote',title:'حالة خاصة',
    ar:'في المضارع البسيط قد يظهر do في السؤال والنفي رغم أنه غير موجود في الجملة المثبتة.',
    en:'In the present simple, do may appear in questions and negatives even though it is absent from the affirmative sentence.',
    body:'You work here. → Do you work here? → You do not work here.'
  },
  ...examples,
  ...questions
];

const box={vocab:[],checkpointVocab:[],listen:[],checkpointListen:[],grammar,exam:[]};
data.set('liplip-zone-content-v1',JSON.stringify({1:box}));
data.set('liplip-zone-state-v1',JSON.stringify({
  boxId:1,phase:4,card:0,flipped:false,reviewed:[],spoken:{},imageSpoken:{},
  answers:{},attempts:{},feedback:'',revision:0
}));

class FormDataMock{
  constructor(form){this.fields=form?.fields||{}}
  get(name){return Object.prototype.hasOwnProperty.call(this.fields,name)?this.fields[name]:null}
  has(name){return Object.prototype.hasOwnProperty.call(this.fields,name)}
}
const ctx={
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  window:{speechSynthesis:{cancel(){},speak(){}}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  FormData:FormDataMock,URL,Date,Number,Object,Math,Set,Map,document:{getElementById(){return null}}
};
vm.createContext(ctx);
for(const file of ['progress.js','content.js','zone.js','import.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
vm.runInContext('this.Z=LiplipZone;this.I=LiplipImporter;',ctx);
const {Z,I}=ctx;

assert.ok(Z.TYPES.grammar.some(([type])=>type==='negativeRule'));
assert.ok(Z.TYPES.grammar.some(([type])=>type==='subjectGuide'));
assert.ok(Z.TYPES.grammar.some(([type])=>type==='agreementGuide'));
assert.ok(Z.TYPES.grammar.some(([type])=>type==='exceptionNote'));
assert.doesNotThrow(()=>Z.validateItem('grammar',{type:'addition',title:'Legacy',body:'Old content stays loadable.'}));

Z.start(1);
let html=Z.render({snapshot:{}});
assert.match(html,/مختبر القواعد/);
assert.match(html,/قانون تكوين الجملة العادية/);
assert.match(html,/قم بإضافة الفعل المساعد can في بداية الجملة لعمل سؤال/);
assert.doesNotMatch(html,/Move can to the beginning of the sentence to make a question/,'grammar teaching explanation is Arabic-first');
assert.match(html,/قم بإضافة not بعد can لعمل جملة منفية/);
assert.match(html,/zone-grammar-guide subjectGuide/);
assert.match(html,/zone-grammar-guide agreementGuide/);
assert.match(html,/I → am \/ was/);
assert.match(html,/Ali and Sara → are \/ were/);
assert.match(html,/zone-grammar-note exception/);
assert.match(html,/8 \/ الهدف 8–10/);
assert.match(html,/5 \/ الهدف 5–8/);
assert.equal((html.match(/class="zone-grammar-example"/g)||[]).length,8);
assert.equal((html.match(/class="zone-question /g)||[]).length,5);

const fields=Object.fromEntries(questions.map(q=>[q.id,'0']));
const result=Z.submit('zone-quiz-form',{fields},()=>{});
assert.deepEqual(result,{});
html=Z.render({snapshot:{}});
assert.match(html,/أثبت ما تعلّمته/,'five correct grammar questions advance to exam');

// New grammar types import through the existing English/Arabic/Formula/Body columns.
const row=values=>I.HEADERS.map(h=>values[h]??'');
const imported=I.parseRows([
  I.HEADERS,
  row({'Item process':'grammar','Item level':1,'Item step':1,'Item box':2,'Item type':'negativeRule','English':'Add not after can.','Arabic':'أضف not بعد can.','Formula':'Subject + can + not + verb','Example':'I cannot swim.','Title':'Negative'}),
  row({'Item process':'grammar','Item level':1,'Item step':1,'Item box':2,'Item type':'subjectGuide','Arabic':'اختر be حسب الفاعل.','Body':'I → am / was\nHe / She / It → is / was','Title':'دليل الفاعل'})
],Z.validateItem);
assert.equal(imported.count,2);
assert.equal(imported.boxes.get(2).grammar[0].type,'negativeRule');
assert.equal(imported.boxes.get(2).grammar[1].type,'subjectGuide');

console.log('Arabic-first grammar law/rules/guides/notes/examples/questions passed');
