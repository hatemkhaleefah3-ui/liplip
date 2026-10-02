/* v89: vocabulary boxes use word-only flashcards and no draw question type. */
(() => {
  'use strict';
  const Course=window.LiplipCourse;
  const S=window.LiplipCourse57;
  if(!Course||!S)return;

  const baseGetContent=Course.getContent?.bind(Course);
  if(baseGetContent){
    Course.getContent=function(id){
      const content=baseGetContent(id);
      const source=Array.isArray(content?.vocabulary?.items)?content.vocabulary.items:[];
      const items=source.filter(item=>{
        const en=String(item?.en||item?.word||'').trim();
        const type=String(item?.type||'word').trim().toLowerCase();
        if(type&&type!=='word')return false;
        // Word-only vocabulary: allow letters plus internal apostrophes/hyphens, but no spaces/sentences.
        return /^[A-Za-z]+(?:['’\-][A-Za-z]+)*$/.test(en);
      });
      return {
        ...content,
        vocabulary:{...(content?.vocabulary||{}),items}
      };
    };
  }

  function removeDrawQuestions(){
    if(!Array.isArray(S.exam))return false;
    const filtered=S.exam.filter(q=>String(q?.type||'').toLowerCase()!=='draw');
    if(filtered.length===S.exam.length)return false;
    S.exam=filtered;
    S.item=Math.min(Math.max(0,Number(S.item)||0),Math.max(0,filtered.length-1));
    return true;
  }

  const baseRender=Course.render?.bind(Course);
  if(baseRender){
    Course.render=function(progress){
      removeDrawQuestions();
      let html=baseRender(progress);
      // Legacy renderer can create draw questions during this render. Remove them before returning UI.
      if(S.phase==='vocabulary'&&Number(S.process)===1&&removeDrawQuestions()){
        html=baseRender(progress);
      }
      if(typeof html==='string'){
        html=html
          .replace(/ثلاثة أنواع · خمسة أسئلة لكل نوع/g,'نوعان · خمسة أسئلة لكل نوع')
          .replace(/Three types · five questions per type/g,'Two types · five questions per type')
          .replace(/النوع 2\/3/g,'النوع 1/2')
          .replace(/النوع 3\/3/g,'النوع 2/2')
          .replace(/Type 2\/3/g,'Type 1/2')
          .replace(/Type 3\/3/g,'Type 2/2');
      }
      return html;
    };
  }

  // Clear any exam cached before this patch loaded so the next render rebuilds it without drawing.
  if(Array.isArray(S.exam)&&S.exam.some(q=>String(q?.type||'').toLowerCase()==='draw')){
    S.exam=S.exam.filter(q=>String(q?.type||'').toLowerCase()!=='draw');
    S.item=0;
  }
})();
