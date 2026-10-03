const encoder = new TextEncoder();
// Keep PBKDF2 adaptive and salted, but stay within Cloudflare Pages Functions CPU budgets.
// The iteration count is stored per account, so older accounts remain verifiable if this changes later.
const ITERATIONS = 30000;

function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexToBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}

export function normalizeEmail(value){return String(value||'').trim().toLowerCase()}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))&&normalizeEmail(value).length<=254}
export function validPassword(value){const s=String(value||'');return s.length>=10&&s.length<=128}

export async function hashPassword(password,{saltHex,iterations=ITERATIONS}={}){
  const safeIterations=Math.max(10000,Math.min(300000,Number(iterations)||ITERATIONS));
  const salt=saltHex?hexToBytes(saltHex):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',encoder.encode(String(password)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:safeIterations},key,256);
  return {salt:bytesToHex(salt),hash:bytesToHex(new Uint8Array(bits)),iterations:safeIterations};
}

export async function verifyPassword(password,row){
  const derived=await hashPassword(password,{saltHex:String(row.passwordSalt||row.password_salt||''),iterations:Number(row.passwordIterations||row.password_iterations)||ITERATIONS});
  const expected=String(row.passwordHash||row.password_hash||'');
  if(derived.hash.length!==expected.length)return false;
  let diff=0;for(let i=0;i<expected.length;i++)diff|=derived.hash.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}

// Claim one authentication attempt atomically. Failed authentication leaves the claim in
// place; successful authentication must call clearFailures(). The single UPSERT removes the
// read-then-increment race that otherwise lets parallel guesses all pass the same pre-check.
export async function throttle(context,key,{limit=8,windowMs=15*60*1000,blockMs=15*60*1000}={}){
  const now=Date.now(),until=now+blockMs,db=context.env.DB;
  await db.prepare(`
    INSERT INTO auth_attempts(key,count,window_started_at,blocked_until)
    VALUES(?,1,?,0)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE
        WHEN auth_attempts.blocked_until>? THEN auth_attempts.count
        WHEN ?-auth_attempts.window_started_at>? THEN 1
        ELSE auth_attempts.count+1
      END,
      window_started_at=CASE
        WHEN auth_attempts.blocked_until>? THEN auth_attempts.window_started_at
        WHEN ?-auth_attempts.window_started_at>? THEN ?
        ELSE auth_attempts.window_started_at
      END,
      blocked_until=CASE
        WHEN auth_attempts.blocked_until>? THEN auth_attempts.blocked_until
        WHEN ?-auth_attempts.window_started_at>? THEN 0
        WHEN auth_attempts.count+1>? THEN ?
        ELSE 0
      END
  `).bind(key,now,now,now,windowMs,now,now,windowMs,now,now,now,windowMs,limit,until).run();
  const row=await db.prepare('SELECT blocked_until AS blockedUntil FROM auth_attempts WHERE key=? LIMIT 1').bind(key).first();
  if(row&&Number(row.blockedUntil)>now)return {ok:false,retryAfterMs:Number(row.blockedUntil)-now};
  return {ok:true};
}

export async function clearFailures(context,key){await context.env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key).run()}
