const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const auth=read('functions/_lib/auth.js');
const session=read('functions/api/session.js');
const login=read('functions/api/auth/login.js');
const register=read('functions/api/auth/register.js');
const social=read('functions/_lib/social.js');
const backend=read('backend-client.js');
const account=read('frontend/features/persistent-account-v121.js');
const backendAuth=read('frontend/features/backend-auth-v49.js');
const html=read('index.html');

assert.match(auth,/REGISTERED_SESSION_MAX_AGE_DAYS\s*=\s*365/,'registered sessions last one year between visits');
assert.match(auth,/createRegisteredSession[\s\S]*maxAgeDays:REGISTERED_SESSION_MAX_AGE_DAYS/,'registered session DB expiry uses persistent duration');
assert.match(auth,/refreshRegisteredSession[\s\S]*UPDATE sessions SET expires_at=/,'returning registered sessions renew their server expiry');
assert.match(session,/refreshRegisteredSession\(context,session\)/,'session lookup renews registered sessions');
assert.match(session,/cookie\('liplip_session',token,\{maxAge:REGISTERED_SESSION_MAX_AGE_SECONDS\}\)/,'returning users receive a renewed persistent cookie');
assert.match(login,/REGISTERED_SESSION_MAX_AGE_SECONDS/,'password login uses persistent cookie duration');
assert.match(register,/REGISTERED_SESSION_MAX_AGE_SECONDS/,'signup uses persistent cookie duration');
assert.match(social,/REGISTERED_SESSION_MAX_AGE_SECONDS/,'social login uses persistent cookie duration');

assert.match(backend,/liplip-account-state-v1/,'backend sync includes durable account profile state');
assert.doesNotMatch(backend,/sessionStorage\.getItem\('liplip-preview'\)/,'session-only preview is not synchronized as durable state');
assert.match(backend,/await window\.LiplipAccountSession\?\.ready/,'backend sync waits for account resume bootstrap');
assert.match(backend,/suspend\(\)\{suspended=true;\}/,'backend sync can be suspended during logout');

assert.match(account,/request\('\/api\/session'\)/,'startup validates the existing authenticated session');
assert.match(account,/request\('\/api\/state'\)/,'startup loads saved server progress');
assert.match(account,/state\.progress=LiplipProgress\.hydrate\(progress\)/,'saved progress is restored into runtime state');
assert.match(account,/state\.page=keys\.length\?'app':'profile'/,'returning completed profiles enter the post-login app');
assert.match(account,/migrateLegacyProfile/,'old server preview profiles are migrated to durable account state');
assert.match(account,/scheduleSync\(\)/,'normal save operations schedule server persistence');

assert.match(backendAuth,/LiplipBackend\?\.suspend\?\.\(\)/,'logout pauses sync before clearing local account data');
assert.match(backendAuth,/liplip-account-state-v1/,'logout clears cached account identity');
assert.match(backendAuth,/state\.progress=LiplipProgress\.hydrate\(null\)/,'logout isolates the next user from previous progress');
assert.match(backendAuth,/LiplipBackend\?\.resume\?\.\(\)/,'successful login or signup resumes sync');

const accountIndex=html.indexOf('frontend/features/persistent-account-v121.js');
const backendIndex=html.indexOf('backend-client.js');
assert.ok(accountIndex>0&&backendIndex>accountIndex,'persistent session bootstrap loads before backend-client sync');

console.log('Persistent account session and progress regressions passed');
