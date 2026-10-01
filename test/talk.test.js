const fs=require('node:fs');
const assert=require('node:assert/strict');
const app=fs.readFileSync('stepper-test/app.js','utf8');
const css=fs.readFileSync('talk.css','utf8');

for(const phase of ["talkPhase:'select'","?'waiting':'select'","talkPhase='active'","talkPhase='rating'"])assert.ok(app.includes(phase),`missing phase marker ${phase}`);
for(const mode of ['data-mode="call"','data-mode="chat"'])assert.match(app,new RegExp(mode));
assert.match(app,/Array\.from\(\{length:10\}/);
assert.match(app,/state\.talkRating<=4\?TALK_FEEDBACK\.bad:TALK_FEEDBACK\.good/);
for(const reason of ['كلمات مسيئة','عنصرية أو كراهية','إنهاء سريع متكرر','محتوى غير مناسب','تحرّش أو تهديد'])assert.match(app,new RegExp(reason));
for(const selector of ['.talk-waiting','.talk-call','.talk-chat','.talk-rating','.talk-report-sheet'])assert.match(css,new RegExp(selector.replace('.','\\.')));
console.log('Talk and call three-phase journey passed');
