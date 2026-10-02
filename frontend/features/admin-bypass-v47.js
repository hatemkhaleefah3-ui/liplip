/* v72 admin-only frontend gate bypass. Server-side admin endpoints remain authoritative. */
(() => {
  'use strict';
  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  if(!window.LiplipFrontend)return;

  function isNextControl(el){
    if(!el||el.tagName!=='BUTTON')return false;
    if(el.matches('[data-lit66-next],[data-exam-next],[data-ai-next],[data-c57-next],[data-next],[data-lit36="finish-draw"]'))return true;
    const text=String(el.textContent||'').trim().toLowerCase();
    return /^(next|التالي|متابعة|continue)$/.test(text);
  }

  function unlock(root=document){
    if(!isAdmin()||!root?.querySelectorAll)return;
    root.querySelectorAll('[data-v45-locked]').forEach(btn=>{
      delete btn.dataset.v45Locked;
      btn.dataset.v45Fast='1';
      btn.classList.remove('v45-locked');
      btn.removeAttribute('aria-disabled');
      btn.disabled=false;
    });
    root.querySelectorAll('[data-nav]').forEach(btn=>{
      btn.classList.remove('v45-nav-locked','v47-nav-locked');
      btn.removeAttribute('aria-disabled');
      btn.disabled=false;
    });
    root.querySelectorAll('button').forEach(btn=>{
      if(!isNextControl(btn))return;
      btn.disabled=false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('disabled','is-disabled','v45-locked','v47-nav-locked');
      btn.dataset.adminNext='1';
    });
  }

  function mount({root}){unlock(root)}
  LiplipFrontend.registerFeature('admin-bypass-v47',{mount});

  const observer=new MutationObserver(()=>{if(isAdmin())queueMicrotask(()=>unlock(document))});
  const start=()=>{if(document.body){observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled','class']});unlock(document)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  /* Runs at window capture, before older document-level progression guards. */
  window.addEventListener('click',e=>{
    if(!isAdmin())return;
    const nav=e.target.closest?.('[data-nav]');
    if(nav){
      e.preventDefault();e.stopImmediatePropagation();
      state.nav=nav.dataset.nav;state.page='app';state.comingContext=null;state.closetView=null;state.closetIndex=0;state.profileSettings=false;render();
      return;
    }
    const next=e.target.closest?.('button');
    if(next&&isNextControl(next)){next.disabled=false;next.removeAttribute('aria-disabled')}
    const fast=e.target.closest?.('[data-v45-fast]');
    if(fast)return;
    const locked=e.target.closest?.('[data-v45-locked]');
    if(locked){delete locked.dataset.v45Locked;locked.dataset.v45Fast='1';locked.classList.remove('v45-locked');locked.removeAttribute('aria-disabled');locked.disabled=false;}
  },true);
})();
