/* v49: registered account authentication bridge. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;if(!UI||typeof state==='undefined')return;
  const t=(ar,en)=>UI.t(ar,en);
  let busy=false;

  async function request(path,body){
    const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});
    let data={};try{data=await r.json()}catch{}return{r,data};
  }

  function decorate(root){
    const form=root.querySelector('#auth-form');if(!form||form.dataset.v49Auth)return;form.dataset.v49Auth='1';
    const email=form.querySelector('input[name="email"]');if(!email)return;
    const field=email.closest('.field');const pw=document.createElement('div');pw.className='field v49-password-field';pw.innerHTML=`<label for="v49-password">${t('كلمة المرور','Password')}</label><input id="v49-password" name="password" type="password" minlength="10" maxlength="128" autocomplete="${state.mode==='signup'?'new-password':'current-password'}" required placeholder="${t('10 أحرف على الأقل','At least 10 characters')}">`;
    field?.insertAdjacentElement('afterend',pw);
    const notice=root.querySelector('#auth-message');if(notice&&!state.message)notice.textContent=state.mode==='signup'?t('أنشئ حساباً حقيقياً لحفظ تقدمك على أجهزتك.','Create an account to keep progress across devices.'):t('سجّل الدخول لمتابعة تقدمك المحفوظ.','Sign in to continue your saved progress.');
  }

  UI.registerFeature('backend-auth-v49',{mount:({root})=>decorate(root)});

  document.addEventListener('submit',async e=>{
    const form=e.target;if(form?.id!=='auth-form'||busy)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!form.reportValidity())return;
    busy=true;const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
    const fd=new FormData(form),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
    const path=state.mode==='signup'?'/api/auth/register':'/api/auth/login';
    try{
      const {r,data}=await request(path,{email,password});
      if(!r.ok){const el=document.querySelector('#auth-message');if(el){el.classList.add('error');el.textContent=data?.error?.message||t('تعذّر تسجيل الدخول.','Authentication failed.')}return;}
      window.LiplipSessionPersistence?.markSignedIn?.(data?.user||{email});
      localStorage.removeItem('liplip-backend-meta-v1');
      state.guest=false;
      if(state.mode==='signup'){
        state.profile={...(state.profile||{}),email};state.page='profile';if(typeof save==='function')save();render();
        window.LiplipSessionPersistence?.persistProfile?.();
        setTimeout(()=>window.LiplipBackend?.syncNow?.(),200);
      }else{
        const result=await window.LiplipBackend?.syncNow?.();
        if(!result||result.action!=='initial-pull'){state.page='app';state.nav='الرئيسية';render();}
      }
    }catch{
      const el=document.querySelector('#auth-message');if(el){el.classList.add('error');el.textContent=t('تعذّر الاتصال بالخادم. حاول مرة أخرى.','Could not reach the server. Try again.');}
    }finally{busy=false;if(button)button.disabled=false;}
  },true);

  document.addEventListener('click',e=>{
    const logout=e.target.closest?.('[data-action="logout"],[data-v28="logout"]');if(!logout)return;
    fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',keepalive:true}).catch(()=>{});
    localStorage.removeItem('liplip-backend-meta-v1');
    window.LiplipSessionPersistence?.clearSignedOutState?.();
  },true);
})();
