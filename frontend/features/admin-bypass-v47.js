/* v47 admin-only frontend gate bypass. Server-side admin endpoints remain authoritative. */
(() => {
  'use strict';
  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';
  if(!window.LiplipFrontend)return;

  function mount({root}){
    if(!isAdmin())return;
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
  }
  LiplipFrontend.registerFeature('admin-bypass-v47',{mount});

  /* Runs at window capture, before older document-level progression guards. */
  window.addEventListener('click',e=>{
    if(!isAdmin())return;
    const nav=e.target.closest?.('[data-nav]');
    if(nav){
      e.preventDefault();e.stopImmediatePropagation();
      state.nav=nav.dataset.nav;state.page='app';state.comingContext=null;state.closetView=null;state.closetIndex=0;state.profileSettings=false;render();
      return;
    }
    const fast=e.target.closest?.('[data-v45-fast]');
    if(fast)return;
    const locked=e.target.closest?.('[data-v45-locked]');
    if(locked){delete locked.dataset.v45Locked;locked.dataset.v45Fast='1';locked.classList.remove('v45-locked');locked.removeAttribute('aria-disabled');locked.disabled=false;}
  },true);
})();
