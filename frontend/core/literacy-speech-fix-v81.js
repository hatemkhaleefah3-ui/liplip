/* v83: forgiving browser speech recognition for letters, numbers, and short English words. */
(() => {
  'use strict';
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFKC').replace(/[.,?!:;"'’“”_-]/g,'').replace(/\s+/g,' ');
  const squish=v=>norm(v).replace(/\s+/g,'');
  const LETTER_NAMES={
    a:['a','ay','eigh','hey'],b:['b','bee','be'],c:['c','see','sea'],d:['d','dee','the'],e:['e','ee'],f:['f','eff','ef'],g:['g','gee','ji'],h:['h','aitch','h'],i:['i','eye','aye'],j:['j','jay','j'],k:['k','kay','k'],l:['l','el','ell'],m:['m','em'],n:['n','en'],o:['o','oh'],p:['p','pee','pea'],q:['q','cue','queue'],r:['r','are','ar'],s:['s','ess'],t:['t','tee','tea'],u:['u','you'],v:['v','vee'],w:['w','double u','double you','doubleyou'],x:['x','ex'],y:['y','why'],z:['z','zee','zed']
  };
  const NUMBER_NAMES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four','twenty five','twenty six','twenty seven','twenty eight','twenty nine','thirty','thirty one','thirty two','thirty three','thirty four'];
  const isEnglish=()=>localStorage.getItem('liplip-ui-language')==='en';
  const msg=(en,ar)=>isEnglish()?en:ar;

  function distance(a,b){a=squish(a);b=squish(b);const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
  function closeEnough(a,b){const x=squish(a),y=squish(b);if(!x||!y)return false;if(x===y)return true;const longest=Math.max(x.length,y.length);if(longest<=3)return distance(x,y)<=1;if(longest<=7)return distance(x,y)<=2;return distance(x,y)<=Math.max(2,Math.floor(longest*.28));}

  function match(heard,expected){
    const h=norm(heard),e=norm(expected);
    if(!h||!e)return false;
    if(h===e||closeEnough(h,e))return true;

    if(/^[a-z]$/.test(e)){
      const variants=LETTER_NAMES[e]||[];
      if(variants.some(x=>closeEnough(h,x)))return true;
      const words=h.split(' ');
      if(words.some(w=>variants.some(x=>closeEnough(w,x))))return true;
      return false;
    }

    if(/^\d+$/.test(e)){
      const name=NUMBER_NAMES[Number(e)]||'';
      if(h===e||closeEnough(h,name))return true;
      return h.split(' ').some(w=>w===e||closeEnough(w,name));
    }

    return closeEnough(h,e);
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
      cb(false,'',msg('Voice recognition is not supported by this browser.','التعرّف على الصوت غير مدعوم في هذا المتصفح.'));
      return;
    }

    try{await requestMic()}catch(error){
      cb(false,'',error.message==='mic_denied'
        ? msg('Microphone permission is blocked. Allow microphone access for this website, then try again.','صلاحية الميكروفون محظورة. اسمح للموقع باستخدام الميكروفون ثم حاول مجدداً.')
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
    r.interimResults=true;
    r.continuous=false;
    r.maxAlternatives=15;
    r.onresult=e=>{
      const candidates=[];
      for(let i=e.resultIndex||0;i<e.results.length;i++){
        const row=e.results[i];
        for(const alt of Array.from(row||[])){
          const text=String(alt.transcript||'').trim();
          if(text)candidates.push(text);
        }
      }
      const heard=candidates[0]||'';
      if(candidates.some(x=>match(x,expected)))finish(true,heard,'');
      else if(e.results?.[e.results.length-1]?.isFinal)finish(false,heard,'');
    };
    r.onnomatch=()=>finish(false,'',msg('I could not recognize that. Try once more.','لم أتمكن من التعرّف على النطق. حاول مرة أخرى.'));
    r.onerror=e=>{
      const code=String(e?.error||'');
      const error=code==='not-allowed'||code==='service-not-allowed'
        ? msg('Microphone or speech-recognition permission is blocked.','صلاحية الميكروفون أو التعرّف على الصوت محظورة.')
        : code==='no-speech'
          ? msg('No speech was detected. Tap the microphone and speak.','لم يتم سماع صوت. اضغط الميكروفون وتحدث.')
          : code==='audio-capture'
            ? msg('The microphone could not be used.','تعذر استخدام الميكروفون.')
            : code==='network'
              ? msg('Speech recognition needs a network connection on this browser.','التعرّف على الصوت يحتاج اتصالاً بالشبكة في هذا المتصفح.')
              : msg('Could not recognize the pronunciation. Try again.','تعذر التعرّف على النطق. حاول مرة أخرى.');
      finish(false,'',error);
    };
    r.onend=()=>{if(!finished)finish(false,'',msg('Nothing was recognized. Try again.','لم يتم التعرّف على أي نطق. حاول مرة أخرى.'))};

    timer=setTimeout(()=>finish(false,'',msg('Listening timed out. Try again.','انتهى وقت الاستماع. حاول مرة أخرى.')),11000);
    try{r.start()}catch{finish(false,'',msg('Could not start voice recognition. Check microphone permission and try again.','تعذر تشغيل التعرّف على الصوت. تحقق من صلاحية الميكروفون وحاول مرة أخرى.'))}
  }

  window.LiplipSpeechRecognition={recognize,match,source:'browser-v83-forgiving'};
})();
