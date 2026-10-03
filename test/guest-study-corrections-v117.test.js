const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class StorageMock {
  constructor(seed={}) { this.data = new Map(Object.entries(seed)); }
  getItem(k) { return this.data.has(String(k)) ? this.data.get(String(k)) : null; }
  setItem(k,v) { this.data.set(String(k),String(v)); }
  removeItem(k) { this.data.delete(String(k)); }
}
const localStorage = new StorageMock({'liplip-progress-v1':'REGISTERED_PROGRESS','liplip-ui-language':'en'});
const sessionStorage = new StorageMock();
const listeners = {};
const state57 = {boxId:1,phase:'vocabulary',process:1,item:0,revealed:false,answer:null,feedback:'',results:[]};
const milestone = {active:null,item:0,revealed:false,results:[]};
const Course = {
  render(){return milestone.active
    ? '<section><div class="v113-answer-feedback wrong"><strong>Wrong</strong></div><button data-course="v113-next">Next</button></section>'
    : '<section><article>Question</article><nav class="c57-question-next"><button data-course="exam-next">Next</button></nav></section>'},
  click(action){ if(action==='grade-wrong'){state57.results[0]=false;state57.revealed=true} return {action}; }
};
const fresh = {vocabulary:[],course:{currentBox:1,completedBoxes:[]}};
const document = {addEventListener(type,fn){listeners[`document:${type}`]=fn},querySelector(){return null}};
const window = {
  LiplipFrontend:{registerFeature(){}},LiplipCourse:Course,LiplipCourse57:state57,LiplipStudyMilestones113:milestone,
  addEventListener(type,fn){listeners[`window:${type}`]=fn},save(){localStorage.setItem('liplip-progress-v1','SAVED')},render(){},
};
const context = {window,document,Storage:StorageMock,localStorage,sessionStorage,state:{guest:false,profile:null,page:'landing',mode:'signin',progress:{old:true}},
  LiplipProgress:{hydrate(){return structuredClone(fresh)},courseSnapshot(p){return {currentBox:p.course.currentBox,completedBoxes:p.course.completedBoxes}}},
  LiplipCourse:Course,setTimeout(fn){fn()},fetch(){return Promise.resolve({ok:true})},console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('guest-study-corrections-v117.js','utf8'),context);
const api=window.LiplipGuestStudy117;

api.enterGuest();
assert.equal(context.state.guest,true);
assert.equal(context.state.progress.course.currentBox,1);
assert.equal(api.isGuestActive(),true);
localStorage.setItem('liplip-progress-v1','GUEST_PROGRESS');
assert.equal(localStorage.getItem('liplip-progress-v1'),'GUEST_PROGRESS');
assert.equal(localStorage.data.get('liplip-progress-v1'),'REGISTERED_PROGRESS','guest must not overwrite persistent learner data');
window.save();
assert.equal(sessionStorage.getItem('liplip-preview'),null,'guest preview must not persist');
sessionStorage.setItem('liplip-preview','SHOULD_STAY_TRANSIENT');
assert.equal(sessionStorage.data.has('liplip-preview'),false,'guest preview writes must be virtualized even for legacy save calls');

api.resetNewUser();
assert.equal(api.isGuestActive(),false);
assert.equal(context.state.progress.course.currentBox,1);
assert.deepEqual(JSON.parse(localStorage.getItem('liplip-progression-v114')).literacyLearn,{letters:false,numbers:false});

Course.click('grade-wrong',{},context.state.progress,()=>{});
const practice=Course.render(context.state.progress);
assert.match(practice,/This answer is flagged/);
assert.match(practice,/v117-correct-study/);
assert.doesNotMatch(practice,/data-course="exam-next"/);
Course.click('v117-correct-study',{},context.state.progress,()=>{});
assert.equal(state57.revealed,false,'practice correction must reopen the same question');
assert.equal(state57.item,0);

milestone.active={type:'exam',level:1,after:12};milestone.item=0;milestone.revealed=true;milestone.results=[false];
const milestoneHtml=Course.render(context.state.progress);
assert.match(milestoneHtml,/Answer flagged/);
assert.match(milestoneHtml,/cannot be changed/);
assert.match(milestoneHtml,/data-course="v113-next"/,'milestone exam must allow moving on after recording the wrong answer');
assert.doesNotMatch(milestoneHtml,/v117-correct-study/);

const css=fs.readFileSync('guest-study-corrections-v117.css','utf8');
assert.match(css,/\.v117-study-correction/);assert.match(css,/\.v117-exam-flag/);assert.match(css,/\.v117-guest-note/);
console.log('guest-study-corrections-v117 tests passed');

