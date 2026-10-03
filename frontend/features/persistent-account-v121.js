/* v121: persistent registered-account resume + durable profile/progress sync. */
(() => {
  'use strict';

  const ACCOUNT_KEY='liplip-account-state-v1';
  const META_KEY='liplip-backend-meta-v1';
  const DURABLE_KEYS=['liplip-progress-v1','liplip-v45-progression','liplip-ui-language',ACCOUNT_KEY];
  const root=document.getElementById('app');
  let syncTimer=0;

  const parse=value=>{try{return JSON.parse(value||'null')}catch{return null}};
  const managed=data=>{
    const out={};
    if(!data||typeof data!=='object')return out;
    for(const key of DURABLE_KEYS)if(Object.prototype.hasOwnProperty.call(data,key))out[key]=String(data[key]);
    return out;
  };
  const fingerprint=value=>JSON.stringify(Object.keys(value).sort().reduce((o,k)=>(o[k]=value[k],o),{}));
  const readMeta=()=>parse(localStorage.getItem(META_KEY))||{};

  function applyDurable(data){
    const safe=managed(data);
    for(const key of DURABLE_KEYS){
      if(Object.prototype.hasOwnProperty.call(safe,key))localStorage.setItem(key,safe[key]);
      else localStorage.removeItem(key);
    }
  }

  function accountState(){
    const record=parse(localStorage.getItem(ACCOUNT_KEY));
    return record&&typeof record==='object'?record:null;
  }

  function persistProfile(){
    if(typeof state==='undefined'||state.guest===true||!state.profile||typeof state.profile!=='object')return;
    const previous=accountState()||{};
    localStorage.setItem(ACCOUNT_KEY,JSON.stringify({
      ...previous,
      profile:state.profile,
      updatedAt:Date.now()
    }));
  }

  function applyRuntime(){
    if(typeof state==='undefined')return;
    const account=accountState();
    if(account?.profile&&typeof account.profile==='object')state.profile=account.profile;
    const progress=parse(localStorage.getItem('liplip-progress-v1'));
    if(progress&&typeof LiplipProgress!=='undefined')state.progress=LiplipProgress.hydrate(progress);
  }

  function migrateLegacyProfile(remoteData){
    if(localStorage.getItem(ACCOUNT_KEY)!==null)return false;
    const raw=remoteData?.['liplip-preview'];
    if(raw===undefined||raw===null)return false;
    const legacy=parse(String(raw));
    if(!legacy?.profile||typeof legacy.profile!=='object')return false;
    localStorage.setItem(ACCOUNT_KEY,JSON.stringify({profile:legacy.profile,updatedAt:Date.now(),migratedFrom:'liplip-preview'}));
    return true;
  }

  async function request(path,{timeout=2500}={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const res=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
      let body={};try{body=await res.json()}catch{}
      return{res,body};
    }finally{clearTimeout(timer)}
  }

  async function bootstrap(){
    if(root){root.style.visibility='hidden';root.setAttribute('aria-busy','true')}
    try{
      const session=await request('/api/session');
      if(!session.res.ok||session.body?.user?.kind!=='registered')return{authenticated:false};

      const remote=await request('/api/state');
      if(remote.res.ok){
        const remoteRevision=Number(remote.body?.revision)||0;
        const remoteData=remote.body?.data&&typeof remote.body.data==='object'?remote.body.data:{};
        const meta=readMeta();
        const localRevision=Number.isInteger(meta.revision)?meta.revision:null;

        if(remoteRevision>0&&(localRevision===null||remoteRevision>localRevision)){
          const durable=managed(remoteData);
          applyDurable(durable);
          localStorage.setItem(META_KEY,JSON.stringify({revision:remoteRevision,fingerprint:fingerprint(durable)}));
        }
        migrateLegacyProfile(remoteData);
      }

      applyRuntime();
      if(typeof state!=='undefined'){
        if(!state.profile&&session.body?.user?.email)state.profile={email:session.body.user.email};
        state.guest=false;
        state.nav='الرئيسية';
        const keys=state.profile&&typeof state.profile==='object'?Object.keys(state.profile).filter(k=>k!=='email'&&state.profile[k]):[];
        state.page=keys.length?'app':'profile';
        if(typeof render==='function')render();
      }
      return{authenticated:true,user:session.body.user};
    }catch(error){
      console.warn('[liplip account] persistent session check unavailable',error);
      return{authenticated:false,reason:'network'};
    }finally{
      if(root){root.style.visibility='';root.removeAttribute('aria-busy')}
    }
  }

  function scheduleSync(){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>window.LiplipBackend?.syncNow?.(),180);
  }

  if(typeof save==='function'){
    const baseSave=save;
    const wrappedSave=function(){
      persistProfile();
      const result=baseSave.apply(this,arguments);
      scheduleSync();
      return result;
    };
    try{save=wrappedSave}catch{}
    try{window.save=wrappedSave}catch{}
  }

  const ready=bootstrap();
  window.LiplipAccountSession={ready,persistProfile,scheduleSync,applyRuntime};
})();
