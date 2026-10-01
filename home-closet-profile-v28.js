/* Home, closet, and profile redesign. Loaded after app.js. */
(() => {
  const lang = () => localStorage.getItem('liplip-ui-language') === 'en' ? 'en' : 'ar';
  const t = (ar,en) => lang()==='en'?en:ar;
  const safeText = v => esc(v ?? '');
  const currentCourse = () => LiplipProgress.courseSnapshot(state.progress);
  const snapshot = () => LiplipProgress.snapshot(state.progress);
  const completedIds = () => currentCourse().completedBoxes || [];
  const currentId = () => currentCourse().currentBox;
  const phaseLabel = key => ({vocabulary:t('المفردات','Vocabulary'),grammar:t('القواعد','Grammar'),watchRead:t('شاهد واقرأ','Watch & read')})[key] || key;

  function currentRecord(course){return course.records?.find(x=>x.boxId===course.currentBox)||null}
  function boxLabel(id){if(!id)return t('اكتملت الرحلة','Journey complete');const l=LiplipProgress.courseLocation(id);return `${t('المستوى','Level')} ${l.level} · ${t('الصندوق','Box')} ${l.box}`}
  function pct(n,d){return d?Math.max(0,Math.min(100,Math.round(n/d*100))):0}

  dashboard = function(){
    const s=snapshot(),course=currentCourse(),record=currentRecord(course),first=state.guest?t('ضيفنا','Guest'):(state.profile?.name||t('صديقنا','Learner')).trim().split(/\s+/)[0];
    const done=course.completedBoxes.length,total=course.totalBoxes||1000,overall=pct(done,total),loc=LiplipProgress.courseLocation(course.currentBox||total),phase=course.phase||'watchRead',process=record?.processIndex||0;
    const last=course.completedBoxes.length?course.completedBoxes[course.completedBoxes.length-1]:null;
    const levelCards=LiplipProgress.STAGES.map((name,i)=>{const count=course.completedBoxes.filter(id=>Math.floor((id-1)/200)===i).length;return `<article class="home-level ${loc.level===i+1?'active':''}"><span>0${i+1}</span><div><strong>${safeText(name)}</strong><small>${count} / 200 ${t('صندوق','boxes')}</small></div><b>${pct(count,200)}%</b></article>`}).join('');
    const phaseCards=['vocabulary','grammar','watchRead'].map((key,i)=>{const donePhase=record?.completedPhases?.includes(key)||course.completedBoxes.includes(course.currentBox);const active=course.currentBox&&phase===key;return `<div class="home-phase ${donePhase?'done':''} ${active?'active':''}"><span>${donePhase?icon('check',18):`0${i+1}`}</span><div><strong>${phaseLabel(key)}</strong><small>${key==='vocabulary'?t('محتوى + اختبار','Content + exam'):key==='grammar'?t('شرح + اختبار','Lesson + exam'):t('فيديو + قصة','Video + story')}</small></div></div>`}).join('');
    return `<main class="dashboard home-v28">
      <section class="home-greeting">
        <div class="home-greeting-copy"><span>${t('مرحباً بعودتك','Welcome back')}</span><h1>${t('هلا','Hi')} ${safeText(first)}.</h1><p>${t('خطوتك التالية جاهزة. أكمل الصندوق الحالي أو اختر تدريباً سريعاً.','Your next step is ready. Continue the current box or choose a quick practice.')}</p></div>
        <div class="home-status-mini"><small>${t('الحالة الآن','Current status')}</small><strong dir="ltr">${s.level}</strong><span>${boxLabel(course.currentBox)}</span><i><u style="width:${overall}%"></u></i><b>${overall}%</b></div>
      </section>

      <section class="home-section"><div class="home-section-head"><div><span>${t('وصول مباشر','Quick access')}</span><h2>${t('ماذا تريد أن تفعل الآن؟','What do you want to do now?')}</h2></div></div>
        <div class="home-actions-grid">
          <button class="home-action primary" data-v28="study-current" ${course.currentBox?'':'disabled'}><span class="home-action-icon">${icon('book',25)}</span><div><strong>${t('ادرس الصندوق الحالي','Study current box')}</strong><small>${boxLabel(course.currentBox)}</small></div>${icon('arrow',18)}</button>
          <button class="home-action chat" data-v28="talk" data-mode="chat"><span class="home-action-icon">${icon('chat',25)}</span><div><strong>${t('دردشة','Chat')}</strong><small>${t('محادثة كتابية مباشرة','Start a text conversation')}</small></div>${icon('arrow',18)}</button>
          <button class="home-action call" data-v28="talk" data-mode="call"><span class="home-action-icon">${icon('phone',25)}</span><div><strong>${t('مكالمة','Call')}</strong><small>${t('تدرّب بالصوت','Practice by voice')}</small></div>${icon('arrow',18)}</button>
          <button class="home-action review" data-v28="review-last" ${last?'':'disabled'}><span class="home-action-icon">${icon('layers',25)}</span><div><strong>${t('راجع آخر صندوق','Review last box')}</strong><small>${last?boxLabel(last):t('لا يوجد صندوق مكتمل بعد','No completed box yet')}</small></div>${icon('arrow',18)}</button>
          <button class="home-action soon" data-v28="soon" data-feature="letters"><span class="home-action-icon home-letter">A</span><div><strong>${t('تعلّم الحروف','Letters')}</strong><small>${t('قريباً','Coming soon')}</small></div><span class="soon-pill">${t('قريباً','Soon')}</span></button>
          <button class="home-action soon" data-v28="soon" data-feature="numbers"><span class="home-action-icon home-number">123</span><div><strong>${t('تعلّم الأرقام','Numbers')}</strong><small>${t('قريباً','Coming soon')}</small></div><span class="soon-pill">${t('قريباً','Soon')}</span></button>
          <button class="home-action soon" data-v28="soon" data-feature="fast-write"><span class="home-action-icon">${icon('keyboard',25)}</span><div><strong>${t('الكتابة السريعة','Fast writing')}</strong><small>${t('قريباً','Coming soon')}</small></div><span class="soon-pill">${t('قريباً','Soon')}</span></button>
        </div>
      </section>

      <section class="home-progress-card">
        <div class="home-progress-top"><div><span>${t('هيكل الدراسة','Study structure')}</span><h2>${t('تقدّمك بالتفصيل','Detailed progress')}</h2><p>${t('خمسة مستويات، ٢٠٠ صندوق في كل مستوى، وثلاث مراحل داخل كل صندوق.','Five levels, 200 boxes per level, and three phases inside each box.')}</p></div><div class="home-progress-ring" style="--p:${overall}"><strong>${overall}%</strong><small>${done}/${total}</small></div></div>
        <div class="home-current-box"><div><small>${t('أنت الآن','You are here')}</small><strong>${boxLabel(course.currentBox)}</strong><span>${course.currentBox?`${phaseLabel(phase)} · ${process===0?t('العملية الأولى','Process 1'):t('العملية الثانية','Process 2')}`:t('اكتملت الرحلة','Journey complete')}</span></div><button data-v28="study-current" ${course.currentBox?'':'disabled'}>${t('متابعة','Continue')} ${icon('arrow',18)}</button></div>
        <div class="home-phase-row">${phaseCards}</div>
        <div class="home-level-list">${levelCards}</div>
      </section>
    </main>`;
  };

  function closetBoxes(){
    const c=currentCourse(),ids=[...new Set([...(c.completedBoxes||[]),...(c.currentBox?[c.currentBox]:[])])].sort((a,b)=>a-b),done=new Set(c.completedBoxes||[]);
    return ids.map(id=>({id,status:done.has(id)?'finished':'unfinished',content:LiplipCourse.getContent(id)}));
  }
  function closetEntries(kind){
    const boxes=closetBoxes(),out=[];
    for(const box of boxes){const c=box.content,base={boxId:box.id,status:box.status,boxLabel:boxLabel(box.id)};
      if(kind==='words')for(const item of c.vocabulary?.items||[]){if(!['word','flashcardWord','imageWord','imageToWord'].includes(item.type))continue;out.push({...base,title:item.en||'',sub:item.ar||'',detail:item.voice||'',search:[item.en,item.ar,item.voice].join(' ')})}
      if(kind==='grammar'){const a=c.grammar?.article||{};for(const law of a.laws||[])out.push({...base,title:law.title||a.title||t('قاعدة لغوية','Grammar rule'),sub:law.formula||'',detail:law.rule||'',search:[law.title,law.formula,law.rule,a.title].join(' ')});for(const note of a.notes||[])out.push({...base,title:t('ملاحظة','Note'),sub:note,detail:'',search:note})}
      if(kind==='videos'){const v=c.watchRead?.video;if(v?.title||v?.youtube)out.push({...base,title:v.title||t('فيديو الصندوق','Box video'),sub:v.youtube||'',detail:'',search:[v.title,v.youtube].join(' ')})}
      if(kind==='stories')for(const page of c.watchRead?.story||[])out.push({...base,title:page.title||t('صفحة قصة','Story page'),sub:page.text||'',detail:page.arabic||'',search:[page.title,page.text,page.arabic].join(' ')})
    }
    return out;
  }
  function closetKindMeta(kind){return ({words:[t('الكلمات','Words'),'book'],grammar:[t('القواعد','Grammar'),'layers'],videos:[t('الفيديوهات','Videos'),'media'],stories:[t('القصص','Stories'),'file']})[kind]||[kind,'book']}
  function closetDetailV28(kind){
    const [label,ico]=closetKindMeta(kind),items=closetEntries(kind),finished=items.filter(x=>x.status==='finished').length,unfinished=items.length-finished;
    const cards=items.map((x,i)=>`<article class="closet-entry-v28" data-closet-status="${x.status}" data-closet-search="${safeText(String(x.search||'').toLocaleLowerCase())}"><div class="closet-entry-head"><span>${x.status==='finished'?t('مكتمل','Finished'):t('غير مكتمل','Unfinished')}</span><small>${safeText(x.boxLabel)}</small></div><strong ${kind==='words'?'dir="ltr"':''}>${safeText(x.title)}</strong>${x.sub?`<p ${kind==='words'||kind==='stories'?'dir="auto"':''}>${safeText(x.sub)}</p>`:''}${x.detail?`<small class="closet-entry-detail">${safeText(x.detail)}</small>`:''}</article>`).join('');
    return `<main class="dashboard closet-v28 closet-v28-detail"><div class="closet-detail-v28-head"><button data-v28="closet-back">${icon('back',18)} ${t('العودة للخزانة','Back to closet')}</button><div><span>${t('الخزانة','Closet')}</span><h1>${label}</h1><p>${t('ابحث بالعربية أو الإنجليزية، وصفِّ العناصر حسب حالة الصندوق.','Search in Arabic or English and filter by box status.')}</p></div><div class="closet-kind-icon">${icon(ico,31)}</div></div>
      <div class="closet-tools-v28"><label class="closet-search-v28">${icon('search' in paths?'search':'compass',19)}<input id="closet-v28-search" type="search" placeholder="${t('ابحث بالعربية أو الإنجليزية...','Search Arabic or English...')}" autocomplete="off"></label><div class="closet-filter-v28"><button class="active" data-v28-filter="all">${t('الكل','All')} <b>${items.length}</b></button><button data-v28-filter="finished">${t('مكتمل','Finished')} <b>${finished}</b></button><button data-v28-filter="unfinished">${t('غير مكتمل','Unfinished')} <b>${unfinished}</b></button></div></div>
      <div class="closet-box-summary"><span>${finished} ${t('عنصر من صناديق مكتملة','items from finished boxes')}</span><span>${unfinished} ${t('عنصر من الصندوق الحالي','items from the current box')}</span></div>
      <div id="closet-v28-results" class="closet-entry-grid">${cards||`<div class="closet-v28-empty"><span>${icon(ico,38)}</span><h2>${t('لا يوجد محتوى بعد','No content yet')}</h2><p>${t('سيظهر المحتوى هنا عندما تبدأ أو تكمل صندوقاً.','Content appears here after you start or finish a box.')}</p></div>`}</div>
    </main>`;
  }
  closetPage = function(){
    if(state.closetView&&['words','grammar','videos','stories'].includes(state.closetView))return closetDetailV28(state.closetView);
    const kinds=['words','grammar','videos','stories'];
    const cards=kinds.map(kind=>{const [label,ico]=closetKindMeta(kind),items=closetEntries(kind),finished=items.filter(x=>x.status==='finished').length;return `<button class="closet-category-v28 ${kind}" data-v28="closet-open" data-kind="${kind}"><span class="closet-cat-icon">${icon(ico,32)}</span><div><span>${label}</span><strong>${items.length}</strong><small>${finished} ${t('من صناديق مكتملة','from finished boxes')}</small></div>${icon('arrow',19)}</button>`}).join('');
    return `<main class="dashboard closet-v28"><section class="closet-v28-hero"><div><span>${t('خزانتك التعليمية','Your learning closet')}</span><h1>${t('كل ما أنهيته، مرتب وسهل الرجوع إليه.','Everything you learned, organized and easy to revisit.')}</h1><p>${t('الكلمات والقواعد والفيديوهات والقصص مرتبطة بالصندوق الذي جاءت منه.','Words, grammar, videos and stories stay linked to their source box.')}</p></div><div class="closet-hero-mark">${icon('closet',54)}</div></section><div class="closet-category-grid">${cards}</div></main>`;
  };

  function cartoonAvatar(name){const initial=safeText(String(name||'ل').trim().charAt(0)||'ل');return `<div class="profile-cartoon" aria-label="${t('صورة شخصية كرتونية','Cartoon profile image')}"><span class="hair"></span><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="smile"></i></span><b>${initial}</b></div>`}
  accountProfilePage = function(){
    if(state.profileSettings)return settingsPage();
    const s=snapshot(),p=state.profile||{},name=state.guest?t('ضيف لُبلُب','Liplip Guest'):(p.name||t('متعلّم لُبلُب','Liplip Learner')),birth=p.birth||t('غير محدد','Not set'),uiLang=lang();
    return `<main class="dashboard profile-v28"><section class="profile-v28-card">${cartoonAvatar(name)}<div class="profile-v28-name"><span>${t('الملف الشخصي','Profile')}</span><h1>${safeText(name)}</h1><p>${state.guest?t('حساب ضيف','Guest account'):(p.city?`${safeText(p.city)}${p.town?` · ${safeText(p.town)}`:''}`:t('متعلّم لُبلُب','Liplip learner'))}</p></div><button class="profile-settings-shortcut" data-action="open-settings">${icon('settings',20)} ${t('الإعدادات','Settings')}</button></section>
      <section class="profile-facts-v28"><article><span>${icon('user',21)}</span><div><small>${t('تاريخ الميلاد','Birth date')}</small><strong dir="ltr">${safeText(birth)}</strong></div></article><article><span>${icon('target',21)}</span><div><small>${t('المستوى الحالي','Current level')}</small><strong dir="ltr">${s.level}</strong></div></article><article><span>${icon('layers',21)}</span><div><small>${t('الصناديق المكتملة','Completed boxes')}</small><strong>${s.completedCount}</strong></div></article></section>
      <section class="profile-actions-v28"><div class="profile-action-row"><span>${icon('settings',20)}</span><div><strong>${t('الإعدادات','Settings')}</strong><small>${t('إدارة بيانات التعلّم المحلية والتقدّم','Manage local learning data and progress')}</small></div><button data-action="open-settings">${t('فتح','Open')} ${icon('arrow',16)}</button></div>
        <label class="profile-action-row language-row"><span>${icon('globe',20)}</span><div><strong>${t('لغة الواجهة','Interface language')}</strong><small>${t('غيّر لغة الصفحات الرئيسية والخزانة والملف الشخصي','Change the redesigned home, closet and profile language')}</small></div><select id="profile-language-v28"><option value="ar" ${uiLang==='ar'?'selected':''}>العربية</option><option value="en" ${uiLang==='en'?'selected':''}>English</option></select></label>
        <div class="profile-action-row"><span>${icon('logout',20)}</span><div><strong>${t('تسجيل الخروج','Sign out')}</strong><small>${t('ارجع إلى شاشة البداية','Return to the start screen')}</small></div><button data-v28="logout">${t('خروج','Sign out')}</button></div>
        <div class="profile-action-row danger"><span>${icon('close',20)}</span><div><strong>${t('حذف الحساب','Delete account')}</strong><small>${t('يمسح الملف والتقدّم المحلي من هذا المتصفح','Removes the profile and local progress from this browser')}</small></div><button data-v28="delete-account">${t('حذف','Delete')}</button></div>
      </section>
      ${state._v28DeleteConfirm?`<div class="profile-delete-confirm-v28" role="alertdialog" aria-modal="true"><div><span>${icon('close',25)}</span><h2>${t('حذف الحساب؟','Delete account?')}</h2><p>${t('سيتم حذف ملفك وتقدّمك المحفوظ محلياً من هذا المتصفح.','Your profile and locally saved progress will be removed from this browser.')}</p><div><button data-v28="delete-cancel">${t('إلغاء','Cancel')}</button><button class="danger" data-v28="delete-confirm">${t('نعم، احذف الحساب','Yes, delete account')}</button></div></div></div>`:''}
    </main>`;
  };

  function applyClosetFilter(){
    const root=document.getElementById('closet-v28-results');if(!root)return;const query=(document.getElementById('closet-v28-search')?.value||'').trim().toLocaleLowerCase();const active=document.querySelector('[data-v28-filter].active')?.dataset.v28Filter||'all';
    root.querySelectorAll('.closet-entry-v28').forEach(el=>{const okStatus=active==='all'||el.dataset.closetStatus===active,okSearch=!query||(el.dataset.closetSearch||'').includes(query);el.hidden=!(okStatus&&okSearch)});
  }

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('[data-v28]');if(!el)return;e.preventDefault();e.stopImmediatePropagation();const action=el.dataset.v28;
    if(action==='study-current'){const id=currentId();if(id){LiplipCourse.start(id,state.progress);state.page='course-zone';state.nav='الدراسة';render()}return}
    if(action==='review-last'){const ids=completedIds(),id=ids[ids.length-1];if(id){LiplipCourse.start(id,state.progress,{review:true});state.page='course-zone';state.nav='الدراسة';render()}return}
    if(action==='talk'){state.chatMode=el.dataset.mode==='call'?'call':'chat';state.talkPhase='waiting';state.nav='تحدّث';state.page='app';render();return}
    if(action==='soon'){state.comingContext={kind:'study',kicker:el.dataset.feature||t('ميزة جديدة','New feature'),icon:el.dataset.feature==='fast-write'?'keyboard':'book'};state.page='feature-soon';render();return}
    if(action==='closet-open'){state.closetView=el.dataset.kind;state.closetIndex=0;render();return}
    if(action==='closet-back'){state.closetView=null;state.closetIndex=0;render();return}
    if(action==='logout'){state.profileSettings=false;state.guest=false;state.profile=null;state.page='landing';state.nav='الرئيسية';save();render();return}
    if(action==='delete-account'){state._v28DeleteConfirm=true;render(false);return}
    if(action==='delete-cancel'){state._v28DeleteConfirm=false;render(false);return}
    if(action==='delete-confirm'){state.profile=null;state.guest=false;state.progress=LiplipProgress.hydrate(null);state._v28DeleteConfirm=false;try{sessionStorage.removeItem('liplip-preview');localStorage.removeItem('liplip-progress-v1')}catch{}state.page='landing';state.nav='الرئيسية';render();return}
  },true);
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-v28-filter]');if(!b)return;e.preventDefault();document.querySelectorAll('[data-v28-filter]').forEach(x=>x.classList.toggle('active',x===b));applyClosetFilter()},true);
  document.addEventListener('input',e=>{if(e.target?.id==='closet-v28-search')applyClosetFilter()},true);
  document.addEventListener('change',e=>{if(e.target?.id!=='profile-language-v28')return;localStorage.setItem('liplip-ui-language',e.target.value==='en'?'en':'ar');document.documentElement.lang=e.target.value==='en'?'en':'ar';document.documentElement.dir=e.target.value==='en'?'ltr':'rtl';render(false)},true);

  const savedLang=lang();document.documentElement.lang=savedLang;document.documentElement.dir=savedLang==='en'?'ltr':'rtl';
  if(state.page==='app')render(false);
})();