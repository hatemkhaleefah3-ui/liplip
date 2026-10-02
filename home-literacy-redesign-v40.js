/* v40: refreshed home dashboard + playful letter/number learning cards. */
(() => {
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  if(typeof dashboard==='function'){
    const previousDashboard=dashboard;
    dashboard=function(){
      const html=previousDashboard(),tpl=document.createElement('template');tpl.innerHTML=html;
      const root=tpl.content.querySelector('.home-v28');if(!root)return html;
      root.classList.add('home-v40');
      const course=LiplipProgress.courseSnapshot(state.progress),snap=LiplipProgress.snapshot(state.progress),done=course.completedBoxes?.length||0,total=course.totalBoxes||250;
      const current=course.currentBox?LiplipProgress.courseLocation(course.currentBox):null;
      const hero=root.querySelector('.home-greeting');
      if(hero&&!hero.querySelector('.home-v40-orbit'))hero.insertAdjacentHTML('beforeend','<span class="home-v40-orbit o1"></span><span class="home-v40-orbit o2"></span><span class="home-v40-star s1">✦</span><span class="home-v40-star s2">✦</span>');
      const section=root.querySelector('.home-section');
      if(section&&!root.querySelector('.home-v40-overview'))section.insertAdjacentHTML('beforebegin',`<section class="home-v40-overview"><article><span>${icon('target',20)}</span><div><small>${t('موقعك الآن','Current position')}</small><strong>${current?t('المستوى','Level')+' '+current.level+' · '+t('الصندوق','Box')+' '+current.box:t('اكتملت الرحلة','Journey complete')}</strong></div></article><article><span>${icon('check',20)}</span><div><small>${t('الصناديق المكتملة','Completed boxes')}</small><strong>${done} / ${total}</strong></div></article><article><span>${icon('spark',20)}</span><div><small>${t('مستواك','Your level')}</small><strong dir="ltr">${safe(snap.level||'A1')}</strong></div></article></section>`);
      const qh=root.querySelector('.home-section-head h2');if(qh)qh.textContent=t('اختر مغامرتك التالية','Choose your next adventure');
      const qp=root.querySelector('.home-section-head span');if(qp)qp.textContent=t('تعلّم بطريقتك','Learn your way');
      return tpl.innerHTML;
    };
  }

  function polishLiteracy(){
    const L=window.LiplipLiteracy;if(!L||state.page!=='literacy-v36'||(L.mode!=='letters'&&L.mode!=='numbers')||L.stage!=='learn')return;
    const page=document.querySelector('.lit36');if(!page)return;page.classList.add('lit40-learn-page',L.mode==='letters'?'letters':'numbers');
    const card=page.querySelector('.lit36-flip');if(!card)return;card.classList.add('lit40-flashcard');
    const front=card.querySelector('.lit36-face.front'),back=card.querySelector('.lit36-face.back');
    if(front&&!front.querySelector('.lit40-card-label'))front.insertAdjacentHTML('afterbegin',`<span class="lit40-card-label">${L.mode==='letters'?t('حرف إنجليزي','English letter'):t('رقم إنجليزي','English number')}</span><i class="lit40-bubble b1"></i><i class="lit40-bubble b2"></i><i class="lit40-bubble b3"></i>`);
    if(back&&!back.querySelector('.lit40-card-label'))back.insertAdjacentHTML('afterbegin',`<span class="lit40-card-label alt">${t('اقلب · اسمع · كرر','Flip · hear · repeat')}</span><i class="lit40-squiggle">~</i>`);
    const wrap=page.querySelector('.lit36-card-wrap');if(wrap&&!wrap.querySelector('.lit40-card-caption'))wrap.insertAdjacentHTML('afterbegin',`<div class="lit40-card-caption"><b>${L.mode==='letters'?'A–Z':'0–34'}</b><span>${t('استمع تلقائياً ثم اقلب البطاقة','Auto sound, then flip the card')}</span></div>`);
  }

  const observer=new MutationObserver(()=>polishLiteracy());
  const app=document.getElementById('app');if(app)observer.observe(app,{childList:true,subtree:true});
  polishLiteracy();
})();