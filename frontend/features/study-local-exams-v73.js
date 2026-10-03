/* Build 112: local study/exam engine with accessible, playful vocabulary interactions. */
(() => {
  'use strict';
  if (!window.LiplipCourse || !window.LiplipCourse57) return;

  const Course = window.LiplipCourse;
  const S = window.LiplipCourse57;
  const STORE = 'liplip-course-content-v2';
  const STRIDE = 200;
  const T = (ar,en) => window.LiplipFrontend?.t ? window.LiplipFrontend.t(ar,en) : (localStorage.getItem('liplip-ui-language') === 'en' ? en : ar);
  const esc = v => window.LiplipFrontend?.escapeHTML ? window.LiplipFrontend.escapeHTML(v) : String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').trim().toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[.,?!؟؛:()"'’“”\-_]/g,'').replace(/\s+/g,' ');
  const gid = (level,box) => (Number(level)-1)*STRIDE+Number(box);
  const rawStore = () => { try { const x=JSON.parse(localStorage.getItem(STORE)||'{}'); return x&&typeof x==='object'?x:{} } catch { return {} } };
  const saveStore = x => localStorage.setItem(STORE,JSON.stringify(x));

  const oldGetContent = Course.getContent.bind(Course);
  Course.getContent = id => {
    const base = oldGetContent(id);
    const raw = rawStore()[String(id)] || {};
    const wr = raw.watchRead || {};
    const questions = Array.isArray(wr.questions) ? wr.questions : [];
    const videoQuestions = Array.isArray(wr.videoQuestions) ? wr.videoQuestions : questions;
    const storyQuestions = Array.isArray(wr.storyQuestions) ? wr.storyQuestions : questions;
    return {
      ...base,
      vocabulary:{...base.vocabulary,questions:Array.isArray(raw.vocabulary?.questions)?raw.vocabulary.questions:[]},
      grammar:{...base.grammar,questions:Array.isArray(raw.grammar?.questions)?raw.grammar.questions:[]},
      watchRead:{...base.watchRead,questions,videoQuestions,storyQuestions}
    };
  };

  const HEADERS = {
    vocabulary:['Level','Box','English','Arabic'],
    grammar:['Level','Box','Title','Rule','Normal Formula','Negative Formula','Question Formula','Notes','Examples'],
    watchRead:['Level','Box','Video Link','Story Text','Question Title','Correct Answer','Option 1','Option 2','Option 3','Option 4']
  };
  Course.HEADERS = {...Course.HEADERS,...HEADERS};

  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function takeRandom(source,count){if(!source.length)return[];const out=[];let pool=[];while(out.length<count){if(!pool.length)pool=shuffle(source);out.push(pool.shift())}return out}
  function distance(a,b){a=norm(a);b=norm(b);const r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let p=r[0];r[0]=i;for(let j=1;j<=b.length;j++){const o=r[j];r[j]=Math.min(r[j]+1,r[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=o}}return r[b.length]}
  function textMatch(a,b){const x=norm(a),y=norm(b);if(x===y)return true;if(Math.max(x.length,y.length)>=6&&distance(x,y)<=1)return true;return false}

  const LETTER_NAMES={a:['a','ay','eigh'],b:['b','bee'],c:['c','see','sea'],d:['d','dee'],e:['e','ee'],f:['f','eff'],g:['g','gee'],h:['h','aitch'],i:['i','eye'],j:['j','jay'],k:['k','kay'],l:['l','el'],m:['m','em'],n:['n','en'],o:['o','oh'],p:['p','pee'],q:['q','cue','queue'],r:['r','are'],s:['s','ess'],t:['t','tee'],u:['u','you'],v:['v','vee'],w:['w','double you'],x:['x','ex'],y:['y','why'],z:['z','zee','zed']};
  function speechMatch(heard,expected){const h=norm(heard),e=norm(expected);if(textMatch(h,e))return true;if(e.length===1&&/[a-z]/.test(e))return (LETTER_NAMES[e]||[]).some(x=>norm(x)===h);if(/^\d+$/.test(e)){const names=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','twenty one','twenty two','twenty three','twenty four','twenty five','twenty six','twenty seven','twenty eight','twenty nine','thirty','thirty one','thirty two','thirty three','thirty four'];return norm(names[Number(e)]||'')===h}return false}

  function recognize(expected,cb){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){cb(false,'',T('التعرّف الصوتي غير مدعوم في هذا المتصفح.','Speech recognition is not supported in this browser.'));return}const r=new R();r.lang='en-US';r.interimResults=false;r.maxAlternatives=5;r.onresult=e=>{const alts=[...(e.results?.[0]||[])].map(x=>x.transcript||'');const heard=alts[0]||'';cb(alts.some(x=>speechMatch(x,expected)),heard,'')};r.onerror=()=>cb(false,'',T('تعذر سماع النطق. حاول مجدداً.','Could not hear the pronunciation. Try again.'));try{r.start()}catch{cb(false,'',T('تعذر تشغيل الميكروفون.','Could not start the microphone.'))}}
  window.LiplipSpeechRecognition={recognize,match:speechMatch};

  function nativeSpeak(text,lang='en-US'){const value=String(text||'').trim();if(!value||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(value);u.lang=lang;u.rate=lang.startsWith('ar')?.86:.92;window.speechSynthesis.speak(u)}catch{}}

  function examKey(kind){return `${S.boxId}:${S.review?'review':'normal'}:${S.phase}:${S.process}:${kind}`}
  function clearAttempt(){S.item=0;S.revealed=false;S.answer=null;S.feedback='';S.results=[];S._v73Status='';}

  function vocabExam(content){const ws=content.vocabulary?.items?.filter(x=>x.en&&x.ar)||[];const picked=takeRandom(ws,10);const types=['en_ar','ar_en','speak'];return picked.map((w,i)=>({kind:'vocab',type:types[i%3],word:w}))}
  function grammarExam(content){const examples=(content.grammar?.article?.examples||[]).map(x=>String(x?.text||x||'').trim()).filter(Boolean);return takeRandom(examples,10).map((sentence,i)=>{const parts=sentence.split(/\s+/);let idx=Math.min(parts.length-1,Math.max(0,(i*2+1)%Math.max(1,parts.length)));while(parts.length>1&&/^[\W_]+$/.test(parts[idx]))idx=(idx+1)%parts.length;const answer=parts[idx]||sentence;const shown=parts.map((x,j)=>j===idx?'_____':x).join(' ');return{kind:'grammar',type:'fill',prompt:shown,answer,sentence}})}
  function mediaExam(content,kind){const wr=content.watchRead||{};const list=(kind==='video'?(wr.videoQuestions||wr.questions):(wr.storyQuestions||wr.questions))||[];return list.filter(q=>q&&q.title&&q.answer).map(q=>({kind,type:'mcq',prompt:String(q.title),answer:String(q.answer),options:[q.option1,q.option2,q.option3,q.option4].map(String).filter(Boolean)}))}

  function ensureExam(kind){const k=examKey(kind);if(S._v73ExamKey===k&&Array.isArray(S.exam)&&S.exam.length)return;const c=Course.getContent(S.boxId);S._v73ExamKey=k;clearAttempt();if(kind==='vocabulary')S.exam=vocabExam(c);else if(kind==='grammar')S.exam=grammarExam(c);else S.exam=mediaExam(c,kind)}
  function score(){const a=S.results||[];return a.length?Math.round(a.filter(Boolean).length/a.length*100):0}

  function pager(total){return `<div class="c57-pager"><span>${T('سؤال','Question')}</span><b>${Math.min(S.item+1,total)} / ${Math.max(1,total)}</b><i><u style="width:${total?((S.item+1)/total*100):0}%"></u></i></div>`}
  function feedback(q){if(!S.revealed)return'';const ok=Boolean(S.results[S.item]);return `<div class="c57-feedback ${ok?'correct':'wrong'}"><strong>${ok?T('صحيح','Correct'):T('غير صحيح — صحح إجابتك','Not correct — correct your answer')}</strong>${!ok?`<p>${T('الإجابة الصحيحة','Correct answer')}: <b>${esc(q.answer||q.word?.[q.type==='en_ar'?'ar':'en']||'')}</b></p>`:''}${S.feedback?`<p>${esc(S.feedback)}</p>`:''}</div>`}
  function nextButton(total){if(!S.revealed||!S.results[S.item])return'';if(S.item>=total-1)return `<button class="primary" data-v73-summary>${T('عرض النتيجة','Show result')}</button>`;return `<button class="primary" data-v73-next>${T('التالي','Next')}</button>`}

  function soundIcon(){
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z"/><path d="M15 9.5a4 4 0 0 1 0 5"/><path d="M18 7a7 7 0 0 1 0 10"/></svg>';
  }
  function micIcon(){
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
  }
  function renderVocab(){
    ensureExam('vocabulary');
    const list=S.exam||[];
    if(S.answer==='v73-summary')return summary('vocabulary');
    const q=list[S.item];
    if(!q)return empty(T('لا توجد كلمات مفردات في هذا الصندوق.','No vocabulary words are available in this box.'));
    let body='';
    if(q.type==='en_ar'){
      body=`<div class="v112-vocab-prompt"><small>ENGLISH <i>→</i> العربية</small><h2 dir="ltr">${esc(q.word.en)}</h2></div><label class="c57-correction v112-vocab-write"><span>${T('اكتب الترجمة العربية','Write the Arabic translation')}</span><input id="v73-answer" dir="rtl" autocomplete="off" inputmode="text" value="${esc(S.answer||'')}"></label>`;
    }else if(q.type==='ar_en'){
      body=`<div class="v112-vocab-prompt"><small>العربية <i>→</i> ENGLISH</small><h2>${esc(q.word.ar)}</h2></div><label class="c57-correction v112-vocab-write"><span>${T('اكتب الترجمة الإنجليزية','Write the English translation')}</span><input id="v73-answer" dir="ltr" autocomplete="off" inputmode="text" value="${esc(S.answer||'')}"></label>`;
    }else{
      const listening=/Listening|استمع/.test(S.feedback||'');
      body=`<div class="v112-pronounce-card ${listening?'is-listening':''}">
        <div class="v112-sound-stage" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><span>${micIcon()}</span></div>
        <small>${T('تحدّي النطق','PRONUNCIATION CHALLENGE')}</small>
        <h2 dir="ltr">${esc(q.word.en)}</h2>
        <p>${T('استمع أولاً، ثم قل الكلمة بصوت واضح.','Listen first, then say the word clearly.')}</p>
        <div class="v112-speech-actions">
          <button type="button" data-v73-hear data-text="${esc(q.word.en)}" aria-label="${T('استمع إلى الكلمة','Hear the word')}">${soundIcon()}<span>${T('استمع','Listen')}</span></button>
          <button type="button" class="primary ${listening?'is-listening':''}" data-v73-pronounce data-expected="${esc(q.word.en)}" aria-label="${T('ابدأ نطق الكلمة','Start pronunciation')}">${micIcon()}<span>${listening?T('أستمع إليك…','Listening…'):T('قل الكلمة','Say the word')}</span></button>
        </div>
      </div>`;
    }
    const check=q.type==='speak'?'':`<button class="primary" data-v73-check>${S.revealed&&!S.results[S.item]?T('تحقق مرة أخرى','Check again'):T('تحقق','Check')}</button>`;
    return examShell(T('اختبار المفردات','Vocabulary exam'),list.length,`<article class="c57-question v112-vocab-question v112-${q.type}">${body}${feedback(q)}</article><nav class="c57-question-next v112-vocab-actions">${check}${nextButton(list.length)}</nav>`);
  }

  function renderGrammar(){ensureExam('grammar');const list=S.exam||[];if(S.answer==='v73-summary')return summary('grammar');const q=list[S.item];if(!q)return empty(T('أضف جمل أمثلة للقواعد حتى ينشئ الموقع الأسئلة.','Add grammar example sentences so the site can build questions.'));return examShell(T('اختبار القواعد','Grammar exam'),list.length,`<article class="c57-question"><small>${T('من أمثلة القاعدة','From the grammar examples')}</small><h2 dir="ltr">${esc(q.prompt)}</h2><label class="c57-correction"><span>${T('اكتب الكلمة الناقصة','Write the missing word')}</span><input id="v73-answer" dir="ltr" autocomplete="off" value="${esc(S.answer||'')}"></label>${feedback(q)}</article><nav class="c57-question-next"><button class="primary" data-v73-check>${S.revealed&&!S.results[S.item]?T('تحقق مرة أخرى','Check again'):T('تحقق','Check')}</button>${nextButton(list.length)}</nav>`)}

  function renderMedia(kind){ensureExam(kind);const list=S.exam||[];if(S.answer==='v73-summary')return summary(kind);const q=list[S.item];if(!q)return empty(T('لا توجد أسئلة اختيار من متعدد لهذا المحتوى. أضفها من مخطط Excel.','No multiple-choice questions are available. Add them with the Excel schema.'));const opts=shuffle([...new Set([q.answer,...q.options])]).slice(0,4);if(!q._opts)q._opts=opts;return examShell(kind==='video'?T('اختبار الفيديو','Video exam'):T('اختبار القصة','Story exam'),list.length,`<article class="c57-question"><small>MCQ</small><h2>${esc(q.prompt)}</h2><div class="c57-options">${q._opts.map((x,i)=>`<button data-v73-option data-value="${esc(x)}" class="${S.answer===x?'selected':''}"><span>${esc(x)}</span></button>`).join('')}</div>${feedback(q)}</article><nav class="c57-question-next"><button class="primary" data-v73-check ${S.answer==null?'disabled':''}>${S.revealed&&!S.results[S.item]?T('تحقق مرة أخرى','Check again'):T('تحقق','Check')}</button>${nextButton(list.length)}</nav>`)}

  function examShell(title,total,body){return `<section class="c57-exam c57-ai-exam v73-local-exam"><header><span>${T('اختبار محلي','LOCAL EXAM')}</span><h1>${esc(title)}</h1><p>${T('سؤال واحد في كل مرة. يمكنك تصحيح الإجابة الخاطئة قبل المتابعة.','One question at a time. Wrong answers can be corrected before continuing.')}</p></header>${pager(total)}${body}</section>`}
  function empty(text){return `<section class="c57-ai-start v73-local-exam"><h1>${T('المحتوى غير مكتمل','Content needed')}</h1><p>${esc(text)}</p></section>`}
  function summary(kind){const total=(S.exam||[]).length,sc=score();return `<section class="c57-summary ${sc>=60?'pass':'fail'}"><span>${sc>=60?'✓':'↻'}</span><h1>${T('نتيجة الاختبار','Exam result')}</h1><strong>${sc}%</strong><p>${T(`أجبت عن ${S.results.filter(Boolean).length} من ${total} بشكل صحيح.`,`You answered ${S.results.filter(Boolean).length} of ${total} correctly.`)}</p><div class="c57-complete-actions"><button data-v73-retry data-kind="${kind}">${T('إعادة الاختبار','Retry exam')}</button><button class="primary" data-course="finish-exam" data-score="${sc}">${T('إنهاء والمتابعة','Finish and continue')}</button></div></section>`}

  function shouldCustom(){if(!S.boxId)return null;if(S.phase==='vocabulary'&&Number(S.process)===1)return'vocabulary';if(S.phase==='grammar'&&Number(S.process)===1)return'grammar';if(S.phase==='watchRead'&&Number(S.mediaStep)===1)return Number(S.process)===0?'video':'story';return null}
  function mount(){const ws=document.querySelector('.c57-workspace');if(!ws)return;const kind=shouldCustom();if(kind){const key=`${examKey(kind)}:${S.item}:${S.revealed}:${S.answer}:${S.results?.[S.item]}:${S.feedback||''}`;if(ws.dataset.v73Key!==key){ws.dataset.v73Key=key;ws.innerHTML=kind==='vocabulary'?renderVocab():kind==='grammar'?renderGrammar():renderMedia(kind)}}else delete ws.dataset.v73Key;
    document.querySelectorAll('.c57-manager p').forEach(p=>{if(/Gemini|جيميني/i.test(p.textContent||''))p.textContent=T('الموقع ينشئ الاختبارات محلياً من محتوى الصندوق. أسئلة الفيديو والقصة تأتي من ملف Excel.','The site builds exams locally from box content. Video and story MCQs come from the Excel file.')});
    document.querySelectorAll('.c57-schema-grid article').forEach(a=>{const b=a.querySelector('[data-phase="watchRead"]');if(b){const s=a.querySelector('small');if(s)s.textContent=HEADERS.watchRead.join(' · ')}});
    document.querySelectorAll('.c57-media p').forEach(p=>{p.textContent=(Number(S.process)===0)?T('شاهد بتركيز ثم ابدأ الأسئلة المحفوظة لهذا الصندوق.','Watch carefully, then answer the saved questions for this box.'):T('اقرأ النص ثم ابدأ الأسئلة المحفوظة لهذا الصندوق.','Read the story, then answer the saved questions for this box.')});
    document.querySelectorAll('[data-course="media-exam"]').forEach(b=>{b.textContent=T('ابدأ الاختبار','Start exam')});
  }

  function checkCurrent(){const kind=shouldCustom(),q=S.exam?.[S.item];if(!q)return;if(kind==='vocabulary'){if(q.type==='speak')return;const value=document.getElementById('v73-answer')?.value||'';S.answer=value;const expected=q.type==='en_ar'?q.word.ar:q.word.en;const ok=textMatch(value,expected);S.results[S.item]=ok;S.revealed=true;S.feedback=ok?T('إجابة صحيحة','Correct answer'):T('عدّل إجابتك ثم تحقق مرة أخرى.','Edit your answer, then check again.')}else if(kind==='grammar'){const value=document.getElementById('v73-answer')?.value||'';S.answer=value;const ok=textMatch(value,q.answer);S.results[S.item]=ok;S.revealed=true;S.feedback=ok?T('صحيح','Correct'):T('صحح الكلمة ثم تحقق مرة أخرى.','Correct the word, then check again.')}else{const ok=textMatch(S.answer,q.answer);S.results[S.item]=ok;S.revealed=true;S.feedback=ok?T('إجابة صحيحة','Correct answer'):T('اختر إجابة أخرى وحاول مرة ثانية.','Choose another answer and try again.')}window.render?.(false)}

  document.addEventListener('click',e=>{
    const inStudy=Boolean(document.querySelector('.c57-zone'));
    const speak=e.target.closest?.('[data-course="speak"]');if(inStudy&&speak){e.preventDefault();e.stopImmediatePropagation();nativeSpeak(speak.dataset.text,speak.dataset.lang||'en-US');return}
    const media=e.target.closest?.('[data-course="media-exam"]');if(inStudy&&media){e.preventDefault();e.stopImmediatePropagation();S.mediaStep=1;S.exam=null;S._v73ExamKey='';clearAttempt();window.render?.(false);return}
    if(e.target.closest?.('[data-v73-check]')){e.preventDefault();e.stopImmediatePropagation();checkCurrent();return}
    const opt=e.target.closest?.('[data-v73-option]');if(opt){e.preventDefault();e.stopImmediatePropagation();S.answer=opt.dataset.value;S.revealed=false;S.feedback='';window.render?.(false);return}
    if(e.target.closest?.('[data-v73-next]')){e.preventDefault();e.stopImmediatePropagation();S.item++;S.answer=null;S.revealed=false;S.feedback='';window.render?.(false);return}
    if(e.target.closest?.('[data-v73-summary]')){e.preventDefault();e.stopImmediatePropagation();S.answer='v73-summary';window.render?.(false);return}
    const retry=e.target.closest?.('[data-v73-retry]');if(retry){e.preventDefault();e.stopImmediatePropagation();S._v73ExamKey='';S.exam=null;S.answer=null;clearAttempt();window.render?.(false);return}
    const hear=e.target.closest?.('[data-v73-hear]');if(hear){e.preventDefault();e.stopImmediatePropagation();nativeSpeak(hear.dataset.text,'en-US');return}
    const pr=e.target.closest?.('[data-v73-pronounce]');if(pr){e.preventDefault();e.stopImmediatePropagation();S.feedback=T('استمع…','Listening…');mount();recognize(pr.dataset.expected,(ok,heard,error)=>{S.results[S.item]=ok;S.revealed=true;S.feedback=error||(ok?T(`سمعت: ${heard} — صحيح`,`Heard: ${heard} — correct`):T(`سمعت: ${heard}. حاول مرة أخرى.`,`Heard: ${heard}. Try again.`));window.render?.(false)});return}
    const schema=e.target.closest?.('[data-course="schema-download"]');if(schema){e.preventDefault();e.stopImmediatePropagation();downloadTemplate(schema.dataset.phase).catch(console.error);return}
  },true);

  function csv(rows){return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')}
  function sampleRows(kind){if(kind==='vocabulary')return[HEADERS.vocabulary,[1,1,'hello','مرحباً'],[1,1,'family','عائلة']];if(kind==='grammar')return[HEADERS.grammar,[1,1,'Present simple','Use for routines and facts.','Subject + verb + object.','Subject + do/does not + verb.','Do/Does + subject + verb?','Use does with he/she/it.','I study English every day.|She reads a book at school.']];return[HEADERS.watchRead,[1,1,'https://www.youtube.com/watch?v=VIDEO_ID','Ali studies English every morning.','What does Ali study?','English','English','Math','Science','History'],[1,1,'https://www.youtube.com/watch?v=VIDEO_ID','Ali studies English every morning.','When does Ali study?','every morning','every morning','at night','at noon','on Friday']]}
  async function downloadTemplate(kind){const rows=sampleRows(kind);if(typeof JSZip==='undefined'){const blob=new Blob([csv(rows)],{type:'text/csv;charset=utf-8'});download(blob,`liplip-${kind}-schema.csv`);return}const xmlEsc=v=>String(v??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>`<c r="${col(ci)}${ri+1}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;const z=new JSZip();z.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');z.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');z.file('xl/workbook.xml','<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Content" sheetId="1" r:id="rId1"/></sheets></workbook>');z.file('xl/_rels/workbook.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');z.file('xl/worksheets/sheet1.xml',sheet);download(await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`liplip-${kind}-schema.xlsx`)}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}

  function parseCSV(text){const rows=[];let row=[],cell='',q=false;for(let i=0;i<=text.length;i++){const ch=text[i]??'\n';if(ch==='"'&&q&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=!q;else if(ch===','&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>String(x).trim()))rows.push(row);row=[]}else cell+=ch}return rows}
  async function parseXLSX(file){const z=await JSZip.loadAsync(await file.arrayBuffer()),read=async p=>z.file(p)?.async('string');const ss=await read('xl/sharedStrings.xml'),shared=[];if(ss){const d=new DOMParser().parseFromString(ss,'application/xml');d.querySelectorAll('si').forEach(si=>shared.push([...si.querySelectorAll('t')].map(x=>x.textContent).join('')))}const sh=await read('xl/worksheets/sheet1.xml');if(!sh)throw Error('Excel file needs a first worksheet.');const d=new DOMParser().parseFromString(sh,'application/xml'),rows=[];d.querySelectorAll('row').forEach(n=>{const out=[];n.querySelectorAll('c').forEach(c=>{const ref=c.getAttribute('r')||'A1',letters=/^[A-Z]+/.exec(ref)?.[0]||'A';let ix=0;for(const x of letters)ix=ix*26+x.charCodeAt(0)-64;ix--;const type=c.getAttribute('t'),v=c.querySelector('v')?.textContent||'',inline=[...c.querySelectorAll('t')].map(x=>x.textContent).join('');out[ix]=type==='s'?shared[Number(v)]||'':type==='inlineStr'?inline:v});rows.push(out)});return rows}
  async function importRows(rows){if(rows.length<2)return;const headers=rows[0].map(x=>String(x||'').trim().toLowerCase());const map=Object.fromEntries(headers.map((h,i)=>[h,i]));const store=rawStore();const get=(r,n)=>String(r[map[n]]??'').trim();for(const r of rows.slice(1)){const level=Number(get(r,'level')),box=Number(get(r,'box'));if(!level||!box)continue;const id=String(gid(level,box)),current=store[id]||oldGetContent(Number(id));if(map.english!=null&&map.arabic!=null){current.vocabulary=current.vocabulary||{items:[]};current.vocabulary.items=current.vocabulary.items||[];const en=get(r,'english'),ar=get(r,'arabic');if(en&&ar&&!current.vocabulary.items.some(x=>norm(x.en)===norm(en)))current.vocabulary.items.push({type:'word',order:current.vocabulary.items.length+1,en,ar,voice:en})}else if(map.examples!=null){const a=current.grammar?.article||{};current.grammar={article:{...a,title:get(r,'title')||a.title,rule:get(r,'rule')||a.rule,normal:get(r,'normal formula')||a.normal,negative:get(r,'negative formula')||a.negative,question:get(r,'question formula')||a.question,notes:get(r,'notes').split('|').map(x=>x.trim()).filter(Boolean),examples:get(r,'examples').split('|').map(x=>({text:x.trim()})).filter(x=>x.text)}}}else if(map['video link']!=null){const title=get(r,'question title'),answer=get(r,'correct answer'),q={title,answer,option1:get(r,'option 1'),option2:get(r,'option 2'),option3:get(r,'option 3'),option4:get(r,'option 4')};current.watchRead=current.watchRead||{};const link=get(r,'video link'),story=get(r,'story text');if(link)current.watchRead.video={...(current.watchRead.video||{}),youtube:link,title:current.watchRead.video?.title||`Box ${box} video`};if(story)current.watchRead.story=[{order:1,title:`Box ${box} story`,text:story,arabic:''}];current.watchRead.questions=current.watchRead.questions||[];if(title&&answer)current.watchRead.questions.push(q);current.watchRead.videoQuestions=current.watchRead.questions;current.watchRead.storyQuestions=current.watchRead.questions}store[id]=current}saveStore(store)}

  document.addEventListener('change',e=>{const input=e.target.closest?.('[data-course-manager-import]');if(!input||!input.files?.[0])return;e.stopImmediatePropagation();const file=input.files[0];(async()=>{const rows=/\.csv$/i.test(file.name)?parseCSV(await file.text()):await parseXLSX(file);await importRows(rows);S.manager=false;S.error='';window.render?.(false)})().catch(err=>{S.error=String(err.message||err);window.render?.(false)})},true);

  const observer=new MutationObserver(()=>requestAnimationFrame(mount));
  const start=()=>{if(!document.body)return;observer.observe(document.body,{childList:true,subtree:true});mount()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();