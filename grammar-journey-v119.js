/* Build 119: unified Grammar article, playful question journey, and direct Watch & Read handoff. */
(() => {
  'use strict';
  if (typeof LiplipCourse === 'undefined' || typeof state === 'undefined') return;
  const UI=window.LiplipFrontend,Course=window.LiplipCourse,S=window.LiplipCourse57;
  if(!S)return;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const baseRender=Course.render.bind(Course),baseClick=Course.click.bind(Course);
  const icon=(path,size=22)=>`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const icons={book:'<path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2V5Z"/><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2V5Z"/>',spark:'<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'};

  function grammarArticle(){
    const a=Course.getContent(S.boxId)?.grammar?.article||{},notes=(a.notes||[]).filter(Boolean),examples=(a.examples||[]).map(x=>String(x?.text||x||'').trim()).filter(Boolean);
    const formulas=[
      {n:'01',tone:'normal',label:t('الجملة المثبتة','Positive form'),value:a.normal},
      {n:'02',tone:'negative',label:t('الجملة المنفية','Negative form'),value:a.negative},
      {n:'03',tone:'question',label:t('صيغة السؤال','Question form'),value:a.question}
    ].filter(x=>x.value);
    return `<section class="v119-grammar-article">
      <header class="v119-grammar-hero"><div class="v119-grammar-icon">${icon(icons.book,30)}</div><div><span>02 · ${t('القواعد','GRAMMAR')}</span><h1>${esc(a.title||t('قاعدة هذا الصندوق','This box grammar'))}</h1><p>${esc(a.rule||t('اقرأ القاعدة والصيغ والأمثلة في صفحة واحدة، ثم ابدأ الاختبار.','Read the rule, forms, and examples on one page, then start the exam.'))}</p></div><i aria-hidden="true">✦</i></header>
      <div class="v119-reading-path"><span class="active"><b>1</b>${t('افهم القاعدة','Understand')}</span><i></i><span><b>2</b>${t('شاهد الصيغ','See forms')}</span><i></i><span><b>3</b>${t('طبّق بالأمثلة','Use examples')}</span></div>
      <article class="v119-rule-card"><small>${t('القانون ببساطة','THE RULE, SIMPLY')}</small><h2>${esc(a.rule||a.title||'')}</h2><p>${t('اجعل هذه الفكرة مرجعك أثناء قراءة الصيغ التالية.','Keep this idea in mind while reading the forms below.')}</p><span aria-hidden="true">Aa</span></article>
      <section class="v119-formula-section"><header><span>${icon(icons.spark,18)}</span><div><small>${t('مختبر الصيغ','FORMULA LAB')}</small><h2>${t('ثلاث طرق لاستخدام القاعدة','Three ways to use the rule')}</h2></div></header><div>${formulas.map(f=>`<article class="${f.tone}"><span>${f.n}</span><small>${f.label}</small><strong dir="ltr">${esc(f.value)}</strong></article>`).join('')||`<p class="v119-empty">${t('أضف الصيغ إلى محتوى القواعد لهذا الصندوق.','Add grammar formulas to this box content.')}</p>`}</div></section>
      ${notes.length?`<aside class="v119-notes"><header><span>!</span><div><small>${t('تذكّر','REMEMBER')}</small><h2>${t('ملاحظات ذكية','Smart notes')}</h2></div></header><ul>${notes.map(note=>`<li>${icon(icons.check,17)}<span>${esc(note)}</span></li>`).join('')}</ul></aside>`:''}
      <section class="v119-examples"><header><div><small>${t('شاهدها تعمل','SEE IT IN ACTION')}</small><h2>${t('أمثلة واضحة','Clear examples')}</h2></div><b>${examples.length}</b></header><div>${examples.map((example,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><p dir="ltr">${esc(example)}</p></article>`).join('')||`<p class="v119-empty">${t('أضف أمثلة إلى محتوى القواعد لهذا الصندوق.','Add grammar examples to this box content.')}</p>`}</div></section>
      <footer class="v119-article-finish"><div><span>${icon(icons.check,20)}</span><p><strong>${t('أنهيت المقال','Article complete')}</strong><small>${t('أنت جاهز الآن لتطبيق القاعدة سؤالاً بعد سؤال.','You are ready to apply the rule one question at a time.')}</small></p></div><button class="primary" data-course="complete-study" data-total="1">${t('ابدأ اختبار القواعد','Start grammar exam')} ${icon(icons.arrow,18)}</button></footer>
    </section>`;
  }

  function replaceGrammarStudy(html){
    if(S.phase!=='grammar'||Number(S.process)!==0)return html;
    return html.replace(/<section class="c57-study c57-grammar">[\s\S]*?<\/section>/,grammarArticle());
  }
  Course.render=progress=>replaceGrammarStudy(baseRender(progress));

  function resetForWatchRead(){
    Object.assign(S,{phase:'watchRead',process:0,item:0,answer:null,revealed:false,feedback:'',exam:null,results:[],order:[],mediaStep:0,loading:false,error:''});
  }
  Course.click=(action,target,progress,rerender)=>{
    const finishingGrammar=action==='finish-exam'&&S.phase==='grammar'&&Number(S.process)===1;
    const result=baseClick(action,target,progress,rerender);
    if(finishingGrammar&&result?.progress)resetForWatchRead();
    return result;
  };

  function decorateExam(){
    const exam=document.querySelector('.v95-grammar-exam');
    if(exam&&!exam.dataset.v119){
      exam.dataset.v119='1';exam.classList.add('v119-grammar-exam');
      const head=exam.querySelector('header');
      head?.insertAdjacentHTML('beforeend',`<div class="v119-question-route"><span class="done">${icon(icons.check,14)} ${t('المقال','Article')}</span><i></i><span class="active">${t('سؤال بسؤال','Question journey')}</span><i></i><span>${t('النتيجة','Result')}</span></div>`);
      const question=exam.querySelector('.c57-question'),type=question?.querySelector(':scope > small');
      if(type){const key=type.textContent.trim().toLowerCase().replaceAll(' ','-');question.classList.add(`v119-type-${key}`);type.insertAdjacentHTML('afterbegin','<b aria-hidden="true">✦</b> ');}
    }
    const summary=document.querySelector('.c57-workspace > .c57-summary');
    if(summary&&S.phase==='grammar'&&S.answer==='v95-summary'){
      summary.classList.add('v119-grammar-result');
      if(!summary.querySelector('.v119-result-kicker'))summary.querySelector('h1')?.insertAdjacentHTML('beforebegin',`<small class="v119-result-kicker">${t('رحلة القواعد اكتملت','GRAMMAR JOURNEY COMPLETE')}</small>`);
      const done=summary.querySelector('[data-course="finish-exam"]');
      if(done)done.innerHTML=`${t('تم · ابدأ شاهد واقرأ','Done · Start Watch & Read')} ${icon(icons.arrow,18)}`;
    }
  }
  const schedule=()=>requestAnimationFrame(()=>setTimeout(decorateExam,0));
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  UI?.registerFeature?.('grammar-journey-v119',{mount:decorateExam});
  window.LiplipGrammar119={grammarArticle,replaceGrammarStudy,resetForWatchRead,decorateExam};
  schedule();
})();
