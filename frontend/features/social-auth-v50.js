/* v50: Google, Facebook and WhatsApp authentication UI. */
(() => {
  'use strict';
  const UI=window.LiplipFrontend;if(!UI||typeof state==='undefined')return;
  const t=(ar,en)=>UI.t(ar,en),esc=UI.escapeHTML;
  let waPhone='',busy=false,returnHandled=false;

  async function post(path,body){
    const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});
    let data={};try{data=await r.json()}catch{}return{r,data};
  }

  function decorate(root){
    if(!root.querySelector('#auth-form'))return;
    root.querySelectorAll('button').forEach(button=>{
      if(button.dataset.v50Provider)return;
      const text=(button.textContent||'').trim().toLowerCase();
      if(text.includes('google'))button.dataset.v50Provider='google';
      else if(text.includes('facebook'))button.dataset.v50Provider='facebook';
      else if(text.includes('whatsapp'))button.dataset.v50Provider='whatsapp';
    });
  }
  UI.registerFeature('social-auth-v50',{mount:({root})=>decorate(root)});

  function closeSheet(){document.querySelector('.v50-social-layer')?.remove()}
  function whatsappSheet(step='phone',message=''){
    closeSheet();
    const layer=document.createElement('div');layer.className='v50-social-layer';
    layer.innerHTML=`<button class="v50-social-backdrop" data-v50-close aria-label="${t('إغلاق','Close')}"></button><section class="v50-social-sheet" role="dialog" aria-modal="true">
      <div class="v50-social-handle"></div><div class="v50-social-icon">☎</div>
      <h2>${t('الدخول عبر واتساب','Continue with WhatsApp')}</h2>
      ${step==='phone'?`<p>${t('أدخل رقم واتساب مع رمز الدولة. مثال العراق: +9647…','Enter your WhatsApp number with country code. Example: +9647…')}</p><form id="v50-wa-phone"><label>${t('رقم واتساب','WhatsApp number')}<input name="phone" type="tel" dir="ltr" autocomplete="tel" placeholder="+9647XXXXXXXXX" value="${esc(waPhone)}" required></label><small class="v50-social-message">${esc(message)}</small><button type="submit" class="primary">${t('إرسال رمز التحقق','Send verification code')}</button></form>`:`<p>${t('أرسلنا رمزاً من 6 أرقام إلى واتساب.','We sent a 6-digit code to WhatsApp.')}</p><form id="v50-wa-code"><label>${t('رمز التحقق','Verification code')}<input name="code" type="text" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required></label><small class="v50-social-message">${esc(message)}</small><button type="submit" class="primary">${t('تأكيد والدخول','Verify and continue')}</button><button type="button" class="v50-secondary" data-v50-wa-back>${t('تغيير الرقم','Change number')}</button></form>`}
    </section>`;
    document.body.appendChild(layer);
    setTimeout(()=>layer.querySelector('input')?.focus(),80);
  }

  async function finishSession(user){
    localStorage.removeItem('liplip-backend-meta-v1');state.guest=false;
    state.profile={...(state.profile||{})};
    if(user?.email)state.profile.email=user.email;
    if(user?.name&&!state.profile.name)state.profile.name=user.name;
    if(user?.picture&&!state.profile.avatarData){state.profile.avatarType='upload';state.profile.avatarData=user.picture}
    if(user?.phone)state.profile.phone=user.phone;
    state.page='app';state.nav='الرئيسية';if(typeof save==='function')save();render();
    setTimeout(()=>window.LiplipBackend?.syncNow?.(),200);
  }

  async function handleReturn(){
    if(returnHandled)return;returnHandled=true;
    const url=new URL(location.href),provider=url.searchParams.get('auth'),error=url.searchParams.get('auth_error');
    if(!provider&&!error)return;
    history.replaceState({},'',url.pathname);
    if(error){state.page='auth';state.mode='signup';state.message=t('تعذّر تسجيل الدخول الخارجي. حاول مرة أخرى.','Social sign-in failed. Try again.');render();return}
    try{
      const r=await fetch('/api/auth/me',{credentials:'same-origin'}),data=await r.json();
      if(r.ok&&data.user)await finishSession(data.user);
      else throw new Error('session');
    }catch{state.page='auth';state.mode='signup';state.message=t('تم تسجيل الدخول لدى المزود لكن تعذّر فتح الحساب.','Provider sign-in completed, but the account session could not be opened.');render()}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',handleReturn,{once:true});else handleReturn();

  document.addEventListener('click',e=>{
    const providerButton=e.target.closest?.('[data-v50-provider]');
    if(providerButton){
      e.preventDefault();e.stopImmediatePropagation();
      const provider=providerButton.dataset.v50Provider;
      if(provider==='whatsapp')whatsappSheet('phone');
      else location.assign(`/api/oauth/start/${provider}`);
      return;
    }
    if(e.target.closest?.('[data-v50-close]')){e.preventDefault();closeSheet();return}
    if(e.target.closest?.('[data-v50-wa-back]')){e.preventDefault();whatsappSheet('phone');return}
  },true);

  document.addEventListener('submit',async e=>{
    if(!['v50-wa-phone','v50-wa-code'].includes(e.target?.id)||busy)return;
    e.preventDefault();e.stopImmediatePropagation();if(!e.target.reportValidity())return;busy=true;
    const button=e.target.querySelector('button[type="submit"]');if(button)button.disabled=true;
    try{
      if(e.target.id==='v50-wa-phone'){
        waPhone=String(new FormData(e.target).get('phone')||'').trim();
        const {r,data}=await post('/api/auth/whatsapp/send',{phone:waPhone});
        if(!r.ok){whatsappSheet('phone',data?.error?.message||t('تعذّر إرسال الرمز.','Could not send the code.'));return}
        whatsappSheet('code');
      }else{
        const code=String(new FormData(e.target).get('code')||'').trim();
        const {r,data}=await post('/api/auth/whatsapp/verify',{phone:waPhone,code});
        if(!r.ok){whatsappSheet('code',data?.error?.message||t('الرمز غير صحيح.','The code is not correct.'));return}
        closeSheet();await finishSession(data.user);
      }
    }catch{whatsappSheet(e.target.id==='v50-wa-phone'?'phone':'code',t('تعذّر الاتصال بالخادم.','Could not reach the server.'))}
    finally{busy=false;if(button)button.disabled=false}
  },true);
})();
