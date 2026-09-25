/* Watch & Read learning zone, content studio, and resumable local state. */
const LiplipReception = (() => {
 const CONTENT_KEY='liplip-reception-content-v1',STATE_KEY='liplip-reception-state-v1';
 const PHASES=[
  {key:'watch',name:'المشاهدة',detail:'شاهد الفيديو بتركيز'},
  {key:'watchExam',name:'اختبار المشاهدة',detail:'استماع وصور واختيارات'},
  {key:'read',name:'القصة',detail:'اقرأ صفحة وراء صفحة'},
  {key:'readExam',name:'اختبار القصة',detail:'ترجمة وفهم'}
 ];
 const TYPES={
  watch:[['video','فيديو YouTube']],
  watchExam:[['textVoice','نص إنجليزي ← صوت إنجليزي'],['imageArabicWrite','صورة ← اكتب بالعربية'],['mcq','اختيارات متعددة']],
  read:[['storyPage','صفحة قصة']],
  readExam:[['enToArWrite','كلمة إنجليزية ← اكتب بالعربية'],['arToEnWrite','كلمة عربية ← اكتب بالإنجليزية'],['mcq','اختيارات متعددة']]
 };
 const blank=()=>({watch:[],watchExam:[],read:[],readExam:[]});
 let edits={};try{const raw=JSON.parse(localStorage.getItem(CONTENT_KEY)||'{}');if(raw&&typeof raw==='object')edits=raw}catch{}
 let state={boxId:null,phase:0,bookPage:0,feedback:'',review:false,control:false,editProcess:'watch',editType:'video',editIndex:null,notice:'',error:''};
 function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function norm(v){return String(v??'').trim().toLocaleLowerCase().replace(/[\s.,!?؛،]+/g,' ')}
 function https(v){try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}
 function youtubeId(value){
  try{const u=new URL(String(value));if(u.protocol!=='https:')return '';
   if(u.hostname==='youtu.be')return u.pathname.split('/').filter(Boolean)[0]||'';
   if(/(^|\.)youtube\.com$/.test(u.hostname)||u.hostname==='www.youtube-nocookie.com'){
    if(u.pathname==='/watch')return u.searchParams.get('v')||'';
    const m=u.pathname.match(/^\/(?:embed|shorts)\/([^/?#]+)/);return m?.[1]||'';
   }
  }catch{}return ''
 }
 function validate(process,item){
  if(!TYPES[process]?.some(([t])=>t===item.type))throw Error('نوع العنصر غير مدعوم في هذه العملية.');
  const clean={type:item.type,id:item.id||('r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7))};
  const field=(key,max,required=false)=>{const v=String(item[key]??'').trim();if(required&&!v)throw Error('أكمل الحقول المطلوبة.');if(v.length>max)throw Error('أحد الحقول أطول من الحد المسموح.');if(v)clean[key]=v};
  field('title',160);field('english',1800);field('arabic',1200);field('prompt',500);field('answer',300);field('explanation',800);
  if(item.image){if(!https(item.image))throw Error('رابط الصورة يجب أن يكون HTTPS صالحاً.');clean.image=String(item.image).trim()}
  if(process==='watch'&&item.type==='video'){field('title',160,true);const id=youtubeId(item.youtube);if(!id)throw Error('أدخل رابط YouTube صالحاً من youtube.com أو youtu.be.');clean.youtube=String(item.youtube).trim();clean.youtubeId=id}
  if(process==='watchExam'&&item.type==='textVoice'){field('english',500,true);const options=(item.options||[]).map(x=>String(x).trim()).filter(Boolean);if(options.length<2||options.length>4)throw Error('أضف من خيارين إلى أربعة خيارات إنجليزية.');if(!Number.isInteger(item.correct)||item.correct<0||item.correct>=options.length)throw Error('حدّد الإجابة الصحيحة.');clean.options=options;clean.correct=item.correct}
  if(process==='watchExam'&&item.type==='imageArabicWrite'){if(!clean.image)throw Error('أضف رابط الصورة.');field('answer',180,true)}
  if(['watchExam','readExam'].includes(process)&&item.type==='mcq'){field('prompt',500,true);const options=(item.options||[]).map(x=>String(x).trim()).filter(Boolean);if(options.length<2||options.length>4)throw Error('أضف من خيارين إلى أربعة خيارات.');if(!Number.isInteger(item.correct)||item.correct<0||item.correct>=options.length)throw Error('حدّد الإجابة الصحيحة.');clean.options=options;clean.correct=item.correct}
  if(process==='read'&&item.type==='storyPage'){field('title',160,true);field('english',1800,true);clean.page=Number.isInteger(item.page)&&item.page>0?Math.min(99,item.page):1}
  if(process==='readExam'&&item.type==='enToArWrite'){field('english',200,true);field('answer',180,true)}
  if(process==='readExam'&&item.type==='arToEnWrite'){field('arabic',200,true);field('answer',180,true)}
  return clean
 }
 function getContent(boxId){const raw=edits[String(boxId)]||blank();const out=blank();for(const p of Object.keys(out))out[p]=Array.isArray(raw[p])?raw[p].map(x=>{try{return validate(p,x)}catch{return null}}).filter(Boolean):[];return out}
 function store(next){localStorage.setItem(CONTENT_KEY,JSON.stringify(next));edits=next}
 function saveState(){if(state.review)return;try{localStorage.setItem(STATE_KEY,JSON.stringify({boxId:state.boxId,phase:state.phase,bookPage:state.bookPage}))}catch{}}
 function start(boxId,{phase=0,review=false}={}){state={boxId,phase:Math.max(0,Math.min(3,phase)),bookPage:0,feedback:'',review,control:false,editProcess:'watch',editType:'video',editIndex:null,notice:review?'وضع المراجعة: لن يتغير تقدم هذا المسار.':'',error:''};if(!review){try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(saved?.boxId===boxId&&Number.isInteger(saved.phase)&&saved.phase===state.phase)state.bookPage=Math.max(0,Number(saved.bookPage)||0)}catch{}}saveState()}
 function setPhase(phase){state.phase=Math.max(0,Math.min(3,phase));state.bookPage=0;state.feedback='';state.control=false;saveState()}
 function clear(){if(!state.review)try{localStorage.removeItem(STATE_KEY)}catch{}state.boxId=null}
 function speak(text){if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){state.feedback='الصوت غير متاح في هذا المتصفح.';return}try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.88;window.speechSynthesis.speak(u)}catch{state.feedback='تعذّر تشغيل الصوت.'}}
 function phaseNav(){return `<div class="reception-phase-nav">${PHASES.map((p,i)=>`<span class="${i<state.phase?'done':i===state.phase?'active':''}"><b>${i+1}</b>${p.name}</span>`).join('')}</div>`}
 function top(){return `<header class="reception-zone-top"><button data-reception="exit">← العودة للخريطة</button><div><span>الصندوق ${state.boxId}</span><strong>${PHASES[state.phase].name}</strong></div><button data-reception="control">إدارة المحتوى</button></header>${state.notice?`<p class="reception-zone-notice">${safe(state.notice)}</p>`:''}${phaseNav()}`}
 function empty(process){return `<section class="reception-empty"><span>لا يوجد محتوى لهذه العملية بعد.</span><h2>أضف المحتوى من لوحة التحكم أو استورده من Excel.</h2><button data-reception="control">فتح إدارة المحتوى</button></section>`}
 function watchView(content){const item=content.watch[0];if(!item)return empty('watch');return `<section class="watch-learning"><div class="watch-heading"><span>المشاهدة / فهم المسموع</span><h1>${safe(item.title)}</h1>${item.arabic?`<p>${safe(item.arabic)}</p>`:''}</div><div class="youtube-shell"><iframe src="https://www.youtube-nocookie.com/embed/${safe(item.youtubeId)}?rel=0" title="${safe(item.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>${item.english?`<div class="watch-keyline"><span>عبارة مهمة في الفيديو</span><strong dir="ltr" lang="en">${safe(item.english)}</strong><button data-reception="speak" data-text="${safe(item.english)}">استمع</button></div>`:''}<button class="reception-complete" data-reception="complete-process">أكملت المشاهدة · ابدأ الاختبار</button></section>`}
 function watchQuestion(q,i){if(q.type==='textVoice')return `<fieldset class="reception-question"><legend>${i+1}. استمع ثم اختر النص الإنجليزي المطابق للصوت.</legend><button type="button" class="voice-question" data-reception="speak" data-text="${safe(q.english)}">تشغيل الصوت الإنجليزي</button><div class="reception-options" dir="ltr">${q.options.map((x,j)=>`<label><input type="radio" name="q${i}" value="${j}" required>${safe(x)}</label>`).join('')}</div></fieldset>`;
  if(q.type==='imageArabicWrite')return `<fieldset class="reception-question"><legend>${i+1}. ${safe(q.prompt||'انظر إلى الصورة واكتب معناها بالعربية.')}</legend><img class="reception-question-image" src="${safe(q.image)}" alt="صورة سؤال"><input name="q${i}" lang="ar" dir="rtl" required maxlength="180" placeholder="اكتب الإجابة بالعربية"></fieldset>`;
  return `<fieldset class="reception-question"><legend>${i+1}. ${safe(q.prompt)}</legend><div class="reception-options">${q.options.map((x,j)=>`<label><input type="radio" name="q${i}" value="${j}" required>${safe(x)}</label>`).join('')}</div></fieldset>`
 }
 function examView(items,kind){if(!items.length)return empty(kind);const watch=kind==='watchExam';return `<section class="reception-exam"><div class="reception-exam-head"><span>${watch?'اختبار المشاهدة':'اختبار القصة'}</span><h1>${watch?'اختبر ما سمعت وشاهدت.':'اختبر الكلمات وفهم القصة.'}</h1><p>التعليمات بالعربية، والإجابة حسب نوع السؤال.</p></div><form id="reception-exam-form">${items.map((q,i)=>watch?watchQuestion(q,i):readQuestion(q,i)).join('')}<button class="reception-complete" type="submit">تحقّق من الإجابات</button></form>${state.feedback?`<p class="reception-feedback">${safe(state.feedback)}</p>`:''}</section>`}
 function readQuestion(q,i){if(q.type==='enToArWrite')return `<fieldset class="reception-question"><legend>${i+1}. اكتب معنى الكلمة الإنجليزية بالعربية.</legend><strong class="reception-word" dir="ltr" lang="en">${safe(q.english)}</strong><input name="q${i}" lang="ar" dir="rtl" required maxlength="180" placeholder="المعنى بالعربية"></fieldset>`;
  if(q.type==='arToEnWrite')return `<fieldset class="reception-question"><legend>${i+1}. اكتب المقابل الإنجليزي للكلمة العربية.</legend><strong class="reception-word" lang="ar">${safe(q.arabic)}</strong><input name="q${i}" dir="ltr" lang="en" required maxlength="180" placeholder="Type in English"></fieldset>`;
  return `<fieldset class="reception-question"><legend>${i+1}. ${safe(q.prompt)}</legend><div class="reception-options">${q.options.map((x,j)=>`<label><input type="radio" name="q${i}" value="${j}" required>${safe(x)}</label>`).join('')}</div></fieldset>`
 }
 function storyView(content){const pages=[...content.read].sort((a,b)=>(a.page||1)-(b.page||1));if(!pages.length)return empty('read');state.bookPage=Math.min(state.bookPage,pages.length-1);const p=pages[state.bookPage];return `<section class="story-learning"><div class="story-heading"><span>القصة / قراءة وفهم</span><h1>${safe(p.title)}</h1><small>الصفحة ${state.bookPage+1} من ${pages.length}</small></div><article class="story-book"><div class="story-book-spine"></div><div class="story-page">${p.image?`<img src="${safe(p.image)}" alt="صورة القصة">`:''}<p dir="ltr" lang="en">${safe(p.english)}</p>${p.arabic?`<aside>${safe(p.arabic)}</aside>`:''}<span class="story-page-number">${state.bookPage+1}</span></div></article><div class="story-controls"><button data-reception="story-prev" ${state.bookPage===0?'disabled':''}>الصفحة السابقة</button>${state.bookPage<pages.length-1?`<button data-reception="story-next">الصفحة التالية</button>`:`<button class="reception-complete" data-reception="complete-process">أنهيت القصة · ابدأ الاختبار</button>`}</div></section>`}
 function learning(){const c=getContent(state.boxId);return `<main class="reception-zone">${top()}<div class="reception-zone-body">${state.phase===0?watchView(c):state.phase===1?examView(c.watchExam,'watchExam'):state.phase===2?storyView(c):examView(c.readExam,'readExam')}</div></main>`}
 function editorFields(){const p=state.editProcess,t=state.editType,item=state.editIndex===null?{}:getContent(state.boxId)[p][state.editIndex]||{},input=(name,label,value='',type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${safe(value)}"></label>`,area=(name,label,value='')=>`<label>${label}<textarea name="${name}" rows="4">${safe(value)}</textarea></label>`;let html=input('title','العنوان بالعربية',item.title||'');
  if(t==='video')html+=input('youtube','رابط YouTube',item.youtube||'', 'url')+area('arabic','وصف أو هدف بالعربية',item.arabic||'')+input('english','عبارة إنجليزية مهمة (اختياري)',item.english||'');
  if(t==='storyPage')html+=input('page','رقم الصفحة',item.page||1,'number')+area('english','نص الصفحة بالإنجليزية',item.english||'')+area('arabic','ملاحظة عربية اختيارية',item.arabic||'')+input('image','رابط صورة الصفحة HTTPS (اختياري)',item.image||'','url');
  if(t==='textVoice')html+=area('english','النص الإنجليزي الذي سيحوّل إلى صوت',item.english||'')+input('option1','الخيار 1',item.options?.[0]||'')+input('option2','الخيار 2',item.options?.[1]||'')+input('option3','الخيار 3',item.options?.[2]||'')+input('option4','الخيار 4',item.options?.[3]||'')+input('correct','رقم الإجابة الصحيحة',Number.isInteger(item.correct)?item.correct+1:1,'number');
  if(t==='imageArabicWrite')html+=input('image','رابط الصورة HTTPS',item.image||'','url')+input('prompt','عنوان السؤال بالعربية',item.prompt||'')+input('answer','الإجابة العربية',item.answer||'');
  if(t==='enToArWrite')html+=input('english','الكلمة الإنجليزية',item.english||'')+input('answer','الإجابة العربية',item.answer||'');
  if(t==='arToEnWrite')html+=input('arabic','الكلمة العربية',item.arabic||'')+input('answer','الإجابة الإنجليزية',item.answer||'');
  if(t==='mcq')html+=input('prompt','عنوان السؤال بالعربية',item.prompt||'')+input('option1','الخيار 1',item.options?.[0]||'')+input('option2','الخيار 2',item.options?.[1]||'')+input('option3','الخيار 3',item.options?.[2]||'')+input('option4','الخيار 4',item.options?.[3]||'')+input('correct','رقم الإجابة الصحيحة',Number.isInteger(item.correct)?item.correct+1:1,'number');
  if(!['video','storyPage'].includes(t))html+=area('explanation','شرح الإجابة بالعربية (اختياري)',item.explanation||'');return html
 }
 function formatCard(kind){const watch=kind==='watch',heads=watch?LiplipReceptionImporter.WATCH_HEADERS:LiplipReceptionImporter.READ_HEADERS;return `<article class="reception-format-card"><span>${watch?'قالب المشاهدة':'قالب القراءة'}</span><strong>${watch?'watch / watchExam':'read / readExam'}</strong><p>${watch?'video · textVoice · imageArabicWrite · mcq':'storyPage · enToArWrite · arToEnWrite · mcq'}</p><details><summary>أسماء الأعمدة المطلوبة</summary><code>${heads.map(safe).join(' | ')}</code></details></article>`}
 function control(){const content=getContent(state.boxId),types=TYPES[state.editProcess];return `<main class="reception-control"><header><button data-reception="control-back">← العودة للمحتوى</button><div><span>إدارة محتوى الصندوق ${state.boxId}</span><h1>المشاهدة والقراءة</h1></div><button class="reception-danger" data-reception="clear-box">مسح الصندوق</button></header><section class="reception-format-grid">${formatCard('watch')}${formatCard('read')}</section><section class="reception-import-panel"><div><h2>استيراد Excel</h2><p>اختر ملف المشاهدة أو ملف القراءة؛ يتعرف النظام على القالب من أسماء الأعمدة.</p></div><input id="reception-import-file" type="file" accept=".xlsx">${state.error?`<p class="error">${safe(state.error)}</p>`:state.notice?`<p class="success">${safe(state.notice)}</p>`:''}</section><section class="reception-editor-layout"><aside><h2>العناصر الحالية</h2>${Object.keys(content).map(p=>`<div class="reception-content-group"><strong>${PHASES.find(x=>x.key===p)?.name||p} · ${content[p].length}</strong>${content[p].map((x,i)=>`<button data-reception="edit-item" data-process="${p}" data-index="${i}">${safe(x.title||x.prompt||x.english||x.arabic||x.type)}</button>`).join('')||'<small>لا عناصر</small>'}</div>`).join('')}</aside><form id="reception-editor-form"><div class="reception-editor-selects"><label>العملية<select id="reception-process-select" name="process">${Object.keys(TYPES).map(p=>`<option value="${p}" ${p===state.editProcess?'selected':''}>${PHASES.find(x=>x.key===p).name}</option>`).join('')}</select></label><label>نوع العنصر<select id="reception-type-select" name="type">${types.map(([v,l])=>`<option value="${v}" ${v===state.editType?'selected':''}>${l}</option>`).join('')}</select></label></div>${editorFields()}<div class="reception-editor-actions"><button type="submit">${state.editIndex===null?'إضافة العنصر':'حفظ التعديل'}</button>${state.editIndex!==null?'<button type="button" data-reception="delete-item">حذف العنصر</button>':''}<button type="button" data-reception="new-item">عنصر جديد</button></div></form></section></main>`}
 function render(){return state.control?control():learning()}
 function click(action,target){
  if(action==='exit')return {exit:true};
  if(action==='control'){state.control=true;state.feedback='';return {}}
  if(action==='control-back'){state.control=false;state.error='';return {}}
  if(action==='speak'){speak(target.dataset.text||'');return {}}
  if(action==='story-prev'){state.bookPage=Math.max(0,state.bookPage-1);saveState();return {}}
  if(action==='story-next'){state.bookPage++;saveState();return {}}
  if(action==='complete-process')return {completeProcess:{boxId:state.boxId,process:PHASES[state.phase].key,score:100}};
  if(action==='edit-item'){state.editProcess=target.dataset.process;state.editType=getContent(state.boxId)[state.editProcess][Number(target.dataset.index)]?.type||TYPES[state.editProcess][0][0];state.editIndex=Number(target.dataset.index);return {}}
  if(action==='new-item'){state.editIndex=null;return {}}
  if(action==='delete-item'){const next=JSON.parse(JSON.stringify(edits)),bucket=next[String(state.boxId)]?.[state.editProcess];if(bucket&&state.editIndex!==null){bucket.splice(state.editIndex,1);store(next);state.editIndex=null;state.notice='تم حذف العنصر.'}return {}}
  if(action==='clear-box'){const next=JSON.parse(JSON.stringify(edits));delete next[String(state.boxId)];store(next);state.editIndex=null;state.notice='تم مسح محتوى المشاهدة والقراءة لهذا الصندوق.';return {}}
  return {}
 }
 function grade(items,form){let correct=0;items.forEach((q,i)=>{const answer=String(form.get('q'+i)??'').trim();if(q.type==='mcq'||q.type==='textVoice'){if(Number(answer)===q.correct)correct++}else if(norm(answer)===norm(q.answer))correct++});return Math.round(correct/items.length*100)}
 function submit(id,form){
  if(id==='reception-exam-form'){const c=getContent(state.boxId),items=state.phase===1?c.watchExam:c.readExam;if(!items.length)return {};const score=grade(items,new FormData(form));state.feedback=`النتيجة: ${score}% · ${score>=70?'أحسنت.':'راجع المحتوى ويمكنك المحاولة مرة أخرى.'}`;if(score<70)return {};return {completeProcess:{boxId:state.boxId,process:PHASES[state.phase].key,score}}}
  if(id==='reception-editor-form'){const fd=new FormData(form),process=String(fd.get('process')),type=String(fd.get('type')),options=[1,2,3,4].map(i=>String(fd.get('option'+i)||'').trim()).filter(Boolean),raw={type,title:fd.get('title'),youtube:fd.get('youtube'),page:Number(fd.get('page')),english:fd.get('english'),arabic:fd.get('arabic'),image:fd.get('image'),prompt:fd.get('prompt'),options,correct:Number(fd.get('correct'))-1,answer:fd.get('answer'),explanation:fd.get('explanation')};let item;try{item=validate(process,raw)}catch(e){state.error=e.message;return {}}const next=JSON.parse(JSON.stringify(edits)),box=next[String(state.boxId)]||(next[String(state.boxId)]=blank()),bucket=box[process]||(box[process]=[]);if(state.editIndex===null)bucket.push(item);else bucket[state.editIndex]=item;try{store(next);state.notice='تم حفظ العنصر.';state.error='';state.editProcess=process;state.editType=type;state.editIndex=null}catch{state.error='تعذّر حفظ المحتوى في هذا المتصفح.'}return {}}
  return {}
 }
 function change(target){if(target.id==='reception-process-select'){state.editProcess=target.value;state.editType=TYPES[state.editProcess][0][0];state.editIndex=null;return true}if(target.id==='reception-type-select'){state.editType=target.value;state.editIndex=null;return true}return false}
 async function importFile(file){
  state.error='';state.notice='';try{const result=await LiplipReceptionImporter.read(file,validate),next=JSON.parse(JSON.stringify(edits));for(const [id,incoming] of result.boxes){const box=next[String(id)]||(next[String(id)]=blank());for(const p of Object.keys(incoming)){const sig=x=>JSON.stringify([x.type,x.title,x.youtube,x.page,x.english,x.arabic,x.image,x.prompt,x.options,x.answer]);const seen=new Set((box[p]||[]).map(sig));for(const item of incoming[p])if(!seen.has(sig(item))){box[p].push(item);seen.add(sig(item))}}}store(next);state.notice=`تم استيراد ${result.count} عنصراً من قالب ${result.format==='watch'?'المشاهدة':'القراءة'}.`;return true}catch(e){state.error=e.message;return false}}
 return {PHASES,TYPES,start,setPhase,clear,render,click,submit,change,importFile,getContent,validate};
})();