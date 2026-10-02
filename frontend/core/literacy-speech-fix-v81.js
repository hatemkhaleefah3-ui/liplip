/* v81: robust browser speech recognition with explicit microphone permission and useful iPhone/Safari errors. */
(() => {
  'use strict';
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFKC').replace(/[.,?!:;"'’“”_-]/g,'').replace(/\s+/g,' ');
  const LETTER_NAMES={a:['a','ay','eigh'],b:['b','bee'],c:['c','see','sea'],d:['d','dee'],e:['e','ee'],f:['f','eff'],g:['g','gee'],h:['h','aitch'],i:['i','eye'],j:['j','jay'],k:['k','kay'],l:['l','el'],m:['m','em'],n:['n','en'],o:['o','oh'],p:['p','pee'],q:['q','cue','queue'],r:['r','are'],s:['s','ess'],t:['t','tee'],u:['u','you'],v:['v','vee'],w:['w','double u','double you'],x:['x','ex'],y:['y','why'],z:['z','zee','zed']};
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four','twenty five','twenty six','twenty seven','twenty eight','twenty nine','thirty','thirty one','thirty two','thirty three','thirty four'];
  const isEnglish=()=>localStorage.getItem('liplip-ui-language')==='en';
  const msg=(en,ar)=>isEnglish()?en:ar;

  function match(heard,expected){
    const h=norm(heard),e=norm(expected);
    if(!h||!e)return false;
    if(h===e)return true;
    if(/^[a-z]$/.test(e))return (LETTER_NAMES[e]||[]).some(x=>norm(x)===h);
    if(/^\d+$/.test(e)){
      const name=NUMBER_NAMES[Number(e)]||'';
      return h===e||h===norm(name);
    }
    return false;
  }

  async function requestMic(){
    if(!navigator.mediaDevices?.getUserMedia)return true;
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      return true;
    }catch(error){
      const name=String(error?.name||'');
      if(name==='NotAllowedError'||name==='SecurityError')throw new Error('mic_denied');
      throw new Error('mic_unavailable');
    }finally{
      stream?.getTracks?.().forEach(track=>track.stop());
    }
  }

  async function recognize(expected,cb){
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R){
      cb(false,'',msg('Voice recognition is not supported by this browser. On iPhone, use a Safari version that supports Web Speech recognition.','التعرّف على الصوت غير مدعوم في هذا المتصفح. على iPhone استخدم إصدار Safari يدعم Web Speech.'));
      return;
    }

    try{await requestMic()}catch(error){
      cb(false,'',error.message==='mic_denied'
        ? msg('Microphone permission is blocked. Allow microphone access for this website in Safari settings, then try again.','صلاحية الميكروفون محظورة. اسمح للموقع باستخدام الميكروفون من إعدادات Safari ثم حاول مجدداً.')
        : msg('The microphone is unavailable. Check microphone access and try again.','الميكروفون غير متاح. تحقق من صلاحية الميكروفون ثم حاول مجدداً.'));
      return;
    }

    const r=new R();
    let finished=false;
    let timer=null;
    const finish=(ok,heard='',error='')=>{
      if(finished)return;
      finished=true;
      if(timer)clearTimeout(timer);
      try{r.stop?.()}catch{}
      cb(ok,heard,error);
    };

    r.lang='en-US';
    r.interimResults=false;
    r.continuous=false;
    r.maxAlternatives=10;
    r.onresult=e=>{
      const row=e.results?.[0];
      const alts=row?Array.from(row).map(x=>String(x.transcript||'').trim()).filter(Boolean):[];
      const heard=alts[0]||'';
      finish(alts.some(x=>match(x,expected)),heard,'');
    };
    r.onnomatch=()=>finish(false,'',msg('I could not recognize that pronunciation. Try again and speak clearly.','لم أتمكن من التعرّف على النطق. حاول مرة أخرى وتحدث بوضوح.'));
    r.onerror=e=>{
      const code=String(e?.error||'');
      const error=code==='not-allowed'||code==='service-not-allowed'
        ? msg('Microphone or speech-recognition permission is blocked. Allow it in Safari settings.','صلاحية الميكروفون أو التعرّف على الصوت محظورة. اسمح بها من إعدادات Safari.')
        : code==='no-speech'
          ? msg('No speech was detected. Tap the microphone and speak immediately.','لم يتم سماع صوت. اضغط الميكروفون وتحدث مباشرة.')
          : code==='audio-capture'
            ? msg('The microphone could not be used. Check microphone access.','تعذر استخدام الميكروفون. تحقق من الصلاحية.')
            : code==='network'
              ? msg('Speech recognition needs a network connection on this browser. Try again when online.','التعرّف على الصوت يحتاج اتصالاً بالشبكة في هذا المتصفح. حاول مرة أخرى عند توفر الإنترنت.')
              : msg('Could not recognize the pronunciation. Try again.','تعذر التعرّف على النطق. حاول مرة أخرى.');
      finish(false,'',error);
    };
    r.onend=()=>{if(!finished)finish(false,'',msg('Nothing was recognized. Tap the microphone and try again.','لم يتم التعرّف على أي نطق. اضغط الميكروفون وحاول مرة أخرى.'))};

    timer=setTimeout(()=>finish(false,'',msg('Listening timed out. Tap the microphone and speak immediately.','انتهى وقت الاستماع. اضغط الميكروفون وتحدث مباشرة.')),9000);
    try{r.start()}catch{finish(false,'',msg('Could not start voice recognition. Check microphone permission and try again.','تعذر تشغيل التعرّف على الصوت. تحقق من صلاحية الميكروفون وحاول مرة أخرى.'))}
  }

  window.LiplipSpeechRecognition={recognize,match,source:'browser-v81-permission-aware'};
})();
