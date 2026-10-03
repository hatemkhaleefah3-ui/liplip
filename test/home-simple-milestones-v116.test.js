const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('home-simple-milestones-v116.js','utf8');
const css=fs.readFileSync('home-simple-milestones-v116.css','utf8');

function boot(completedBoxes=[],currentBox=1){
  const storage=new Map([['liplip-ui-language','en'],['liplip-study-milestones-v113',JSON.stringify({version:1,baseline:{1:1,2:1,3:1,4:1,5:1},completed:{}})]]);
  const course={currentBox,completedBoxes,records:[],phase:'vocabulary',totalBoxes:250};
  const context={
    console,setTimeout:fn=>fn(),
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))},
    document:{querySelector:()=>({})},
    state:{page:'auth',nav:'الرئيسية',guest:false,profile:{name:'Test Learner'},progress:{}},
    dashboard(){return'old'},
    LiplipProgress:{courseSnapshot:()=>course,courseLocation:id=>({level:Math.floor((id-1)/200)+1,box:(id-1)%200+1})},
    LiplipCourse:{mapPage:()=>'<main>map</main>'},
    window:{LiplipFrontend:{registerFeature(){}},LiplipProgression114:{snapshot:()=>({cefr:'A1',study:true,fastWrite:false,talk:false,letters:true,numbers:true})},render(){}},
  };
  context.window.window=context.window;context.window.document=context.document;context.window.state=context.state;context.window.localStorage=context.localStorage;context.window.LiplipProgress=context.LiplipProgress;context.window.LiplipCourse=context.LiplipCourse;
  vm.createContext(context);vm.runInContext(source,context,{filename:'home-simple-milestones-v116.js'});
  return{context,storage,api:context.window.LiplipHome116};
}

{
  const {api,storage}=boot([1,2,3,4,5,6,7,8,9],10);
  assert.equal(api.repairMilestones({}),true);
  const saved=JSON.parse(storage.get('liplip-study-milestones-v113'));
  assert.equal(saved.completed['1:review:4'].recovered,true);
  assert.equal(saved.completed['1:review:8'].recovered,true,'later box proves the review-8 gate was already passed');
  assert.equal(saved.completed['1:exam:12'],undefined);
}

{
  const {api,storage}=boot([1,2,3,4,5,6,7,8],9);
  api.repairMilestones({});
  const saved=JSON.parse(storage.get('liplip-study-milestones-v113'));
  assert.equal(saved.completed['1:review:8'],undefined,'a newly reached milestone stays current rather than auto-completing');
}

{
  const completed=Array.from({length:13},(_,i)=>i+1),{api,storage}=boot(completed,14);
  api.repairMilestones({});
  const saved=JSON.parse(storage.get('liplip-study-milestones-v113'));
  assert.equal(saved.completed['1:review:12'].recovered,true);
  assert.equal(saved.completed['1:exam:12'].recovered,true,'later Study progress repairs an impossible locked exam');
}

{
  const {api}=boot([],1),html=api.simpleDashboard();
  assert.match(html,/home-v116/);
  assert.match(html,/NEXT STEP/);
  assert.match(html,/QUICK ACCESS/);
  assert.match(html,/Vocabulary Closet/);
  assert.match(html,/class="v114-path" hidden/,'prevents the old seven-step panel from being injected');
  assert.doesNotMatch(html,/Detailed progress/);
}

assert.match(css,/\.v116-next/);
assert.match(css,/\.v116-quick/);
assert.match(css,/@media\(max-width:720px\)/);
console.log('home-simple-milestones-v116 regression tests passed');
