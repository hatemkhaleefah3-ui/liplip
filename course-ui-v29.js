/* v29 course UI shim. Loaded after course.js and the v29 dialog handlers. */
(() => {
  if (typeof LiplipCourse === 'undefined' || typeof LiplipCourse.render !== 'function') return;
  const STRIDE=200, MAX=50;
  const base=LiplipCourse.render.bind(LiplipCourse);
  const local=id=>((Number(id)-1)%STRIDE)+1;
  const level=id=>Math.floor((Number(id)-1)/STRIDE)+1;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  LiplipCourse.LEVEL_BOXES=MAX;
  LiplipCourse.render=function(progress){
    const html=base(progress),tpl=document.createElement('template');tpl.innerHTML=html;const root=tpl.content;
    root.querySelectorAll('.course-box').forEach(el=>{const id=Number(el.dataset.boxId);if(id&&local(id)>MAX)el.remove()});
    root.querySelectorAll('[data-course-manager-field="box"] option').forEach(o=>{if(Number(o.value)>MAX)o.remove()});
    const snap=LiplipProgress.courseSnapshot(progress);
    root.querySelectorAll('.course-level').forEach((el,i)=>{
      const n=i+1,done=snap.completedBoxes.filter(id=>level(id)===n&&local(id)<=MAX).length,records=snap.records.filter(r=>level(r.boxId)===n&&local(r.boxId)<=MAX),units=records.reduce((s,r)=>s+(r.completedPhases?.length||0),0),percent=Math.round(units/(MAX*3)*100);
      const p=el.querySelector('p');if(p&&!el.disabled)p.textContent=`${done} / ${MAX} ${t('صندوق مكتمل','completed boxes')}`;
      const pct=[...el.children].find(x=>x.tagName==='B');if(pct)pct.textContent=`${percent}%`;
      const bar=el.querySelector('.course-progress i');if(bar)bar.style.width=`${percent}%`;
    });
    const home=root.querySelector('.course-manager-home');
    if(home&&!home.querySelector('[data-v29="clear-content"]')){
      const b=document.createElement('button');b.type='button';b.dataset.v29='clear-content';b.className='course-clear-content-entry';b.innerHTML=`<b>3</b><span><strong>${t('مسح المحتوى','Clear content')}</strong><small>${t('اختر اللغة والمستوى والصندوق أو عدة صناديق','Choose language, level, one box or multiple boxes')}</small></span>`;home.appendChild(b);
    }
    return tpl.innerHTML;
  };
})();