/* v46: first-attempt assessment scoring, bilingual literacy faces, dual drawing fields. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;
  if(!UI||typeof LiplipProgress==='undefined'||typeof LiplipCourse==='undefined')return;
  const t=(ar,en)=>UI.t(ar,en);
  const META_KEY='liplip-v45-progression';

  const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LATIN_AR=[
    ['أ','ألف'],['ب','باء'],['س','سين'],['د','دال'],['ي','ياء'],['ف','فاء'],['ج','جيم'],['هـ','هاء'],['ا','ألف'],['ج','جيم'],['ك','كاف'],['ل','لام'],['م','ميم'],['ن','نون'],['و','واو'],['ب','باء'],['ق','قاف'],['ر','راء'],['س','سين'],['ت','تاء'],['و','واو'],['ف','فاء'],['و','واو'],['كس','إكس'],['ي','ياء'],['ز','زاي']
  ];
  const EN_NUM=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine','thirty','thirty-one','thirty-two','thirty-three','thirty-four'];
  const AR_NUM=['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر','عشرون','واحد وعشرون','اثنان وعشرون','ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون','ثمانية وعشرون','تسعة وعشرون','ثلاثون','واحد وثلاثون','اثنان وثلاثون','ثلاثة وثلاثون','أربعة وثلاثون'];
  const arabicDigits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);

  function literacyPair(s){
    if(s.mode==='letters'){
      const upper=LETTERS[Math.max(0,Math.min(25,Number(s.index)||0))]||'A';
      const [glyph,name]=LATIN_AR[LETTERS.indexOf(upper)]||['أ','ألف'];
      return {front:upper+upper.toLowerCase(),back:`${glyph} ${name}`,first:upper,second:upper.toLowerCase(),firstLabel:t('الحرف الكبير','Capital letter'),secondLabel:t('الحرف الصغير','Small letter')};
    }
    const n=Math.max(0,Math.min(34,Number(s.index)||0));
    return {front:`${n} ${EN_NUM[n]}`,back:`${arabicDigits(n)} ${AR_NUM[n]}`,first:String(n),second:EN_NUM[n],firstLabel:t('الرقم','Number'),secondLabel:t('اسم الرقم','Number name')};
  }

  function decorateLearn(root,s){
    if(s.stage!=='learn')return;
    const p=literacyPair(s),front=root.querySelector('.lit36-face.front b'),back=root.querySelector('.lit36-face.back b');
    if(front)front.textContent=p.front;
    if(back){back.textContent=p.back;back.setAttribute('dir','rtl');}
  }

  function setupCanvas(canvas,index,s,key){
    if(!canvas||canvas.dataset.v46Bound)return;canvas.dataset.v46Bound='1';
    const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#17131f';ctx.lineWidth=18;
    let down=false,last=null;
    const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return{x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height}};
    const sync=()=>{if(s._v46DrawKey!==key){s._v46DrawKey=key;s._v46Drawn=[false,false]}s.drawn=!!(s._v46Drawn?.[0]&&s._v46Drawn?.[1]);};
    canvas.addEventListener('pointerdown',e=>{down=true;last=pos(e);e.preventDefault()});
    canvas.addEventListener('pointermove',e=>{if(!down)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;if(s._v46DrawKey!==key){s._v46DrawKey=key;s._v46Drawn=[false,false]}s._v46Drawn[index]=true;sync();e.preventDefault()});
    const end=()=>{down=false;last=null;sync()};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',end);
  }

  function decorateDraw(root,s){
    if(!['trace','draw','hear-draw'].includes(s.stage))return;
    const p=literacyPair(s),card=root.querySelector('.lit36-canvas-card');if(!card)return;
    const key=`${s.mode}:${s.stage}:${s.index}`;
    if(s._v46DrawKey!==key){s._v46DrawKey=key;s._v46Drawn=[false,false];s.drawn=false;}
    const heading=root.querySelector('.lit36-practice-head > strong');if(heading)heading.textContent=p.front;
    const showGuide=s.stage==='trace';
    if(card.dataset.v46Key!==key){
      card.dataset.v46Key=key;
      card.innerHTML=`<div class="lit46-draw-grid"><section class="lit46-draw-field"><header><span>01</span><b>${UI.escapeHTML(p.firstLabel)}</b></header><div class="lit46-draw-surface">${showGuide?`<span class="lit46-guide">${UI.escapeHTML(p.first)}</span>`:''}<canvas id="lit36-canvas" data-v46-canvas="0" width="720" height="720"></canvas></div></section><section class="lit46-draw-field"><header><span>02</span><b>${UI.escapeHTML(p.secondLabel)}</b></header><div class="lit46-draw-surface">${showGuide?`<span class="lit46-guide lit46-guide-word">${UI.escapeHTML(p.second)}</span>`:''}<canvas id="lit46-canvas-2" data-v46-canvas="1" width="720" height="720"></canvas></div></section></div>`;
    }
    card.querySelectorAll('[data-v46-canvas]').forEach(c=>setupCanvas(c,Number(c.dataset.v46Canvas),s,key));
  }

  /* Sticky first-attempt scoring for normal boxes and review boxes. */
  const sticky=new Map();
  const boxIdFromProgress=progress=>LiplipProgress.courseSnapshot(progress).currentBox;
  const qList=(boxId,phase,process)=>{const c=LiplipCourse.getContent(boxId);return phase==='vocabulary'?(c.vocabulary?.questions||[]):phase==='grammar'?(c.grammar?.questions||[]):process==='video'?(c.watchRead?.videoQuestions||[]):(c.watchRead?.storyQuestions||[])};
  const formQuestionIndex=form=>{const named=[...form.elements].map(x=>x.name).find(Boolean)||'';const m=/^q(\d+)/.exec(named);return m?Number(m[1]):0};
  const normal=s=>String(s??'').trim().toLocaleLowerCase().replace(/[\s\u064B-\u065F]+/g,' ');
  function answerCorrect(form,q,index){
    if(!q)return false;const fd=new FormData(form),name='q'+index;
    if(q.type==='match')return (q.matches||[]).every((_,j)=>Number(fd.get(`${name}:${j}`))===j);
    const v=String(fd.get(name)||'').trim();
    if(['mcq','trueFalse'].includes(q.type)&&Array.isArray(q.options)&&q.options.length)return v!==''&&Number(v)===Number(q.correct);
    return v!==''&&normal(v)===normal(q.answer);
  }
  const stickyKey=(box,phase,process)=>`${box}:${phase}:${process}`;
  function markCurrentCourse(form,progress){
    if(!form||form.id!=='course-exam-form')return null;const box=boxIdFromProgress(progress);if(!box)return null;
    const phase=form.dataset.phase,process=form.dataset.process||'exam',items=qList(box,phase,process),index=formQuestionIndex(form),key=stickyKey(box,phase,process);
    if(!sticky.has(key))sticky.set(key,new Set());const wrong=sticky.get(key);if(!answerCorrect(form,items[index],index))wrong.add(index);
    return{box,phase,process,total:Math.max(1,items.length),wrong,key,index};
  }

  if(!LiplipCourse.__v46Sticky){
    const baseClick=LiplipCourse.click.bind(LiplipCourse),baseSubmit=LiplipCourse.submit.bind(LiplipCourse),baseRecord=LiplipProgress.recordCourseProcess.bind(LiplipProgress);
    let ctx=null;
    LiplipCourse.click=function(action,target,progress,onUpdate){
      if(action==='item-next')markCurrentCourse(target.closest?.('form'),progress);
      if(action==='result-repeat'){const box=LiplipProgress.courseLocation?.(LiplipProgress.courseSnapshot(progress).currentBox||0);for(const key of [...sticky.keys()])if(key.startsWith(`${LiplipProgress.courseSnapshot(progress).currentBox}:`))sticky.delete(key);}
      return baseClick(action,target,progress,onUpdate);
    };
    LiplipCourse.submit=function(form,progress){
      const m=markCurrentCourse(form,progress);ctx=m;
      if(m){const ceiling=Math.round((m.total-m.wrong.size)/m.total*100);if(ceiling<70){ctx=null;alert(t(`هذه المحاولة حدها الأقصى ${ceiling}% لأن الإجابة الخاطئة أو المتروكة تبقى خاطئة حتى بعد تصحيحها.`,`This attempt is capped at ${ceiling}% because a wrong or skipped answer stays wrong even after correction.`));return{};}}
      const out=baseSubmit(form,progress);ctx=null;return out;
    };
    LiplipProgress.recordCourseProcess=function(raw,payload){
      if(ctx&&payload.boxId===ctx.box&&payload.phase===ctx.phase){const ceiling=Math.round((ctx.total-ctx.wrong.size)/ctx.total*100);payload={...payload,score:Math.min(Number(payload.score)||0,ceiling)};}
      return baseRecord(raw,payload);
    };
    Object.defineProperty(LiplipCourse,'__v46Sticky',{value:true});
  }

  function decorateCourseExam(root){
    root.querySelectorAll('#course-exam-form').forEach(form=>{
      form.querySelectorAll('[required]').forEach(x=>x.removeAttribute('required'));
      if(!form.querySelector('[data-v46-skip]')){
        const nav=form.querySelector('.course-item-nav');if(nav){const b=document.createElement('button');b.type='button';b.dataset.v46Skip='1';b.className='v46-skip';b.textContent=t('تخطي السؤال','Skip question');nav.insertBefore(b,nav.lastElementChild);}
      }
    });
  }

  /* Milestone/final exams: explicit check/skip marks first wrong permanently for this exam opening. */
  function decorateBigExam(root=document){
    root.querySelectorAll?.('.v45-exam-layer').forEach(layer=>{
      const form=layer.querySelector('#v45-exam-form');if(!form)return;form.querySelectorAll('[required]').forEach(x=>x.removeAttribute('required'));layer._v46Wrong=layer._v46Wrong||new Set();
      [...form.querySelectorAll('fieldset')].forEach((fs,i)=>{if(fs.querySelector('.v46-exam-question-actions'))return;const row=document.createElement('div');row.className='v46-exam-question-actions';row.innerHTML=`<button type="button" data-v46-exam-check="${i}">${t('تحقق','Check')}</button><button type="button" data-v46-exam-skip="${i}">${t('تخطي','Skip')}</button><small>${t('أول خطأ أو تخطي يبقى محسوباً كخطأ.','A first wrong answer or skip remains wrong.')}</small>`;fs.appendChild(row);});
    });
  }
  function bigExamCorrect(layer,i){const q=layer._questions?.[i],form=layer.querySelector('#v45-exam-form');if(!q||!form)return false;const v=new FormData(form).get(`q${i}`);return q.options?.length?String(v??'')!==''&&Number(v)===Number(q.correct):String(v||'').trim()!==''&&normal(v)===normal(q.answer)}
  function adjustedBigExam(layer){const qs=layer._questions||[],form=layer.querySelector('#v45-exam-form');if(!form)return 0;let good=0;qs.forEach((q,i)=>{if(!layer._v46Wrong?.has(i)&&bigExamCorrect(layer,i))good++});return Math.round(good/Math.max(1,qs.length)*100)}
  function rating(score){return score<=40?'bad':score<=60?'good':score<=70?'very-good':score<=80?'excellent':score<=90?'incredible':'master'}
  function applyAdjustedExamResult(layer){if(layer._v46Adjusted==null||!layer.querySelector('.v45-exam-result')||layer.dataset.v46AdjustedDone)return;layer.dataset.v46AdjustedDone='1';const score=layer._v46Adjusted,pass=score>=70,level=Number(layer.dataset.level),end=Number(layer.dataset.end),key=`${level}:${end}`;if(!pass){const meta=UI.storage.get(META_KEY,{literacy:{letters:false,numbers:false},exams:{}});if(meta.exams)delete meta.exams[key];UI.storage.set(META_KEY,meta);}const card=layer.querySelector('.v45-exam-result');card.className=`v45-exam-result ${rating(score)}`;card.querySelector('span')?.replaceChildren(document.createTextNode(score<=40?t('سيئ — يجب الإعادة','Bad — must repeat'):score<=60?t('جيد','Good'):score<=70?t('جيد جداً','Very good'):score<=80?t('ممتاز','Excellent'):score<=90?t('مذهل','Incredible'):t('متقن','Master')));if(!pass){const h=card.querySelector('h1');if(h)h.textContent=t('أعد المحاولة','Try again');const p=card.querySelector('p');if(p)p.textContent=t('تحتاج إلى ممتاز أو أعلى. الإجابة الخاطئة أو المتروكة بقيت محسوبة كخطأ.','Excellent or higher is required. Wrong or skipped answers remain wrong.');const actions=card.querySelector('div')||card; if(!card.querySelector('[data-v45-exam-retry]')){const b=document.createElement('button');b.className='primary';b.dataset.v45ExamRetry='';b.dataset.level=String(level);b.dataset.end=String(end);b.textContent=t('إعادة بأسئلة جديدة','Retry with new questions');actions.appendChild(b);}}
  }

  function mount({root}){const s=window.LiplipLiteracy;if(s&&(s.mode==='letters'||s.mode==='numbers')){decorateLearn(root,s);decorateDraw(root,s)}decorateCourseExam(root);decorateBigExam(document);document.querySelectorAll('.v45-exam-layer').forEach(applyAdjustedExamResult);}
  UI.registerFeature('assessment-literacy-v46',{mount});

  UI.delegate('click','[data-v46-skip]',(e,b)=>{e.preventDefault();const form=b.closest('form');if(!form)return;const next=form.querySelector('[data-course="item-next"]');if(next)next.click();else form.requestSubmit()});
  UI.delegate('click','[data-v46-exam-check]',(e,b)=>{const layer=b.closest('.v45-exam-layer'),i=Number(b.dataset.v46ExamCheck),fs=b.closest('fieldset');if(!layer)return;const ok=bigExamCorrect(layer,i);if(!ok)layer._v46Wrong.add(i);fs?.classList.remove('correct','wrong');fs?.classList.add(ok?'correct':'wrong');b.textContent=ok?t('صحيح','Correct'):t('خطأ — يمكنك إعادة الإجابة','Wrong — you can reanswer')});
  UI.delegate('click','[data-v46-exam-skip]',(e,b)=>{const layer=b.closest('.v45-exam-layer'),i=Number(b.dataset.v46ExamSkip),fs=b.closest('fieldset');if(!layer)return;layer._v46Wrong.add(i);fs?.classList.remove('correct');fs?.classList.add('wrong','v46-skipped');b.textContent=t('تم التخطي — محسوب خطأ','Skipped — counted wrong')});
  UI.delegate('click','[data-lit36="clear-draw"]',()=>{const s=window.LiplipLiteracy;if(!s)return;s._v46Drawn=[false,false];s.drawn=false;document.querySelectorAll('[data-v46-canvas]').forEach(c=>c.getContext('2d')?.clearRect(0,0,c.width,c.height))});

  /* Runs after v45's submit listener, caches the sticky-adjusted score before its delayed result render. */
  document.addEventListener('submit',e=>{if(e.target?.id!=='v45-exam-form')return;const layer=e.target.closest('.v45-exam-layer');if(!layer)return;layer._v46Adjusted=adjustedBigExam(layer);},true);
  new MutationObserver(()=>{decorateBigExam(document);document.querySelectorAll('.v45-exam-layer').forEach(applyAdjustedExamResult)}).observe(document.body,{childList:true,subtree:true});
})();
