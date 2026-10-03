/* Build 120: preserve imported workbook questions and render Story as one complete book page. */
(() => {
  'use strict';
  const Course=window.LiplipCourse,S=window.LiplipCourse57,UI=window.LiplipFrontend;
  if(!Course||!S)return;

  const STORE='liplip-course-content-v2';
  const t=(ar,en)=>localStorage.getItem('liplip-ui-language')==='en'?en:ar;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLocaleLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/[.,?!؟؛:()"'’“”\-_]/g,'').replace(/\s+/g,' ');

  function storeData(){try{const value=JSON.parse(localStorage.getItem(STORE)||'{}');return value&&typeof value==='object'?value:{}}catch{return {}}}
  function rawContent(id){return storeData()[String(id)]||{}}
  function optionValues(q){
    const direct=[q?.option1,q?.option2,q?.option3,q?.option4].map(text).filter(Boolean);
    if(direct.length)return direct;
    return Array.isArray(q?.options)?q.options.map(text).filter(Boolean):[];
  }
  function grammarQuestion(q,index=0){
    const type=text(q?.type),title=text(q?.title||q?.prompt),answer=text(q?.answer),opts=optionValues(q);
    return {...q,order:Number(q?.order)||index+1,type,title,prompt:title,answer,option1:opts[0]||'',option2:opts[1]||'',option3:opts[2]||'',option4:opts[3]||'',options:opts};
  }
  function mcqQuestion(q,index=0){
    const title=text(q?.title||q?.prompt),answer=text(q?.answer);let opts=optionValues(q);
    if(answer&&!opts.some(x=>norm(x)===norm(answer)))opts=[answer,...opts];
    opts=opts.slice(0,4);let correct=opts.findIndex(x=>norm(x)===norm(answer));if(correct<0)correct=0;
    return {...q,order:Number(q?.order)||index+1,type:'mcq',title,prompt:title,answer,option1:opts[0]||'',option2:opts[1]||'',option3:opts[2]||'',option4:opts[3]||'',options:opts,correct,correctIndex:correct,explanation:text(q?.explanation)};
  }
  function validGrammarQuestions(list){return (Array.isArray(list)?list:[]).map(grammarQuestion).filter(q=>['fill_blank','reorder','correct_error'].includes(q.type)&&q.title&&q.answer)}
  function validMCQ(list){return (Array.isArray(list)?list:[]).map(mcqQuestion).filter(q=>q.title&&q.answer&&q.options.length>=2)}

  const baseGetContent=Course.getContent.bind(Course);
  Course.getContent=id=>{
    const base=baseGetContent(id)||{},raw=rawContent(id),rawGrammar=raw.grammar||{},rawWatch=raw.watchRead||{};
    const grammarQuestions=validGrammarQuestions(rawGrammar.questions);
    const baseWatch=base.watchRead||{};
    const videoQuestions=validMCQ(rawWatch.videoQuestions?.length?rawWatch.videoQuestions:baseWatch.videoQuestions);
    const storyQuestions=validMCQ(rawWatch.storyQuestions?.length?rawWatch.storyQuestions:baseWatch.storyQuestions);
    return {
      ...base,
      grammar:{...(base.grammar||{}),questions:grammarQuestions.length?grammarQuestions:validGrammarQuestions(base.grammar?.questions)},
      watchRead:{...baseWatch,videoQuestions,storyQuestions}
    };
  };

  function storyPages(){
    const raw=rawContent(S.boxId)?.watchRead||{},content=Course.getContent(S.boxId)?.watchRead||{};
    let source=Array.isArray(raw.story)&&raw.story.length?raw.story:content.story;
    if(!Array.isArray(source))source=source?[source]:[];
    return source.map((page,index)=>{
      if(typeof page==='string')return {order:index+1,title:'',text:text(page),arabic:''};
      return {
        order:Number(page?.order)||index+1,
        title:text(page?.title||page?.storyTitle),
        text:text(page?.text||page?.english||page?.storyEnglish||page?.body),
        arabic:text(page?.arabic||page?.storyArabic||page?.translation)
      };
    }).filter(page=>page.text||page.arabic).sort((a,b)=>a.order-b.order);
  }
  function storyTitle(pages){return pages.find(page=>page.title)?.title||t('قصة هذا الصندوق','This box story')}
  function storyBook(){
    const pages=storyPages(),title=storyTitle(pages),hasText=pages.some(page=>page.text||page.arabic);
    const sections=pages.map((page,index)=>`<section class="v120-book-section">${page.title&&page.title!==title?`<h3>${esc(page.title)}</h3>`:''}${page.text?`<p class="v120-book-en" dir="ltr">${esc(page.text)}</p>`:''}${page.arabic?`<p class="v120-book-ar" dir="rtl">${esc(page.arabic)}</p>`:''}${index<pages.length-1?'<hr>':''}</section>`).join('');
    return `<section class="c57-study c57-media v120-story-reader"><header><span>03 · ${t('القصة','STORY')}</span><h1>${esc(title)}</h1><p>${t('القصة كاملة في صفحة قراءة واحدة. اقرأها ثم ابدأ أسئلة القصة.','The full story is on one reading page. Read it, then start the story questions.')}</p></header><article class="v120-story-book"><div class="v120-book-spine" aria-hidden="true"></div><div class="v120-book-page">${hasText?sections:`<div class="v120-story-empty">${t('لا يوجد نص قصة محفوظ لهذا الصندوق. أضف Story English أو Story Arabic في ورقة Watch_Read.','No story text is saved for this box. Add Story English or Story Arabic in the Watch_Read sheet.')}</div>`}</div></article><button class="primary c57-media-next" data-course="media-exam" data-kind="story" ${hasText?'':'disabled'}>${t('أنهيت القراءة — ابدأ أسئلة القصة','Finished reading — start story questions')}</button></section>`;
  }
  function isStoryReading(){return Boolean(S.boxId&&S.phase==='watchRead'&&Number(S.process)===1&&Number(S.mediaStep||0)===0)}
  function replaceStory(html){return isStoryReading()?String(html).replace(/<section class="c57-study c57-media">[\s\S]*?<\/section>/,storyBook()):html}

  function installStyles(){
    if(document.getElementById('v120-story-book-style'))return;
    const style=document.createElement('style');style.id='v120-story-book-style';style.textContent=`
      .v120-story-reader{max-width:980px;margin-inline:auto}.v120-story-reader>header{text-align:center;margin-bottom:22px}.v120-story-book{position:relative;margin:0 auto 22px;max-width:820px;border:1px solid rgba(91,66,119,.22);border-radius:30px;background:#e9dcc1;padding:0 0 16px;box-shadow:0 16px 0 rgba(183,163,126,.35)}
      .v120-book-page{position:relative;z-index:1;min-height:520px;background:#fffdf7;border-radius:28px;padding:clamp(28px,6vw,58px);box-shadow:inset 0 0 0 1px rgba(188,164,118,.3);overflow:hidden}.v120-book-page:before,.v120-book-page:after{content:"";position:absolute;border-radius:50%;opacity:.58;pointer-events:none}.v120-book-page:before{width:170px;height:170px;background:#ffe27c;inset:-70px auto auto -55px}.v120-book-page:after{width:210px;height:210px;background:#b9ead5;inset:auto -95px -95px auto}.v120-book-spine{position:absolute;z-index:2;top:28px;bottom:42px;left:50%;width:1px;background:linear-gradient(transparent,rgba(112,88,62,.15),transparent);opacity:.28;pointer-events:none}
      .v120-book-section{position:relative;z-index:3;max-width:690px;margin:0 auto}.v120-book-section h3{font-size:18px;margin:0 0 16px;color:#6f5688}.v120-book-en{white-space:pre-wrap;font-family:"DM Sans",sans-serif;font-size:clamp(22px,4.2vw,34px);font-weight:650;line-height:1.72;color:#292238;text-align:left;margin:0}.v120-book-ar{white-space:pre-wrap;margin:22px 0 0;padding:18px 20px;border-radius:18px;background:rgba(246,240,250,.84);font-family:"Readex Pro",sans-serif;font-size:clamp(17px,3.4vw,23px);line-height:1.9;color:#655a70;text-align:right}.v120-book-section hr{border:0;border-top:1px dashed rgba(91,66,119,.2);margin:34px 0}.v120-story-empty{position:relative;z-index:3;min-height:360px;display:grid;place-items:center;text-align:center;font-weight:800;color:#7b6d82;line-height:1.8}.v120-story-reader>.c57-media-next{width:min(100%,820px);display:block;margin-inline:auto}
      @media(max-width:640px){.v120-story-book{border-radius:24px}.v120-book-page{min-height:430px;border-radius:22px;padding:30px 24px}.v120-book-spine{display:none}.v120-book-en{font-size:24px;line-height:1.65}}
    `;document.head.appendChild(style);
  }

  const baseRender=Course.render.bind(Course),baseClick=Course.click.bind(Course);
  Course.render=progress=>{installStyles();return replaceStory(baseRender(progress))};
  Course.click=(action,target,progress,rerender)=>{
    if(action==='media-exam'&&['story','video'].includes(target?.dataset?.kind)){
      const kind=target.dataset.kind,content=Course.getContent(S.boxId),questions=kind==='story'?content?.watchRead?.storyQuestions:content?.watchRead?.videoQuestions;
      const list=validMCQ(questions);
      if(list.length){Object.assign(S,{mediaStep:1,exam:list,item:0,answer:null,revealed:false,feedback:'',results:[],order:[],loading:false,error:''});return {}}
    }
    return baseClick(action,target,progress,rerender);
  };

  UI?.registerFeature?.('study-content-bridge-v120',{mount:installStyles});
  window.LiplipStudyContentBridge120={rawContent,validGrammarQuestions,validMCQ,storyPages,storyBook,replaceStory,isStoryReading};
  installStyles();
})();
