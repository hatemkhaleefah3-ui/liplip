/* Editable lesson content remains in this browser, separate from session progress. */
const LiplipContent = (() => {
  const KEY='liplip-content-v1';
  const STARTERS={
    1:{title:'أول تحية',goal:'تعرّف إلى أربع كلمات تفتح أي محادثة قصيرة.',words:[
      {term:'hello',meaning:'مرحباً',example:'Hello, my name is Noor.'},
      {term:'goodbye',meaning:'إلى اللقاء',example:'Goodbye, see you tomorrow.'},
      {term:'please',meaning:'من فضلك',example:'A glass of water, please.'},
      {term:'thank you',meaning:'شكراً لك',example:'Thank you for your help.'}
    ]},
    2:{title:'تعرّف إلى شخص',goal:'استخدم كلمات بسيطة لتعرّف بنفسك وتسأل عن الآخرين.',words:[
      {term:'name',meaning:'اسم',example:'My name is Ali.'},
      {term:'from',meaning:'من',example:'I am from Iraq.'},
      {term:'live',meaning:'يسكن',example:'I live in Baghdad.'},
      {term:'meet',meaning:'يقابل',example:'Nice to meet you.'}
    ]},
    3:{title:'أماكن حولك',goal:'سمِّ الأماكن القريبة منك واستخدمها في جمل قصيرة.',words:[
      {term:'street',meaning:'شارع',example:'The street is quiet.'},
      {term:'market',meaning:'سوق',example:'The market is open.'},
      {term:'school',meaning:'مدرسة',example:'The school is near my home.'},
      {term:'hospital',meaning:'مستشفى',example:'The hospital is on this street.'}
    ]},
    4:{title:'يومك المعتاد',goal:'صف أجزاء بسيطة من يومك باللغة الإنجليزية.',words:[
      {term:'morning',meaning:'صباح',example:'I study in the morning.'},
      {term:'work',meaning:'عمل',example:'I go to work every day.'},
      {term:'study',meaning:'يدرس',example:'We study English together.'},
      {term:'evening',meaning:'مساء',example:'I read in the evening.'}
    ]},
    5:{title:'على المائدة',goal:'تحدّث عن طعام وشراب مألوف في حياتك اليومية.',words:[
      {term:'bread',meaning:'خبز',example:'The bread is fresh.'},
      {term:'water',meaning:'ماء',example:'I drink water.'},
      {term:'rice',meaning:'أرز',example:'We eat rice for lunch.'},
      {term:'tea',meaning:'شاي',example:'Would you like some tea?'}
    ]}
  };
  let edits={};
  try {const raw=JSON.parse(localStorage.getItem(KEY)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw)){for(const [key,value] of Object.entries(raw)){try{const id=Number(key);edits[id]=validate(id,value)}catch{}}}}catch{}
  const copy=data=>({title:data.title,goal:data.goal,words:data.words.map(w=>({...w}))});
  function blank(boxId,name=''){return {title:name||`الصندوق ${boxId}`,goal:'أضف هدف هذا الدرس وكلماته ثم احفظه لتبدأ التعلّم.',words:[]}}
  function get(boxId,name=''){const data=Object.prototype.hasOwnProperty.call(edits,boxId)?edits[boxId]:(STARTERS[boxId]||blank(boxId,name));return copy(data)}
  function validate(boxId,data){
    if(!Number.isInteger(boxId)||boxId<1||boxId>1000)throw new Error('رقم الصندوق غير صحيح.');
    if(typeof data?.title!=='string'||!data.title.trim()||data.title.trim().length>80)throw new Error('أدخل عنواناً لا يتجاوز ٨٠ حرفاً.');
    if(typeof data.goal!=='string'||!data.goal.trim()||data.goal.trim().length>250)throw new Error('أدخل هدفاً لا يتجاوز ٢٥٠ حرفاً.');
    if(!Array.isArray(data.words)||data.words.length>12)throw new Error('يمكن إضافة ١٢ كلمة كحد أقصى.');
    const seen=new Set();
    const words=data.words.map(w=>{
      const term=typeof w.term==='string'?w.term.trim():'';
      const meaning=typeof w.meaning==='string'?w.meaning.trim():'';
      const example=typeof w.example==='string'?w.example.trim():'';
      if(!term||term.length>80||!meaning||meaning.length>120||!example||example.length>220)throw new Error('أكمل الكلمة ومعناها ومثالها ضمن الحدود المحددة.');
      const key=term.toLocaleLowerCase();if(seen.has(key))throw new Error('لا تكرر الكلمة نفسها في الدرس.');seen.add(key);
      return {term,meaning,example};
    });
    return {title:data.title.trim(),goal:data.goal.trim(),words};
  }
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(edits));return true}catch{return false}}
  function save(boxId,data){edits[boxId]=validate(boxId,data);return persist()}
  function remove(boxId){if(!Number.isInteger(boxId)||boxId<1||boxId>1000)throw new Error('رقم الصندوق غير صحيح.');edits[boxId]=blank(boxId);return persist()}
  function restore(boxId){if(!Number.isInteger(boxId)||boxId<1||boxId>1000)throw new Error('رقم الصندوق غير صحيح.');delete edits[boxId];return persist()}
  function hasStarter(boxId){return Object.prototype.hasOwnProperty.call(STARTERS,boxId)}
  return {get,save,remove,restore,hasStarter,validate};
})();
