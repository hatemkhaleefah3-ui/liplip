/* Local preview progress model. Persisted in sessionStorage by app.js. */
const LiplipProgress = (() => {
  const STAGES = ['التأسيس','بناء المفردات','التعبير','التفاعل','الإتقان'];
  const LEVELS = ['A0','A1','A2','B1','B2','C1','C2'];
  const METRICS = ['pronunciation','writing','communication','accent','fluency'];
  const REQUIREMENTS = [
    {words:0,boxes:0,samples:0,score:0},
    {words:100,boxes:50,samples:1,score:20},
    {words:400,boxes:150,samples:2,score:35},
    {words:1000,boxes:300,samples:5,score:50},
    {words:2000,boxes:500,samples:10,score:65},
    {words:4000,boxes:750,samples:20,score:80},
    {words:7000,boxes:1000,samples:30,score:90}
  ];
  const TOTAL_BOXES = 5 * 10 * 20;
  const fresh = () => ({completedBoxes:[],vocabulary:[],ratings:Object.fromEntries(METRICS.map(k=>[k,[]]))});
  const validBox = n => Number.isInteger(n)&&n>=1&&n<=TOTAL_BOXES;
  function hydrate(raw){
    const p=fresh();if(!raw||typeof raw!=='object')return p;
    if(Array.isArray(raw.completedBoxes))p.completedBoxes=[...new Set(raw.completedBoxes.filter(validBox))].sort((a,b)=>a-b);
    if(Array.isArray(raw.vocabulary)){
      const seen=new Set();p.vocabulary=raw.vocabulary.filter(item=>{
        if(!item||typeof item.word!=='string')return false;
        const key=item.word.trim().toLocaleLowerCase();if(!key||key.length>80||seen.has(key))return false;
        seen.add(key);return true;
      }).slice(0,10000).map(item=>({word:item.word.trim(),boxId:validBox(item.boxId)?item.boxId:null}));
    }
    for(const metric of METRICS){const values=raw.ratings?.[metric];if(Array.isArray(values))p.ratings[metric]=values.filter(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100).slice(-50)}
    return p;
  }
  function location(boxId){const index=boxId-1;return {stage:Math.floor(index/200)+1,step:Math.floor(index%200/20)+1,box:index%20+1}}
  function snapshot(raw){
    const p=hydrate(raw);const completed=new Set(p.completedBoxes);
    let currentBox=1;while(currentBox<=TOTAL_BOXES&&completed.has(currentBox))currentBox++;
    const position=location(Math.min(currentBox,TOTAL_BOXES));
    const metrics=Object.fromEntries(METRICS.map(key=>{const values=p.ratings[key];return [key,{count:values.length,average:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null}]}));
    let index=0;for(let i=1;i<LEVELS.length;i++){
      const req=REQUIREMENTS[i];
      if(p.vocabulary.length>=req.words&&p.completedBoxes.length>=req.boxes&&METRICS.every(k=>metrics[k].count>=req.samples&&metrics[k].average>=req.score))index=i;
      else break;
    }
    return {level:LEVELS[index],levelIndex:index,next:REQUIREMENTS[index+1]||null,vocabularyCount:p.vocabulary.length,completedCount:p.completedBoxes.length,currentBox:currentBox<=TOTAL_BOXES?currentBox:null,position,metrics,stages:STAGES,totalBoxes:TOTAL_BOXES};
  }
  /* Future study/chat features may call these after real assessment. Viewing a box never calls them. */
  function recordStudy(raw,{boxId,words=[],pronunciation,writing}){
    const p=hydrate(raw);const current=snapshot(p).currentBox;
    if(!validBox(boxId)||boxId!==current)throw new Error('Study boxes must be completed in order');
    if(!Array.isArray(words)||!words.every(w=>typeof w==='string'&&w.trim()&&w.trim().length<=80))throw new Error('Invalid vocabulary');
    for(const score of [pronunciation,writing])if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid study rating');
    p.completedBoxes.push(boxId);const seen=new Set(p.vocabulary.map(x=>x.word.toLocaleLowerCase()));
    for(const word of words){const clean=word.trim();if(!seen.has(clean.toLocaleLowerCase())){p.vocabulary.push({word:clean,boxId});seen.add(clean.toLocaleLowerCase())}}
    p.ratings.pronunciation.push(pronunciation);p.ratings.writing.push(writing);
    return hydrate(p);
  }
  function recordChat(raw,{communication,accent,fluency}){
    const p=hydrate(raw);for(const [key,value] of Object.entries({communication,accent,fluency})){
      if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw new Error('Invalid chat rating');
      p.ratings[key].push(value);
    }
    return hydrate(p);
  }
  return {STAGES,LEVELS,METRICS,REQUIREMENTS,TOTAL_BOXES,hydrate,snapshot,location,recordStudy,recordChat};
})();
