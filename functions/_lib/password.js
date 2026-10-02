const encoder = new TextEncoder();
const ITERATIONS = 210000;

function bytesToHex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexToBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}

export function normalizeEmail(value){return String(value||'').trim().toLowerCase()}
export function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))&&normalizeEmail(value).length<=254}
export function validPassword(value){const s=String(value||'');return s.length>=10&&s.length<=128}

export async function hashPassword(password,{saltHex,iterations=ITERATIONS}={}){
  const salt=saltHex?hexToBytes(saltHex):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',encoder.encode(String(password)),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
  return {salt:bytesToHex(salt),hash:bytesToHex(new Uint8Array(bits)),iterations};
}

export async function verifyPassword(password,row){
  const derived=await hashPassword(password,{saltHex:String(row.passwordSalt||row.password_salt||''),iterations:Number(row.passwordIterations||row.password_iterations)||ITERATIONS});
  const expected=String(row.passwordHash||row.password_hash||'');
  if(derived.hash.length!==expected.length)return false;
  let diff=0;for(let i=0;i<expected.length;i++)diff|=derived.hash.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}

export async function throttle(context,key,{limit=8,windowMs=15*60*1000,blockMs=15*60*1000}={}){
  const now=Date.now(),db=context.env.DB;
  const row=await db.prepare('SELECT count, window_started_at AS windowStartedAt, blocked_until AS blockedUntil FROM auth_attempts WHERE key=? LIMIT 1').bind(key).first();
  if(row&&Number(row.blockedUntil)>now)return {ok:false,retryAfterMs:Number(row.blockedUntil)-now};
  if(!row||now-Number(row.windowStartedAt)>windowMs){await db.prepare('INSERT INTO auth_attempts(key,count,window_started_at,blocked_until) VALUES(?,0,?,0) ON CONFLICT(key) DO UPDATE SET count=0,window_started_at=excluded.window_started_at,blocked_until=0').bind(key,now).run();return {ok:true}}
  if(Number(row.count)>=limit){const until=now+blockMs;await db.prepare('UPDATE auth_attempts SET blocked_until=? WHERE key=?').bind(until,key).run();return {ok:false,retryAfterMs:blockMs}}
  return {ok:true};
}

export async function recordFailure(context,key){await context.env.DB.prepare('UPDATE auth_attempts SET count=count+1 WHERE key=?').bind(key).run()}
export async function clearFailures(context,key){await context.env.DB.prepare('DELETE FROM auth_attempts WHERE key=?').bind(key).run()}
