/* v44: route the app Study tab through five-box sets (four learning boxes + one review). */
(() => {
  if (typeof LiplipCourse === 'undefined' || typeof LiplipCourse.mapPage !== 'function' || typeof LiplipProgress === 'undefined') return;

  const STRIDE=200, LEVELS=5, BOXES=50, PAGE_SIZE=5, PAGES=10;
  const baseMapPage=LiplipCourse.mapPage.bind(LiplipCourse);
  const mapState=window.LiplipTreasureMap=window.LiplipTreasureMap||{level:null,page:1};
  let latestProgress=null;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gid=(level,box)=>(level-1)*STRIDE+box;
  const local=id=>((Number(id)-1)%STRIDE)+1;
  const levelOf=id=>Math.floor((Number(id)-1)/STRIDE)+1;
  const pageOf=box=>Math.max(1,Math.min(PAGES,Math.ceil(box/PAGE_SIZE)));
  const icon=(type,size=22)=>{
    const paths={
      chest:'<path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Z"/><path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M9 5V3h6v2M9 14h6M12 12v4"/>',
      lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      star:'<path d="m12 3 2.6 5.3 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3Z"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
      back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
      next:'<path d="M5 12h14m-6-6 6 6-6 6"/>'
    };
    return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[type]||paths.star}</svg>`;
  };
  const snap=p=>LiplipProgress.courseSnapshot(p);
  const levelStatus=(p,l)=>{const s=snap(p);if(s.currentBox===null)return 'complete';const c=levelOf(s.currentBox);return l<c?'complete':l===c?'current':'locked'};
  const boxStatus=(p,id)=>{const s=snap(p);return s.completedBoxes.includes(id)?'complete':s.currentBox===id?'current':'locked'};
  const currentPage=(p,l)=>{const s=snap(p);return s.currentBox&&levelOf(s.currentBox)===l?pageOf(local(s.currentBox)):1};
  const pageUnlocked=(p,l,page)=>page<=1||snap(p).completedBoxes.includes(gid(l,(page-1)*PAGE_SIZE));
  const levelStats=(p,l)=>{const s=snap(p),records=new Map((s.records||[]).map(r=>[r.boxId,r]));let done=0,units=0;for(let b=1;b<=BOXES;b++){const id=gid(l,b);if(s.completedBoxes.includes(id))done++;units+=(records.get(id)?.completedPhases?.length||0)}return{done,percent:Math.round(units/(BOXES*3)*100)}};
  const phases=(p,id,status)=>{const s=snap(p),r=(s.records||[]).find(x=>x.boxId===id),count=status==='complete'?3:(r?.completedPhases?.length||0);return `<span class="treasure-box-phases">${[0,1,2].map(i=>`<i class="${i<count?'done':i===count&&status==='current'?'active':''}"></i>`).join('')}</span>`};
  function extras(original){const tpl=document.createElement('template');tpl.innerHTML=original;const main=tpl.content.querySelector('.course-map');if(!main)return '';return [...main.children].filter(el=>!el.classList.contains('course-map-panel')&&!el.classList.contains('course-map-note')).map(el=>el.outerHTML).join('')}
  function levelNode(p,l){const status=levelStatus(p,l),stat=levelStats(p,l),label=LiplipProgress.STAGES?.[l-1]||`${t('المستوى','Level')} ${l}`;return `<article class="treasure-level-stop ${status} ${l%2?'left':'right'}"><span class="treasure-path-dot"></span><button class="treasure-level-card" ${status==='locked'?'disabled':`data-course="level" data-level="${l}"`}><span class="treasure-level-art"><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><b>${status==='locked'?icon('lock',31):icon('chest',39)}</b></span><span class="treasure-level-copy"><small>${t('الكنز','TREASURE')} ${String(l).padStart(2,'0')}</small><strong>${safe(label)}</strong><em>${status==='locked'?t('ينفتح بعد إكمال الكنز السابق','Unlocks after the previous treasure'):status==='complete'?t('مكتمل · افتحه للمراجعة','Complete · open for review'):t('كنزك الحالي · تابع الرحلة','Current treasure · keep going')}</em><span class="treasure-progress"><i style="width:${stat.percent}%"></i></span></span><span class="treasure-level-score"><b>${stat.percent}%</b><small>${stat.done}/${BOXES}</small></span></button></article>`}
  function levelsPage(p,original){const s=snap(p),cl=s.currentBox?levelOf(s.currentBox):LEVELS;return `<main class="course-map treasure-study-map treasure-level-map"><div class="treasure-sky-decor" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><header class="treasure-map-hero"><span>${icon('map',22)} ${t('خريطة الدراسة','STUDY MAP')}</span><h1>${t('رحلة الكنوز الخمسة','The five-treasure journey')}</h1><p>${t('مرّر عمودياً لاستكشاف الكنوز. افتح المستوى الحالي أو أي مستوى مكتمل.','Scroll vertically through the treasures. Open the current level or any completed level.')}</p><div><b>${t('الكنز الحالي','Current treasure')}</b><strong>${String(cl).padStart(2,'0')}</strong></div></header><section class="treasure-levels-road">${Array.from({length:LEVELS},(_,i)=>levelNode(p,i+1)).join('')}<span class="treasure-finish">${icon('star',25)}<b>${t('نهاية الخريطة','Map finish')}</b></span></section>${extras(original)}</main>`}
  function boxNode(p,l,b,i){const id=gid(l,b),status=boxStatus(p,id),treasure=b%PAGE_SIZE===0;return `<article class="treasure-box-stop ${i%2?'zig-right':'zig-left'} ${status} ${treasure?'checkpoint':''}"><span class="treasure-box-path-dot"></span><button class="treasure-box-card" ${status==='locked'?'disabled':`data-course="box" data-box-id="${id}"`} ${treasure?'data-treasure-checkpoint="true"':''} data-level="${l}" data-local-box="${b}"><span class="treasure-box-icon">${status==='locked'?icon('lock',25):treasure?icon('chest',36):status==='complete'?icon('check',25):icon('star',25)}</span><span class="treasure-box-copy"><small>${treasure?t('صندوق المراجعة','REVIEW BOX'):t('صندوق','BOX')} ${String(b).padStart(2,'0')}</small><strong>${treasure?t(`مراجعة ${b-4}–${b-1}`,`Review ${b-4}–${b-1}`):t('خطوة جديدة','New step')}</strong><em>${treasure?t('يجمع الصناديق الأربعة السابقة في مراجعة واحدة','Combines the previous four boxes into one review'):status==='complete'?t('مكتمل · افتحه للمراجعة','Complete · open for review'):status==='current'?t('أنت هنا الآن','You are here'):t('أكمل الصندوق السابق لفتحه','Finish the previous box to unlock')}</em>${phases(p,id,status)}</span>${treasure?`<span class="treasure-crown">${icon('star',18)}<b>×4</b></span>`:''}</button></article>`}
  function boxesPage(p,l,page,original){page=Math.max(1,Math.min(PAGES,page));if(!pageUnlocked(p,l,page))page=currentPage(p,l);mapState.level=l;mapState.page=page;const start=(page-1)*PAGE_SIZE+1,end=start+PAGE_SIZE-1,nextOpen=page<PAGES&&pageUnlocked(p,l,page+1),label=LiplipProgress.STAGES?.[l-1]||`${t('المستوى','Level')} ${l}`;return `<main class="course-map treasure-study-map treasure-box-map-page"><div class="treasure-sky-decor" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="treasure-map-topbar"><button class="treasure-levels-back" data-course="levels">${icon('back',18)} ${t('الكنوز','Treasures')}</button><button class="treasure-page-nav previous" data-treasure-page="prev" ${page===1?'disabled':''}>${icon('back',17)} ${t('السابق','Previous')}</button><span>${t('المجموعة','Set')} ${page}/${PAGES}</span></div><header class="treasure-box-hero"><span>${t('الكنز','Treasure')} ${String(l).padStart(2,'0')}</span><h1>${safe(label)}</h1><p>${t(`الصناديق ${start}–${end}. أربعة صناديق تعلم ثم الصندوق ${end} للمراجعة.`,`Boxes ${start}–${end}. Four learning boxes followed by review box ${end}.`)}</p></header><section class="treasure-ten-road">${Array.from({length:PAGE_SIZE},(_,i)=>boxNode(p,l,start+i,i)).join('')}</section><div class="treasure-bottom-nav"><button class="treasure-page-nav next" data-treasure-page="next" ${page===PAGES||!nextOpen?'disabled':''}>${t('التالي','Next')} ${icon('next',17)}</button>${page<PAGES&&!nextOpen?`<small>${t(`أكمل صندوق المراجعة ${end} لفتح الخمسة التالية`,`Finish review box ${end} to unlock the next five`)}</small>`:''}</div>${extras(original)}</main>`}

  LiplipCourse.mapPage=function(progress){latestProgress=progress;const original=baseMapPage(progress);const boxesMode=original.includes('course-breadcrumb');if(!boxesMode){mapState.level=null;mapState.page=1;return levelsPage(progress,original)}let level=mapState.level;if(!level){const s=snap(progress);level=s.currentBox?levelOf(s.currentBox):1}if(!mapState.page||!pageUnlocked(progress,level,mapState.page))mapState.page=currentPage(progress,level);return boxesPage(progress,level,mapState.page,original)};

  document.addEventListener('click',e=>{
    const levelBtn=e.target.closest?.('[data-course="level"][data-level]');
    if(levelBtn&&latestProgress){mapState.level=Number(levelBtn.dataset.level)||1;mapState.page=currentPage(latestProgress,mapState.level)}
    if(e.target.closest?.('[data-course="levels"]')){mapState.level=null;mapState.page=1}
    const pageBtn=e.target.closest?.('[data-treasure-page]');
    if(!pageBtn)return;
    e.preventDefault();e.stopImmediatePropagation();if(pageBtn.disabled||!latestProgress)return;
    const next=pageBtn.dataset.treasurePage==='next';const candidate=Math.max(1,Math.min(PAGES,mapState.page+(next?1:-1)));
    if(next&&!pageUnlocked(latestProgress,mapState.level,candidate))return;
    mapState.page=candidate;if(typeof render==='function')render(false);requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}));
  },true);
})();
