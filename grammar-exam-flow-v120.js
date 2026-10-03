/* Build 120: deterministic Grammar exam flow without answer-field summary sentinels. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend,Course=window.LiplipCourse,S=window.LiplipCourse57;
  if(!UI||!Course||!S)return;
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=value=>String(value??'').trim().toLocaleLowerCase().replace(/[\s\u064B-\u065F]+/g,' ').replace(/[.!?؟]+$/,'');
  const active=()=>Boolean(S.boxId&&S.phase==='grammar'&&Number(S.process)===1&&Array.isArray(S.exam)&&S.exam.length&&S.exam.every(q=>q?.kind==='grammar-v95'));
  const current=()=>S.exam?.[Math.min(S.item||0,Math.max(0,(S.exam?.length||1)-1))];
  let scheduled=false;

  function answerValue(q){
    if(q?.type==='reorder'){
      const tokens=String(q.title||'').includes('|')?String(q.title).split('|').map(x=>x.trim()).filter(Boolean):String(q.title||'').split(/\s+/).filter(Boolean);
      return (S._v95Order||[]).map(index=>tokens[index]).join(' ');
    }
    if(q?.type==='correct_error')return document.getElementById('v95-answer')?.value||'';
    return String(S.answer??'');
  }
  function resetQuestion(){Object.assign(S,{answer:null,revealed:false,feedback:'',order:[]});S._v95Order=[];}
  function score(){const results=S.results||[];return Math.round(results.filter(Boolean).length/Math.max(1,S.exam?.length||0)*100)}
  function resultMarkup(){const value=score();return `<section class="v120-grammar-result"><span class="v120-result-burst" aria-hidden="true">✦</span><small>${t('اكتملت رحلة القواعد','GRAMMAR EXAM COMPLETE')}</small><div class="v120-result-score"><strong>${value}%</strong><span>${t('متقن','MASTERED')}</span></div><h1>${t('أحسنت! صححت كل إجابة وأكملت الاختبار.','Well done! You corrected every answer and completed the exam.')}</h1><p>${t(`أنهيت ${S.exam.length} من ${S.exam.length} أسئلة. اضغط تم للانتقال مباشرة إلى شاهد واقرأ.`,`You completed all ${S.exam.length} questions. Press Done to move directly to Watch & Read.`)}</p><div class="v120-result-steps"><span class="done">✓ ${t('المقال','Article')}</span><i></i><span class="done">✓ ${t('الاختبار','Exam')}</span><i></i><span class="next">03 ${t('شاهد واقرأ','Watch & Read')}</span></div><button class="primary" data-course="finish-exam" data-kind="grammar" data-score="${value}">${t('تم · ابدأ شاهد واقرأ','Done · Start Watch & Read')} <b aria-hidden="true">←</b></button></section>`}

  function showResult(){S._v120Result=true;S.revealed=false;S.feedback='';schedule();}
  function submitCurrent(){
    if(!active()||S._v120Result)return;
    const q=current(),value=answerValue(q);
    if(q?.type==='correct_error')S.answer=value;
    const correct=norm(value)===norm(q?.answer);
    if(!correct){
      S.results[S.item]=false;S.revealed=true;S.feedback=t('تم وضع علامة على هذه الإجابة. صححها ثم اضغط التالي.','This answer is flagged. Correct it, then press Next.');
      window.render?.(false);schedule();return;
    }
    S.results[S.item]=true;
    if(S.item>=S.exam.length-1){showResult();return;}
    S.item++;resetQuestion();window.render?.(false);schedule();
  }

  function decorateSelected(root){
    root.querySelectorAll('[data-v95-option]').forEach(button=>{const selected=String(S.answer??'')===String(button.dataset.value??'');button.classList.toggle('v120-selected',selected);button.setAttribute('aria-pressed',String(selected));});
    root.querySelectorAll('[data-v95-remove]').forEach(button=>{button.classList.add('v120-selected-word');button.setAttribute('aria-label',`${t('كلمة مختارة','Selected word')}: ${button.textContent.trim()}`)});
    const made=root.querySelector('.v95-made');if(made&&S._v95Order?.length)made.classList.add('has-selection');
  }
  function decorateQuestion(){
    if(!active())return;
    const workspace=document.querySelector('.c57-workspace');if(!workspace)return;
    if(S._v120Result){if(!workspace.querySelector('.v120-grammar-result'))workspace.innerHTML=resultMarkup();return;}
    const exam=workspace.querySelector('.v95-grammar-exam');if(!exam)return;
    decorateSelected(exam);
    const nav=exam.querySelector('.c57-question-next');if(nav&&!nav.dataset.v120){nav.dataset.v120='1';nav.innerHTML=`<button class="v120-next primary" data-v120-next>${S.item>=S.exam.length-1?t('إنهاء وعرض النتيجة','Finish and see result'):t('التالي','Next')} <span aria-hidden="true">←</span></button>`;}
    const feedback=exam.querySelector('.c57-feedback.wrong');
    if(feedback&&!feedback.querySelector('.v120-flag'))feedback.insertAdjacentHTML('afterbegin',`<div class="v120-flag"><b>⚑ ${t('إجابة معلّمة','ANSWER FLAGGED')}</b><span>${t('ابقَ في هذا السؤال وصحح الإجابة، ثم اضغط التالي.','Stay on this question, correct the answer, then press Next.')}</span></div>`);
    const counter=exam.querySelector('.c57-pager b');if(counter)counter.setAttribute('aria-label',`${t('السؤال','Question')} ${S.item+1} ${t('من','of')} ${S.exam.length}`);
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>setTimeout(()=>{scheduled=false;decorateQuestion()},0));}

  document.addEventListener('click',event=>{
    const next=event.target.closest?.('[data-v120-next]');if(!next)return;
    event.preventDefault();event.stopImmediatePropagation();submitCurrent();
  },true);
  document.addEventListener('input',event=>{
    if(event.target?.id==='v95-answer'&&S.revealed){S.revealed=false;S.feedback='';delete S.results[S.item];schedule();}
  },true);
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-v95-option],[data-v95-token],[data-v95-remove]'))return;
    if(S.revealed){S.revealed=false;S.feedback='';delete S.results[S.item];}
    schedule();
  },false);

  const baseRender=Course.render.bind(Course),baseClick=Course.click.bind(Course);
  Course.render=progress=>{if(S.phase!=='grammar'||Number(S.process)!==1)S._v120Result=false;const html=baseRender(progress);schedule();return html};
  Course.click=(action,target,progress,rerender)=>{const result=baseClick(action,target,progress,rerender);if(action==='retry-exam'||action==='generate-exam'||action==='process'||action==='phase')S._v120Result=false;return result};
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  UI.registerFeature('grammar-exam-flow-v120',{mount:decorateQuestion});
  window.LiplipGrammarExam120={active,answerValue,submitCurrent,showResult,resultMarkup,decorateQuestion,resetQuestion,score};
  schedule();
})();
