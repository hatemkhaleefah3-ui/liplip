/* v99: route the redesigned admin content-control UI to the current v95 workbook importer/template. */
(() => {
  'use strict';

  const ADMIN_FLAG='liplip-admin-v47';
  const isAdmin=()=>sessionStorage.getItem(ADMIN_FLAG)==='1';

  function patch(){
    if(!isAdmin())return;

    document.querySelectorAll('.v97-cc-actions input[data-course-manager-import]').forEach(input=>{
      input.removeAttribute('data-course-manager-import');
      input.setAttribute('data-v95-import','');
      input.setAttribute('accept','.xlsx');
    });

    document.querySelectorAll('.v97-cc-actions [data-v94-unified-template]').forEach(button=>{
      button.removeAttribute('data-v94-unified-template');
      button.setAttribute('data-v95-template','');
    });
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch()});
  }

  const start=()=>{
    patch();
    const root=document.getElementById('app')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
