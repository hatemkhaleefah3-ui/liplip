const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('grammar-exam-flow-v120.js','utf8'),css=fs.readFileSync('grammar-exam-flow-v120.css','utf8');
function boot(){
 const inputs=new Map(),S={boxId:1,phase:'grammar',process:1,item:0,answer:null,revealed:false,feedback:'',results:[],_v95Order:[],exam:[{kind:'grammar-v95',type:'fill_blank',title:'I ___ here.',answer:'study'},{kind:'grammar-v95',type:'reorder',title:'we|are|ready',answer:'we are ready'},{kind:'grammar-v95',type:'correct_error',title:'I are ready.',answer:'I am ready.'}]};
 const Course={render(){return'<main></main>'},click(){return{}}},context={console,LiplipCourse:Course,localStorage:{getItem(){return'en'}},requestAnimationFrame(fn){fn()},setTimeout(fn){fn()},MutationObserver:class{observe(){}},document:{body:{},getElementById(id){return inputs.get(id)||null},querySelector(){return null},addEventListener(){}},window:{LiplipFrontend:{registerFeature(){}},LiplipCourse:Course,LiplipCourse57:S,render(){}}};
 context.window.window=context.window;context.window.document=context.document;context.window.localStorage=context.localStorage;context.window.requestAnimationFrame=context.requestAnimationFrame;context.window.setTimeout=context.setTimeout;vm.createContext(context);vm.runInContext(source,context);return{S,api:context.window.LiplipGrammarExam120,inputs};
}
const {S,api,inputs}=boot();
S.answer='wrong';api.submitCurrent();assert.equal(S.item,0);assert.equal(S.revealed,true);assert.equal(S.results[0],false);assert.match(S.feedback,/flagged/);
S.answer='study';api.submitCurrent();assert.equal(S.item,1,'correct answer advances immediately');assert.equal(S.results[0],true);assert.equal(S.answer,null);
S._v95Order=[0,1,2];api.submitCurrent();assert.equal(S.item,2);assert.equal(S.results[1],true);
inputs.set('v95-answer',{value:'I am ready.'});api.submitCurrent();assert.equal(S._v120Result,true,'final correct answer opens result directly');assert.equal(S.answer,'I am ready.','final answer is preserved and never replaced by a summary sentinel');assert.doesNotMatch(S.answer,/summary/);const result=api.resultMarkup();assert.match(result,/Done · Start Watch & Read/);assert.match(result,/data-course="finish-exam"/);
assert.match(css,/\.v120-next/);assert.match(css,/\.v120-selected/);assert.match(css,/\.v120-flag/);assert.match(css,/\.v120-grammar-result/);
console.log('grammar-exam-flow-v120 regression tests passed');

