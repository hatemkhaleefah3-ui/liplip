/* v34 editable profile with 10 cartoon avatars + uploaded photo support. */
(() => {
  if (typeof accountProfilePage !== 'function' || typeof state === 'undefined') return;

  const lang=()=>localStorage.getItem('liplip-ui-language')==='en'?'en':'ar';
  const t=(ar,en)=>lang()==='en'?en:ar;
  const safe=v=>esc(v??'');
  const colors=[
    ['#8d65bd','#ffd36b','#f1b88c','#493650'],['#55b9c5','#ffd88b','#dca87f','#2c4056'],['#ee789f','#9be0c0','#f3bd93','#65394b'],['#6da5e8','#f3cf62','#c98965','#313f68'],['#65bc88','#d9a5ef','#edbb91','#384b3e'],
    ['#ff9c61','#89c8f5','#f0c29a','#5e3b2e'],['#9d74d1','#79d7ce','#b87d5b','#352b48'],['#ef6c7d','#f5d15d','#e8b486','#51323c'],['#4db4a0','#fd9bc1','#f2c69f','#284b4d'],['#7f8de8','#ffbf72','#9f684f','#30365b']
  ];
  function avatarSVG(id=1){
    const i=Math.max(1,Math.min(10,Number(id)||1))-1,[bg,shirt,skin,hair]=colors[i];
    const fringe=i%3===0?'<path d="M28 50c9-26 55-30 71-4-18-9-43 3-71 4Z" fill="'+hair+'"/>':i%3===1?'<path d="M25 50c6-29 60-31 75 0-17-8-26-24-38-22-13 1-19 15-37 22Z" fill="'+hair+'"/>':'<path d="M27 51c4-30 58-35 73-5-12-5-22 0-30-13-10 12-26 10-43 18Z" fill="'+hair+'"/>';
    const accessory=i===2?'<circle cx="94" cy="38" r="8" fill="#fff06b"/><circle cx="94" cy="38" r="3" fill="#ee789f"/>':i===5?'<path d="M31 35h66" stroke="#fff" stroke-width="5" stroke-linecap="round"/>':i===8?'<path d="M32 42c15-18 51-22 66 0" fill="none" stroke="#ffe06b" stroke-width="7" stroke-linecap="round"/>':'';
    return `<svg viewBox="0 0 128 128" role="img" aria-label="${t('صورة كرتونية','Cartoon avatar')} ${i+1}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="${shirt}"/></linearGradient></defs><rect width="128" height="128" rx="30" fill="url(#g${i})"/><circle cx="20" cy="20" r="7" fill="#fff" opacity=".55"/><circle cx="109" cy="28" r="5" fill="#fff" opacity=".45"/><path d="M20 128c5-33 23-47 44-47s40 14 44 47" fill="${shirt}"/><ellipse cx="64" cy="61" rx="34" ry="37" fill="${skin}"/>${fringe}<circle cx="52" cy="62" r="3.5" fill="#332a38"/><circle cx="77" cy="62" r="3.5" fill="#332a38"/><circle cx="42" cy="72" r="5" fill="#f28e9e" opacity=".5"/><circle cx="87" cy="72" r="5" fill="#f28e9e" opacity=".5"/><path d="M54 76c6 7 15 7 21 0" fill="none" stroke="#87505e" stroke-width="3" stroke-linecap="round"/>${accessory}</svg>`;
  }
  function avatarHTML(p={}){
    if(p.avatarType==='upload'&&p.avatarData)return `<img src="${safe(p.avatarData)}" alt="${t('الصورة الشخصية','Profile photo')}">`;
    return avatarSVG(p.avatarId||1);
  }
  function avatarWrap(p={}){return `<div class="profile-v34-avatar-wrap"><div class="profile-v34-avatar">${avatarHTML(p)}</div></div>`}
  function displayName(p){return p.name|| (state.guest?t('ضيف لُبلُب','Liplip Guest'):t('متعلّم لُبلُب','Liplip Learner'))}

  function editPage(){
    const p=state.profile||{},selected=state._profileAvatarDraft||(p.avatarType==='upload'?'upload':String(p.avatarId||1));
    const preview=selected==='upload'&&state._profileUploadData?{avatarType:'upload',avatarData:state._profileUploadData}:{avatarType:selected==='upload'&&p.avatarData?'upload':'preset',avatarData:p.avatarData,avatarId:selected==='upload'?(p.avatarId||1):Number(selected)||1};
    return `<main class="dashboard profile-edit-v34"><div class="profile-edit-v34-head"><button type="button" data-v34="edit-cancel">${icon('back',17)} ${t('العودة','Back')}</button><h1>${t('تعديل الملف الشخصي','Edit profile')}</h1></div><form id="profile-edit-v34-form" class="profile-edit-v34-card">
      <section class="profile-edit-avatar-preview">${avatarWrap(preview)}<div><strong>${t('صورتك الشخصية','Your profile image')}</strong><span>${t('اختر رسماً كرتونياً أو ارفع صورة من جهازك.','Choose a cartoon avatar or upload a photo from your device.')}</span><label class="profile-upload-label">${icon('media',17)} ${t('رفع صورة','Upload photo')}<input id="profile-photo-v34" type="file" accept="image/*"></label></div></section>
      <section class="profile-avatar-picker"><strong>${t('أو اختر واحداً من 10 شخصيات','Or choose one of 10 characters')}</strong><div class="profile-avatar-grid">${Array.from({length:10},(_,i)=>`<button type="button" class="profile-avatar-choice ${selected===String(i+1)?'selected':''}" data-v34="avatar" data-avatar="${i+1}" aria-label="${t('الشخصية','Avatar')} ${i+1}">${avatarSVG(i+1)}</button>`).join('')}</div></section>
      <section class="profile-fields-v34"><label>${t('الاسم','Name')}<input name="name" maxlength="60" value="${safe(p.name||'')}" placeholder="${t('اسمك','Your name')}"></label><label>${t('تاريخ الميلاد','Birth date')}<input name="birth" type="date" value="${safe(p.birth||'')}"></label><label>${t('المدينة','City')}<input name="city" maxlength="60" value="${safe(p.city||'')}" placeholder="${t('المدينة','City')}"></label><label>${t('المنطقة / البلدة','Town / area')}<input name="town" maxlength="60" value="${safe(p.town||'')}" placeholder="${t('المنطقة','Area')}"></label></section>
      <div class="profile-edit-actions"><button type="button" class="cancel" data-v34="edit-cancel">${t('إلغاء','Cancel')}</button><button type="submit" class="save">${t('حفظ التغييرات','Save changes')}</button></div>
    </form></main>`;
  }

  accountProfilePage=function(){
    if(state.profileSettings)return settingsPage();
    if(state._profileEditV34)return editPage();
    const s=LiplipProgress.snapshot(state.progress),p=state.profile||{},name=displayName(p),birth=p.birth||t('غير محدد','Not set'),uiLang=lang();
    return `<main class="dashboard profile-v34"><section class="profile-v34-hero">${avatarWrap(p)}<div class="profile-v34-copy"><span>${t('ملفك الشخصي','YOUR PROFILE')}</span><h1>${safe(name)}</h1><p>${[p.city,p.town].filter(Boolean).map(safe).join(' · ')||t('رحلتك مع لُبلُب في مكان واحد','Your Liplip journey in one place')}</p></div><button class="profile-v34-edit" data-v34="edit">${icon('pen',18)} ${t('تعديل الملف','Edit profile')}</button></section>
      <section class="profile-v34-facts"><article><span>${icon('user',21)}</span><div><small>${t('تاريخ الميلاد','Birth date')}</small><strong dir="ltr">${safe(birth)}</strong></div></article><article><span>${icon('target',21)}</span><div><small>${t('المستوى الحالي','Current level')}</small><strong dir="ltr">${s.level}</strong></div></article><article><span>${icon('layers',21)}</span><div><small>${t('الصناديق المكتملة','Completed boxes')}</small><strong>${s.completedCount}</strong></div></article></section>
      <section class="profile-actions-v28 profile-v34-actions"><div class="profile-action-row"><span>${icon('settings',20)}</span><div><strong>${t('الإعدادات','Settings')}</strong><small>${t('إدارة بيانات التعلّم والتقدّم','Manage learning data and progress')}</small></div><button data-action="open-settings">${t('فتح','Open')} ${icon('arrow',16)}</button></div>
        <label class="profile-action-row language-row"><span>${icon('globe',20)}</span><div><strong>${t('لغة الواجهة','Interface language')}</strong><small>${t('العربية أو الإنجليزية','Arabic or English')}</small></div><select id="profile-language-v28"><option value="ar" ${uiLang==='ar'?'selected':''}>العربية</option><option value="en" ${uiLang==='en'?'selected':''}>English</option></select></label>
        <div class="profile-action-row"><span>${icon('logout',20)}</span><div><strong>${t('تسجيل الخروج','Sign out')}</strong><small>${t('العودة إلى شاشة البداية','Return to the start screen')}</small></div><button data-v28="logout">${t('خروج','Sign out')}</button></div>
        <div class="profile-action-row danger"><span>${icon('close',20)}</span><div><strong>${t('حذف الحساب','Delete account')}</strong><small>${t('حذف الملف والتقدّم المحلي','Remove profile and local progress')}</small></div><button data-v28="delete-account">${t('حذف','Delete')}</button></div>
      </section>${state._v28DeleteConfirm?`<div class="profile-delete-confirm-v28" role="alertdialog" aria-modal="true"><div><span>${icon('close',25)}</span><h2>${t('حذف الحساب؟','Delete account?')}</h2><p>${t('سيتم حذف ملفك وتقدّمك المحفوظ محلياً.','Your profile and locally saved progress will be removed.')}</p><div><button data-v28="delete-cancel">${t('إلغاء','Cancel')}</button><button class="danger" data-v28="delete-confirm">${t('نعم، احذف الحساب','Yes, delete account')}</button></div></div></div>`:''}</main>`;
  };

  function setPreview(html){const root=document.querySelector('.profile-edit-avatar-preview .profile-v34-avatar');if(root)root.innerHTML=html}
  function chooseAvatar(id){state._profileAvatarDraft=String(id);document.querySelectorAll('.profile-avatar-choice').forEach(b=>b.classList.toggle('selected',b.dataset.avatar===String(id)));setPreview(avatarSVG(id))}

  document.addEventListener('click',e=>{
    const el=e.target.closest?.('[data-v34]');if(!el)return;
    const action=el.dataset.v34;
    if(action==='edit'){e.preventDefault();e.stopImmediatePropagation();const p=state.profile||{};state._profileEditV34=true;state._profileAvatarDraft=p.avatarType==='upload'?'upload':String(p.avatarId||1);state._profileUploadData=p.avatarData||'';render(false);return}
    if(action==='edit-cancel'){e.preventDefault();e.stopImmediatePropagation();state._profileEditV34=false;state._profileAvatarDraft=null;state._profileUploadData='';render(false);return}
    if(action==='avatar'){e.preventDefault();e.stopImmediatePropagation();chooseAvatar(el.dataset.avatar);return}
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.id!=='profile-photo-v34'||!e.target.files?.[0])return;
    const file=e.target.files[0];if(!file.type.startsWith('image/'))return;
    const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const size=256,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);state._profileUploadData=canvas.toDataURL('image/jpeg',.84);state._profileAvatarDraft='upload';document.querySelectorAll('.profile-avatar-choice').forEach(b=>b.classList.remove('selected'));setPreview(`<img src="${state._profileUploadData}" alt="${t('الصورة الشخصية','Profile photo')}">`)};img.src=String(reader.result)};reader.readAsDataURL(file);
  },true);

  document.addEventListener('submit',e=>{
    if(e.target?.id!=='profile-edit-v34-form')return;
    e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(e.target),old=state.profile||{},draft=state._profileAvatarDraft||String(old.avatarId||1),next={...old,name:String(fd.get('name')||'').trim(),birth:String(fd.get('birth')||''),city:String(fd.get('city')||'').trim(),town:String(fd.get('town')||'').trim()};
    if(draft==='upload'&&state._profileUploadData){next.avatarType='upload';next.avatarData=state._profileUploadData}else{next.avatarType='preset';next.avatarId=Math.max(1,Math.min(10,Number(draft)||1));delete next.avatarData}
    state.profile=next;state._profileEditV34=false;state._profileAvatarDraft=null;state._profileUploadData='';if(typeof save==='function')save();render(false);
  },true);
})();
