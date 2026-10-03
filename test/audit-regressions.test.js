const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const adminLogin=read('functions/api/admin/login.js');
assert.match(adminLogin,/throttle\(context, key, \{ limit: 5/,'admin login is rate limited');
assert.match(adminLogin,/recordFailure\(context, key\)/,'failed admin logins increment the limiter');
assert.match(adminLogin,/clearFailures\(context, key\)/,'successful admin login clears the limiter');
assert.match(adminLogin,/cf-connecting-ip/,'admin limiter is scoped by client address');

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
assert.match(bypass,/box<=200/,'admin bypass covers every box in each level');
assert.doesNotMatch(bypass,/box<=50/,'obsolete 50-box admin geometry is gone');

const health=read('functions/api/health.js');
assert.match(health,/schema='v4'/);
assert.match(health,/schema==='v4'/);
assert.match(health,/SELECT state_hash FROM oauth_states/);

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

console.log('Audit security, synchronization, geometry, health, and persistence regressions passed');
