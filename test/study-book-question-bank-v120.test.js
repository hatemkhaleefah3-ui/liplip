const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('study-book-question-bank-v120.js', 'utf8');

const saved = {
  '1': {
    grammar: {
      questions: [
        {order:1,type:'fill_blank',title:'She ___ every day.',answer:'studies',option1:'study',option2:'studies'}
      ]
    },
    watchRead: {
      story: [
        {order:1,title:'A Busy Morning',text:'Ali wakes up early.\nHe studies English.',arabic:'يستيقظ علي مبكراً.'},
        {order:2,title:'At School',text:'Then he goes to school.',arabic:''}
      ],
      storyQuestions: [{title:'When does Ali wake up?',answer:'early'}]
    }
  }
};

const S = {boxId:1,phase:'watchRead',process:1,mediaStep:0,exam:null,_v95GrammarKey:'cached'};
const Course = {
  getContent() {
    return {
      grammar:{article:{title:'Present simple'}},
      watchRead:{story:[{order:1,title:'fallback',text:'fallback text'}]}
    };
  },
  render() {
    return '<main><section class="c57-study c57-media"><p>legacy paginated story</p></section></main>';
  }
};
const styleNodes = new Map();
const document = {
  head:{appendChild(node){styleNodes.set(node.id,node)}},
  getElementById(id){return styleNodes.get(id)||null},
  createElement(tag){return tag === 'style' ? {id:'',textContent:''} : null}
};
const localStorage = {getItem(key){if(key==='liplip-course-content-v2')return JSON.stringify(saved);if(key==='liplip-ui-language')return'en';return null}};
const context = {
  console,
  document,
  localStorage,
  window:{
    LiplipCourse:Course,
    LiplipCourse57:S,
    LiplipFrontend:{t:(ar,en)=>en,registerFeature(){}},
    document,
    localStorage
  }
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source, context);

const merged = Course.getContent(1);
assert.equal(merged.grammar.questions.length,1,'saved Grammar_Questions survive Course.getContent');
assert.equal(merged.grammar.questions[0].answer,'studies');
assert.equal(merged.watchRead.storyQuestions.length,1,'saved story questions remain available');
assert.equal(merged.watchRead.story[0].text,'Ali wakes up early.\nHe studies English.','raw workbook story is preferred');

const rendered = Course.render({});
assert.match(rendered,/v120-story-book/);
assert.match(rendered,/A Busy Morning/);
assert.match(rendered,/Ali wakes up early\./);
assert.match(rendered,/He studies English\./);
assert.match(rendered,/Then he goes to school\./);
assert.match(rendered,/Start story questions/);
assert.doesNotMatch(rendered,/legacy paginated story/);
assert.doesNotMatch(rendered,/c57-pager/,'story is a single reading page, not paginated');

S.phase='grammar';
S.process=1;
S.exam=[];
context.window.LiplipStudyBookQuestionBank120.refreshGrammarExamKey();
assert.equal(S._v95GrammarKey,'','v95 cache is invalidated when saved questions exist but the exam is empty');

saved['1'].watchRead.story=[];
S.phase='watchRead';
S.process=1;
const empty = context.window.LiplipStudyBookQuestionBank120.storyBookMarkup(Course.getContent(1));
assert.match(empty,/Story text has not been added yet/);
assert.match(empty,/disabled/);

assert.ok(styleNodes.has('liplip-study-book-question-bank-v120-style'),'book reader styles are installed once');
console.log('study book + workbook question bank regression tests passed');
