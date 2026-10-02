/* v105: compatibility fix for the standalone workbook importer. */
(() => {
  'use strict';

  // v104 calls cSort() from inside its importer but did not define it.
  // Expose one stable sorter before v104 loads so those calls resolve correctly.
  window.cSort = function cSort(list){
    if(!Array.isArray(list)) return list;
    list.sort((a,b)=>{
      const ao=Number(a?.order)||0;
      const bo=Number(b?.order)||0;
      return ao-bo;
    });
    list.forEach((item,index)=>{
      if(item && typeof item==='object') item.order=index+1;
    });
    return list;
  };

  // Keep uncaught importer errors visible instead of silently collapsing to a generic flag.
  window.addEventListener('error', event => {
    const msg=String(event?.error?.message||event?.message||'').trim();
    if(!msg || !/cSort|workbook|excel|import/i.test(msg)) return;
    try{
      sessionStorage.setItem('liplip-study-import-v104-status',JSON.stringify({
        state:'error',
        message:`Excel import failed: ${msg}`,
        time:Date.now()
      }));
    }catch{}
  });
})();
