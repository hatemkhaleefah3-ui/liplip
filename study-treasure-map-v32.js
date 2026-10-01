/* v32: playful treasure-map navigation for the five course levels and 10-box chapters. */
(() => {
  if (typeof LiplipCourse === 'undefined' || typeof LiplipCourse.render !== 'function' || typeof LiplipProgress === 'undefined') return;

  const STRIDE = 200;
  const LEVELS = 5;
  const BOXES_PER_LEVEL = 50;
  const PAGE_SIZE = 10;
  const PAGES = BOXES_PER_LEVEL / PAGE_SIZE;
  const baseRender = LiplipCourse.render.bind(LiplipCourse);
  const mapState = window.LiplipTreasureMap = window.LiplipTreasureMap || {level:null,page:1};

  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t = (ar,en) => localStorage.getItem('liplip-ui-language') === 'en' ? en : ar;
  const globalId = (level,box) => (level - 1) * STRIDE + box;
  const localBox = id => ((Number(id) - 1) % STRIDE) + 1;
  const levelOf = id => Math.floor((Number(id) - 1) / STRIDE) + 1;
  const isTreasure = box => box % 10 === 0;
  const pageOfBox = box => Math.max(1, Math.min(PAGES, Math.ceil(box / PAGE_SIZE)));
  const icon = (name,size=24) => {
    const paths = {
      chest:'<path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z"/><path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M9 5V3h6v2M9 14h6M12 12v4"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
      back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
      star:'<path d="m12 3 2.6 5.3 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3Z"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5 21 12l-2-1.5-.4-2.1-2.4-.4L15 5l-3-1-3 1-1.2 3-2.4.4L5 10.5 3 12l2 1.5.4 2.1 2.4.4L9 19l3 1 3-1 1.2-3 2.4-.4.4-2.1Z"/>'
    };
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.star}</svg>`;
  };

  function stats(progress, level){
    const snap = LiplipProgress.courseSnapshot(progress);
    const ids = Array.from({length:BOXES_PER_LEVEL},(_,i)=>globalId(level,i+1));
    const complete = ids.filter(id=>snap.completedBoxes.includes(id)).length;
    const records = new Map((snap.records||[]).map(r=>[r.boxId,r]));
    const units = ids.reduce((sum,id)=>sum+(records.get(id)?.completedPhases?.length||0),0);
    return {complete,percent:Math.round(units/(BOXES_PER_LEVEL*3)*100)};
  }

  function levelStatus(progress, level){
    const snap = LiplipProgress.courseSnapshot(progress);
    if (snap.currentBox === null) return 'complete';
    const currentLevel = levelOf(snap.currentBox);
    if (level < currentLevel) return 'complete';
    if (level === currentLevel) return 'current';
    return 'locked';
  }

  function boxStatus(progress,id){
    const snap=LiplipProgress.courseSnapshot(progress);
    if (snap.completedBoxes.includes(id)) return 'complete';
    if (snap.currentBox===id) return 'current';
    return 'locked';
  }

  function currentPageForLevel(progress,level){
    const snap=LiplipProgress.courseSnapshot(progress);
    if (snap.currentBox && levelOf(snap.currentBox)===level) return pageOfBox(localBox(snap.currentBox));
    return 1;
  }

  function pageUnlocked(progress,level,page){
    if(page<=1) return true;
    const previousTreasure=globalId(level,(page-1)*PAGE_SIZE);
    return LiplipProgress.courseSnapshot(progress).completedBoxes.includes(previousTreasure);
  }

  function extrasFromOriginal(original){
    const tpl=document.createElement('template');tpl.innerHTML=original;
    const main=tpl.content.querySelector('.course-map');
    if(!main)return '';
    return [...main.children]
      .filter(el=>!el.classList.contains('course-map-panel')&&!el.classList.contains('course-map-note'))
      .map(el=>el.outerHTML).join('');
  }

  function levelNode(progress,level){
    const status=levelStatus(progress,level),stat=stats(progress,level),side=level%2?'left':'right';
    const label=LiplipProgress.STAGES?.[level-1]||`${t('المستوى','Level')} ${level}`;
    return `<article class="treasure-level-stop ${status} ${side}">
      <span class="treasure-path-dot"></span>
      <button class="treasure-level-card" ${status==='locked'?'disabled':`data-course="level" data-level="${level}"`} aria-label="${safe(label)}">
        <span class="treasure-level-art"><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><b>${status==='locked'?icon('lock',31):icon('chest',39)}</b></span>
        <span class="treasure-level-copy"><small>${t('الكنز','TREASURE')} ${String(level).padStart(2,'0')}</small><strong>${safe(label)}</strong><em>${status==='locked'?t('ينفتح بعد إكمال الكنز السابق','Unlocks after the previous treasure'):status==='complete'?t('مكتمل · يمكنك العودة للمراجعة','Complete · open anytime'):t('كنزك الحالي · تابع الرحلة','Your current treasure · keep going')}</em><span class="treasure-progress"><i style="width:${stat.percent}%"></i></span></span>
        <span class="treasure-level-score"><b>${stat.percent}%</b><small>${stat.complete}/${BOXES_PER_LEVEL}</small></span>
      </button>
    </article>`;
  }

  function renderLevels(progress,original){
    const current=LiplipProgress.courseSnapshot(progress).currentBox;
    const currentLevel=current?levelOf(current):LEVELS;
    return `<main class="course-map treasure-study-map treasure-level-map">
      <div class="treasure-sky-decor" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <header class="treasure-map-hero"><span>${icon('map',22)} ${t('خريطة الدراسة','STUDY MAP')}</span><h1>${t('رحلة الكنوز الخمسة','The five-treasure journey')}</h1><p>${t('اسحب للأسفل لاستكشاف كل كنز. يمكنك فتح الكنوز المكتملة وكنزك الحالي فقط.','Scroll down to explore every treasure. Completed and current treasures can be opened.')}</p><div><b>${t('الكنز الحالي','Current treasure')}</b><strong>${String(currentLevel).padStart(2,'0')}</strong></div></header>
      <section class="treasure-levels-road">${Array.from({length:LEVELS},(_,i)=>levelNode(progress,i+1)).join('')}<span class="treasure-finish">${icon('star',25)}<b>${t('نهاية الخريطة','Map finish')}</b></span></section>
      ${extrasFromOriginal(original)}
    </main>`;
  }

  function phaseDots(progress,id,status){
    const snap=LiplipProgress.courseSnapshot(progress),record=(snap.records||[]).find(r=>r.boxId===id),count=status==='complete'?3:(record?.completedPhases?.length||0);
    return `<span class="treasure-box-phases">${[0,1,2].map(i=>`<i class="${i<count?'done':i===count&&status==='current'?'active':''}"></i>`).join('')}</span>`;
  }

  function boxNode(progress,level,box,index){
    const id=globalId(level,box),status=boxStatus(progress,id),treasure=isTreasure(box),side=index%2?'zig-right':'zig-left';
    const action=status==='locked'?'disabled':`data-course="box" data-box-id="${id}"`;
    return `<article class="treasure-box-stop ${side} ${status} ${treasure?'checkpoint':''}">
      <span class="treasure-box-path-dot"></span>
      <button class="treasure-box-card" ${action} ${treasure?'data-treasure-checkpoint="true"':''} data-level="${level}" data-local-box="${box}">
        <span class="treasure-box-icon">${status==='locked'?icon('lock',25):treasure?icon('chest',36):status==='complete'?icon('check',25):icon('star',25)}</span>
        <span class="treasure-box-copy"><small>${treasure?t('صندوق الكنز','TREASURE BOX'):t('صندوق','BOX')} ${String(box).padStart(2,'0')}</small><strong>${treasure?t(`تحدّي ${box-9}–${box-1}`,`Challenge ${box-9}–${box-1}`):t('خطوة جديدة','New step')}</strong><em>${treasure?t('يجمع محتوى الصناديق التسعة السابقة في مراجعة واحدة','Combines the previous 9 boxes into one review'):status==='complete'?t('مكتمل · اضغط للمراجعة','Complete · tap to review'):status==='current'?t('أنت هنا الآن','You are here'):t('أكمل الصندوق السابق لفتحه','Finish the previous box to unlock')}</em>${phaseDots(progress,id,status)}</span>
        ${treasure?`<span class="treasure-crown">${icon('star',18)}<b>×9</b></span>`:''}
      </button>
    </article>`;
  }

  function renderBoxes(progress,level,page,original){
    page=Math.max(1,Math.min(PAGES,page));
    if(!pageUnlocked(progress,level,page)) page=currentPageForLevel(progress,level);
    mapState.level=level;mapState.page=page;
    const start=(page-1)*PAGE_SIZE+1,end=start+PAGE_SIZE-1;
    const nextUnlocked=page<PAGES&&pageUnlocked(progress,level,page+1);
    const label=LiplipProgress.STAGES?.[level-1]||`${t('المستوى','Level')} ${level}`;
    return `<main class="course-map treasure-study-map treasure-box-map-page">
      <div class="treasure-sky-decor" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="treasure-map-topbar">
        <button class="treasure-levels-back" data-course="levels">${icon('back',18)} ${t('الكنوز','Treasures')}</button>
        <button class="treasure-page-nav previous" data-treasure-page="prev" ${page===1?'disabled':''}>${icon('back',17)} ${t('السابق','Previous')}</button>
        <span>${t('المجموعة','Set')} ${page}/${PAGES}</span>
      </div>
      <header class="treasure-box-hero"><span>${t('الكنز','Treasure')} ${String(level).padStart(2,'0')}</span><h1>${safe(label)}</h1><p>${t(`الصناديق ${start}–${end}. الصندوق ${end} هو صندوق كنز يجمع الصناديق التسعة السابقة.`,`Boxes ${start}–${end}. Box ${end} is a treasure box combining the previous nine.`)}</p></header>
      <section class="treasure-ten-road">${Array.from({length:PAGE_SIZE},(_,i)=>boxNode(progress,level,start+i,i)).join('')}</section>
      <div class="treasure-bottom-nav"><button class="treasure-page-nav next" data-treasure-page="next" ${page===PAGES||!nextUnlocked?'disabled':''}>${t('التالي','Next')} ${icon('arrow',17)}</button>${page<PAGES&&!nextUnlocked?`<small>${t(`أكمل صندوق الكنز ${end} لفتح المجموعة التالية`,`Finish treasure box ${end} to unlock the next set`)}</small>`:''}</div>
      ${extrasFromOriginal(original)}
    </main>`;
  }

  function aggregateCheckpoint(level,box){
    if(!isTreasure(box)) return;
    const id=globalId(level,box),first=box-9;
    const sources=Array.from({length:9},(_,i)=>LiplipCourse.getContent(globalId(level,first+i)));
    const aggregate={
      vocabulary:{items:[],questions:[]},
      grammar:{article:{title:t(`مراجعة الصناديق ${first}–${box-1}`,`Boxes ${first}–${box-1} review`),rule:'',normal:'',negative:'',question:'',laws:[],notes:[],examples:[]},questions:[]},
      watchRead:{video:{title:'',youtube:''},videoQuestions:[],story:[],storyQuestions:[]}
    };
    for(const content of sources){
      aggregate.vocabulary.items.push(...(content?.vocabulary?.items||[]));
      aggregate.vocabulary.questions.push(...(content?.vocabulary?.questions||[]));
      const a=content?.grammar?.article||{};
      aggregate.grammar.article.laws.push(...(a.laws||[]));
      aggregate.grammar.article.notes.push(...(a.notes||[]));
      aggregate.grammar.article.examples.push(...(a.examples||[]));
      aggregate.grammar.questions.push(...(content?.grammar?.questions||[]));
      if(!aggregate.watchRead.video.youtube&&content?.watchRead?.video?.youtube) aggregate.watchRead.video={...content.watchRead.video};
      aggregate.watchRead.videoQuestions.push(...(content?.watchRead?.videoQuestions||[]));
      aggregate.watchRead.story.push(...(content?.watchRead?.story||[]));
      aggregate.watchRead.storyQuestions.push(...(content?.watchRead?.storyQuestions||[]));
    }
    aggregate.vocabulary.items.forEach((x,i)=>x.order=i+1);
    aggregate.watchRead.story.forEach((x,i)=>x.order=i+1);
    try{
      const key='liplip-course-content-v2',store=JSON.parse(localStorage.getItem(key)||'{}');
      store[String(id)]=aggregate;
      localStorage.setItem(key,JSON.stringify(store));
    }catch{}
  }

  LiplipCourse.render=function(progress){
    const original=baseRender(progress);
    if(!/^\s*<main class="course-map/.test(original)) return original;
    const boxesMode=original.includes('course-breadcrumb');
    if(!boxesMode) return renderLevels(progress,original);
    let level=mapState.level;
    if(!level){
      const snap=LiplipProgress.courseSnapshot(progress);
      level=snap.currentBox?levelOf(snap.currentBox):1;
    }
    if(!mapState.page||!pageUnlocked(progress,level,mapState.page)) mapState.page=currentPageForLevel(progress,level);
    return renderBoxes(progress,level,mapState.page,original);
  };

  document.addEventListener('click',e=>{
    const levelBtn=e.target.closest?.('[data-course="level"][data-level]');
    if(levelBtn){mapState.level=Number(levelBtn.dataset.level)||1;mapState.page=currentPageForLevel(state?.progress,mapState.level);return;}
    if(e.target.closest?.('[data-course="levels"]')){mapState.level=null;mapState.page=1;return;}

    const pageBtn=e.target.closest?.('[data-treasure-page]');
    if(pageBtn){
      e.preventDefault();e.stopImmediatePropagation();
      if(pageBtn.disabled)return;
      mapState.page=Math.max(1,Math.min(PAGES,mapState.page+(pageBtn.dataset.treasurePage==='next'?1:-1)));
      if(typeof render==='function')render(false);
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
      return;
    }

    const checkpoint=e.target.closest?.('[data-treasure-checkpoint="true"][data-local-box][data-level]');
    if(checkpoint&&!checkpoint.disabled){aggregateCheckpoint(Number(checkpoint.dataset.level),Number(checkpoint.dataset.localBox));}
  },true);
})();
