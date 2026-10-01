/* v32: build every 10th treasure box from the previous nine stored boxes before course.js reads content. */
(() => {
  const KEY='liplip-course-content-v2',STRIDE=200,LEVELS=5,GROUP=10;
  const gid=(level,box)=>(level-1)*STRIDE+box;
  try{
    const store=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(!store||typeof store!=='object')return;
    let changed=false;
    for(let level=1;level<=LEVELS;level++){
      for(let end=10;end<=50;end+=GROUP){
        const sources=[];
        for(let box=end-9;box<end;box++){
          const c=store[String(gid(level,box))];
          if(c&&typeof c==='object')sources.push(c);
        }
        if(!sources.length)continue;
        const first=end-9,aggregate={
          _treasureGenerated:true,
          _treasureRange:[first,end-1],
          vocabulary:{items:[],questions:[]},
          grammar:{article:{title:`Treasure review ${first}-${end-1}`,rule:'Cumulative review of the previous nine boxes.',normal:'',negative:'',question:'',laws:[],notes:[],examples:[]},questions:[]},
          watchRead:{video:{title:'',youtube:''},videoQuestions:[],story:[],storyQuestions:[]}
        };
        for(const c of sources){
          aggregate.vocabulary.items.push(...(c.vocabulary?.items||[]));
          aggregate.vocabulary.questions.push(...(c.vocabulary?.questions||[]));
          const a=c.grammar?.article||{};
          aggregate.grammar.article.laws.push(...(a.laws||[]));
          aggregate.grammar.article.notes.push(...(a.notes||[]));
          aggregate.grammar.article.examples.push(...(a.examples||[]));
          aggregate.grammar.questions.push(...(c.grammar?.questions||[]));
          if(!aggregate.watchRead.video.youtube&&c.watchRead?.video?.youtube)aggregate.watchRead.video={...c.watchRead.video};
          aggregate.watchRead.videoQuestions.push(...(c.watchRead?.videoQuestions||[]));
          aggregate.watchRead.story.push(...(c.watchRead?.story||[]));
          aggregate.watchRead.storyQuestions.push(...(c.watchRead?.storyQuestions||[]));
        }
        aggregate.vocabulary.items=aggregate.vocabulary.items.map((x,i)=>({...x,order:i+1}));
        aggregate.watchRead.story=aggregate.watchRead.story.map((x,i)=>({...x,order:i+1}));
        store[String(gid(level,end))]=aggregate;
        changed=true;
      }
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(store));
  }catch{}
})();
