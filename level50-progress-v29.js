/* v29: five course levels, 50 boxes per level. Keep the legacy 200-id stride so existing box content IDs stay stable. */
(() => {
  if (!window.LiplipProgress) return;
  const P = window.LiplipProgress;
  const LEVELS = 5;
  const BOXES_PER_LEVEL = 50;
  const LEGACY_STRIDE = 200;
  const TOTAL = LEVELS * BOXES_PER_LEVEL;
  const ORDER = P.COURSE_PHASES.flatMap(phase => P.COURSE_PROCESSES[phase].map(process => `${phase}:${process}`));
  const allowedIds = Array.from({length: LEVELS}, (_, level) => Array.from({length: BOXES_PER_LEVEL}, (_, i) => level * LEGACY_STRIDE + i + 1)).flat();
  const allowed = new Set(allowedIds);
  const baseSnapshot = P.snapshot.bind(P);
  const limited = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';

  function courseLocation(boxId){
    const id = Number(boxId) || 1;
    const level = Math.max(1, Math.min(LEVELS, Math.floor((id - 1) / LEGACY_STRIDE) + 1));
    const box = Math.max(1, Math.min(BOXES_PER_LEVEL, ((id - 1) % LEGACY_STRIDE) + 1));
    return {level, box};
  }
  function location(boxId){
    const {level,box} = courseLocation(boxId);
    return {stage:level, step:Math.floor((box - 1) / 5) + 1, box:((box - 1) % 5) + 1};
  }
  function completeSet(p){
    return new Set((p.courseBoxes || []).filter(x => allowed.has(x.boxId) && Array.isArray(x.completed) && x.completed.length === ORDER.length).map(x => x.boxId));
  }
  function courseSnapshot(raw){
    const p=P.hydrate(raw), records=(p.courseBoxes||[]).filter(x=>allowed.has(x.boxId)).map(entry=>{
      const completedPhases=P.COURSE_PHASES.filter((phase,i)=>(entry.completed?.length||0)>=(i+1)*2);
      const phaseIndex=Math.min(2,Math.floor((entry.completed?.length||0)/2));
      return {...entry,completedPhases,currentPhase:P.COURSE_PHASES[phaseIndex],processIndex:(entry.completed?.length||0)%2};
    });
    const complete=completeSet(p);
    const boxId=allowedIds.find(id=>!complete.has(id)) ?? null;
    const record=boxId?records.find(x=>x.boxId===boxId):null;
    const done=record?.completed?.length||0, phaseIndex=boxId?Math.min(2,Math.floor(done/2)):3;
    return {currentBox:boxId,completedBoxes:[...complete].sort((a,b)=>a-b),records,phaseIndex,phase:P.COURSE_PHASES[phaseIndex]||null,processIndex:boxId?done%2:0,totalBoxes:TOTAL};
  }
  function snapshot(raw){
    const p=P.hydrate(raw), base=baseSnapshot(p), course=courseSnapshot(p), metrics=base.metrics;
    let levelIndex=0;
    for(let i=1;i<P.LEVELS.length;i++){
      const req=P.REQUIREMENTS[i];
      if(p.vocabulary.length>=req.words && course.completedBoxes.length>=req.boxes && P.METRICS.every(k=>metrics[k].count>=req.samples && metrics[k].average>=req.score)) levelIndex=i;
      else break;
    }
    const current=course.currentBox, pos=location(current || allowedIds[allowedIds.length-1]), cl=courseLocation(current || allowedIds[allowedIds.length-1]);
    return {...base,level:P.LEVELS[levelIndex],levelIndex,next:P.REQUIREMENTS[levelIndex+1]||null,vocabularyCount:p.vocabulary.length,completedCount:course.completedBoxes.length,currentBox:current,position:pos,stageName:P.STAGES[cl.level-1],stepName:P.STEP_NAMES[cl.level-1]?.[pos.step-1]||'',boxName:current?`الصندوق ${cl.box}`:'اكتملت الرحلة',totalBoxes:TOTAL};
  }
  function recordCourseProcess(raw,{boxId,phase,process,score=100,words=[],grammar=[]}){
    const p=P.hydrate(raw), snap=courseSnapshot(p);
    if(!allowed.has(boxId)||boxId!==snap.currentBox)throw new Error('Course boxes must be completed in order');
    let record=p.courseBoxes.find(x=>x.boxId===boxId);
    if(!record){record={boxId,completed:[],scores:{}};p.courseBoxes.push(record)}
    const expected=ORDER[record.completed.length],token=`${phase}:${process}`;
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
      for(const [type,title,formula] of rules)if(formula)p.grammar.push({boxId,id:`${type}-${boxId}`,type,title,formula:limited(formula,220),en:'',ar:'',body:limited(article.rule,700),example:limited(article.examples?.[0]?.text,220)});
      p.ratings.writing.push(score);
    }
    if(token==='watchRead:video')p.ratings.listening.push(score);
    if(token==='watchRead:story')p.ratings.reading.push(score);
    if(record.completed.length===ORDER.length&&!p.completedBoxes.includes(boxId))p.completedBoxes.push(boxId);
    p.courseBoxes.sort((a,b)=>a.boxId-b.boxId);
    return P.hydrate(p);
  }

  /* Scale box-count gates to the new 250-box course while retaining word/assessment requirements. */
  for(const req of P.REQUIREMENTS) req.boxes=Math.min(TOTAL,Math.ceil((req.boxes||0)*TOTAL/1000));
  P.TOTAL_BOXES=TOTAL;
  P.BOXES_PER_LEVEL=BOXES_PER_LEVEL;
  P.courseLocation=courseLocation;
  P.location=location;
  P.courseSnapshot=courseSnapshot;
  P.snapshot=snapshot;
  P.recordCourseProcess=recordCourseProcess;
})();