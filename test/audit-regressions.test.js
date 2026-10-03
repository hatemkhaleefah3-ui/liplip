const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const adminLogin=read('functions/api/admin/login.js');
const passwordLib=read('functions/_lib/password.js');
assert.match(adminLogin,/throttle\(context, key, \{ limit: 5/,'admin login is rate limited');
assert.match(passwordLib,/INSERT INTO auth_attempts\(key,count,window_started_at,blocked_until\)/,'authentication attempts are claimed atomically');
assert.match(passwordLib,/ELSE auth_attempts.count\+1/,'parallel attempts increment in the same UPSERT');
assert.match(adminLogin,/clearFailures\(context, key\)/,'successful admin login clears the limiter');
assert.match(adminLogin,/cf-connecting-ip/,'admin limiter is scoped by Cloudflare client address');

const whatsappSend=read('functions/api/auth/whatsapp/send.js');
assert.match(whatsappSend,/WHERE whatsapp_otps\.last_sent_at <= \?/,'WhatsApp send cooldown is claimed atomically');
assert.match(whatsappSend,/claimed\.meta\?\.changes/,'WhatsApp sender checks whether it won the cooldown claim');
assert.match(whatsappSend,/DELETE FROM whatsapp_otps WHERE phone=\? AND code_hash=\?/,'send failures only remove the OTP created by that request');
const whatsappVerify=read('functions/api/auth/whatsapp/verify.js');
assert.match(whatsappVerify,/DELETE FROM whatsapp_otps WHERE phone=\? AND code_hash=\? AND expires_at>\? AND attempts<5/,'valid OTP is consumed atomically');
assert.match(whatsappVerify,/UPDATE whatsapp_otps SET attempts=attempts\+1 WHERE phone=\? AND expires_at>\? AND attempts<5/,'wrong OTP attempt is claimed atomically');
assert.match(whatsappVerify,/consumed\.meta\?\.changes/);
assert.match(whatsappVerify,/failed\.meta\?\.changes/);

const social=read('functions/_lib/social.js');
const oauthCallback=read('functions/api/oauth/callback/[provider].js');
assert.match(oauthCallback,/userIdHint: oauthState\.userId \|\| null/,'OAuth callback links to the state owner');
assert.match(oauthCallback,/useCurrentSession: false/,'OAuth callback cannot silently link to a later cookie session');
assert.match(oauthCallback,/emailVerified: profile\.email_verified === true/,'Google email trust follows provider verification');
assert.match(social,/identity\.emailVerified === true/,'automatic email account matching requires a verified provider email');
assert.match(social,/existingUser\(context, userIdHint\)/,'state user hint is checked against the database');

const backendClient=read('backend-client.js');
assert.match(backendClient,/else sessionStorage\.removeItem\('liplip-preview'\)/,'remote state deletion clears stale preview state');
assert.match(backendClient,/if \(activeSync\) return activeSync/,'backend synchronization is single-flight');
assert.match(backendClient,/activeSync = runSync\(\)\.finally/);

const bypass=read('frontend/features/admin-hard-bypass-v98.js');
const level50=read('level50-progress-v29.js');
assert.match(level50,/BOXES_PER_LEVEL = 50/,'live course exposes 50 boxes per level');
assert.match(level50,/LEGACY_STRIDE = 200/,'legacy content IDs retain a 200-box stride');
assert.match(bypass,/box<=50/,'admin bypass covers all live boxes in each level');
assert.match(bypass,/\(level-1\)\*200\+box/,'admin bypass preserves the legacy ID stride');

const health=read('functions/api/health.js');
assert.match(health,/schema='v4'/);
assert.match(health,/schema==='v4'/);
assert.match(health,/SELECT state_hash FROM oauth_states/);

const courseExam=read('functions/api/gemini/course-exam.js');
assert.match(courseExam,/readJson\(request, 128 \* 1024\)/,'course exam JSON is bounded before parsing');
assert.match(courseExam,/box > 50/,'Gemini exams follow the live 50-box-per-level geometry');

const drawing=read('functions/api/gemini/drawing.js');
assert.match(drawing,/readJson\(request, 5 \* 1024 \* 1024\)/,'drawing JSON is bounded before parsing');
assert.match(drawing,/'x-goog-api-key': env\.GEMINI_API_KEY/,'drawing API key is sent in a header');
assert.doesNotMatch(drawing,/generateContent\?key=/,'drawing API key is not embedded in the request URL');

const speech=read('functions/api/gemini/speech.js');
assert.match(speech,/readJson\(request, 16 \* 1024\)/,'speech JSON is bounded before parsing');

// Lesson content edits must be transactional with respect to localStorage.
const store=new Map();
let failWrites=false;
const context={
  localStorage:{
    getItem:key=>store.get(key)||null,
    setItem:(key,value)=>{if(failWrites)throw new Error('quota');store.set(key,value)},
    removeItem:key=>store.delete(key)
  },
  Date,Number,String,Object,Array,Set,Map,JSON
};
vm.createContext(context);
vm.runInContext(read('content.js')+'\nthis.Content=LiplipContent;',context);
const Content=context.Content;
const replacement={title:'Edited lesson',goal:'Persist this lesson safely.',words:[{term:'safe',meaning:'آمن',example:'This edit is safe.'}]};
const original=Content.get(1);
failWrites=true;
assert.equal(Content.save(1,replacement),false);
assert.equal(Content.get(1).title,original.title,'failed save does not alter in-memory lesson content');
failWrites=false;
assert.equal(Content.save(1,replacement),true);
assert.equal(Content.get(1).title,'Edited lesson');
failWrites=true;
assert.equal(Content.restore(1),false);
assert.equal(Content.get(1).title,'Edited lesson','failed restore keeps the last durable lesson');

console.log('Audit security, synchronization, Gemini, geometry, health, and persistence regressions passed');
