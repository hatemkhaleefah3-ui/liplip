/* v48: dual-field literacy drawing + face-aware English/Arabic pronunciation. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;
  if(!UI)return;

  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const EN_NUM=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const AR_NUM=['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر','عشرون','واحد وعشرون','اثنان وعشرون','ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون','ثمانية وعشرون','تسعة وعشرون','ثلاثون','واحد وثلاثون','اثنان وثلاثون','ثلاثة وثلاثون','أربعة وثلاثون'];
  const BASE_AR={A:'أ ألف',B:'ب باء',C:'س سين',D:'د دال',E:'إي',F:'ف فاء',G:'ج جيم',H:'هـ هاء',I:'آي',K:'ك كاف',L:'ل لام',M:'م ميم',N:'ن نون',O:'أو',R:'ر راء',S:'س سين',T:'ت تاء',V:'في',Z:'ز زاي'};
  const SPECIAL_AR={Q:'كيو',W:'دبليو',Y:'وأي',U:'يو',J:'جي',P:'پ',X:'اكس'};
  const arabicDigits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  const t=(ar,en)=>UI.t(ar,en);
  const esc=UI.escapeHTML;
  const literacy=()=>window.LiplipLiteracy;

  function model(s=literacy()){
    if(!s)return null;
    if(s.mode==='letters'){
      const upper=LETTERS[Math.max(0,Math.min(25,Number(s.index)||0))]||'A';
      const ar=SPECIAL_AR[upper]||BASE_AR[upper]||upper;
      return {front:`${upper}${upper.toLowerCase()}`,back:ar,first:upper,second:upper.toLowerCase(),firstLabel:t('الحرف الكبير','Capital letter'),secondLabel:t('الحرف الصغير','Small letter'),englishSpeech:upper.toLowerCase(),arabicSpeech:ar};
    }
    if(s.mode==='numbers'){
      const n=Math.max(0,Math.min(34,Number(s.index)||0));
      return {front:`${n} ${EN_NUM[n]}`,back:`${arabicDigits(n)} ${AR_NUM[n]}`,first:String(n),second:EN_NUM[n],firstLabel:t('الرقم','Number'),secondLabel:t('اسم الرقم','Number name'),englishSpeech:EN_NUM[n],arabicSpeech:AR_NUM[n]};
    }
    return null;
  }

  function bindCanvas(canvas,index,s,key){
    if(!canvas||canvas.dataset.v48Bound==='1')return;
    canvas.dataset.v48Bound='1';
    const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#17131f';ctx.lineWidth=18;
    let down=false,last=null;
    const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return{x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height}};
    const sync=()=>{if(s._v48DrawKey!==key){s._v48DrawKey=key;s._v48Drawn=[false,false]}s.drawn=!!(s._v48Drawn?.[0]&&s._v48Drawn?.[1])};
    canvas.addEventListener('pointerdown',e=>{down=true;last=pos(e);e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{if(!down)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;if(s._v48DrawKey!==key){s._v48DrawKey=key;s._v48Drawn=[false,false]}s._v48Drawn[index]=true;sync();e.preventDefault()});
    const end=()=>{down=false;last=null;sync()};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',end);
  }

  function ensureLearn(root,s,m){
    if(s.stage!=='learn')return;
    const front=root.querySelector('.lit36-face.front b'),back=root.querySelector('.lit36-face.back b');
    if(front){front.textContent=m.front;front.setAttribute('dir','ltr')}
    if(back){back.textContent=m.back;back.setAttribute('dir','rtl')}
  }

  function ensureDualDraw(root,s,m){
    if(!['trace','draw','hear-draw'].includes(s.stage))return;
    const card=root.querySelector('.lit36-canvas-card');if(!card)return;
    const key=`${s.mode}:${s.stage}:${s.index}`,guide=s.stage==='trace';
    const valid=card.querySelectorAll('[data-v48-canvas]').length===2&&card.dataset.v48Key===key;
    if(!valid){
      card.dataset.v48Key=key;s._v48DrawKey=key;s._v48Drawn=[false,false];s.drawn=false;
      card.innerHTML=`<div class="lit48-draw-grid"><section class="lit48-draw-field"><header><span>01</span><b>${esc(m.firstLabel)}</b></header><div class="lit48-draw-surface">${guide?`<span class="lit48-guide">${esc(m.first)}</span>`:''}<canvas data-v48-canvas="0" width="720" height="720"></canvas></div></section><section class="lit48-draw-field"><header><span>02</span><b>${esc(m.secondLabel)}</b></header><div class="lit48-draw-surface">${guide?`<span class="lit48-guide lit48-guide-word">${esc(m.second)}</span>`:''}<canvas data-v48-canvas="1" width="720" height="720"></canvas></div></section></div>`;
    }
    const heading=root.querySelector('.lit36-practice-head > strong');if(heading)heading.textContent=m.front;
    card.querySelectorAll('[data-v48-canvas]').forEach(c=>bindCanvas(c,Number(c.dataset.v48Canvas),s,key));
  }

  function mount({root}){const s=literacy();if(!s||!['letters','numbers'].includes(s.mode))return;const m=model(s);if(!m)return;ensureLearn(root,s,m);ensureDualDraw(root,s,m)}
  UI.registerFeature('literacy-audio-draw-v48',{mount});

  const synth=window.speechSynthesis;
  if(synth&&typeof synth.speak==='function'&&!synth.__liplipV48FaceAudio){
    const previous=synth.speak.bind(synth);
    synth.speak=utterance=>{
      try{
        const s=literacy(),m=model(s);
        if(m&&s?.stage==='learn'){
          const u=new SpeechSynthesisUtterance(s.face?m.englishSpeech:m.arabicSpeech);
          u.lang=s.face?'en-US':'ar-IQ';u.rate=s.face?0.82:0.78;u.pitch=1.02;u.volume=utterance?.volume??1;
          return previous(u);
        }
        if(m&&s?.mode==='letters'&&utterance&&/^[A-Z]$/.test(String(utterance.text||''))){
          const u=new SpeechSynthesisUtterance(String(utterance.text).toLowerCase());
          u.lang='en-US';u.rate=utterance.rate;u.pitch=utterance.pitch;u.volume=utterance.volume;return previous(u);
        }
      }catch{}
      return previous(utterance);
    };
    Object.defineProperty(synth,'__liplipV48FaceAudio',{value:true});
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>{const s=literacy(),m=model(s);if(s&&m&&['trace','draw','hear-draw'].includes(s.stage))ensureDualDraw(app,s,m)}).observe(app,{childList:true,subtree:true});
})();
