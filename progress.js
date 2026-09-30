/* Local preview progress model. Persisted in sessionStorage by app.js. */
const LiplipProgress = (() => {
  const STAGES = ['التأسيس','بناء المفردات','التعبير','التفاعل','الإتقان'];
  const LEVELS = ['A0','A1','A2','B1','B2','C1','C2'];
  const METRICS = ['pronunciation','writing','listening','reading','communication','accent','fluency'];
  const RECEPTION_PROCESSES=['watch','watchExam','read','readExam'];
  const COURSE_PHASES=['vocabulary','grammar','watchRead'];
  const COURSE_PROCESSES={vocabulary:['content','exam'],grammar:['article','exam'],watchRead:['video','story']};
  const COURSE_ORDER=COURSE_PHASES.flatMap(phase=>COURSE_PROCESSES[phase].map(process=>phase+':'+process));
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
  const fresh = () => ({completedBoxes:[],vocabulary:[],grammar:[],receptionBoxes:[],courseBoxes:[],ratings:Object.fromEntries(METRICS.map(k=>[k,[]]))});
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
    const hasCourse=Array.isArray(raw.courseBoxes);
    if(hasCourse){
      const seen=new Set();
      p.courseBoxes=raw.courseBoxes.filter(x=>x&&validBox(x.boxId)&&!seen.has(x.boxId)&&seen.add(x.boxId)).map(x=>{
        const completed=[],input=Array.isArray(x.completed)?x.completed:[];
        for(const token of COURSE_ORDER){if(input.includes(token))completed.push(token);else break}
        const scores={};for(const token of completed){const value=x.scores?.[token];scores[token]=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):100}
        return {boxId:x.boxId,completed,scores};
      }).sort((a,b)=>a.boxId-b.boxId);
    }else{
      const study=new Set(p.completedBoxes),reception=new Map(p.receptionBoxes.map(x=>[x.boxId,x]));
      for(let boxId=1;boxId<=TOTAL_BOXES;boxId++){
        const completed=[],scores={};
        if(study.has(boxId))completed.push(...COURSE_ORDER.slice(0,4));
        const old=reception.get(boxId);
        if(completed.length===4&&old?.completed.includes('watchExam')){completed.push('watchRead:video');scores['watchRead:video']=old.scores.watchExam??100}
        if(completed.length===5&&old?.completed.includes('readExam')){completed.push('watchRead:story');scores['watchRead:story']=old.scores.readExam??100}
        if(completed.length)p.courseBoxes.push({boxId,completed,scores});
      }
    }
    if(Array.isArray(raw.grammar)){
      const seen=new Set(),completed=new Set([...p.completedBoxes,...p.courseBoxes.filter(x=>x.completed.length>=4).map(x=>x.boxId)]);
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
  function courseLocation(boxId){const index=boxId-1;return {level:Math.floor(index/200)+1,box:index%200+1}}
  function courseComplete(p){return new Set(p.courseBoxes.filter(x=>x.completed.length===COURSE_ORDER.length).map(x=>x.boxId))}
  function snapshot(raw){
    const p=hydrate(raw);const completed=p.courseBoxes.length?courseComplete(p):new Set(p.completedBoxes);
    let currentBox=1;while(currentBox<=TOTAL_BOXES&&completed.has(currentBox))currentBox++;
    const position=location(Math.min(currentBox,TOTAL_BOXES));
    const metrics=Object.fromEntries(METRICS.map(key=>{const values=p.ratings[key];return [key,{count:values.length,average:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null}]}));
    let index=0;for(let i=1;i<LEVELS.length;i++){
      const req=REQUIREMENTS[i];
      if(p.vocabulary.length>=req.words&&completed.size>=req.boxes&&METRICS.every(k=>metrics[k].count>=req.samples&&metrics[k].average>=req.score))index=i;
      else break;
    }
    return {level:LEVELS[index],levelIndex:index,next:REQUIREMENTS[index+1]||null,vocabularyCount:p.vocabulary.length,completedCount:completed.size,currentBox:currentBox<=TOTAL_BOXES?currentBox:null,position,stageName:STAGES[position.stage-1],stepName:STEP_NAMES[position.stage-1][position.step-1],boxName:currentBox<=TOTAL_BOXES?BOX_NAMES[position.box-1]:'اكتملت الرحلة',metrics,stages:STAGES,totalBoxes:TOTAL_BOXES};
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
  function courseSnapshot(raw){
    const p=hydrate(raw),records=p.courseBoxes.map(entry=>{
      const completedPhases=COURSE_PHASES.filter((phase,i)=>entry.completed.length>=(i+1)*2);
      const phaseIndex=Math.min(2,Math.floor(entry.completed.length/2)),currentPhase=COURSE_PHASES[phaseIndex],processIndex=entry.completed.length%2;
      return {...entry,completedPhases,currentPhase,processIndex};
    }),complete=courseComplete(p);
    let currentBox=1;while(currentBox<=TOTAL_BOXES&&complete.has(currentBox))currentBox++;
    const boxId=currentBox<=TOTAL_BOXES?currentBox:null,record=boxId?records.find(x=>x.boxId===boxId):null,done=record?.completed.length||0,phaseIndex=boxId?Math.min(2,Math.floor(done/2)):3;
    return {currentBox:boxId,completedBoxes:[...complete].sort((a,b)=>a-b),records,phaseIndex,phase:COURSE_PHASES[phaseIndex]||null,processIndex:boxId?done%2:0,totalBoxes:TOTAL_BOXES};
  }
  function recordCourseProcess(raw,{boxId,phase,process,score=100,words=[],grammar=[]}){
    const p=hydrate(raw),snap=courseSnapshot(p);
    if(!validBox(boxId)||boxId!==snap.currentBox)throw new Error('Course boxes must be completed in order');
    let record=p.courseBoxes.find(x=>x.boxId===boxId);
    if(!record){record={boxId,completed:[],scores:{}};p.courseBoxes.push(record)}
    const expected=COURSE_ORDER[record.completed.length],token=phase+':'+process;
    if(token!==expected)throw new Error('Course phases and processes must be completed in order');
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid course score');
    record.completed.push(token);record.scores[token]=score;
    if(token==='vocabulary:exam'){
      const seen=new Set(p.vocabulary.map(x=>x.word.toLocaleLowerCase()));
      for(const item of words){const word=limited(item?.word,80);if(!word||seen.has(word.toLocaleLowerCase()))continue;seen.add(word.toLocaleLowerCase());p.vocabulary.push({word,boxId,ar:limited(item.ar,160),example:limited(item.example,220),image:typeof item.image==='string'&&/^https:\/\//i.test(item.image)?limited(item.image,500):''})}
      p.ratings.pronunciation.push(score);p.ratings.writing.push(score);
    }
    if(token==='grammar:exam'){
      const article=grammar[0]||{},rules=[['sentenceRule','Normal',article.normal],['negativeRule','Negative',article.negative],['questionRule','Question',article.question]];
      for(const [type,title,formula] of rules)if(formula)p.grammar.push({boxId,id:type+'-'+boxId,type,title,formula:limited(formula,220),en:'',ar:'',body:limited(article.rule,700),example:limited(article.examples?.[0]?.text,220)});
      p.ratings.writing.push(score);
    }
    if(token==='watchRead:video')p.ratings.listening.push(score);
    if(token==='watchRead:story')p.ratings.reading.push(score);
    if(record.completed.length===COURSE_ORDER.length&&!p.completedBoxes.includes(boxId))p.completedBoxes.push(boxId);
    p.courseBoxes.sort((a,b)=>a.boxId-b.boxId);
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
  return {STAGES,STEP_NAMES,BOX_NAMES,LEVELS,METRICS,REQUIREMENTS,RECEPTION_PROCESSES,COURSE_PHASES,COURSE_PROCESSES,TOTAL_BOXES,hydrate,snapshot,receptionSnapshot,courseSnapshot,location,courseLocation,recordStudy,recordReceptionProcess,recordCourseProcess,recordChat,recordReception};
})();
