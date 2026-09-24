const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const data=new Map(),spoken=[];
const images=[1,2,3,4].map(i=>'https://liplip.pages.dev/images/test-'+i+'.svg');
const box={
  vocab:[{id:'v-img',type:'imageWord',en:'book',ar:'كتاب',example:'This is a book.',image:images[0]}],
  checkpointVocab:[
    {id:'q-word-images',type:'wordImageChoice',answer:'book',images,correct:0,explanation:'Book matches the first image.'},
    {id:'q-match',type:'imageMatch',options:['book','pen','bag','car'],images,explanation:'Match each word to its image.'},
    {id:'q-image-words',type:'imageChoice',prompt:'What is this?',image:images[0],options:['book','pen','bag','car'],correct:0,explanation:'It is a book.'}
  ],
  listen:[{id:'l-img',type:'imageWord',en:'book',ar:'كتاب',image:images[0]}],
  checkpointListen:[],
  grammar:[{id:'g-img',type:'imageChoice',prompt:'Choose the word.',image:images[1],options:['book','pen','bag','car'],correct:1,explanation:'The image shows a pen.'}],
  exam:[]
};
data.set('liplip-zone-content-v1',JSON.stringify({1:box}));
class FormDataMock{
  constructor(form){this.fields=form?.fields||{}}
  get(name){return Object.prototype.hasOwnProperty.call(this.fields,name)?this.fields[name]:null}
  has(name){return Object.prototype.hasOwnProperty.call(this.fields,name)}
}
const ctx={
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  window:{speechSynthesis:{cancel(){},speak:u=>spoken.push(u.text)}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  FormData:FormDataMock,URL,Date,Number,Object,Math,Set,Map,document:{getElementById(){return null}}
};
vm.createContext(ctx);
for(const file of ['progress.js','content.js','zone.js','import.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
vm.runInContext('this.Z=LiplipZone;this.I=LiplipImporter;',ctx);
const {Z,I}=ctx;
assert.ok(Z.TYPES.checkpointVocab.some(([type])=>type==='wordImageChoice'));
assert.ok(Z.TYPES.checkpointListen.some(([type])=>type==='imageMatch'));
assert.ok(Z.TYPES.grammar.some(([type])=>type==='imageChoice'));
assert.ok(Z.TYPES.exam.some(([type])=>type==='wordImageChoice'));
assert.doesNotThrow(()=>Z.validateItem('checkpointVocab',{type:'imageChoice',prompt:'legacy',image:images[0],options:['a','b','c'],correct:0,explanation:'legacy remains valid'}));
assert.throws(()=>Z.validateItem('checkpointVocab',{type:'wordImageChoice',answer:'book',images:images.slice(0,3),correct:0,explanation:'x'}),/أربع صور/);

const extended=Array.from(I.EXTENDED_HEADERS);
const matchRow=Array(24).fill('');
matchRow[0]='checkpointVocab';matchRow[1]=matchRow[2]=matchRow[3]=1;matchRow[4]='imageMatch';
matchRow[5]=images[0];matchRow[11]='book';matchRow[12]='pen';matchRow[13]='bag';matchRow[15]='Match each image.';matchRow[20]='car';matchRow[21]=images[1];matchRow[22]=images[2];matchRow[23]=images[3];
const imported=I.parseRows([extended,matchRow],Z.validateItem);
assert.equal(imported.count,1,'extended image schema imports');
assert.deepEqual(Array.from(imported.boxes.get(1).checkpointVocab[0].options),['book','pen','bag','car']);
assert.equal(imported.boxes.get(1).checkpointVocab[0].images.length,4);

Z.start(1);
let html=Z.render({snapshot:{level:'A0'}});
assert.doesNotMatch(html,/status-strip/,'active study status section is removed');
assert.match(html,/zone-image-word-card/);
assert.match(html,/>book</);
assert.match(html,/>كتاب</,'vocab image item shows Arabic');
assert.match(html,/استمع مجدداً/);
Z.afterRender();Z.afterRender();
assert.deepEqual(spoken,['book'],'vocab image word autoplays once');

Z.click('next',{dataset:{}},()=>{});
html=Z.render({snapshot:{}});
assert.match(html,/zone-word-image-question/,'word to four images question renders');
assert.equal((html.match(/class="zone-image-option"/g)||[]).length,4);
assert.match(html,/zone-image-match-question/,'four words to four images matching renders');
assert.match(html,/zone-image-words-question/,'image to four words renders');
assert.equal((html.match(/zone-image-word-options/g)||[]).length,1);

const result=Z.submit('zone-quiz-form',{fields:{
  'q-word-images':'0',
  'q-match:0':'0','q-match:1':'1','q-match:2':'2','q-match:3':'3',
  'q-image-words':'0'
}},()=>{});
assert.deepEqual(result,{});
html=Z.render({snapshot:{}});
assert.match(html,/zone-listen-image-card/,'listen image item has dedicated image-only design');
assert.doesNotMatch(html,/zone-pronounce-word/,'listen image item hides English/Arabic text');
assert.match(html,/>اسمع</);
assert.match(html,/>تكلّم</);
assert.doesNotMatch(html,/>book</,'listen image item does not expose the word');

data.set('liplip-zone-state-v1',JSON.stringify({boxId:1,phase:4,card:0,flipped:false,reviewed:[],spoken:{},imageSpoken:{},answers:{},attempts:{},feedback:'',revision:0}));
Z.start(1);
html=Z.render({snapshot:{}});
assert.match(html,/zone-image-words-question/,'grammar process supports redesigned image questions');
assert.doesNotMatch(html,/status-strip/);

console.log('Unified image content system and status-strip removal passed');
