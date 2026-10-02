/* v49: shared server-managed course and fast-practice content. */
(() => {
  'use strict';
  const COURSE_KEY='liplip-course-content-v2',FAST_KEY='liplip-v45-fast-articles',META_KEY='liplip-content-meta-v49',ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  const fp=v=>JSON.stringify(v);
  const readLocal=()=>{let course={},fast=null;try{course=JSON.parse(localStorage.getItem(COURSE_KEY)||'{}')}catch{}try{fast=JSON.parse(localStorage.getItem(FAST_KEY)||'null')}catch{}return{course,fastArticles:Array.isArray(fast)?fast:null}};
  const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META_KEY)||'{}')}catch{return{}}};
  const writeMeta=m=>localStorage.setItem(META_KEY,JSON.stringify(m));
  async function req(path,init={}){const r=await fetch(path,{credentials:'same-origin',...init,headers:{'content-type':'application/json',...(init.headers||{})}});let b={};try{b=await r.json()}catch{}return{r,b}}
  function apply(data){if(!data||typeof data!=='object')return false;let changed=false;if(data.course&&typeof data.course==='object'){const next=JSON.stringify(data.course);if(localStorage.getItem(COURSE_KEY)!==next){localStorage.setItem(COURSE_KEY,next);changed=true}}if(Array.isArray(data.fastArticles)){const next=JSON.stringify(data.fastArticles);if(localStorage.getItem(FAST_KEY)!==next){localStorage.setItem(FAST_KEY,next);changed=true}}return changed}

  async function sync({publish=false}={}){
    try{
      const remote=await req('/api/content');if(!remote.r.ok)return{ok:false,status:remote.r.status};
      const meta=readMeta(),revision=Number(remote.b.revision)||0,remoteData=remote.b.data&&typeof remote.b.data==='object'?remote.b.data:{},local=readLocal();
      const localData={course:local.course,fastArticles:local.fastArticles};const localFp=fp(localData),remoteFp=fp(remoteData),lastFp=meta.fingerprint||'';
      if(isAdmin()&&(publish||((meta.revision===revision)&&lastFp&&localFp!==lastFp))){
        const pushed=await req('/api/admin/content',{method:'PUT',body:JSON.stringify({revision,data:localData})});
        if(pushed.r.ok){writeMeta({revision:pushed.b.revision,fingerprint:localFp});return{ok:true,action:'publish',revision:pushed.b.revision}}
        if(pushed.r.status!==409)return{ok:false,status:pushed.r.status};
      }
      if(meta.revision!==revision||!lastFp){const changed=apply(remoteData);writeMeta({revision,fingerprint:remoteFp});if(changed)setTimeout(()=>location.reload(),20);return{ok:true,action:changed?'pull-reload':'pull',revision}}
      return{ok:true,action:'noop',revision};
    }catch{return{ok:false,status:0}}
  }
  window.LiplipContentBackend={sync,publish:()=>sync({publish:true})};
  window.addEventListener('load',()=>setTimeout(sync,900),{once:true});
  setInterval(()=>sync(),12000);
})();
