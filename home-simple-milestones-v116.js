/* Build 116: compact functional Home and recovery for impossible locked-past milestones. */
(() => {
  'use strict';
  if(typeof state==='undefined'||typeof LiplipProgress==='undefined'||typeof LiplipCourse==='undefined')return;
  const UI=window.LiplipFrontend;
  const STORE='liplip-study-milestones-v113';
  const baseMapPage=LiplipCourse.mapPage.bind(LiplipCourse);
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const glyph=(name,size=22)=>{
    const paths={
      arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',book:'<path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2V5Z"/><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2V5Z"/>',
      review:'<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M8 8h8M8 12h6M8 16h4"/>',closet:'<path d="M4 9h16v12H4V9Z"/><path d="M7 9V5h10v4M9 13h6"/>',chat:'<path d="M4 4h16v12H8l-4 4V4Z"/>',phone:'<path d="M7 3h3l2 5-2 2a14 14 0 0 0 4 4l2-2 5 2v3c0 2-2 4-4 4A17 17 0 0 1 3 7c0-2 2-4 4-4Z"/>',
      keyboard:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M8 14h8"/>',check:'<path d="m5 12 4 4L19 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
    };
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.book}</svg>`;
  };
  const gid=(level,box)=>(level-1)*200+box;
  const levelOf=id=>Math.floor((Number(id)-1)/200)+1;
  const localBox=id=>((Number(id)-1)%200)+1;
  const milestoneKey=m=>`${m.level}:${m.type}:${m.after}`;
  function milestones(level){
    const list=[];for(let after=4;after<=48;after+=4){list.push({type:'review',level,after});if(after%12===0)list.push({type:'exam',level,after})}list.push({type:'final',level,after:50});return list;
  }
  function readStore(){try{const value=JSON.parse(localStorage.getItem(STORE)||'null');return value?.version===1?value:{version:1,baseline:{},completed:{}}}catch{return{version:1,baseline:{},completed:{}}}}
  function repairMilestones(progress){
    const snap=LiplipProgress.courseSnapshot(progress),completed=snap.completedBoxes||[],saved=readStore();saved.completed=saved.completed||{};let changed=false;
    for(let level=1;level<=5;level++)for(const milestone of milestones(level)){
      const key=milestoneKey(milestone);if(saved.completed[key])continue;
      const provedPast=completed.some(id=>levelOf(id)>level||(levelOf(id)===level&&localBox(id)>milestone.after));
      if(!provedPast)continue;
      saved.completed[key]={score:null,recovered:true,completedAt:new Date().toISOString()};changed=true;
    }
    if(changed)try{localStorage.setItem(STORE,JSON.stringify(saved))}catch{}
    return changed;
  }

  function course(){return LiplipProgress.courseSnapshot(state.progress)}
  function progression(){return window.LiplipProgression114?.snapshot?.()||{cefr:'A0',study:false,fastWrite:false,talk:false,letters:false,numbers:false}}
  function boxLabel(id){if(!id)return t('اكتملت الرحلة','Journey complete');const loc=LiplipProgress.courseLocation(id);return `${t('المستوى','Level')} ${loc.level} · ${t('الصندوق','Box')} ${String(loc.box).padStart(2,'0')}`}
  function simpleDashboard(){
    const c=course(),p=progression(),first=state.guest?t('صديقنا','Learner'):String(state.profile?.name||t('صديقنا','Learner')).trim().split(/\s+/)[0];
    const current=c.currentBox,last=c.completedBoxes?.at(-1)||null,loc=LiplipProgress.courseLocation(current||gid(5,50)),levelDone=(c.completedBoxes||[]).filter(id=>levelOf(id)===loc.level&&localBox(id)<=50).length,percent=Math.round(levelDone/50*100);
    const currentRecord=c.records?.find(record=>record.boxId===current),phase={vocabulary:t('المفردات','Vocabulary'),grammar:t('القواعد','Grammar'),watchRead:t('شاهد واقرأ','Watch & read')}[c.phase]||t('جاهز','Ready');
    return `<main class="dashboard home-v28 home-v116"><span class="v114-path" hidden></span>
      <header class="v116-home-head"><div><span>${t('مرحباً بعودتك','WELCOME BACK')}</span><h1>${t('هلا','Hi')} ${esc(first)}</h1><p>${t('كل ما تحتاجه لخطوتك التالية في مكان واحد.','Everything for your next step, in one place.')}</p></div><strong dir="ltr">${esc(p.cefr)}</strong></header>
      <section class="v116-next"><div class="v116-next-icon">${glyph(p.study?'book':'lock',29)}</div><div><small>${t('خطوتك التالية','NEXT STEP')}</small><h2>${p.study?t('تابع صندوق الدراسة الحالي','Continue your current Study box'):t('أكمل الحروف والأرقام','Complete Letters and Numbers')}</h2><p>${p.study?`${boxLabel(current)} · ${phase}${currentRecord?` · ${t('العملية','Process')} ${(currentRecord.processIndex||0)+1}`:''}`:t('بعد إكمالهما ستفتح الدراسة عند A1.','Study unlocks at A1 after both Learn tracks are complete.')}</p></div><button ${p.study&&current?'data-v28="study-current"':'data-nav="الرئيسية"'}>${p.study?t('متابعة','Continue'):t('ابدأ من الأساسيات','Start foundations')} ${glyph('arrow',17)}</button></section>
      <section class="home-section v116-quick"><header><div><span>${t('وصول سريع','QUICK ACCESS')}</span><h2>${t('اختر وجهتك','Choose where to go')}</h2></div><div class="v116-level-progress"><b>${percent}%</b><small>${levelDone}/50 · ${t('المستوى','Level')} ${loc.level}</small></div></header><div>
        <button class="v116-action study" data-v28="study-current" ${current?'':'disabled'}><i>${glyph('book')}</i><span><strong>${t('الدراسة','Study')}</strong><small>${boxLabel(current)}</small></span>${glyph('arrow',16)}</button>
        <button class="v116-action review" data-v28="review-last" ${last?'':'disabled'}><i>${glyph('review')}</i><span><strong>${t('مراجعة آخر صندوق','Review last box')}</strong><small>${last?boxLabel(last):t('لا يوجد صندوق مكتمل','No completed box')}</small></span>${glyph('arrow',16)}</button>
        <button class="v116-action closet" data-nav="خزانتي"><i>${glyph('closet')}</i><span><strong>${t('خزانة الكلمات','Vocabulary Closet')}</strong><small>${t('الكلمات المكتملة والمراجعة العشوائية','Completed words and random review')}</small></span>${glyph('arrow',16)}</button>
        <button class="v116-action talk" data-v28="talk" data-mode="chat"><i>${glyph('chat')}</i><span><strong>${t('الدردشة','Chat')}</strong><small>${p.talk?t('تدرّب بالمحادثة','Practice conversation'):t('تفتح عند B1','Unlocks at B1')}</small></span>${glyph(p.talk?'arrow':'lock',16)}</button>
      </div></section>
      <section class="v116-foundations"><header><span>${t('مهاراتك','YOUR SKILLS')}</span><h2>${t('الأساسيات والأدوات','Foundations and tools')}</h2></header><div>
        <button class="home-action soon" data-v28="soon" data-feature="letters"><i class="letter">A</i><span><strong>${t('الحروف','Letters')}</strong><small>${p.letters?t('مكتمل','Complete'):t('ابدأ هنا','Start here')}</small></span>${p.letters?glyph('check',17):glyph('arrow',17)}</button>
        <button class="home-action soon" data-v28="soon" data-feature="numbers"><i class="number">123</i><span><strong>${t('الأرقام','Numbers')}</strong><small>${p.numbers?t('مكتمل','Complete'):p.letters?t('جاهز','Ready'):t('بعد الحروف','After Letters')}</small></span>${p.numbers?glyph('check',17):glyph(p.letters?'arrow':'lock',17)}</button>
        <button class="home-action soon" data-v28="soon" data-feature="fast-write"><i>${glyph('keyboard')}</i><span><strong>${t('الكتابة السريعة','Fast Write')}</strong><small>${p.fastWrite?t('مفتوحة','Open'):t('تفتح عند A2','Unlocks at A2')}</small></span>${glyph(p.fastWrite?'arrow':'lock',17)}</button>
        <button class="v116-tool call" data-v28="talk" data-mode="call"><i>${glyph('phone')}</i><span><strong>${t('المكالمة','Call')}</strong><small>${p.talk?t('مفتوحة','Open'):t('تفتح عند B1','Unlocks at B1')}</small></span>${glyph(p.talk?'arrow':'lock',17)}</button>
      </div></section>
    </main>`;
  }

  LiplipCourse.mapPage=progress=>{repairMilestones(progress);return baseMapPage(progress)};
  window.dashboard=dashboard=simpleDashboard;
  const api=window.LiplipHome116=window.LiplipHome116||{};Object.assign(api,{milestones,repairMilestones,simpleDashboard});
  UI?.registerFeature?.('home-simple-milestones-v116',{mount(){if(state.page==='app'&&state.nav==='الرئيسية'&&!document.querySelector('.home-v116'))window.render?.(false)}});
  if(state.page==='app'&&state.nav==='الرئيسية')window.render?.(false);
})();
