const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('grammar-journey-v119.js','utf8'),css=fs.readFileSync('grammar-journey-v119.css','utf8');
const S={boxId:1,phase:'grammar',process:0,item:3,answer:'old',revealed:true,feedback:'old',exam:[{}],results:[true],order:['x'],mediaStep:1,loading:true,error:'old'};
const content={grammar:{article:{title:'Present simple',rule:'Use it for routines.',normal:'Subject + verb.',negative:'Subject + do not + verb.',question:'Do + subject + verb?',notes:['Use does with he.'],examples:[{text:'I study every day.'},{text:'Do you study?'}]}}};
const Course={getContent(){return content},render(){return '<main><section class="c57-workspace"><section class="c57-study c57-grammar"><p>old cards</p></section></section></main>'},click(action){return action==='finish-exam'?{progress:{advanced:true}}:{}}};
const context={console,state:{},LiplipCourse:Course,localStorage:{getItem(){return'en'}},document:{getElementById(){return null},body:{},querySelector(){return null}},MutationObserver:class{observe(){}},requestAnimationFrame(fn){fn()},setTimeout(fn){fn()},window:{LiplipCourse:Course,LiplipCourse57:S,LiplipFrontend:{registerFeature(){}}}};
context.window.window=context.window;context.window.document=context.document;context.window.localStorage=context.localStorage;context.window.requestAnimationFrame=context.requestAnimationFrame;context.window.setTimeout=context.setTimeout;
vm.createContext(context);vm.runInContext(source,context,{filename:'grammar-journey-v119.js'});
const html=Course.render({});
assert.match(html,/v119-grammar-article/);assert.match(html,/THE RULE, SIMPLY/);assert.match(html,/FORMULA LAB/);assert.match(html,/Subject \+ do not \+ verb\./);assert.match(html,/Smart notes/);assert.match(html,/I study every day\./);assert.match(html,/Start grammar exam/);assert.doesNotMatch(html,/old cards/);
S.process=1;const result=Course.click('finish-exam',{dataset:{score:'80'}},{},()=>{});
assert.deepEqual(result,{progress:{advanced:true}});assert.equal(S.phase,'watchRead');assert.equal(S.process,0);assert.equal(S.item,0);assert.equal(S.exam,null);assert.equal(S.results.length,0);assert.equal(S.mediaStep,0);
assert.match(css,/\.v119-grammar-article/);assert.match(css,/\.v119-formula-section/);assert.match(css,/\.v119-grammar-exam/);assert.match(css,/\.v119-grammar-result/);assert.match(css,/@media\(max-width:700px\)/);
console.log('grammar-journey-v119 regression tests passed');

