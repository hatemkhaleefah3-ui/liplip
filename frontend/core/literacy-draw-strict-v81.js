/* v83: balanced single-character handwriting grading — forgiving on uncertain OCR, strict on clear mismatches. */
(() => {
  'use strict';

  function install(){
    const service=window.LiplipLocalDrawingJudge;
    if(!service?.judge||service.__v83Balanced)return false;
    const baseJudge=service.judge.bind(service);
    const baseGradePair=service.gradePair?.bind(service);

    function expectedValue(item){return String(item?.target??'').trim().toLowerCase()}
    function isSingle(item){const v=String(item?.target??'').trim();return /^[A-Za-z]$/.test(v)||/^\d{1,2}$/.test(v)}
    function equivalent(a,b){
      if(a===b)return true;
      const groups=['o0q','i1lj','s5','z2','g9'];
      return groups.some(g=>g.includes(a)&&g.includes(b));
    }

    async function balancedJudge(item){
      const result=await baseJudge(item);
      if(!isSingle(item))return result;

      const expected=expectedValue(item);
      const recognized=String(result?.normalized??'').trim().toLowerCase();
      const confidence=Number(result?.confidence||0);
      const ink=result?.ink||{};

      if(recognized && equivalent(recognized,expected)){
        return {...result,correct:true,reason:'balanced_ocr_match'};
      }

      // A clearly recognized different symbol should still fail (e.g. O instead of W).
      if(recognized && confidence>=0.42){
        return {...result,correct:false,reason:'balanced_clear_mismatch'};
      }

      // If OCR is unsure, accept a reasonable beginner-sized attempt rather than demanding perfection.
      const plausible=Number(ink.coverage||0)>=0.0016 && Number(ink.width||0)>=0.045 && Number(ink.height||0)>=0.10;
      if(plausible){
        return {...result,correct:true,confidence:Math.max(confidence,0.72),reason:'balanced_uncertain_shape'};
      }

      return {...result,correct:false,reason:'balanced_unrecognized'};
    }

    async function balancedGradePair(items){
      if(!Array.isArray(items)||items.length!==2){
        if(baseGradePair)return baseGradePair(items);
        throw new Error('invalid_local_drawing_pair');
      }
      const results=[];
      for(const item of items)results.push(await balancedJudge(item));
      const correct=results.every(r=>r.correct);
      const confidence=Math.min(...results.map(r=>Number(r.confidence||0)));
      return {correct,confidence,results,source:'local-balanced-v83'};
    }

    service.judge=balancedJudge;
    service.gradePair=balancedGradePair;
    service.source='local-balanced-v83';
    service.__v83Balanced=true;
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},100);
  }
})();
