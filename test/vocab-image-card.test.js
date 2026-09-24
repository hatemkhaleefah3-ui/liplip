const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const data=new Map(),spoken=[];
const ctx={
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  window:{speechSynthesis:{cancel(){},speak:u=>spoken.push(u.text)}},
  SpeechSynthesisUtterance:class{constructor(text){this.text=text}},
  URL,Date,Number,Object,Math,Set,Map
};
vm.createContext(ctx);
for(const file of ['progress.js','content.js','zone.js','import.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
vm.runInContext('this.Z=LiplipZone;this.I=LiplipImporter;',ctx);
const {Z,I}=ctx;
const row=(box,type,en,ar,example,image='')=>{
  const cells=Array(I.HEADERS.length).fill('');
  cells[0]='vocab';cells[1]=1;cells[2]=1;cells[3]=box;cells[4]=type;cells[5]=image;cells[6]=en;cells[7]=ar;cells[8]=example;
  return cells;
};
async function main(){
  const parsed=I.parseRows([
    I.HEADERS,
    row(10,'imageWord','book','كتاب','This book is new.','https://liplip.pages.dev/images/book.svg'),
    row(11,'sentence','I read a book.','أنا أقرأ كتاباً.','I read a book.')
  ],Z.validateItem);
  I.read=async()=>parsed;

  Z.start(10);
  await Z.importFile({name:'vocab.xlsx',size:500,arrayBuffer:async()=>new ArrayBuffer(1)},()=>{});
  Z.start(10);

  let html=Z.render({snapshot:{}});
  assert.match(html,/zone-image-word-card/,'imageWord gets its own card');
  assert.match(html,/zone-image-word-media/);
  assert.match(html,/src="https:\/\/liplip\.pages\.dev\/images\/book\.svg"/);
  assert.match(html,/>book</);
  assert.match(html,/data-zone="replay-word"/,'image card has replay audio');
  assert.doesNotMatch(html,/data-zone="flip"/,'image card is not a flip card');
  assert.match(html,/data-zone="next" class="zone-primary"/);
  assert.doesNotMatch(html,/data-zone="next" class="zone-primary" disabled/,'image card Next is immediately enabled');

  Z.afterRender();
  Z.afterRender();
  assert.deepEqual(spoken,['book'],'image word auto-pronounces once for the current card');
  Z.click('replay-word',{dataset:{}},()=>{});
  assert.deepEqual(spoken,['book','book'],'replay button pronounces the word again');

  Z.click('next',{dataset:{}},()=>{});
  assert.match(Z.render({snapshot:{}}),/هل استقرّت الكلمات/,'image word advances without flip or confirmation');

  const spokenBeforeSentence=spoken.length;
  Z.start(11);
  html=Z.render({snapshot:{}});
  assert.match(html,/zone-sentence/);
  assert.match(html,/data-zone="next" class="zone-primary"/);
  assert.doesNotMatch(html,/data-zone="next" class="zone-primary" disabled/,'sentence Next is immediately enabled');
  Z.afterRender();
  assert.equal(spoken.length,spokenBeforeSentence,'sentence does not trigger word autoplay');
  Z.click('next',{dataset:{}},()=>{});
  assert.match(Z.render({snapshot:{}}),/هل استقرّت الكلمات/,'sentence advances without flip or confirmation');

  console.log('Dedicated image vocabulary card, autoplay/replay, and ungated image/sentence navigation passed');
}
main().catch(error=>{console.error(error);process.exitCode=1});
