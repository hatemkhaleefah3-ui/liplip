/* v85: one-time microphone permission + live pronunciation recognition that stops after verdict. */
(() => {
  'use strict';
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFKC').replace(/[.,?!:;"'’“”_-]/g,'').replace(/\s+/g,' ');
  const squish=v=>norm(v).replace(/\s+/g,'');
  const LETTER_NAMES={
    a:['a','ay','eigh','hey'],b:['b','bee','be'],c:['c','see','sea'],d:['d','dee','the'],e:['e','ee'],f:['f','eff','ef'],g:['g','gee','ji'],h:['h','aitch','h'],i:['i','eye','aye'],j:['j','jay','j'],k:['k','kay','k'],l:['l','el','ell'],m:['m','em'],n:['n','en'],o:['o','oh'],p:['p','pee','pea'],q:['q','cue','queue'],r:['r','are','ar'],s:['s','ess'],t:['t','tee','tea'],u:['u','you'],v:['v','vee'],w:['w','double u','double you','doubleyou'],x:['x','ex'],y:['y','why'],z:['z','zee','zed']
  };
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four','twenty five','twenty six','twenty seven','twenty eight','twenty nine','thirty','thirty one','thirty two','thirty three','thirty four'];
  const MIC_KEY='liplip-mic-permission-v85';
  const isEnglish=()=>localStorage.getItem('liplip-ui-language')==='en';
  const msg=(en,ar)=>isEnglish()?en:ar;
  let micGranted=localStorage.getItem(MIC_KEY)==='granted';
  let activeRecognition=null;

  function distance(a,b){a=squish(a);b=squish(b);const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
  function closeEnough(a,b){const x=squish(a),y=squish(b);if(!x||!y)return false;if(x===y)return true;const longest=Math.max(x.length,y.length);if(longest<=3)return distance(x,y)<=1;if(longest<=7)return distance(x,y)<=2;return distance(x,y)<=Math.max(2,Math.floor(longest*.28));}

  function match(heard,expected){
    const h=norm(heard),e=norm(expected);
    if(!h||!e)return false;
    if(h===e||closeEnough(h,e))return true;
    if(/^[a-z]$/.test(e)){
      const variants=LETTER_NAMES[e]||[];
      if(variants.some(x=>closeEnough(h,x)))return true;
      return h.split(' ').some(w=>variants.some(x=>closeEnough(w,x)));
    }
    if(/^\d+$/.test(e)){
      const name=NUMBER_NAMES[Number(e)]||'';
      if(h===e||closeEnough(h,name))return true;
      return h.split(' ').some(w=>w===e||closeEnough(w,name));
    }
    return closeEnough(h,e);
  }

  async function permissionAlreadyGranted(){
    if(micGranted)return true;
    try{
      const status=await navigator.permissions?.query?.({name:'microphone'});
      if(status?.state==='granted'){
        micGranted=true;
        localStorage.setItem(MIC_KEY,'granted');
        return true;
      }
      if(status?.state==='denied')throw new Error('mic_denied');
    }catch(error){
      if(error?.message==='mic_denied')throw error;
    }
    return false;
  }

  async function ensureMicPermission(){
    if(await permissionAlreadyGranted())return true;
    if(!navigator.mediaDevices?.getUserMedia)return true;
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      micGranted=true;
      localStorage.setItem(MIC_KEY,'granted');
      return true;
    }catch(error){
      micGranted=false;
      localStorage.removeItem(MIC_KEY);
      const name=String(error?.name||'');
      if(name==='NotAllowedError'||name==='SecurityError')throw new Error('mic_denied');
      throw new Error('mic_unavailable');
    }finally{
      stream?.getTracks?.().forEach(track=>track.stop());
    }
  }

  function stopActive(){
    if(!activeRecognition)return;
    try{activeRecognition.abort?.()}catch{}
    activeRecognition=null;
  }

  async function recognize(expected,cb){
    stopActive();
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R){
      cb(false,'',msg('Voice recognition is not supported by this browser.','التعرّف على الصوت غير مدعوم في هذا المتصفح.'));
      return;
    }

    try{await ensureMicPermission()}catch(error){
      cb(false,'',error.message==='mic_denied'
        ? msg('Microphone permission is blocked. Allow it once for this website, then try again.','صلاحية الميكروفون محظورة. اسمح بها مرة واحدة لهذا الموقع ثم حاول مجدداً.')
        : msg('The microphone is unavailable. Check microphone access and try again.','الميكروفون غير متاح. تحقق من صلاحية الميكروفون ثم حاول مجدداً.'));
      return;
    }

    const r=new R();
    activeRecognition=r;
    let finished=false;
    let timer=null;
    let bestHeard='';

    const finish=(ok,heard='',error='')=>{
      if(finished)return;
      finished=true;
      if(timer)clearTimeout(timer);
      if(activeRecognition===r)activeRecognition=null;
      try{r.stop?.()}catch{}
      cb(ok,heard||bestHeard,error);
    };

    r.lang='en-US';
    r.interimResults=true;
    r.continuous=true;
    r.maxAlternatives=15;

    r.onresult=e=>{
      for(let i=e.resultIndex||0;i<e.results.length;i++){
        const row=e.results[i];
        const alternatives=Array.from(row||[]).map(x=>String(x.transcript||'').trim()).filter(Boolean);
        if(alternatives[0])bestHeard=alternatives[0];
        if(alternatives.some(x=>match(x,expected))){
          finish(true,alternatives[0]||bestHeard,'');
          return;
        }
        if(row?.isFinal && alternatives.length){
          finish(false,alternatives[0]||bestHeard,'');
          return;
        }
      }
    };

    r.onspeechend=()=>{
      // Give Safari a brief moment to deliver the final transcript before forcing a verdict.
      setTimeout(()=>{if(!finished&&bestHeard)finish(match(bestHeard,expected),bestHeard,'')},250);
    };
    r.onnomatch=()=>finish(false,bestHeard,msg('I could not recognize that. Try once more.','لم أتمكن من التعرّف على النطق. حاول مرة أخرى.'));
    r.onerror=e=>{
      const code=String(e?.error||'');
      if(code==='not-allowed'||code==='service-not-allowed'){
        micGranted=false;
        localStorage.removeItem(MIC_KEY);
      }
      const error=code==='not-allowed'||code==='service-not-allowed'
        ? msg('Microphone or speech-recognition permission is blocked.','صلاحية الميكروفون أو التعرّف على الصوت محظورة.')
        : code==='no-speech'
          ? msg('No speech was detected. Tap the microphone and speak.','لم يتم سماع صوت. اضغط الميكروفون وتحدث.')
          : code==='audio-capture'
            ? msg('The microphone could not be used.','تعذر استخدام الميكروفون.')
            : code==='network'
              ? msg('Speech recognition needs a network connection on this browser.','التعرّف على الصوت يحتاج اتصالاً بالشبكة في هذا المتصفح.')
              : msg('Could not recognize the pronunciation. Try again.','تعذر التعرّف على النطق. حاول مرة أخرى.');
      finish(false,bestHeard,error);
    };
    r.onend=()=>{if(!finished)finish(!!bestHeard&&match(bestHeard,expected),bestHeard,bestHeard?'':msg('Nothing was recognized. Try again.','لم يتم التعرّف على أي نطق. حاول مرة أخرى.'))};

    timer=setTimeout(()=>finish(!!bestHeard&&match(bestHeard,expected),bestHeard,bestHeard?'':msg('Listening timed out. Try again.','انتهى وقت الاستماع. حاول مرة أخرى.')),12000);
    try{r.start()}catch{finish(false,'',msg('Could not start voice recognition. Check microphone permission and try again.','تعذر تشغيل التعرّف على الصوت. تحقق من صلاحية الميكروفون وحاول مرة أخرى.'))}
  }

  window.LiplipSpeechRecognition={
    recognize,
    match,
    stop:stopActive,
    hasMicPermission:()=>micGranted,
    source:'browser-v85-one-time-permission-live-verdict'
  };
})();
