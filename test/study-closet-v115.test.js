const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('study-closet-v115.js','utf8');
const css=fs.readFileSync('study-closet-v115.css','utf8');

function boot({study=true}={}){
  const storage=new Map([['liplip-ui-language','en']]);
  const listeners={};
  const progress={vocabulary:[
    {word:'apple',ar:'تفاحة',boxId:1},
    {word:'book',ar:'كتاب',boxId:1},
    {word:'APPLE',ar:'تفاحة',boxId:2}
  ]};
  const content=new Map(Array.from({length:50},(_,i)=>[i+1,{vocabulary:{items:[{en:`word${i+1}`,ar:`معنى${i+1}`}]}}]));
  const context={
    console,
    setTimeout:fn=>fn(),
    alert(){},
    SpeechSynthesisUtterance:function(text){this.text=text},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
    document:{addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)}},
    state:{page:'app',nav:'الرئيسية',progress},
    closetPage(){return 'old'},
    render(){},
    LiplipProgress:{hydrate:value=>structuredClone(value)},
    LiplipCourse:{
      mapPage:()=>'<article class="v113-stop v113-special v113-review"><span class="v113-node-copy"><em>15 words per box · 20 questions</em></span><span class="v113-node-badge"><b>60</b><small>Q</small></span></article>',
      render:()=>'<main>base</main>',
      click:()=>({base:true}),
      getContent:id=>content.get(id)||{vocabulary:{items:[]}}
    },
    window:{
      LiplipFrontend:{registerFeature(){}},
      LiplipProgression114:{snapshot:()=>({study})}
    }
  };
  context.window.window=context.window;context.window.document=context.document;context.window.render=context.render;
  context.window.LiplipFrontend=context.window.LiplipFrontend;context.window.LiplipProgression114=context.window.LiplipProgression114;
  context.window.localStorage=context.localStorage;context.window.state=context.state;context.window.LiplipProgress=context.LiplipProgress;context.window.LiplipCourse=context.LiplipCourse;
  vm.createContext(context);vm.runInContext(source,context,{filename:'study-closet-v115.js'});
  return {context,storage,api:context.window.LiplipStudyCloset115,milestones:context.window.LiplipStudyMilestones113};
}

{
  const {api}=boot();
  assert.equal(api.passMark('review'),0);
  assert.equal(api.passMark('exam'),70);
  assert.equal(api.passMark('final'),85);
  assert.equal(api.grade(49).key,'bad');
  assert.equal(api.grade(50).key,'good');
  assert.equal(api.grade(60).key,'very-good');
  assert.equal(api.grade(70).key,'excellent');
  assert.equal(api.grade(80).key,'incredible');
  assert.equal(api.grade(90).key,'master');
  assert.equal(api.grade(100).key,'master');
  assert.equal(api.completedWords().length,2,'Closet de-duplicates completed vocabulary only');
}

{
  const {context}=boot({study:false});
  assert.match(context.LiplipCourse.render({}),/Study is locked/);
}

{
  const {context,storage,milestones}=boot();
  const review={dataset:{type:'review',level:'1',after:'4',questions:'20'}};
  context.LiplipCourse.click('v113-open',review,{});
  const reviewHtml=context.LiplipCourse.render({});
  assert.match(reviewHtml,/WORDS-ONLY REVIEW/);
  assert.doesNotMatch(reviewHtml,/Choose an answer/);
  context.LiplipCourse.click('v115-finish-review',{},{});
  const saved=JSON.parse(storage.get('liplip-study-milestones-v113'));
  assert.equal(saved.completed['1:review:4'].score,100);
  assert.equal(milestones.stage,'result');
  assert.match(context.LiplipCourse.render({}),/REVIEW COMPLETE/);
}

{
  const {context,storage,milestones}=boot();
  const exam={dataset:{type:'exam',level:'1',after:'12',questions:'1'}};
  context.LiplipCourse.click('v113-open',exam,{});
  milestones.results=[false];milestones.revealed=true;milestones.item=0;
  context.LiplipCourse.click('v113-next',{},{});
  assert.equal(JSON.parse(storage.get('liplip-study-milestones-v113')||'{"completed":{}}').completed?.['1:exam:12'],undefined,'failed exam stays incomplete');
  assert.match(context.LiplipCourse.render({}),/PASS MARK 70%/);

  context.LiplipCourse.click('v113-retry',{},{});
  milestones.results=[true];milestones.revealed=true;milestones.item=0;
  context.LiplipCourse.click('v113-next',{},{});
  assert.equal(JSON.parse(storage.get('liplip-study-milestones-v113')).completed['1:exam:12'].score,100);
}

{
  const {context}=boot();
  const map=context.LiplipCourse.mapPage({});
  assert.match(map,/review without questions/);
  assert.match(map,/60<\/b><small>WORDS/);
}

assert.match(css,/\.v115-word-grid/);
assert.match(css,/\.v115-result\.master/);
assert.match(css,/@media\(max-width:760px\)/);
console.log('study-closet-v115 regression tests passed');
