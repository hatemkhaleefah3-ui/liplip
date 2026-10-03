const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const persistent=read('frontend/features/persistent-session-v121.js');
const backend=read('backend-client.js');
const authLib=read('functions/_lib/auth.js');
const login=read('functions/api/auth/login.js');
const register=read('functions/api/auth/register.js');
const sessionApi=read('functions/api/session.js');

assert.match(html,/frontend\/features\/persistent-session-v121\.js\?v=120/,'persistent session bridge is loaded');
assert.ok(html.indexOf('backend-auth-v49.js')<html.indexOf('persistent-session-v121.js'),'session persistence loads after auth bridge');
assert.match(persistent,/liplip-auth-v1/,'registered sign-in marker is durable');
assert.match(persistent,/liplip-profile-v1/,'profile is persisted outside sessionStorage');
assert.match(persistent,/fetch\('\/api\/session'/,'return visits verify the server session');
assert.match(persistent,/state\.page = state\.profile.*\? 'app' : 'profile'/,'valid remembered users enter the post-login route');
assert.match(persistent,/clearSignedOutState/,'explicit sign-out clears local user state');

assert.match(backend,/liplip-profile-v1/,'profile participates in backend state synchronization');
assert.match(backend,/migrateProfile\(remoteData\)/,'legacy remote preview profiles are migrated before synchronization');
assert.doesNotMatch(backend,/out\['liplip-preview'\]/,'ephemeral preview state is no longer pushed as durable state');
assert.match(backend,/window\.addEventListener\('pagehide'/,'leaving the page triggers a final synchronization attempt');

assert.match(authLib,/REGISTERED_SESSION_DAYS = 365/,'registered sessions are long lived');
assert.match(authLib,/refreshRegisteredSession/,'registered sessions support rolling renewal');
assert.match(login,/REGISTERED_SESSION_DAYS\*24\*60\*60/,'login cookie lifetime matches the server session');
assert.match(register,/REGISTERED_SESSION_DAYS\*24\*60\*60/,'signup cookie lifetime matches the server session');
assert.match(sessionApi,/refreshRegisteredSession\(context,session\)/,'return visits renew sessions near expiration');

const local=new Map([
  ['liplip-auth-v1',JSON.stringify({kind:'registered',email:'user@example.com'})],
  ['liplip-profile-v1',JSON.stringify({name:'Operator',email:'user@example.com',level:'b1'})],
  ['liplip-progress-v1','{"completed":7}'],
  ['liplip-v45-progression','{"stage":2}']
]);
const sessionStore=new Map();
let renders=0;
const context={
  state:{page:'landing',profile:null,guest:false,progress:{}},
  render(){renders++},
  localStorage:{
    getItem:key=>local.has(key)?local.get(key):null,
    setItem:(key,value)=>local.set(key,String(value)),
    removeItem:key=>local.delete(key)
  },
  sessionStorage:{
    getItem:key=>sessionStore.has(key)?sessionStore.get(key):null,
    setItem:(key,value)=>sessionStore.set(key,String(value)),
    removeItem:key=>sessionStore.delete(key)
  },
  document:{addEventListener(){}},
  LiplipProgress:{hydrate:()=>({fresh:true})},
  queueMicrotask(){},
  setTimeout(){},
  fetch:async()=>{throw new Error('not used in this test')},
  console,JSON,Date,String,Object
};
context.window=context;
vm.createContext(context);
vm.runInContext(persistent,context);

assert.equal(context.state.page,'app','remembered registered user bypasses landing/auth');
assert.equal(context.state.profile.name,'Operator','persisted profile is restored');
assert.ok(renders>=1,'restoring a signed-in session rerenders the app');
context.LiplipSessionPersistence.clearSignedOutState();
assert.equal(context.state.page,'app','routing remains the caller responsibility during the click event');
assert.equal(context.state.profile,null,'sign-out removes in-memory profile');
assert.equal(context.state.guest,false);
assert.equal(local.has('liplip-auth-v1'),false,'sign-out removes remembered authentication');
assert.equal(local.has('liplip-profile-v1'),false,'sign-out removes local profile');
assert.equal(local.has('liplip-progress-v1'),false,'sign-out removes local progress to protect the next user');
assert.equal(local.has('liplip-v45-progression'),false,'sign-out removes local progression state');

console.log('Persistent registered session and progress synchronization regressions passed');
