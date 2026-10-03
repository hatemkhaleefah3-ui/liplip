const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('study-static-media-exams-v120.js','utf8');

const S={boxId:1,phase:'watchRead',process:0,mediaStep:0,item:0,answer:null,revealed:false,feedback:'',results:[],exam:null,loading:false,error:''};
let baseClicks=[];
const Course={
 getContent(){return {watchRead:{
  videoQuestions:[
   {order:2,title:'Second?',answer:'B',option1:'A',option2:'B',option3:'C'},
   {order:1,prompt:'First?',answer:'Yes',options:['No','Yes']}
  ],
  storyQuestions:[{order:1,title:'Who reads?',answer:'Ali',option1:'Sara',option2:'Ali'}]
 }}},
 render(){return '<main class="c57-zone"><div class="c57-zone-grid"><section>nav</section><section class="c57-workspace"><section class="c57-ai-start"><h1>Gemini fresh exam</h1></section></section></div></main>'},
 click(action){baseClicks.push(action);return {base:true}}
};
const listeners={};
const document={
 body:{},
 querySelector(){return null},
 getElementById(){return null},
 addEventListener(type,fn){listeners[type]=fn}
};
const context={console,document,localStorage:{getItem(){return'en'}},requestAnimationFrame(fn){fn()},MutationObserver:class{observe(){}},window:{LiplipCourse:Course,LiplipCourse57:S,LiplipFrontend:{t:(ar,en)=>en,registerFeature(){}},render(){}}};
Object.assign(context.window,{document,localStorage:context.localStorage,requestAnimationFrame:context.requestAnimationFrame,MutationObserver:context.MutationObserver});
context.window.window=context.window;
vm.createContext(context);vm.runInContext(source,context);
const api=context.window.LiplipStaticMediaExams120;

let bank=api.questionBank('video');
assert.equal(bank.length,2);
assert.equal(bank[0].prompt,'First?','bank respects Excel order');
assert.equal(bank[0].correctIndex,1);
assert.equal(bank[1].prompt,'Second?');

Course.click('media-exam',{dataset:{kind:'video'}},{},()=>{});
assert.equal(baseClicks.length,0,'media-exam never reaches legacy Gemini click handler');
assert.equal(S.mediaStep,1);
assert.equal(S.exam.length,2);
let html=Course.render({});
assert.match(html,/EXCEL QUESTION BANK/);
assert.match(html,/Video_Questions/);
assert.match(html,/First\?/);
assert.doesNotMatch(html,/Gemini/i,'Study exam UI contains no Gemini copy');

function click(selectorTarget){listeners.click({target:{closest(sel){return sel===selectorTarget?this:null},dataset:{index:'1'}},preventDefault(){},stopImmediatePropagation(){}})}
click('[data-v120-media-option]');
assert.equal(S.answer,1);
click('[data-v120-media-check]');
assert.equal(S.results[0],true);
assert.equal(S.revealed,true);
click('[data-v120-media-next]');
assert.equal(S.item,1);
assert.equal(S.answer,null);

S.answer=0;click('[data-v120-media-check]');
assert.equal(S.results[1],false);
assert.equal(S.item,1,'wrong answer stays on the same question');
html=Course.render({});
assert.match(html,/Not correct — correct your answer/);

S.process=1;S.mediaStep=0;S.exam=null;S.results=[];S.item=0;S.answer=null;S.revealed=false;
Course.click('media-exam',{dataset:{kind:'story'}},{},()=>{});
assert.equal(S.exam.length,1);
html=Course.render({});
assert.match(html,/Story_Questions/);
assert.match(html,/Who reads\?/);
assert.doesNotMatch(html,/Gemini/i);

assert.doesNotMatch(source,/\/api\/gemini\/course-exam/);
console.log('static Excel video/story exam regression tests passed');
