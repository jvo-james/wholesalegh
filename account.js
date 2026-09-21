(() => {
  const authShell=document.querySelector('[data-auth-shell]');
  const dashboard=document.querySelector('[data-account-dashboard]');
  const views=[...document.querySelectorAll('[data-auth-view]')];
  const signInForm=document.querySelector('[data-signin-form]');
  const createForm=document.querySelector('[data-create-form]');
  const verifyForm=document.querySelector('[data-verify-form]');
  const forgotForm=document.querySelector('[data-forgot-form]');
  const SIGNUP_KEY='wgh_pending_signup_v4';
  let pendingSignup=null;
  let pendingPassword='';
  let authWaitTimer=null;

  async function setSafeAuthPersistence(){
    if(!WGH.auth)return;
    try{await WGH.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);return;}catch{}
    try{await WGH.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);}catch{}
  }

  const showView=name=>views.forEach(v=>v.hidden=v.dataset.authView!==name);
  const message=(selector,text)=>{const el=document.querySelector(selector);if(el)el.textContent=text||''};
  const verificationPasswordWrap=()=>document.querySelector('[data-verification-password-wrap]');
  const storePending=value=>{
    pendingSignup=value;
    try{
      if(value)localStorage.setItem(SIGNUP_KEY,JSON.stringify(value));
      else localStorage.removeItem(SIGNUP_KEY);
    }catch{}
  };
  try{pendingSignup=JSON.parse(localStorage.getItem(SIGNUP_KEY)||'null')}catch{storePending(null)}

  function updateVerificationView(){
    if(!pendingSignup)return;
    const emailEl=document.querySelector('[data-verification-email]');
    if(emailEl)emailEl.textContent=pendingSignup.email||'';
    const emailInput=verifyForm?.elements?.email;
    if(emailInput&&!emailInput.value)emailInput.value=pendingSignup.email||'';
    const wrap=verificationPasswordWrap();
    if(wrap){
      wrap.hidden=Boolean(pendingPassword);
      const input=wrap.querySelector('input[name="password"]');
      if(input)input.required=!pendingPassword;
    }
  }

  function showAuth(name='signin'){
    authShell.hidden=false;
    dashboard.hidden=true;
    showView(name);
    if(name==='verify')updateVerificationView();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function showDashboard(){
    authShell.hidden=true;
    dashboard.hidden=false;
    document.body.classList.add('account-authenticated');
    window.scrollTo({top:0,behavior:'auto'});
  }

  async function waitForAuth(){
    if(!WGH.auth){
      if(!authWaitTimer){
        authWaitTimer=setTimeout(()=>{
          if(WGH.auth)return;
          document.body.classList.remove('account-authenticated');
          showAuth(pendingSignup?'verify':'signin');
          const selector=pendingSignup?'[data-verify-message]':'[data-signin-message]';
          message(selector,WGH.isInAppBrowser?.() ? 'Account services could not start inside this app browser. Use the app menu and choose Open in browser, then try again.' : 'Account services are taking too long to load. Check your connection and refresh the page.');
          WGH.showBrowserNotice?.('Account services could not start.');
        },12000);
      }
      setTimeout(waitForAuth,150);
      return;
    }
    if(authWaitTimer){clearTimeout(authWaitTimer);authWaitTimer=null;}
    let restored=false;
    WGH.auth.onAuthStateChanged(async user=>{
      restored=true;
      if(!user){
        document.body.classList.remove('account-authenticated');
        showAuth(pendingSignup?'verify':'signin');
        return;
      }
      showDashboard();
      try{await loadDashboard();}catch(err){WGH.showToast(err);}
    });
    setTimeout(()=>{if(!restored&&WGH.auth?.currentUser)showDashboard();},2500);
  }

  document.querySelectorAll('[data-show-auth]').forEach(btn=>btn.addEventListener('click',()=>{
    message('[data-signin-message]','');message('[data-create-message]','');message('[data-forgot-message]','');
    showView(btn.dataset.showAuth);
    if(btn.dataset.showAuth==='verify'){
      const wrap=verificationPasswordWrap();if(wrap){wrap.hidden=false;const input=wrap.querySelector('input[name="password"]');if(input)input.required=true;}
      const emailInput=verifyForm?.elements?.email;if(emailInput&&!emailInput.value&&createForm?.elements?.email?.value)emailInput.value=createForm.elements.email.value.trim().toLowerCase();
    }
  }));

  signInForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.currentTarget.querySelector('button[type="submit"]');
    message('[data-signin-message]','');
    await WGH.withLoading(btn,async()=>{
      const data=Object.fromEntries(new FormData(e.currentTarget));
      try{
        if(!WGH.auth)throw new Error('Account services are not available in this browser yet. Please refresh or open this page in Safari/Chrome.');
        await setSafeAuthPersistence();
        await WGH.auth.signInWithEmailAndPassword(data.email.trim(),data.password);
      }catch(err){
        const friendly=WGH.friendlyError(err);message('[data-signin-message]',friendly);
        if(/create an account/i.test(friendly))setTimeout(()=>showView('create'),700);
      }
    },'Signing in');
  });

  createForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.currentTarget.querySelector('button[type="submit"]');
    message('[data-create-message]','');
    await WGH.withLoading(btn,async()=>{
      const data=Object.fromEntries(new FormData(e.currentTarget));
      const payload={firstName:data.firstName.trim(),lastName:data.lastName.trim(),phone:data.phone.trim(),email:data.email.trim().toLowerCase(),marketingConsent:data.marketingConsent==='yes'};
      try{
        await WGH.api('/account/begin-signup',payload);
        pendingPassword=String(data.password||'');
        // Persist only non-secret signup state. This survives Snapchat/email app switching.
        storePending(payload);
        updateVerificationView();
        showView('verify');
      }catch(err){message('[data-create-message]',WGH.friendlyError(err));}
    },'Sending verification code');
  });

  async function resendPendingCode(){
    if(!pendingSignup)throw new Error('Please start signup again.');
    const {firstName,lastName,phone,email,marketingConsent}=pendingSignup;
    await WGH.api('/account/begin-signup',{firstName,lastName,phone,email,marketingConsent:Boolean(marketingConsent)});
  }

  document.querySelector('[data-resend-code]')?.addEventListener('click',async e=>{
    const btn=e.currentTarget;message('[data-verify-message]','');
    await WGH.withLoading(btn,async()=>{try{await resendPendingCode();message('[data-verify-message]','A fresh code has been sent.')}catch(err){message('[data-verify-message]',WGH.friendlyError(err))}},'Sending code');
  });

  document.querySelector('[data-verification-back]')?.addEventListener('click',()=>{
    showView('create');
    if(pendingSignup){
      const f=createForm;
      ['firstName','lastName','phone','email'].forEach(k=>{if(f?.elements[k])f.elements[k].value=pendingSignup[k]||''});
      if(f?.elements.marketingConsent)f.elements.marketingConsent.checked=Boolean(pendingSignup.marketingConsent);
    }
  });

  verifyForm?.addEventListener('submit',async e=>{
    e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');message('[data-verify-message]','');
    await WGH.withLoading(btn,async()=>{
      const fd=new FormData(e.currentTarget);
      const email=String(fd.get('email')||pendingSignup?.email||'').trim().toLowerCase();
      const code=String(fd.get('code')||'').trim();
      const password=pendingPassword||String(fd.get('password')||'');
      if(!email){message('[data-verify-message]','Enter the email address you used to sign up.');return;}
      if(password.length<6){
        const wrap=verificationPasswordWrap();if(wrap){wrap.hidden=false;const input=wrap.querySelector('input[name="password"]');if(input)input.required=true;}
        message('[data-verify-message]','Re-enter the password you chose to finish creating your account.');
        return;
      }
      try{
        const result=await WGH.api('/account/complete-signup',{email,password,code,marketingConsent:Boolean(pendingSignup?.marketingConsent)});
        if(!WGH.auth)throw new Error('Your email was verified, but sign-in services did not load. Open this page in Safari/Chrome and sign in with your email and password.');
        await setSafeAuthPersistence();
        await WGH.auth.signInWithCustomToken(result.customToken);
        pendingPassword='';storePending(null);
        showDashboard();
        await loadDashboard();
        WGH.showToast('Your verified account is ready.','success');
      }catch(err){message('[data-verify-message]',WGH.friendlyError(err));}
    },'Verifying');
  });

  document.querySelector('[data-forgot-open]')?.addEventListener('click',()=>showView('forgot'));
  forgotForm?.addEventListener('submit',async e=>{
    e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');message('[data-forgot-message]','');
    await WGH.withLoading(btn,async()=>{
      const email=String(new FormData(e.currentTarget).get('email')||'').trim();
      try{
        if(!WGH.auth)throw new Error('Account services are not available in this browser yet. Please refresh or open this page in Safari/Chrome.');
        await WGH.auth.sendPasswordResetEmail(email);
        message('[data-forgot-message]','Password reset email sent. Check your inbox and spam folder.');
      }catch(err){message('[data-forgot-message]',WGH.friendlyError(err));}
    },'Sending reset link');
  });

  async function loadDashboard(){
    const user=WGH.auth.currentUser;if(!user)return;
    const list=document.querySelector('[data-account-orders]');
    try{
      const [profile,orders]=await Promise.all([WGH.api('/account/profile',undefined,{auth:true}),WGH.api('/account/orders',undefined,{auth:true})]);
      const fullName=`${profile.firstName||''} ${profile.lastName||''}`.trim()||user.displayName||'Your account';
      document.querySelector('[data-account-first-name]').textContent=(profile.firstName||fullName.split(' ')[0]||'there');
      document.querySelector('[data-profile-name]').textContent=fullName;
      document.querySelector('[data-profile-email]').textContent=user.email||'';
      document.querySelector('[data-profile-phone]').textContent=profile.phone||'Not added';const addr=document.querySelector('[data-profile-address]');if(addr)addr.textContent=[profile.address,profile.city,profile.region,profile.country].filter(Boolean).join(' · ')||'Add an address at checkout and it will appear here.';
      document.querySelector('[data-profile-monogram]').textContent=(profile.firstName||user.email||'W').trim()[0].toUpperCase();
      const totalOrders=orders?.length||0,totalPieces=(orders||[]).reduce((s,o)=>s+Number(o.pieces||0),0),active=(orders||[]).filter(o=>o.status!=='delivered').length;
      document.querySelector('[data-account-stat-orders]').textContent=totalOrders;
      document.querySelector('[data-account-stat-pieces]').textContent=totalPieces;
      document.querySelector('[data-account-stat-active]').textContent=active;
      renderOrders(orders,list);
    }catch(err){list.innerHTML=`<div class="account-empty"><h3>We could not load your orders.</h3><p>${WGH.friendlyError(err)}</p></div>`;}
  }

  function renderOrders(orders,list){
    if(!orders?.length){list.innerHTML=`<div class="account-empty account-empty-premium"><div class="orbit-art"><i></i><i></i><i></i><span>W</span></div><h3>Your first order will live beautifully here.</h3><p>Every production milestone, delivery estimate and order detail will appear in one timeline.</p><a class="button button-dark" href="shop.html">Explore the collection</a></div>`;return;}
    list.innerHTML=orders.map(order=>{
      const current=Math.max(0,WGH.statuses.indexOf(order.status));
      return `<article class="account-order-card premium-order-card"><div class="order-card-glow"></div><div class="account-order-top"><div><span>${order.orderNumber}</span><strong>${WGH.statusLabels[order.status]||'In progress'}</strong></div><span class="order-status-pill">${WGH.prettyBatch(order.batchName)||'Cycle assigned'}</span></div><div class="account-order-body"><div><small>Estimated delivery</small><strong>${order.estimatedDelivery||'Updating soon'}</strong></div><div><small>Pieces</small><strong>${order.pieces||0}</strong></div><div><small>Total</small><strong>${WGH.money(order.total||0)}</strong></div></div><div class="animated-progress" aria-label="Order progress"><b style="width:${((current+1)/WGH.statuses.length)*100}%"></b></div><div class="order-stage-dots">${WGH.statuses.map((s,i)=>`<span class="order-dot-wrap ${i<current?'done':i===current?'current':''}"><i title="${WGH.statusLabels[s]}"></i>${i===current?`<small>${WGH.statusLabels[s]}</small>`:''}</span>`).join('')}</div><div class="account-order-actions"><button class="text-link account-track-toggle" type="button" data-order-track="${order.orderNumber}">View progress <span data-icon="arrow">${WGH.icons.arrow}</span></button><a class="text-link subtle-track-link" href="tracking.html?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(WGH.auth.currentUser?.email||'')}">Open tracking</a><button class="text-link reorder-link" type="button" data-reorder="${order.orderNumber}">Reorder</button></div><div class="account-order-track" data-order-track-panel="${order.orderNumber}" hidden>${WGH.renderTracking(order)}</div></article>`
    }).join('');
    list.querySelectorAll('[data-order-track]').forEach(btn=>btn.addEventListener('click',()=>{const p=list.querySelector(`[data-order-track-panel="${btn.dataset.orderTrack}"]`);p.hidden=!p.hidden;btn.firstChild.textContent=p.hidden?'View progress ':'Hide progress '}));list.querySelectorAll('[data-reorder]').forEach(btn=>btn.addEventListener('click',()=>{const o=orders.find(x=>x.orderNumber===btn.dataset.reorder);if(!o?.items?.length)return;WGH.saveCart(o.items.map(i=>({...i})));WGH.showToast('Previous items added to your bag.','success');setTimeout(()=>location.href='cart.html',350)}));
  }

  document.querySelector('[data-account-refresh]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,loadDashboard,'Refreshing'));
  document.querySelector('[data-account-signout]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>WGH.auth.signOut(),'Signing out'));

  // If a shopper returns from their email app/Snapchat after requesting a code,
  // take them straight back to verification instead of losing their place.
  if(pendingSignup){updateVerificationView();showAuth('verify');}
  waitForAuth();
})();
