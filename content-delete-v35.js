/* v35: delete-content workflow inside the study content-control bottom sheet. */
(() => {
  if (typeof LiplipCourse === 'undefined' || typeof LiplipProgress === 'undefined') return;
  const STORE='liplip-course-content-v2', STRIDE=200, BOXES=50;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const gid=(level,box)=>(Number(level)-1)*STRIDE+Number(box);
  const empty=()=>({
    vocabulary:{items:[],questions:[]},
    grammar:{article:{title:'',rule:'',normal:'',negative:'',question:'',notes:[],examples:[],laws:[]},questions:[]},
    watchRead:{video:{title:'',youtube:''},videoQuestions:[],story:[],storyQuestions:[]},
    _deleted:true
  });

  function inject(html){
    if(!String(html).includes('course-manager-home')) return html;
    const tpl=document.createElement('template');tpl.innerHTML=html;const root=tpl.content;
    root.querySelectorAll('.course-manager-home').forEach(home=>{
      if(home.querySelector('[data-v35="delete-content"]')) return;
      const btn=document.createElement('button');
      btn.type='button';btn.dataset.v35='delete-content';btn.className='course-delete-content-entry';
      btn.innerHTML=`<b>3</b><span><strong>${t('حذف المحتوى','Delete content')}</strong><small>${t('احذف محتوى صندوق واحد أو عدة صناديق أو مستوى كامل','Delete one box, multiple boxes, or a whole level')}</small></span>`;
      home.appendChild(btn);
    });
    return tpl.innerHTML;
  }

  if(typeof LiplipCourse.mapPage==='function'){
    const base=LiplipCourse.mapPage.bind(LiplipCourse);
    LiplipCourse.mapPage=progress=>inject(base(progress));
  }
  if(typeof LiplipCourse.render==='function'){
    const base=LiplipCourse.render.bind(LiplipCourse);
    LiplipCourse.render=progress=>inject(base(progress));
  }

  function currentLevel(){
    const snap=LiplipProgress.courseSnapshot(state?.progress);
    return snap.currentBox?LiplipProgress.courseLocation(snap.currentBox).level:1;
  }
  function scopeFields(scope){
    const host=document.getElementById('delete-content-scope-fields-v35');if(!host)return;
    if(scope==='level'){
      host.innerHTML=`<p>${t('سيتم حذف محتوى الصناديق الخمسين في هذا المستوى.','Content in all 50 boxes of this level will be deleted.')}</p>`;return;
    }
    if(scope==='one'){
      host.innerHTML=`<label>${t('الصندوق','Box')}<select id="delete-content-one-v35">${Array.from({length:BOXES},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label>`;return;
    }
    host.innerHTML=`<div class="delete-multi-head-v35"><span>${t('اختر الصناديق','Choose boxes')}</span><button type="button" data-v35="select-all">${t('تحديد الكل','Select all')}</button></div><div class="delete-box-grid-v35">${Array.from({length:BOXES},(_,i)=>`<label><input type="checkbox" name="delete-box-v35" value="${i+1}"><span>${i+1}</span></label>`).join('')}</div>`;
  }
  function openDialog(){
    document.getElementById('delete-content-modal-v35')?.remove();const level=currentLevel();
    document.body.insertAdjacentHTML('beforeend',`<div class="delete-content-modal-v35" id="delete-content-modal-v35"><button class="delete-content-backdrop-v35" data-v35="close" aria-label="${t('إغلاق','Close')}"></button><section role="dialog" aria-modal="true" aria-labelledby="delete-content-title-v35"><header><div><small>${t('إدارة المحتوى','Content control')}</small><h2 id="delete-content-title-v35">${t('حذف المحتوى','Delete content')}</h2><p>${t('اختر اللغة والمستوى والنطاق الذي تريد حذف محتواه.','Choose the language, level, and scope whose content you want to delete.')}</p></div><button type="button" data-v35="close">×</button></header><div class="delete-content-form-v35"><label>${t('اللغة','Language')}<select id="delete-content-language-v35"><option value="en">English</option><option disabled>${t('لغات أخرى — قريباً','Other languages — coming soon')}</option></select></label><label>${t('المستوى','Level')}<select id="delete-content-level-v35">${Array.from({length:5},(_,i)=>`<option value="${i+1}" ${i+1===level?'selected':''}>${t('المستوى','Level')} ${i+1}</option>`).join('')}</select></label><div class="delete-scope-v35"><span>${t('النطاق','Scope')}</span><div><button class="active" type="button" data-v35-scope="one">${t('صندوق واحد','One box')}</button><button type="button" data-v35-scope="multiple">${t('عدة صناديق','Multiple boxes')}</button><button type="button" data-v35-scope="level">${t('مستوى كامل','Whole level')}</button></div></div><div id="delete-content-scope-fields-v35"></div><p class="delete-warning-v35">${t('سيصبح المحتوى المحدد فارغاً. لا يتم حذف تقدّم المستخدم أو تصميم الصندوق.','Selected learning content will become empty. User progress and box design are not deleted.')}</p></div><footer><button type="button" data-v35="close">${t('إلغاء','Cancel')}</button><button type="button" class="danger" data-v35="confirm">${t('حذف المحتوى المحدد','Delete selected content')}</button></footer></section></div>`);
    scopeFields('one');
  }
  function selectedBoxes(){
    const modal=document.getElementById('delete-content-modal-v35');if(!modal)return[];
    const scope=modal.querySelector('[data-v35-scope].active')?.dataset.v35Scope||'one';
    if(scope==='level')return Array.from({length:BOXES},(_,i)=>i+1);
    if(scope==='one')return [Number(document.getElementById('delete-content-one-v35')?.value)||1];
    return [...modal.querySelectorAll('input[name="delete-box-v35"]:checked')].map(x=>Number(x.value));
  }
  function removeSelected(){
    const boxes=selectedBoxes();if(!boxes.length){alert(t('اختر صندوقاً واحداً على الأقل.','Select at least one box.'));return}
    const level=Number(document.getElementById('delete-content-level-v35')?.value)||1;
    let data={};try{data=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{}
    boxes.forEach(box=>{data[String(gid(level,box))]=empty()});
    localStorage.setItem(STORE,JSON.stringify(data));
    document.getElementById('delete-content-modal-v35')?.remove();
    alert(t(`تم حذف محتوى ${boxes.length} صندوق.`,`Deleted content from ${boxes.length} box${boxes.length===1?'':'es'}.`));
    if(typeof render==='function')render(false);
  }

  document.addEventListener('click',e=>{
    const open=e.target.closest?.('[data-v35="delete-content"]');if(open){e.preventDefault();e.stopImmediatePropagation();openDialog();return}
    const action=e.target.closest?.('[data-v35]');if(action){
      const a=action.dataset.v35;
      if(a==='close'){e.preventDefault();document.getElementById('delete-content-modal-v35')?.remove();return}
      if(a==='confirm'){e.preventDefault();removeSelected();return}
      if(a==='select-all'){e.preventDefault();const checks=[...document.querySelectorAll('input[name="delete-box-v35"]')],all=checks.every(x=>x.checked);checks.forEach(x=>x.checked=!all);action.textContent=!all?t('إلغاء تحديد الكل','Deselect all'):t('تحديد الكل','Select all');return}
    }
    const scope=e.target.closest?.('[data-v35-scope]');if(scope){e.preventDefault();document.querySelectorAll('[data-v35-scope]').forEach(x=>x.classList.toggle('active',x===scope));scopeFields(scope.dataset.v35Scope);}
  },true);
})();
