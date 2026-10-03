const fs=require('node:fs');
const assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('talk.css','utf8');

assert.match(app,/talkPhase:'select'/,'Talk state starts in select mode');
assert.match(app,/state\.talkPhase=keepMode\?'waiting':'select'/,'starting a mode enters waiting');
assert.match(app,/state\.talkPhase='active'/,'matching enters the active session');
assert.match(app,/state\.talkPhase='rating'/,'ending a session enters rating');
for(const mode of ['data-mode="call"','data-mode="chat"'])assert.match(app,new RegExp(mode));
assert.match(app,/Array\.from\(\{length:10\}/,'rating offers ten stars');
assert.match(app,/state\.talkRating<=4\?TALK_FEEDBACK\.bad:TALK_FEEDBACK\.good/);
for(const reason of ['كلمات مسيئة','عنصرية أو كراهية','إنهاء سريع متكرر','محتوى غير مناسب','تحرّش أو تهديد'])assert.match(app,new RegExp(reason));
for(const selector of ['.talk-waiting','.talk-call','.talk-chat','.talk-rating','.talk-report-sheet'])assert.match(css,new RegExp(selector.replace('.','\\.')));
console.log('Talk and call three-phase journey passed');
