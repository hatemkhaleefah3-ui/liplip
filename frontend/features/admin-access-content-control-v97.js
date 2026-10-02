/* v97: admin has unrestricted navigation; study content control matches the unified workbook structure. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const app=()=>document.getElementById('app')||document.body;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;

  function clearLock(el){
    if(!el)return;
    el.classList.remove('locked','v45-locked','v45-nav-locked','v47-nav-locked','v47-home-study-blocked','course-nav-locked');
    el.removeAttribute('aria-disabled');
    if('disabled' in el)el.disabled=false;
    delete el.dataset.v47Lock;
  }

  function unlockPrimaryNavigation(root){
    if(!isAdmin())return;

    root.querySelectorAll('[data-nav],.bottom-nav button,.home-v28 [data-action],.dashboard [data-action]').forEach(clearLock);
    root.querySelectorAll('[data-v47-lock],.v45-nav-locked,.v47-nav-locked,.course-nav-locked').forEach(clearLock);

    // Progression v45 converts Fast Practice into a locked placeholder before A2.
    // Restore its real action for admin instead of only changing its visual state.
    root.querySelectorAll('[data-v45-locked]').forEach(btn=>{
      clearLock(btn);
      btn.dataset.v45Fast='1';
      delete btn.dataset.v45Locked;
    });

    root.querySelectorAll('[data-v28="study-current"],[data-v28="review-last"]').forEach(clearLock);

    // Literacy launchers themselves are always available to admin, independently of completion.
    root.querySelectorAll('[data-v45-literacy],[data-literacy="letters"],[data-literacy="numbers"],[data-v47-onboard]').forEach(clearLock);
  }

  function unlockCourseMap(root){
    if(!isAdmin())return;

    root.querySelectorAll('.c57-level').forEach((btn,i)=>{
      clearLock(btn);
      btn.dataset.course='level';
      if(!btn.dataset.level){
        const shown=btn.querySelector('.c57-level-no')?.textContent||'';
        btn.dataset.level=String(Number(shown.replace(/\D/g,''))||i+1);
      }
    });

    const currentLevel=Number(window.LiplipCourse57?.level)||1;
    root.querySelectorAll('.c57-box').forEach((btn,i)=>{
      clearLock(btn);
      btn.dataset.course='box';
      if(!btn.dataset.boxId)btn.dataset.boxId=String((currentLevel-1)*200+i+1);
    });

    root.querySelectorAll('.treasure-level-card').forEach((btn,i)=>{
      clearLock(btn);
      btn.dataset.course='level';
      if(!btn.dataset.level)btn.dataset.level=String(i+1);
    });

    root.querySelectorAll('.treasure-box-card').forEach((btn,i)=>{
      clearLock(btn);
      const level=Number(btn.dataset.level)||currentLevel;
      const local=Number(btn.dataset.localBox)||i+1;
      btn.dataset.course='box';
      btn.dataset.boxId=String((level-1)*200+local);
    });
  }

  function unlockCourseProcesses(root){
    if(!isAdmin())return;
    const phases=['vocabulary','grammar','watchRead'];
    root.querySelectorAll('.c57-stage-nav section').forEach((section,pi)=>{
      section.classList.remove('locked');
      const phaseButton=section.querySelector(':scope > button');
      if(phaseButton){
        clearLock(phaseButton);
        phaseButton.dataset.course='phase';
        phaseButton.dataset.phase=phases[pi]||'vocabulary';
      }
      section.querySelectorAll(':scope > div > button').forEach((btn,i)=>{
        clearLock(btn);
        btn.dataset.course='process';
        btn.dataset.process=String(i);
      });
    });
  }

  function contentIcon(){
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v14H4z"/><path d="M8 3v4M16 3v4M8 11h8M8 15h5"/></svg>';
  }

  function redesignContentButton(root){
    if(!isAdmin())return;
    root.querySelectorAll('.c57-manage[data-course="manager-open"]').forEach(btn=>{
      if(btn.dataset.v97Design)return;
      btn.dataset.v97Design='1';
      btn.classList.add('v97-content-button');
      btn.innerHTML=`<span class="v97-content-button-icon">${contentIcon()}</span><span><small>${t('الإدارة','ADMIN')}</small><strong>${t('التحكم بالمحتوى','Content control')}</strong></span><b>${t('ملف واحد','1 workbook')}</b>`;
      btn.setAttribute('aria-label',t('فتح لوحة التحكم بمحتوى الدراسة','Open study content control'));
    });
  }

  function redesignManager(root){
    if(!isAdmin())return;
    const manager=root.querySelector('.c57-manager');
    if(!manager||manager.dataset.v97Design)return;
    const section=manager.querySelector(':scope > section');
    if(!section)return;
    manager.dataset.v97Design='1';
    manager.classList.add('v97-content-control');

    section.innerHTML=`
      <header class="v97-cc-head">
        <div>
          <span class="v97-cc-kicker">${t('إدارة · الدراسة','ADMIN · STUDY')}</span>
          <h2>${t('التحكم بمحتوى الدراسة','Study content control')}</h2>
          <p>${t('ملف Excel موحّد يدير محتوى المراحل والأسئلة لكل الصناديق.','One unified Excel workbook controls phase content and question banks for every box.')}</p>
        </div>
        <button type="button" class="v97-cc-close" data-course="manager-close" aria-label="${t('إغلاق','Close')}">×</button>
      </header>

      <div class="v97-cc-overview">
        <article><strong>5</strong><span>${t('مستويات','Levels')}</span></article>
        <article><strong>250</strong><span>${t('صندوقاً','Boxes')}</span></article>
        <article><strong>3</strong><span>${t('مراحل','Phases')}</span></article>
        <article><strong>6</strong><span>${t('أوراق محتوى','Content sheets')}</span></article>
      </div>

      <section class="v97-cc-phases">
        <article>
          <span class="v97-cc-step">01</span>
          <div><h3>${t('المفردات','Vocabulary')}</h3><p>${t('بطاقات كلمات إنجليزي ↔ عربي. الاختبار يُنشأ عشوائياً من كلمات الصندوق.','English ↔ Arabic word cards. The exam is generated randomly from the box vocabulary.')}</p></div>
          <small>Vocabulary</small>
        </article>
        <article>
          <span class="v97-cc-step">02</span>
          <div><h3>${t('القواعد','Grammar')}</h3><p>${t('درس القاعدة + بنك أسئلة: ملء فراغ، ترتيب جملة، وتصحيح الخطأ.','Grammar lesson + question bank: fill blank, reorder sentence, and correct error.')}</p></div>
          <small>Grammar · Grammar_Questions</small>
        </article>
        <article>
          <span class="v97-cc-step">03</span>
          <div><h3>${t('شاهد واقرأ','Watch & Read')}</h3><p>${t('قصة + فيديو YouTube مع بنك MCQ مستقل لكل واحد.','Story + YouTube video with a separate MCQ bank for each.')}</p></div>
          <small>Watch_Read · Video_Questions · Story_Questions</small>
        </article>
      </section>

      <section class="v97-cc-workbook">
        <div class="v97-cc-file">
          <span>${contentIcon()}</span>
          <div><small>${t('المخطط الحالي','CURRENT SCHEMA')}</small><strong>liplip-study-content.xlsx</strong><p>${t('Vocabulary · Grammar · Grammar_Questions · Watch_Read · Video_Questions · Story_Questions','Vocabulary · Grammar · Grammar_Questions · Watch_Read · Video_Questions · Story_Questions')}</p></div>
        </div>
        <div class="v97-cc-actions">
          <button type="button" class="v97-cc-download" data-v94-unified-template>${t('تنزيل القالب الموحد','Download unified template')}</button>
          <label class="v97-cc-import"><span>${t('استيراد ملف Excel','Import Excel')}</span><input type="file" accept=".xlsx" data-course-manager-import></label>
        </div>
      </section>

      <footer class="v97-cc-foot">
        <span>${t('يحافظ الاستيراد على المراحل غير الموجودة في الملف ويحدّث المحتوى المعبأ فقط.','Import updates filled content while preserving untouched content.')}</span>
        <b>.xlsx</b>
      </footer>`;
  }

  function apply(){
    if(!isAdmin())return;
    const root=app();
    unlockPrimaryNavigation(root);
    unlockCourseMap(root);
    unlockCourseProcesses(root);
    redesignContentButton(root);
    redesignManager(root);
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply()});
  }

  const start=()=>{
    apply();
    new MutationObserver(schedule).observe(app(),{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled','aria-disabled','data-v47-lock','data-v45-locked']});
    document.addEventListener('click',schedule,true);
    window.addEventListener('storage',schedule);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
