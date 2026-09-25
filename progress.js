/* Local preview progress model. Persisted in sessionStorage by app.js. */
const LiplipProgress = (() => {
  const STAGES = ['التأسيس','بناء المفردات','التعبير','التفاعل','الإتقان'];
  const LEVELS = ['A0','A1','A2','B1','B2','C1','C2'];
  const METRICS = ['pronunciation','writing','listening','reading','communication','accent','fluency'];
  const RECEPTION_PROCESSES=['watch','watchExam','read','readExam'];
  const STEP_NAMES = [
    ['أول الطريق','التعارف','كلمات من يومك','أسئلة بسيطة','الوقت والمكان','أشياء حولنا','عبارات مفيدة','مواقف مألوفة','نرتّب الكلمات','نراجع وننطلق'],
    ['المعاني الجديدة','وصف الأشياء','حكاية يومية','اختيار الكلمات','سؤال أوضح','جمل أطول','نسمع ونفهم','نقرأ ونكتشف','تعبير بسيط','نجمع ما تعلّمنا'],
    ['الفكرة الأساسية','التفاصيل المهمّة','تبادل الآراء','القصص القصيرة','السبب والنتيجة','تواصل أعمق','نصوص متنوعة','نبرة المعنى','كتابة مترابطة','مراجعة التعبير'],
    ['الحديث المطوّل','فهم السياق','وجهات النظر','حجّة واضحة','لغة العمل','ثقافة ومجتمع','قراءة نقدية','استماع متقدّم','أسلوبك الخاص','مراجعة التفاعل'],
    ['الدقة في المعنى','المعاني الضمنية','لغة متخصصة','تعبير مرن','نقاش متقدّم','أسلوب وإيقاع','نصوص عميقة','طلاقة ووضوح','تحدّي الإتقان','حصيلة الرحلة']
  ];
  const BOX_NAMES = ['البداية','كلمات جديدة','المعنى','في جملة','اسمعها','قلها','اكتبها','اقرأها','سؤال وجواب','في الحياة','مراجعة قصيرة','اكتشف أكثر','بناء الجملة','اختيار صحيح','تعبيرك','استمع مجدداً','تحدّث بثقة','اقرأ بتركيز','تحدٍّ صغير','خلاصة الخطوة'];
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
  const fresh = () => ({completedBoxes:[],vocabulary:[],grammar:[],receptionBoxes:[],ratings:Object.fromEntries(METRICS.map(k=>[k,[]]))});
  const validBox = n => Number.isInteger(n)&&n>=1&&n<=TOTAL_BOXES;
  const limited=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  function hydrate(raw){
    const p=fresh();if(!raw||typeof raw!=='object')return p;
    if(Array.isArray(raw.completedBoxes))p.completedBoxes=[...new Set(raw.completedBoxes.filter(validBox))].sort((a,b)=>a-b);
    if(Array.isArray(raw.vocabulary)){
      const seen=new Set();p.vocabulary=raw.vocabulary.filter(item=>{
        if(!item||typeof item.word!=='string')return false;
        const key=item.word.trim().toLocaleLowerCase();if(!key||key.length>80||seen.has(key))return false;
        seen.add(key);return true;
      }).slice(0,10000).map(item=>({word:item.word.trim(),boxId:validBox(item.boxId)?item.boxId:null,ar:limited(item.ar,160),example:limited(item.example,220),image:typeof item.image==='string'&&/^https:\/\//i.test(item.image)?limited(item.image,500):''}));
    }
    if(Array.isArray(raw.receptionBoxes)){
      const seen=new Set();
      p.receptionBoxes=raw.receptionBoxes.filter(entry=>entry&&validBox(entry.boxId)&&!seen.has(entry.boxId)&&seen.add(entry.boxId)).slice(0,TOTAL_BOXES).map(entry=>{
        const rawCompleted=Array.isArray(entry.completed)?entry.completed:[];
        const completed=[];for(const key of RECEPTION_PROCESSES){if(rawCompleted.includes(key))completed.push(key);else break}
        return {boxId:entry.boxId,completed,scores:{watchExam:typeof entry.scores?.watchExam==='number'?Math.max(0,Math.min(100,entry.scores.watchExam)):null,readExam:typeof entry.scores?.readExam==='number'?Math.max(0,Math.min(100,entry.scores.readExam)):null}};
      }).sort((a,b)=>a.boxId-b.boxId);
    }
    if(Array.isArray(raw.grammar)){
      const seen=new Set(),completed=new Set(p.completedBoxes);
      p.grammar=raw.grammar.filter(item=>{
        if(!item||!completed.has(item.boxId)||!['sentenceRule','questionRule','negativeRule'].includes(item.type))return false;
        const id=limited(item.id,40),key=`${item.boxId}:${item.type}:${id}`;
        if(seen.has(key))return false;seen.add(key);return true;
      }).slice(0,2000).map(item=>({boxId:item.boxId,id:limited(item.id,40),type:item.type,title:limited(item.title,120),formula:limited(item.formula,220),en:limited(item.en,500),ar:limited(item.ar,500),body:limited(item.body,700),example:limited(item.example,220)}));
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
    return {level:LEVELS[index],levelIndex:index,next:REQUIREMENTS[index+1]||null,vocabularyCount:p.vocabulary.length,completedCount:p.completedBoxes.length,currentBox:currentBox<=TOTAL_BOXES?currentBox:null,position,stageName:STAGES[position.stage-1],stepName:STEP_NAMES[position.stage-1][position.step-1],boxName:currentBox<=TOTAL_BOXES?BOX_NAMES[position.box-1]:'اكتملت الرحلة',metrics,stages:STAGES,totalBoxes:TOTAL_BOXES};
  }
  /* Future study/chat features may call these after real assessment. Viewing a box never calls them. */
  function recordStudy(raw,{boxId,words=[],wordItems=[],grammar=[],pronunciation,writing}){
    const p=hydrate(raw);const current=snapshot(p).currentBox;
    if(!validBox(boxId)||boxId!==current)throw new Error('Study boxes must be completed in order');
    if(!Array.isArray(words)||!words.every(w=>typeof w==='string'&&w.trim()&&w.trim().length<=80))throw new Error('Invalid vocabulary');
    if(!Array.isArray(wordItems)||!Array.isArray(grammar)||grammar.length>30||wordItems.length>60)throw new Error('Invalid study content');
    for(const score of [pronunciation,writing])if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid study rating');
    p.completedBoxes.push(boxId);const seen=new Map(p.vocabulary.map((x,i)=>[x.word.toLocaleLowerCase(),i]));
    for(const word of words){const clean=word.trim(),key=clean.toLocaleLowerCase(),detail=wordItems.find(x=>x?.word?.trim().toLocaleLowerCase()===key&&x.image)||wordItems.find(x=>x?.word?.trim().toLocaleLowerCase()===key)||{};
      const entry={word:clean,boxId,ar:limited(detail.ar,160),example:limited(detail.example,220),image:typeof detail.image==='string'&&/^https:\/\//i.test(detail.image)?limited(detail.image,500):''};
      if(!seen.has(key)){p.vocabulary.push(entry);seen.set(key,p.vocabulary.length-1)}
      else {const previous=p.vocabulary[seen.get(key)];if(!previous.ar&&entry.ar)Object.assign(previous,{ar:entry.ar,example:entry.example,image:entry.image})}
    }
    for(const item of grammar){if(!item||!['sentenceRule','questionRule','negativeRule'].includes(item.type))continue;p.grammar.push({boxId,id:limited(item.id,40),type:item.type,title:limited(item.title,120),formula:limited(item.formula,220),en:limited(item.en,500),ar:limited(item.ar,500),body:limited(item.body,700),example:limited(item.example,220)})}
    p.ratings.pronunciation.push(pronunciation);p.ratings.writing.push(writing);
    return hydrate(p);
  }

  function receptionSnapshot(raw){
    const p=hydrate(raw),records=new Map(p.receptionBoxes.map(x=>[x.boxId,x]));
    const complete=new Set(p.receptionBoxes.filter(x=>x.completed.length===RECEPTION_PROCESSES.length).map(x=>x.boxId));
    let currentBox=1;while(currentBox<=TOTAL_BOXES&&complete.has(currentBox))currentBox++;
    const boxId=currentBox<=TOTAL_BOXES?currentBox:null,position=location(boxId||TOTAL_BOXES),record=boxId?records.get(boxId):null;
    const processIndex=boxId?Math.min(RECEPTION_PROCESSES.length,record?.completed.length||0):RECEPTION_PROCESSES.length;
    return {currentBox:boxId,position,completedBoxes:[...complete].sort((a,b)=>a-b),processIndex,process:RECEPTION_PROCESSES[processIndex]||null,totalBoxes:TOTAL_BOXES};
  }
  function recordReceptionProcess(raw,{boxId,process,score=100}){
    const p=hydrate(raw),snap=receptionSnapshot(p);
    if(!validBox(boxId)||boxId!==snap.currentBox)throw new Error('Reception boxes must be completed in order');
    const expected=RECEPTION_PROCESSES[snap.processIndex];
    if(process!==expected)throw new Error('Reception processes must be completed in order');
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid reception score');
    let record=p.receptionBoxes.find(x=>x.boxId===boxId);
    if(!record){record={boxId,completed:[],scores:{watchExam:null,readExam:null}};p.receptionBoxes.push(record)}
    record.completed.push(process);
    if(process==='watchExam'){record.scores.watchExam=score;p.ratings.listening.push(score)}
    if(process==='readExam'){record.scores.readExam=score;p.ratings.reading.push(score)}
    return hydrate(p);
  }
  function recordChat(raw,{communication,accent,fluency}){
    const p=hydrate(raw);for(const [key,value] of Object.entries({communication,accent,fluency})){
      if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw new Error('Invalid chat rating');
      p.ratings[key].push(value);
    }
    return hydrate(p);
  }
  function recordReception(raw,{kind,score}){
    if(kind!=='watching'&&kind!=='reading')throw new Error('Invalid reception activity');
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid reception rating');
    const p=hydrate(raw);p.ratings[kind==='watching'?'listening':'reading'].push(score);return hydrate(p);
  }
  return {STAGES,STEP_NAMES,BOX_NAMES,LEVELS,METRICS,REQUIREMENTS,RECEPTION_PROCESSES,TOTAL_BOXES,hydrate,snapshot,receptionSnapshot,location,recordStudy,recordReceptionProcess,recordChat,recordReception};
})();
