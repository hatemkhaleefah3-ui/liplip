/* v81: tighten single-character handwriting grading so a different symbol cannot pass on low-confidence fallback. */
(() => {
  'use strict';

  function install(){
    const service=window.LiplipLocalDrawingJudge;
    if(!service?.judge||service.__v81Strict)return false;
    const baseJudge=service.judge.bind(service);
    const baseGradePair=service.gradePair?.bind(service);

    function expectedValue(item){return String(item?.target??'').trim().toLowerCase()}
    function isSingle(item){const v=String(item?.target??'').trim();return /^[A-Za-z]$/.test(v)||/^\d{1,2}$/.test(v)}

    async function strictJudge(item){
      const result=await baseJudge(item);
      if(!isSingle(item))return result;

      const expected=expectedValue(item);
      const recognized=String(result?.normalized??'').trim().toLowerCase();

      // For letters and numerals, require the OCR to identify the requested symbol.
      // Do not let the generic "enough ink" fallback turn O into W, B into A, etc.
      if(recognized===expected){
        return {...result,correct:true,reason:'strict_ocr_match'};
      }

      return {
        ...result,
        correct:false,
        reason: recognized ? 'strict_different_symbol' : 'strict_unrecognized_symbol'
      };
    }

    async function strictGradePair(items){
      if(!Array.isArray(items)||items.length!==2){
        if(baseGradePair)return baseGradePair(items);
        throw new Error('invalid_local_drawing_pair');
      }
      const results=[];
      for(const item of items)results.push(await strictJudge(item));
      const correct=results.every(r=>r.correct);
      const confidence=Math.min(...results.map(r=>Number(r.confidence||0)));
      return {correct,confidence,results,source:'local-strict-v81'};
    }

    service.judge=strictJudge;
    service.gradePair=strictGradePair;
    service.source='local-strict-v81';
    service.__v81Strict=true;
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},100);
  }
})();
