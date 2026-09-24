(() => {
  const login=document.querySelector('[data-admin-login]'),app=document.querySelector('[data-admin-app]'),message=document.querySelector('[data-admin-message]');
  const statuses=WGH.statuses,labels=WGH.statusLabels;let batches=[],orders=[],customers=[],accounts=[],categories=[],notifications=[],pendingPayments=[],selectedBatch=null,adminAuth=null; const ADMIN_VIEWS=['overview','orders','pending-payments','transactions','international','analytics','batches','products','discounts','categories','wholesale','customers','accounts','abandoned','subscribers','alerts','activity','settings'];
  const escape=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  let adminBusyCount=0,adminViewLoading=false,viewLoadToken=0;
  let ordersLoadedAt=0,ordersLoadPromise=null,batchesLoadedAt=0,batchesLoadPromise=null,notificationsLoadedAt=0,notificationsLoadPromise=null;
  let operationalSummary={activeOrders:0,openBatches:0};
  function setAdminPageLoading(on,label='Loading'){
    const el=document.querySelector('[data-admin-page-loader]');
    if(!el)return;
    const text=el.querySelector('[data-admin-page-loader-label]');
    if(text)text.textContent=label;
    el.hidden=!on;
    el.setAttribute('aria-busy',on?'true':'false');
  }
  function adminBusy(on){
    adminBusyCount=Math.max(0,adminBusyCount+(on?1:-1));
    if(!adminViewLoading)setAdminPageLoading(adminBusyCount>0,'Updating');
  }
  const VIEW_LABELS={overview:'Overview',orders:'Orders','pending-payments':'Pending payments',transactions:'Transactions',international:'International orders',analytics:'Sales analytics',batches:'Production batches',products:'Products & inventory',discounts:'Discounts',categories:'Categories',wholesale:'Wholesale',customers:'Customers',accounts:'Registered accounts',abandoned:'Abandoned carts',subscribers:'Subscribers',alerts:'Notifications',activity:'Activity history',settings:'Settings'};
  function showViewLoadError(name,err){
    const panel=document.querySelector(`[data-view-panel="${name}"]`);if(!panel)return;
    let box=panel.querySelector('[data-admin-view-error]');
    if(!box){box=document.createElement('div');box.className='admin-view-load-error';box.dataset.adminViewError='';panel.prepend(box);}
    box.innerHTML=`<strong>Could not load ${escape(VIEW_LABELS[name]||'this section')}</strong><p>${escape(WGH.friendlyError(err))}</p>`;
  }
  async function runViewLoader(name,loader,label='Loading'){
    const token=++viewLoadToken;
    adminViewLoading=true;setAdminPageLoading(true,`${label} ${VIEW_LABELS[name]||''}`.trim());
    try{await loader();if(token===viewLoadToken)document.querySelector(`[data-view-panel="${name}"] [data-admin-view-error]`)?.remove();}
    catch(err){console.error(`Admin ${name} load failed`,err);if(token===viewLoadToken)showViewLoadError(name,err);}
    finally{if(token===viewLoadToken){adminViewLoading=false;setAdminPageLoading(adminBusyCount>0,'Updating');}}
  }
  async function adminRequest(path,body,prefix=true){const auth=await ensureAdminAuth(),user=auth.currentUser;if(!user)throw new Error('Please sign in to admin again.');const token=await user.getIdToken(),opts={method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`}};if(body!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}const res=await fetch(`${WGH.API_BASE}${prefix?'/admin':''}${path}`,opts),data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Admin request failed.');return data}
  async function adminApi(path,body){adminBusy(true);try{return await adminRequest(path,body,true)}finally{adminBusy(false)}}
  async function ensureOrders(force=false){
    const fresh=ordersLoadedAt&&Date.now()-ordersLoadedAt<60000;
    if(!force&&fresh)return orders;
    if(!force&&ordersLoadPromise)return ordersLoadPromise;
    const path=force?'/orders-all?refresh=1':'/orders-all';
    ordersLoadPromise=adminApi(path).then(data=>{orders=Array.isArray(data)?data:[];ordersLoadedAt=Date.now();operationalSummary.activeOrders=orders.filter(o=>o.status!=='delivered').length;return orders});
    try{return await ordersLoadPromise}finally{ordersLoadPromise=null}
  }
  async function ensureBatches(force=false){
    const fresh=batchesLoadedAt&&Date.now()-batchesLoadedAt<60000;
    if(!force&&fresh)return batches;
    if(!force&&batchesLoadPromise)return batchesLoadPromise;
    const path=force?'/batches?refresh=1':'/batches';
    batchesLoadPromise=adminApi(path).then(data=>{batches=Array.isArray(data)?data:[];batchesLoadedAt=Date.now();operationalSummary.openBatches=batches.filter(b=>!b.locked&&String(b.status||'').toUpperCase()!=='CLOSED').length;return batches});
    try{return await batchesLoadPromise}finally{batchesLoadPromise=null}
  }
  async function ensureNotifications(force=false){
    const fresh=notificationsLoadedAt&&Date.now()-notificationsLoadedAt<30000;
    if(!force&&fresh)return notifications;
    if(!force&&notificationsLoadPromise)return notificationsLoadPromise;
    const path=force?'/notifications?refresh=1':'/notifications';
    notificationsLoadPromise=adminApi(path).then(data=>{notifications=Array.isArray(data)?data:[];notificationsLoadedAt=Date.now();return notifications});
    try{return await notificationsLoadPromise}finally{notificationsLoadPromise=null}
  }
  function getViewLoader(name){
    switch(name){
      case 'overview': return loadOverview;
      case 'orders': return loadOrders;
      case 'pending-payments': return loadPendingPayments;
      case 'transactions': return loadTransactions;
      case 'international': return loadInternational;
      case 'analytics': return loadAnalytics;
      case 'batches': return loadBatches;
      case 'products': return loadProducts;
      case 'discounts': return loadDiscounts;
      case 'categories': return loadCategoriesAdmin;
      case 'wholesale': return loadWholesale;
      case 'customers': return loadCustomers;
      case 'accounts': return loadAccounts;
      case 'abandoned': return loadAbandoned;
      case 'subscribers': return loadSubscribers;
      case 'alerts': return loadAlerts;
      case 'activity': return loadActivity;
      case 'settings': return loadSettings;
      default: return null;
    }
  }
  function showView(name){
    if(!ADMIN_VIEWS.includes(name))name='overview';
    location.hash=name;document.querySelectorAll('[data-admin-view]').forEach(b=>b.classList.toggle('active',b.dataset.adminView===name));document.querySelectorAll('[data-view-panel]').forEach(p=>{const active=p.dataset.viewPanel===name;p.hidden=!active;p.classList.toggle('active',active)});document.body.classList.remove('admin-menu-open');window.scrollTo({top:0,behavior:'instant'});
    const loader=getViewLoader(name);return loader?runViewLoader(name,loader):Promise.resolve();
  }
  document.querySelectorAll('[data-admin-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.adminView)));document.querySelectorAll('[data-jump-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.jumpView)));document.querySelector('[data-admin-menu]')?.addEventListener('click',()=>document.body.classList.toggle('admin-menu-open'));

  let authListenerBound=false;
  let authBootPromise=null;
  async function ensureAdminAuth(){
    if(adminAuth)return adminAuth;
    if(authBootPromise)return authBootPromise;
    authBootPromise=(async()=>{
      const started=Date.now();
      while(!window.firebase&&Date.now()-started<8000)await new Promise(r=>setTimeout(r,80));
      if(!window.firebase)throw new Error('Firebase failed to load. Check your connection and reload this page.');
      const config=await WGH.api('/config');if(!config?.firebase?.apiKey)throw new Error('Firebase sign-in is not configured on this deployment.');let named=firebase.apps.find(a=>a.name==='wgh-admin');if(!named)named=firebase.initializeApp(config.firebase,'wgh-admin');adminAuth=named.auth();try{await adminAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);}catch{try{await adminAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);}catch{}}return adminAuth;
    })();
    try{return await authBootPromise}finally{authBootPromise=null}
  }

  async function openAdminForUser(user){
    if(!user){login.hidden=false;app.hidden=true;return;}
    login.hidden=true;app.hidden=false;message.textContent='';const emailEl=document.querySelector('[data-admin-current-email]');if(emailEl)emailEl.textContent=user.email||'';
    const view=ADMIN_VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):'overview';
    try{await showView(view);showNotificationPopoverOnLoad()}catch(err){console.error('Admin view error',err);WGH.showToast(WGH.friendlyError(err))}
  }

  async function waitForAuth(){
    try{
      const auth=await ensureAdminAuth();
      if(authListenerBound)return;
      authListenerBound=true;
      auth.onAuthStateChanged(user=>openAdminForUser(user),err=>{
        console.error('Admin auth state error',err);
        login.hidden=false;app.hidden=true;message.textContent=WGH.friendlyError(err);
      });
    }catch(err){
      console.error('Admin auth bootstrap error',err);
      login.hidden=false;app.hidden=true;message.textContent=WGH.friendlyError(err);
    }
  }

  document.querySelector('[data-admin-login-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.currentTarget.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(e.currentTarget));
    message.textContent='';
    await WGH.withLoading(btn,async()=>{
      try{
        const auth=await ensureAdminAuth();
        await auth.signInWithEmailAndPassword(String(data.email||'').trim(),String(data.password||''));
      }catch(err){
        console.error('Admin sign-in error',err);
        message.textContent=WGH.friendlyError(err);
      }
    },'Signing in');
  });

  // Admin account recovery: keep both recovery actions separate from the sign-in handler
  // so a recovery click can never submit the login form accidentally.
  const adminPasswordRecovery=document.querySelector('[data-admin-password-recovery]');
  const adminEmailRecovery=document.querySelector('[data-admin-email-recovery]');
  const adminLoginForm=document.querySelector('[data-admin-login-form]');
  const adminForgotPasswordEmail=document.querySelector('[data-admin-forgot-password-form] input[name=\"email\"]');
  function showAdminRecovery(which){
    if(adminLoginForm)adminLoginForm.hidden=Boolean(which);
    document.querySelector('.admin-login-recovery-links')?.toggleAttribute('hidden',Boolean(which));
    if(adminPasswordRecovery)adminPasswordRecovery.hidden=which!=='password';
    if(adminEmailRecovery)adminEmailRecovery.hidden=which!=='email';
    if(!which){
      document.querySelector('[data-admin-password-recovery-message]')?.replaceChildren();
      if(adminForgotPasswordEmail)adminForgotPasswordEmail.value=document.querySelector('[data-admin-login-form] input[name=email]')?.value||'';
    }
  }
  document.querySelector('[data-admin-forgot-password]')?.addEventListener('click',()=>{
    const currentEmail=document.querySelector('[data-admin-login-form] input[name=email]')?.value||'';
    if(adminForgotPasswordEmail)adminForgotPasswordEmail.value=currentEmail;
    document.querySelector('[data-admin-message]').textContent='';
    showAdminRecovery('password');
  });
  document.querySelector('[data-admin-forgot-email]')?.addEventListener('click',()=>{document.querySelector('[data-admin-message]').textContent='';showAdminRecovery('email')});
  document.querySelector('[data-admin-recovery-close]')?.addEventListener('click',()=>showAdminRecovery(''));
  document.querySelector('[data-admin-email-recovery-close]')?.addEventListener('click',()=>showAdminRecovery(''));
  document.querySelector('[data-admin-forgot-password-form]')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget,btn=form.querySelector('button[type=submit]'),email=String(new FormData(form).get('email')||'').trim().toLowerCase();
    const out=document.querySelector('[data-admin-password-recovery-message]');
    if(out)out.textContent='';
    await WGH.withLoading(btn,async()=>{
      try{
        const auth=await ensureAdminAuth();
        await auth.sendPasswordResetEmail(email);
        if(out)out.className='auth-message auth-message-success';
        if(out)out.textContent='If that email belongs to an admin account, a password reset link has been sent. Check your inbox and spam folder.';
      }catch(err){
        console.error('Admin password reset error',err);
        if(out){out.className='auth-message';out.textContent=WGH.friendlyError(err);}
      }
    },'Sending reset link');
  });

  document.querySelector('[data-admin-signout]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>adminAuth?.signOut(),'Signing out'));

  async function loadOverview(force=false){
    const overview=await adminApi(force?'/overview?refresh=1':'/overview');
    operationalSummary.activeOrders=Number(overview.activeOrders||0);
    operationalSummary.openBatches=Number(overview.openBatches||0);
    document.querySelector('[data-overview-metrics]').innerHTML=[['Total orders',overview.orders],['Active orders',overview.activeOrders],['Pieces in production',overview.pieces],['Revenue',WGH.money(overview.revenue)]].map(([l,v])=>`<article class="admin-metric"><p>${l}</p><strong>${v}</strong></article>`).join('');
    const batchOverview=document.querySelector('[data-overview-batches]');if(batchOverview)batchOverview.innerHTML=(overview.recentBatches||[]).map(batchRow).join('')||empty('No production batches yet','A production batch will appear automatically after the first paid order is assigned.');
    const orderOverview=document.querySelector('[data-overview-orders]');if(orderOverview)orderOverview.innerHTML=(overview.recentOrders||[]).map(orderRow).join('')||empty('No orders yet','Paid website orders and manually created orders will appear here.');
    orders=[];batches=[];ordersLoadedAt=0;batchesLoadedAt=0;
    await loadNotificationPreview();
  }
  const empty=(title,copy)=>`<div class="admin-empty compact"><h3>${title}</h3><p>${copy}</p></div>`;
  const batchRow=b=>{const pct=Math.min(100,Math.round(Number(b.usedCapacity||0)/Math.max(1,Number(b.capacity||1))*100));return `<button class="admin-batch-row" data-open-batch="${escape(b.id)}"><div><span>${escape(b.status||'OPEN')}</span><strong>${escape(WGH.prettyBatch(b.batchName||b.id))}</strong></div><div class="batch-mini-cap"><span>${b.usedCapacity||0}/${b.capacity||0} pieces</span><i><b style="width:${pct}%"></b></i></div></button>`};
  const orderRow=o=>`<div class="admin-order-row"><div><strong>${escape(o.orderNumber)}</strong><span>${escape(o.customerName||o.customerEmail)}</span></div><div><span>${escape(WGH.prettyBatch(o.batchName)||'')}</span><strong>${labels[o.status]||'In progress'}</strong></div></div>`;

  async function loadBatches(force=false){const btn=document.querySelector('[data-refresh-batches]');await WGH.withLoading(btn,async()=>{await ensureBatches(force);renderBatchList();if(selectedBatch&&batches.some(b=>b.id===selectedBatch))await openBatch(selectedBatch)},'Refreshing')}
  function renderBatchList(){const list=document.querySelector('[data-batch-list]');list.innerHTML=`<div class="admin-card-head"><div><p class="eyebrow">Batches</p><h2>${batches.length} production cycles</h2></div></div>${batches.map(b=>batchRow(b).replace('admin-batch-row"','admin-batch-row '+(selectedBatch===b.id?'active':'')+'"')).join('')||empty('No production batches yet','Once a paid order is assigned to a cycle, that batch will appear here.')}`;list.querySelectorAll('[data-open-batch]').forEach(b=>b.addEventListener('click',()=>openBatch(b.dataset.openBatch)));}
  async function openBatch(id){selectedBatch=id;renderBatchList();const detail=document.querySelector('[data-batch-detail]');detail.innerHTML=`<div class="admin-loading"><span class="page-spinner"></span><p>Loading production sheet</p></div>`;try{const batch=batches.find(b=>b.id===id);const batchOrders=await adminApi(`/orders?batchId=${encodeURIComponent(id)}`);renderBatchDetail(batch,batchOrders)}catch(err){detail.innerHTML=empty('Could not load this batch',WGH.friendlyError(err))}}
  function aggregate(batchOrders){const map={};batchOrders.forEach(o=>(o.items||[]).forEach(item=>{const p=map[item.name]||(map[item.name]={total:0,colours:{}});p.total+=Number(item.totalQuantity||0);(item.variants||[]).forEach(v=>{p.colours[v.colour]=p.colours[v.colour]||{};p.colours[v.colour][v.size]=(p.colours[v.colour][v.size]||0)+Number(v.quantity||0)})}));return map}
  function renderBatchDetail(b,batchOrders){
    const detail=document.querySelector('[data-batch-detail]'),pct=Math.min(100,Math.round(Number(b.usedCapacity||0)/Math.max(1,Number(b.capacity||1))*100)),agg=aggregate(batchOrders),pieces=batchOrders.reduce((sum,o)=>sum+Number(o.pieces||0),0);
    const colourTotals={},sizeTotals={};
    batchOrders.forEach(o=>(o.items||[]).forEach(item=>(item.variants||[]).forEach(v=>{colourTotals[v.colour]=(colourTotals[v.colour]||0)+Number(v.quantity||0);sizeTotals[v.size]=(sizeTotals[v.size]||0)+Number(v.quantity||0)})));
    const productRows=Object.entries(agg).sort((a,b)=>b[1].total-a[1].total);
    detail.innerHTML=`<div class="batch-detail-head"><div><p class="eyebrow">${escape(b.locked?'Locked production sheet':b.status||'OPEN')}</p><h2>${escape(WGH.prettyBatch(b.batchName||b.id))}</h2><p>${date(b.startDate)} to ${date(b.closeDate)}</p></div><div class="admin-head-actions"><button class="button button-outline" data-print-batch><i class="fa-solid fa-print"></i> Print sheet</button><button class="button button-outline" data-lock-batch><i class="fa-solid ${b.locked?'fa-lock-open':'fa-lock'}"></i> ${b.locked?'Unlock batch':'Lock batch'}</button><button class="button button-dark" data-export-batch><i class="fa-solid fa-download"></i> Download CSV</button></div></div>
    <div class="production-delivery-editor admin-card"><div><p class="eyebrow">Estimated delivery</p><h3 data-batch-current-delivery>${escape(b.estimatedDelivery||'-')}</h3><p>${b.deliveryWindowOverridden?'This batch has a custom delivery window.':'This window is calculated automatically from the production cycle.'}</p></div><div class="batch-delivery-fields"><label>From<input type="date" data-batch-delivery-start value="${inputDate(b.estimatedDeliveryStart)}"></label><span>to</span><label>To<input type="date" data-batch-delivery-end value="${inputDate(b.estimatedDeliveryEnd)}"></label><button class="button button-outline" type="button" data-save-batch-delivery>Change delivery window</button></div></div>
    <div class="production-explainer"><i class="fa-solid fa-circle-info"></i><div><strong>${b.locked?'This production sheet is locked.':'This is the working production sheet.'}</strong><p>${b.locked?'Unlock it before changing capacity. New orders will not be assigned here while it is locked.':'Orders assigned to this cycle are counted automatically by style, colour and size. Lock the batch when the sheet is final and ready for production.'}</p></div></div>
    <div class="batch-capacity-large"><div><span>Capacity used</span><strong>${b.usedCapacity||0} / ${b.capacity||0} pieces</strong></div><span>${pct}%</span><i><b style="width:${pct}%"></b></i></div>
    <div class="batch-stat-row"><div><span>Orders</span><strong>${batchOrders.length}</strong></div><div><span>Total pieces</span><strong>${pieces}</strong></div><div><span>Styles</span><strong>${Object.keys(agg).length}</strong></div><div><span>Colours</span><strong>${Object.keys(colourTotals).length}</strong></div></div>
    <div class="capacity-editor"><label>Maximum batch capacity<input type="number" min="1" value="${b.capacity||150}" data-capacity-input ${b.locked?'disabled':''}></label><button class="button button-outline" data-save-capacity ${b.locked?'disabled':''}>Save capacity</button></div>
    <div class="production-inner-tabs" role="tablist"><button class="active" data-production-tab="summary">Summary</button><button data-production-tab="product">By product</button><button data-production-tab="colour">By colour</button><button data-production-tab="size">By size</button><button data-production-tab="orders">Orders</button></div>
    <div class="production-tab-panel active" data-production-panel="summary"><div class="production-summary-grid"><article><span>Most produced style</span><strong>${escape(productRows[0]?.[0]||'-')}</strong><small>${productRows[0]?.[1]?.total||0} pieces</small></article><article><span>Largest colour group</span><strong>${escape(Object.entries(colourTotals).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-')}</strong><small>${Object.entries(colourTotals).sort((a,b)=>b[1]-a[1])[0]?.[1]||0} pieces</small></article><article><span>Largest size group</span><strong>${escape(Object.entries(sizeTotals).sort((a,b)=>b[1]-a[1])[0]?.[0]||'-')}</strong><small>${Object.entries(sizeTotals).sort((a,b)=>b[1]-a[1])[0]?.[1]||0} pieces</small></article></div><div class="production-checklist"><p class="eyebrow">Production workflow</p><ol><li><b>1</b><span>Confirm every paid order is assigned to this batch.</span></li><li><b>2</b><span>Use By product, By colour and By size to prepare the cutting/production count.</span></li><li><b>3</b><span>Download or print the sheet, then lock the batch before production begins.</span></li><li><b>4</b><span>Update each order stage from Orders as production moves forward.</span></li></ol></div></div>
    <div class="production-tab-panel" data-production-panel="product" hidden>${productRows.map(([name,p])=>productionTable(name,p)).join('')||empty('No pieces assigned yet','Products will appear here as soon as orders are assigned to this batch.')}</div>
    <div class="production-tab-panel" data-production-panel="colour" hidden><div class="production-flat-table"><div class="admin-card-head"><div><p class="eyebrow">Colour totals</p><h3>Pieces to produce by colour</h3></div></div><table class="production-table"><thead><tr><th>Colour</th><th>Total pieces</th></tr></thead><tbody>${Object.entries(colourTotals).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<tr><td><span class="production-swatch" style="--swatch:${WGH.colourValue(c)}"></span>${escape(c)}</td><td><strong>${n}</strong></td></tr>`).join('')||'<tr><td colspan="2">No colour totals yet.</td></tr>'}</tbody></table></div></div>
    <div class="production-tab-panel" data-production-panel="size" hidden><div class="production-flat-table"><div class="admin-card-head"><div><p class="eyebrow">Size totals</p><h3>Pieces to produce by size</h3></div></div><table class="production-table"><thead><tr><th>Size</th><th>Total pieces</th></tr></thead><tbody>${Object.entries(sizeTotals).map(([z,n])=>`<tr><td>${escape(z)}</td><td><strong>${n}</strong></td></tr>`).join('')||'<tr><td colspan="2">No size totals yet.</td></tr>'}</tbody></table></div></div>
    <div class="production-tab-panel" data-production-panel="orders" hidden><div class="batch-orders-section"><div class="admin-card-head"><div><p class="eyebrow">Orders</p><h2>${batchOrders.length} orders in this batch</h2></div></div>${batchOrders.map(o=>orderAdminCard(o)).join('')||empty('No orders in this batch','Orders assigned to this production cycle will appear here.')}</div></div>`;
    detail.querySelectorAll('[data-production-tab]').forEach(btn=>btn.onclick=()=>{detail.querySelectorAll('[data-production-tab]').forEach(x=>x.classList.toggle('active',x===btn));detail.querySelectorAll('[data-production-panel]').forEach(panel=>{const on=panel.dataset.productionPanel===btn.dataset.productionTab;panel.hidden=!on;panel.classList.toggle('active',on)})});
    detail.querySelector('[data-save-capacity]')?.addEventListener('click',async e=>WGH.withLoading(e.currentTarget,async()=>{await adminApi('/capacity',{batchId:b.id,capacity:Number(detail.querySelector('[data-capacity-input]').value)});WGH.showToast('Batch capacity updated.','success');batches=await adminApi('/batches');await openBatch(b.id)},'Saving'));
    detail.querySelector('[data-save-batch-delivery]')?.addEventListener('click',async e=>{const start=detail.querySelector('[data-batch-delivery-start]')?.value||'',end=detail.querySelector('[data-batch-delivery-end]')?.value||'';if(!start||!end)return WGH.showToast('Choose both delivery dates.');if(end<start)return WGH.showToast('The delivery end date must be on or after the start date.');await WGH.withLoading(e.currentTarget,async()=>{const result=await adminApi('/batch-delivery-window',{batchId:b.id,startDate:start,endDate:end});WGH.showToast(`Delivery window updated. ${result.emailsSent||0} customer email${result.emailsSent===1?'':'s'} sent.`,'success');batches=await adminApi('/batches');await openBatch(b.id)},'Saving')});
    detail.querySelector('[data-export-batch]')?.addEventListener('click',e=>{WGH.setLoading(e.currentTarget,true,'Preparing file');setTimeout(()=>{exportCsv(b,batchOrders);WGH.setLoading(e.currentTarget,false)},220)});detail.querySelector('[data-print-batch]')?.addEventListener('click',()=>printProductionSheet(b,batchOrders));detail.querySelector('[data-lock-batch]')?.addEventListener('click',async e=>WGH.withLoading(e.currentTarget,async()=>{await adminApi('/batch-lock',{batchId:b.id,locked:!b.locked});WGH.showToast(b.locked?'Batch unlocked.':'Batch locked.','success');batches=await adminApi('/batches');await openBatch(b.id)},b.locked?'Unlocking':'Locking'));
    detail.querySelectorAll('[data-order-detail]').forEach(btn=>btn.onclick=()=>openOrderDetail(btn.dataset.orderDetail));bindStatus(detail,batchOrders);
  }
  function productionTable(name,p){
    const colourBlocks=Object.entries(p.colours).map(([colour,sizes])=>{
      const colourTotal=Object.values(sizes).reduce((sum,n)=>sum+Number(n||0),0);
      const sizeRows=Object.entries(sizes).filter(([,qty])=>Number(qty)>0).map(([size,qty])=>`<div class="production-size-chip"><span>${escape(size)}</span><strong>${qty}</strong></div>`).join('');
      return `<section class="production-colour-card"><div class="production-colour-head"><div><span class="production-swatch" style="--swatch:${WGH.colourValue(colour)}"></span><strong>${escape(colour)}</strong></div><b>${colourTotal} piece${colourTotal===1?'':'s'}</b></div><div class="production-size-breakdown">${sizeRows||'<span class="muted-copy">No size quantities recorded.</span>'}</div></section>`;
    }).join('');
    return `<details class="production-product production-product-expandable"><summary><div><span class="production-product-kicker">Product breakdown</span><h3>${escape(name)}</h3></div><div class="production-product-total"><strong>${p.total}</strong><span>pieces</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></div></summary><div class="production-product-body">${colourBlocks||'<p class="muted-copy">No colour breakdown recorded.</p>'}</div></details>`;
  }
  function orderAdminCard(o){return `<article class="batch-order-card"><div><strong>${escape(o.orderNumber)}</strong><span>${escape(o.customerName||o.customerEmail)}</span><small>${o.pieces} pieces · ${escape(o.estimatedDelivery)}</small></div><select data-status-order="${escape(o.orderNumber)}">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${labels[s]}</option>`).join('')}</select></article>`}
  function bindStatus(root,source){root.querySelectorAll('[data-status-order]').forEach(select=>select.addEventListener('change',async()=>{select.disabled=true;const original=source.find(o=>o.orderNumber===select.dataset.statusOrder)?.status;try{await adminApi('/status',{orderNumber:select.dataset.statusOrder,status:select.value});WGH.showToast('Order stage updated and the customer will be notified.','success');const target=source.find(o=>o.orderNumber===select.dataset.statusOrder);if(target)target.status=select.value;}catch(err){select.value=original||select.value;WGH.showToast(err)}finally{select.disabled=false}}));}

  async function loadOrders(force=false){const btn=document.querySelector('[data-refresh-orders]');await WGH.withLoading(btn,async()=>{await ensureOrders(force);renderOrders()},'Refreshing')}
  function renderOrders(){const q=(document.querySelector('[data-order-search]').value||'').toLowerCase(),filter=document.querySelector('[data-order-filter]').value;const rows=orders.filter(o=>(filter==='all'||o.status===filter)&&`${o.orderNumber} ${o.customerName} ${o.customerEmail}`.toLowerCase().includes(q));document.querySelector('[data-orders-table]').innerHTML=rows.map(o=>`<tr class="admin-click-row" data-order-detail="${escape(o.orderNumber)}"><td><input class="order-select-check" type="checkbox" data-order-select="${escape(o.orderNumber)}"></td><td><strong>${escape(o.orderNumber)}</strong><small>${date(o.createdAt)} · ${time(o.createdAt)}</small></td><td>${escape(o.customerName)}<small>${escape(o.customerEmail)}</small></td><td>${escape(WGH.prettyBatch(o.batchName))}</td><td>${o.pieces}</td><td>${WGH.money(o.total)}</td><td>${escape(o.estimatedDelivery)}</td><td><select data-status-order="${escape(o.orderNumber)}">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${labels[s]}</option>`).join('')}</select></td></tr>`).join('')||`<tr><td colspan="8">No matching orders.</td></tr>`;document.querySelector('[data-orders-mobile]').innerHTML=rows.map(o=>`<article class="admin-mobile-card admin-click-row" data-order-detail="${escape(o.orderNumber)}"><div><label class="mobile-order-check"><input type="checkbox" data-order-select="${escape(o.orderNumber)}"> <strong>${escape(o.orderNumber)}</strong></label><span>${escape(o.customerName)}</span></div><p>${date(o.createdAt)} · ${time(o.createdAt)} · ${o.pieces} pieces · ${WGH.money(o.total)} · ${escape(WGH.prettyBatch(o.batchName))}</p><select data-status-order="${escape(o.orderNumber)}">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${labels[s]}</option>`).join('')}</select></article>`).join('');document.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=e=>{if(e.target.closest('select,[data-status-order]'))return;openOrderDetail(b.dataset.orderDetail)});document.querySelectorAll('[data-status-order]').forEach(el=>el.addEventListener('click',e=>e.stopPropagation()));bindStatus(document.querySelector('[data-view-panel="orders"]'),orders);bindBulkOrderSelection()}
  document.querySelector('[data-order-search]')?.addEventListener('input',renderOrders);document.querySelector('[data-order-filter]')?.addEventListener('change',renderOrders);

  function pendingPaymentItemsHtml(items){
    return (Array.isArray(items)?items:[]).slice(0,6).map(item=>{
      const qty=Number(item.totalQuantity||item.quantity||0);
      return `<span class="pending-payment-chip">${escape(item.name||'Product')}${qty?` · ${qty} piece${qty===1?'':'s'}`:''}</span>`;
    }).join('');
  }
  async function loadPendingPayments(){
    const btn=document.querySelector('[data-refresh-pending-payments]');
    await WGH.withLoading(btn,async()=>{
      pendingPayments=await adminApi('/pending-payments');
      renderPendingPayments();
    },'Refreshing');
  }
  function renderPendingPayments(){
    const root=document.querySelector('[data-pending-payments-list]');
    const count=document.querySelector('[data-pending-results-count]');
    const badge=document.querySelector('[data-pending-payment-count]');
    if(!root)return;
    const q=String(document.querySelector('[data-pending-search]')?.value||'').trim().toLowerCase();
    const items=(Array.isArray(pendingPayments)?pendingPayments:[]).filter(p=>`${p.reference||''} ${p.customer?.firstName||''} ${p.customer?.lastName||''} ${p.customer?.email||''} ${p.customer?.phone||''}`.toLowerCase().includes(q));
    if(count)count.textContent=`${items.length} payment${items.length===1?'':'s'}`;
    if(badge){badge.textContent=String(pendingPayments.length||0);badge.hidden=!pendingPayments.length;}
    root.innerHTML=items.length?items.map((p,index)=>{
      const customerName=[p.customer?.firstName,p.customer?.lastName].filter(Boolean).join(' ')||'Customer';
      const created=p.createdAt?new Date(p.createdAt).toLocaleString('en-GH',{dateStyle:'medium',timeStyle:'short'}):'-';
      const pieces=Number(p.pieces||((p.items||[]).reduce((n,i)=>n+Number(i.totalQuantity||i.quantity||0),0)));
      const itemCount=Array.isArray(p.items)?p.items.length:0;
      return `<article class="pending-payment-card" data-pending-card-index="${index}">
        <div class="pending-payment-main">
          <span class="pending-payment-ref">${escape(p.reference||'Payment reference')}</span>
          <h3>${escape(customerName)}</h3>
          <p>${escape(p.customer?.email||'No email')} ${p.customer?.phone?` · ${escape(p.customer.phone)}`:''}</p>
          <div class="pending-payment-items">${pendingPaymentItemsHtml(p.items)}${itemCount>6?`<span class="pending-payment-chip">+${itemCount-6} more</span>`:''}</div>
        </div>
        <div class="pending-payment-meta">
          <div><span>Total paid</span><strong>${WGH.money(p.total||0)}</strong></div>
          <div><span>Pieces</span><strong>${pieces}</strong></div>
          <div><span>Started</span><strong>${escape(created)}</strong></div>
        </div>
        <div class="pending-payment-action">
          <span class="pending-payment-status">No order number yet</span>
          <button class="button button-dark" type="button" data-confirm-pending="${escape(p.reference||'')}"><i class="fa-solid fa-check"></i> Create official order</button>
        </div>
      </article>`;
    }).join(''):`<div class="pending-payment-empty"><strong>${q?'No matching payments':'Nothing is waiting here'}</strong><p>${q?'Try a different name, email or reference.':'Successful checkouts that still need an official order number will appear here.'}</p></div>`;
    root.querySelectorAll('[data-confirm-pending]').forEach(btn=>btn.onclick=async()=>{
      const reference=btn.dataset.confirmPending;
      if(!reference)return;
      const card=btn.closest('[data-pending-card-index]');
      if(!window.confirm('Create the official order for this payment? The payment will be checked first and the next order number will be assigned automatically.'))return;
      btn.disabled=true;card?.classList.add('is-working');
      try{
        const result=await adminApi('/confirm-pending-payment',{reference});
        if(result?.newlyCreated){WGH.showToast(`Order ${result.order?.orderNumber||''} created. Customer confirmation email triggered.`,'success');}
        else{WGH.showToast(`This payment already has order ${result.order?.orderNumber||''}.`,'success');}
        await loadPendingPayments();
        if(typeof loadOrders==='function'&&location.hash.slice(1)==='orders')await loadOrders();
      }catch(err){
        btn.disabled=false;card?.classList.remove('is-working');WGH.showToast(err);
      }
    });
  }
  document.querySelector('[data-pending-search]')?.addEventListener('input',renderPendingPayments);


  function openOrderDetail(number){
    const o=orders.find(x=>x.orderNumber===number);if(!o)return;
    let panel=document.querySelector('[data-admin-order-panel]');
    if(!panel){panel=document.createElement('aside');panel.className='side-panel admin-order-panel';panel.dataset.adminOrderPanel='';panel.setAttribute('aria-hidden','true');document.body.appendChild(panel)}
    const items=(o.items||[]).map((item,itemIndex)=>{
      const qty=Number(item.totalQuantity||item.quantity||1);
      const unit=Number(item.unitPrice||item.price||0);
      const lineTotal=unit*qty;
      const variants=(item.variants||[]).map((v,i)=>`<div class="order-variant-detail"><span class="variant-number">${i+1}</span><div><small>Quantity</small><strong>${Number(v.quantity||1)}</strong></div><div><small>Colour</small><strong>${escape(v.colour||v.color||'Not specified')}</strong></div><div><small>Size</small><strong>${escape(v.size||'Not specified')}</strong></div></div>`).join('');
      return `<article class="admin-order-product"><header><img src="${escape(item.image||'')}" alt=""><div><span>Item ${itemIndex+1}</span><h3>${escape(item.name||'Product')}</h3><p>${escape(item.mode||item.orderType||'retail')} order · ${qty} total piece${qty===1?'':'s'}</p><div class="admin-order-item-price"><span>Price</span><strong>${WGH.money(unit)}</strong><small>${WGH.money(lineTotal)} total</small></div></div></header><div class="order-variant-list">${variants||'<p class="muted-copy">No colour or size breakdown was saved for this item.</p>'}</div></article>`;
    }).join('');
    const history=(o.statusHistory||[]).slice().reverse().map(h=>`<li><strong>${labels[h.status]||h.status}</strong><small>${h.at?date(h.at):''}${h.by?` · ${escape(h.by)}`:''}</small></li>`).join('');
    const notes=(o.adminNotes||[]).slice().reverse().map(n=>`<div class="internal-note"><p>${escape(n.note)}</p><small>${escape(n.by||'Admin')} · ${n.at?date(n.at):''}</small></div>`).join('');
    panel.innerHTML=`<button class="drawer-close admin-order-close" type="button" data-admin-order-close aria-label="Close order details"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><div class="order-panel-hero"><p class="eyebrow">${escape(o.orderNumber)}</p><h2>${escape(o.customerName||'Customer')}</h2><div class="order-panel-chips"><span>${labels[o.status]||o.status}</span><span>${escape(o.paymentStatus||'paid')}</span></div></div><section class="order-panel-section"><div class="order-panel-section-title"><span>Customer</span><strong>Contact and delivery</strong></div><div class="admin-detail-grid"><div><span>Email</span><strong>${escape(o.customerEmail||'Not provided')}</strong></div><div><span>Phone</span><strong>${escape(o.customerPhone||'Not provided')}</strong></div><div><span>Fulfilment</span><strong>${escape(o.delivery?.fulfilment||'Delivery')}</strong></div><div><span>Destination</span><strong>${escape([o.delivery?.address,o.delivery?.city,o.delivery?.region,o.delivery?.country].filter(Boolean).join(', ')||'Not recorded')}</strong></div></div></section><section class="order-panel-section"><div class="order-panel-section-title"><span>Order</span><strong>What the customer ordered</strong></div><div class="admin-order-items">${items||'<p class="muted-copy">No item details recorded.</p>'}</div></section><section class="order-panel-section"><div class="order-panel-section-title"><span>Payment</span><strong>Financial summary</strong></div><div class="admin-detail-grid"><div><span>Batch</span><strong>${escape(WGH.prettyBatch(o.batchName)||'Unassigned')}</strong></div><div><span>Reference</span><strong class="wrap-reference">${escape(o.paymentReference||'Not recorded')}</strong></div><div><span>Created</span><strong>${date(o.createdAt)} · ${time(o.createdAt)}</strong></div><div><span>Total pieces</span><strong>${Number(o.pieces||0)}</strong></div></div><div class="order-money-breakdown"><span>Subtotal <b>${WGH.money(o.subtotal)}</b></span><span>Processing <b>${WGH.money(o.processingFee)}</b></span><span>Delivery <b>${WGH.money(o.deliveryFee)}</b></span><strong>Total <b>${WGH.money(o.total)}</b></strong></div></section><div class="order-detail-actions"><button class="button button-outline" type="button" data-print-packing><i class="fa-solid fa-print"></i> Print packing slip</button></div><div class="audit-block"><p class="eyebrow">Status history</p><ol>${history||'<li>No changes recorded yet.</li>'}</ol></div><div class="audit-block"><p class="eyebrow">Internal notes</p>${notes||'<p class="muted-copy">No internal notes yet.</p>'}<form class="stack-form" data-order-note-form><label>Add note<textarea name="note" rows="3" required></textarea></label><button class="button button-dark" type="submit">Save internal note</button></form></div>`;
    panel.querySelector('[data-admin-order-close]').onclick=WGH.closeLayers;
    panel.querySelector('[data-print-packing]').onclick=()=>printOrders([o.orderNumber]);
    panel.querySelector('[data-order-note-form]').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),note=new FormData(e.currentTarget).get('note');await WGH.withLoading(btn,async()=>{await adminApi('/order-note',{orderNumber:o.orderNumber,note});await ensureOrders(true);WGH.showToast('Internal note saved.','success');openOrderDetail(o.orderNumber)},'Saving note')};
    WGH.openLayer(panel);
  }

  async function openCustomerDetail(numberOrCustomer){
    const customer=typeof numberOrCustomer==='object'?numberOrCustomer:customers.find((x)=>x.email===numberOrCustomer||x.phone===numberOrCustomer||x.name===numberOrCustomer);
    if(!customer)return;
    let panel=document.querySelector('[data-admin-customer-panel]');
    if(!panel){panel=document.createElement('aside');panel.className='side-panel admin-order-panel';panel.dataset.adminCustomerPanel='';panel.setAttribute('aria-hidden','true');document.body.appendChild(panel)}
    let customerOrders=[];
    try{
      const all=await ensureOrders(false);
      customerOrders=all.filter(o=>{
        const email=String(o.customerEmail||'').trim().toLowerCase();
        const phone=String(o.customerPhone||'').trim();
        return (customer.email&&email===String(customer.email).trim().toLowerCase())||(customer.phone&&phone===String(customer.phone).trim());
      });
    }catch{}
    panel.innerHTML=`<div class="side-panel-head"><div><span class="eyebrow">Customer</span><h2>${escape(customer.name||'Customer')}</h2><p>${escape(customer.email||customer.phone||'')}</p></div><button class="drawer-close" type="button" data-close-customer>×</button></div><div class="customer-detail-summary"><div><span>Orders</span><strong>${customer.orders||0}</strong></div><div><span>Pieces</span><strong>${customer.pieces||0}</strong></div><div><span>Total spend</span><strong>${WGH.money(customer.spent||0)}</strong></div></div><div class="customer-detail-contact"><div><small>Phone</small><strong>${escape(customer.phone||'Not saved')}</strong></div><div><small>Email</small><strong>${escape(customer.email||'Not saved')}</strong></div></div><div class="customer-detail-orders"><div class="admin-card-head"><div><p class="eyebrow">Order history</p><h3>${customerOrders.length} order${customerOrders.length===1?'':'s'}</h3></div></div>${customerOrders.map(o=>`<button type="button" class="customer-order-link" data-order-detail="${escape(o.orderNumber)}"><span><strong>${escape(o.orderNumber)}</strong><small>${dateTime(o.createdAt)} · ${o.pieces||0} pieces</small></span><b>${WGH.money(o.total||0)}</b></button>`).join('')||'<p class="muted-copy">No orders have been placed yet.</p>'}</div>`;
    panel.querySelector('[data-close-customer]')?.addEventListener('click',()=>WGH.closeLayer(panel));
    panel.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=()=>{WGH.closeLayer(panel);openOrderDetail(b.dataset.orderDetail)});
    WGH.openLayer(panel);
  }
  async function loadCustomers(force=false){const btn=document.querySelector('[data-refresh-customers]');await WGH.withLoading(btn,async()=>{customers=await adminApi(force?'/customers?refresh=1':'/customers');renderCustomers()},'Refreshing')}
  function renderCustomers(){document.querySelector('[data-customers-table]').innerHTML=customers.map((c,i)=>`<tr class="admin-click-row" data-customer-index="${i}"><td><strong>${escape(c.name||'Customer')}</strong><small>${escape(c.email)}</small></td><td>${escape(c.phone)}</td><td>${c.orders}</td><td>${c.pieces}</td><td>${WGH.money(c.spent)}</td><td>${date(c.lastOrder)}</td></tr>`).join('')||`<tr><td colspan="6">No customers or registered shoppers yet.</td></tr>`;document.querySelector('[data-customers-mobile]').innerHTML=customers.map((c,i)=>`<article class="admin-mobile-card admin-click-row" data-customer-index="${i}"><div><strong>${escape(c.name||'Customer')}</strong><span>${escape(c.email)}</span></div><p>${c.orders} orders · ${c.pieces} pieces · ${WGH.money(c.spent)}</p></article>`).join('');document.querySelectorAll('[data-customer-index]').forEach(el=>el.onclick=()=>openCustomerDetail(customers[+el.dataset.customerIndex]))}
  const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'-';
  const time=v=>v?new Date(v).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'-';
  const dateTime=v=>v?`${date(v)} · ${time(v)}`:'-';
  const inputDate=v=>{if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10)};
  function exportCsv(b,batchOrders){const lines=[['Batch','Order','Customer','Product','Colour','Size','Quantity']];batchOrders.forEach(o=>(o.items||[]).forEach(item=>(item.variants||[]).forEach(v=>lines.push([b.batchName,o.orderNumber,o.customerName,item.name,v.colour,v.size,v.quantity]))));const csv=lines.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(b.batchName||b.id).replace(/\s+/g,'-').toLowerCase()}-production-sheet.csv`;a.click();URL.revokeObjectURL(url)}

  function printProductionSheet(b,batchOrders){
    const agg=aggregate(batchOrders),pieces=batchOrders.reduce((sum,o)=>sum+Number(o.pieces||0),0),sizeOrder=['XXS','XS','S','M','L','XL','2XL','3XL'];
    const seenSizes=new Set(batchOrders.flatMap(o=>(o.items||[]).flatMap(i=>(i.variants||[]).map(v=>v.size)).filter(Boolean)));
    const sizes=[...sizeOrder.filter(z=>seenSizes.has(z)),...[...seenSizes].filter(z=>!sizeOrder.includes(z))];
    const products=Object.entries(agg).sort((a,b)=>b[1].total-a[1].total);
    const productSections=products.map(([name,p])=>{
      const rows=Object.entries(p.colours).map(([colour,sizeMap])=>{
        const total=Object.values(sizeMap).reduce((sum,n)=>sum+Number(n||0),0);
        return `<tr><td><span class="swatch" style="background:${WGH.colourValue(colour)}"></span><b>${escape(colour)}</b></td>${sizes.map(z=>`<td>${Number(sizeMap[z]||0)||'-'}</td>`).join('')}<td><strong>${total}</strong></td></tr>`;
      }).join('');
      return `<section class="product-sheet"><div class="product-title"><div><small>STYLE</small><h2>${escape(name)}</h2></div><strong>${p.total} PIECES</strong></div><table><thead><tr><th>Colour</th>${sizes.map(z=>`<th>${z}</th>`).join('')}<th>Total</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join('');
    const colourCount=new Set(batchOrders.flatMap(o=>(o.items||[]).flatMap(i=>(i.variants||[]).map(v=>v.colour))).filter(Boolean)).size;
    const win=open('','_blank');
    if(!win)return WGH.showToast('Please allow pop-ups so the production sheet can open.');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(WGH.prettyBatch(b.batchName||b.id))} · Production Sheet</title><style>
      @page{size:A4 landscape;margin:10mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#15130f;background:#fff;font-size:10px}
      .sheet{width:100%}.sheet-head{display:flex;justify-content:space-between;gap:24px;padding-bottom:12px;border-bottom:2px solid #15130f}
      .brand{font-size:17px;font-weight:900;letter-spacing:.08em}.meta{text-align:right}.meta small,.product-title small{display:block;font-size:7px;letter-spacing:.16em;color:#777067;margin-bottom:4px}
      .meta strong{display:block;font-size:17px}.meta span{display:block;margin-top:3px;color:#5e584f}
      .summary{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid #bbb3a8;margin-bottom:14px}
      .summary div{padding:10px 12px 10px 0}.summary span{display:block;font-size:7px;letter-spacing:.12em;color:#777067;text-transform:uppercase;margin-bottom:4px}.summary strong{font-size:15px}
      .product-sheet{break-inside:avoid;margin:0 0 14px}.product-title{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:6px 0;border-bottom:1px solid #15130f}
      .product-title h2{margin:0;font-size:14px}.product-title>strong{font-size:10px;letter-spacing:.08em}
      table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border-bottom:1px solid #ded9d1;padding:6px 5px;text-align:center;vertical-align:middle}
      th{font-size:7px;letter-spacing:.08em;text-transform:uppercase;background:#f5f2ed}th:first-child,td:first-child{text-align:left;width:22%}
      td:first-child{display:flex;align-items:center;gap:6px}.swatch{width:9px;height:9px;border:1px solid #aaa;display:inline-block;flex:0 0 auto}
      .foot{margin-top:18px;padding-top:8px;border-top:1px solid #15130f;display:flex;justify-content:space-between;color:#777067;font-size:7px}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body><main class="sheet">
      <header class="sheet-head"><div><div class="brand">THE WHOLESALE GHANA</div><p>Production sheet · cut, count and prepare by product, colour and size.</p></div><div class="meta"><small>PRODUCTION CYCLE</small><strong>${escape(WGH.prettyBatch(b.batchName||b.id))}</strong><span>${date(b.startDate)} – ${date(b.closeDate)}</span></div></header>
      <section class="summary"><div><span>Orders</span><strong>${batchOrders.length}</strong></div><div><span>Total pieces</span><strong>${pieces}</strong></div><div><span>Styles</span><strong>${products.length}</strong></div><div><span>Colours</span><strong>${colourCount}</strong></div><div><span>Capacity</span><strong>${Number(b.usedCapacity||0)} / ${Number(b.capacity||0)}</strong></div></section>
      ${productSections||'<p>No production quantities recorded.</p>'}
      <footer class="foot"><span>Generated ${new Date().toLocaleString('en-GB')}</span><span>THE WHOLESALE GHANA · INTERNAL PRODUCTION DOCUMENT</span></footer>
    </main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120))<\/script></body></html>`);
    win.document.close();
  }

  let productOverrides=[];
  async function loadProducts(){
    const [productResult,categoryResult]=await Promise.allSettled([adminApi('/products'),adminApi('/categories')]);
    if(productResult.status==='fulfilled'&&Array.isArray(productResult.value)){productOverrides=productResult.value;WGH.products=productOverrides.filter(p=>p.active!==false);}
    if(categoryResult.status==='fulfilled'&&Array.isArray(categoryResult.value)){categories=categoryResult.value;WGH.categories=categories;}
    if(productResult.status==='rejected'&&(!Array.isArray(WGH.products)||!WGH.products.length))throw productResult.reason;
    if(categoryResult.status==='rejected'&&(!Array.isArray(categories)||!categories.length))throw categoryResult.reason;
    hydrateProductCategorySelect();
    const root=document.querySelector('[data-admin-products]');if(!root)return;
    root.innerHTML=WGH.products.map(p=>`<article class="admin-product-card"><div class="admin-product-image"><img src="${escape(p.images?.[0]||'')}" alt=""><span>${p.active===false?'Hidden':'Live'}</span></div><div class="admin-product-card-copy"><div class="admin-product-card-top"><p class="eyebrow">${escape(WGH.categoryName?.(p.category)||p.category||'Collection')}</p><span class="product-live-dot"></span></div><h3>${escape(p.name)}</h3><div class="admin-product-price-row"><strong>${WGH.money(p.retailPrice)}</strong><span>Retail</span><strong>${Number(p.wholesalePrice)>0?WGH.money(p.wholesalePrice):'Not set'}</strong><span>Wholesale</span></div><div class="admin-product-facts"><span><b>${(p.colours||[]).length}</b> colours</span><span><b>${(p.sizes||[]).length}</b> sizes</span><span><b>${p.moq||6}</b> MOQ</span></div><button class="button button-outline full" type="button" data-edit-product="${escape(p.id)}"><i class="fa-regular fa-pen-to-square"></i> Edit product</button></div></article>`).join('')||empty('No products','Add your first product.');
    root.querySelectorAll('[data-edit-product]').forEach(b=>b.addEventListener('click',()=>openProduct(b.dataset.editProduct)));if(typeof hydrateManualProducts==='function')hydrateManualProducts();
  }
  function hydrateProductCategorySelect(){const sel=productForm?.elements?.category;if(!sel)return;const current=sel.value;sel.innerHTML=(categories.length?categories:WGH.categories||[]).map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('');if([...sel.options].some(o=>o.value===current))sel.value=current}

  const modal=document.querySelector('[data-product-modal]'),productForm=document.querySelector('[data-product-form]'),SIZE_OPTIONS=['XXS','XS','S','M','L','XL','2XL','3XL'];
  const manualModal=document.querySelector('[data-manual-order-modal]'),manualForm=document.querySelector('[data-manual-order-form]');
  function hydrateManualProducts(){
    const sel=document.querySelector('[data-manual-product]');
    if(!sel)return;
    const current=sel.value;
    sel.innerHTML=WGH.products.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
    if(current && [...sel.options].some(o=>o.value===current))sel.value=current;
    const sync=()=>{
      const product=WGH.products.find(x=>x.id===sel.value),form=manualForm;
      if(!product||!form)return;
      const colour=form.elements.colour,size=form.elements.size;
      if(colour){
        const wrap=colour.parentElement;
        let replacement=wrap?.querySelector('select[data-manual-colour]');
        if(!replacement){
          replacement=document.createElement('select');
          replacement.name='colour';
          replacement.dataset.manualColour='';
          colour.replaceWith(replacement);
        }
        replacement.innerHTML=(product.colours||[]).map(c=>`<option>${escape(c)}</option>`).join('');
      }
      if(size){size.innerHTML=(product.sizes||[]).map(z=>`<option>${escape(z)}</option>`).join('');}
    };
    sel.onchange=sync;
    sync();
  }
  function renderSizePicker(selected=[]){const root=productForm.querySelector('[data-size-picker]');root.innerHTML=SIZE_OPTIONS.map(size=>`<button type="button" class="size-choice ${selected.includes(size)?'selected':''}" data-size-choice="${size}">${size}</button>`).join('');root.querySelectorAll('[data-size-choice]').forEach(btn=>btn.onclick=()=>{btn.classList.toggle('selected');productForm.elements.sizes.value=[...root.querySelectorAll('.selected')].map(x=>x.dataset.sizeChoice).join(',')});productForm.elements.sizes.value=selected.join(',');renderInventoryEditor()}
  let imageColourAssignments={};
  function productColours(){try{return JSON.parse(productForm.elements.colours.value||'[]')}catch{return []}} function productHexes(){try{return JSON.parse(productForm.elements.colourHexes.value||'{}')}catch{return {}}} function productInventory(){try{return JSON.parse(productForm.elements.inventory.value||'{}')}catch{return {}}}
  function renderInventoryEditor(){const root=productForm.querySelector('[data-inventory-editor]');if(!root)return;const colours=productColours(),sizes=productForm.elements.sizes.value.split(',').filter(Boolean),inv=productInventory();root.innerHTML=colours.map(c=>`<section class="inventory-colour-group"><div><span class="admin-colour-preview" style="--swatch:${productHexes()[c]||WGH.colourValue(c)}"></span><strong>${escape(c)}</strong></div><div class="inventory-size-grid">${sizes.map(z=>`<label><span>${z}</span><input type="number" min="0" placeholder="-" data-inventory-colour="${escape(c)}" data-inventory-size="${escape(z)}" value="${inv?.[c]?.[z]??''}"></label>`).join('')}</div></section>`).join('')||'<p class="muted-copy">Add colours and sizes to build the inventory matrix.</p>';root.querySelectorAll('[data-inventory-colour]').forEach(inp=>inp.oninput=()=>{const data=productInventory(),c=inp.dataset.inventoryColour,z=inp.dataset.inventorySize;data[c]=data[c]||{};if(inp.value==='')delete data[c][z];else data[c][z]=Math.max(0,Number(inp.value));productForm.elements.inventory.value=JSON.stringify(data)})}
  function renderColourEditor(colours=[],hexes=null){const root=productForm.querySelector('[data-colour-editor]');if(!root)return;const oldHexes=hexes||productHexes(),nextHexes={};colours.forEach(c=>nextHexes[c]=oldHexes[c]||WGH.colourValue(c));productForm.elements.colours.value=JSON.stringify(colours);productForm.elements.colourHexes.value=JSON.stringify(nextHexes);root.innerHTML=colours.map((c,i)=>`<div class="admin-colour-row"><input type="color" value="${nextHexes[c]}" data-colour-hex="${i}" aria-label="${escape(c)} swatch"><input value="${escape(c)}" data-colour-name="${i}" aria-label="Colour name"><span class="admin-colour-preview" style="--swatch:${nextHexes[c]}"></span><button type="button" data-remove-colour="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('');root.querySelectorAll('[data-colour-name]').forEach(inp=>inp.onchange=()=>{const a=productColours(),h=productHexes(),old=a[+inp.dataset.colourName],name=inp.value.trim()||old;a[+inp.dataset.colourName]=name;if(old!==name){h[name]=h[old]||WGH.colourValue(name);delete h[old]}renderColourEditor(a,h);renderUploadedImages(productForm.elements.images.value.split(/\n+/).filter(Boolean))});root.querySelectorAll('[data-colour-hex]').forEach(inp=>inp.oninput=()=>{const a=productColours(),h=productHexes(),name=a[+inp.dataset.colourHex];h[name]=inp.value;productForm.elements.colourHexes.value=JSON.stringify(h);inp.closest('.admin-colour-row').querySelector('.admin-colour-preview').style.setProperty('--swatch',inp.value);renderInventoryEditor()});root.querySelectorAll('[data-remove-colour]').forEach(btn=>btn.onclick=()=>{const a=productColours(),h=productHexes(),removed=a.splice(+btn.dataset.removeColour,1)[0];delete h[removed];renderColourEditor(a,h);renderUploadedImages(productForm.elements.images.value.split(/\n+/).filter(Boolean))});const featured=productForm.querySelector('[data-featured-colour]');if(featured){const current=featured.dataset.current||featured.value;featured.innerHTML='<option value="">Use first colour listed</option>'+colours.map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('');featured.value=colours.includes(current)?current:'';featured.onchange=()=>featured.dataset.current=featured.value}renderInventoryEditor()} productForm.querySelector('[data-add-colour]')?.addEventListener('click',()=>{const a=productColours();a.push(`Colour ${a.length+1}`);renderColourEditor(a)})
  function renderUploadedImages(urls=[]){productForm.elements.images.value=urls.join('\n');const colours=productColours();const root=productForm.querySelector('[data-uploaded-images]');root.innerHTML=urls.map((url,i)=>`<figure><img src="${escape(url)}" alt=""><button type="button" data-remove-upload="${i}" aria-label="Remove image"><i class="fa-solid fa-xmark"></i></button>${i===0?'<span>Main</span>':''}<select data-image-colour="${i}" aria-label="Assign image to colour"><option value="">All colours</option>${colours.map(c=>`<option value="${escape(c)}" ${imageColourAssignments[url]===c?'selected':''}>${escape(c)}</option>`).join('')}</select></figure>`).join('');root.querySelectorAll('[data-remove-upload]').forEach(btn=>btn.onclick=()=>{const list=productForm.elements.images.value.split(/\n+/).filter(Boolean),removed=list[Number(btn.dataset.removeUpload)];delete imageColourAssignments[removed];list.splice(Number(btn.dataset.removeUpload),1);renderUploadedImages(list)});root.querySelectorAll('[data-image-colour]').forEach(sel=>sel.onchange=()=>{const list=productForm.elements.images.value.split(/\n+/).filter(Boolean),url=list[Number(sel.dataset.imageColour)];if(sel.value)imageColourAssignments[url]=sel.value;else delete imageColourAssignments[url]})}
  
  async function uploadCloudinary(files){const valid=[...files].filter(f=>f&&/^image\//.test(f.type));if(!valid.length)return;const drop=productForm.querySelector('[data-cloudinary-drop]');drop.classList.add('uploading');try{const signed=await adminApi('/cloudinary-signature',{});const existing=productForm.elements.images.value.split(/\n+/).filter(Boolean);for(const file of valid){const fd=new FormData();fd.append('file',file);fd.append('api_key',signed.apiKey);fd.append('timestamp',signed.timestamp);fd.append('folder',signed.folder);fd.append('signature',signed.signature);const r=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,{method:'POST',body:fd});const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'Cloudinary upload failed.');existing.push(data.secure_url);renderUploadedImages(existing)}WGH.showToast('Image uploaded.','success')}finally{drop.classList.remove('uploading')}}
  function bindUploader(){const drop=productForm.querySelector('[data-cloudinary-drop]'),file=productForm.querySelector('[data-cloudinary-file]');productForm.querySelector('[data-cloudinary-choose]').onclick=()=>file.click();file.onchange=()=>uploadCloudinary(file.files);['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragover')}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragover')}));drop.addEventListener('drop',e=>uploadCloudinary(e.dataTransfer.files));document.addEventListener('paste',e=>{if(!modal.hidden){const files=[...e.clipboardData.items].filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);if(files.length)uploadCloudinary(files)}})}
  function openProduct(id=''){const defaultCat=categories[0]?.id||'tops';const p=WGH.products.find(x=>x.id===id)||{id:'',name:'',category:defaultCat,retailPrice:'',wholesalePrice:'',wholesaleAvailable:true,moq:6,colours:[],sizes:['XS','S','M','L','XL'],images:[],description:'',details:''};hydrateProductCategorySelect();modal.hidden=false;document.body.classList.add('no-scroll');productForm.elements.id.value=p.id;productForm.elements.name.value=p.name;productForm.elements.category.value=p.category||defaultCat;productForm.elements.retailPrice.value=p.retailPrice||'';productForm.elements.wholesalePrice.value=p.wholesalePrice||'';if(productForm.elements.wholesaleAvailable)productForm.elements.wholesaleAvailable.checked=p.wholesaleAvailable!==false;productForm.elements.moq.value=p.moq||6;if(productForm.elements.available)productForm.elements.available.checked=p.available!==false;productForm.elements.inventory.value=JSON.stringify(p.inventory||{});productForm.elements.colourHexes.value=JSON.stringify(p.colourHexes||{});const featured=productForm.querySelector('[data-featured-colour]');if(featured){featured.dataset.current=p.featuredColour||'';featured.value=p.featuredColour||''}renderColourEditor(p.colours||[],p.colourHexes||{});productForm.elements.description.value=p.description||'';productForm.elements.details.value=p.details||'';imageColourAssignments={};Object.entries(p.colourImages||{}).forEach(([c,urls])=>(urls||[]).forEach(url=>imageColourAssignments[url]=c));renderSizePicker(p.sizes||[]);renderUploadedImages(p.images||[]);document.querySelector('[data-product-editor-title]').textContent=id?'Edit product':'Add product';document.querySelector('[data-delete-product]').hidden=!id}
  function closeProduct(){modal.hidden=true;document.body.classList.remove('no-scroll')}
  document.querySelector('[data-add-product]')?.addEventListener('click',async()=>{if(!categories.length){categories=await adminApi('/categories');WGH.categories=categories}openProduct()});document.querySelectorAll('[data-close-product]').forEach(b=>b.addEventListener('click',closeProduct));bindUploader();
  productForm?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]'),d=Object.fromEntries(new FormData(e.currentTarget)),id=d.id||d.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');await WGH.withLoading(btn,async()=>{await adminApi('/product-save',{...d,id,retailPrice:Number(d.retailPrice),wholesalePrice:d.wholesalePrice===''?null:Number(d.wholesalePrice),moq:Number(d.moq),colours:productColours().map(x=>String(x).trim()).filter(Boolean),colourHexes:productHexes(),featuredColour:productForm.querySelector('[data-featured-colour]')?.value||'',inventory:productInventory(),sizes:d.sizes.split(',').map(x=>x.trim()).filter(Boolean),images:d.images.split(/\n+/).map(x=>x.trim()).filter(Boolean),colourImages:Object.entries(imageColourAssignments).reduce((m,[url,c])=>{(m[c]||(m[c]=[])).push(url);return m},{}),available:!!productForm.elements.available?.checked,wholesaleAvailable:!!productForm.elements.wholesaleAvailable?.checked,active:true});WGH.showToast('Product saved.','success');closeProduct();await loadProducts()},'Saving product')});
  document.querySelector('[data-delete-product]')?.addEventListener('click',async e=>{const id=productForm.elements.id.value;if(!id)return;await WGH.withLoading(e.currentTarget,async()=>{await adminApi('/product-delete',{id});WGH.showToast('Product removed from storefront.','success');closeProduct();await loadProducts()},'Removing')});

  let discountProducts=[];
  let discountDisplay={showBanner:false,showModal:false};
  let discountStudioBound=false;
  const discountBadgeOptions=['Big sale','Selling quickly','Limited time','Last call','Price drop'];
  const discountMoney=v=>Number.isFinite(Number(v))&&Number(v)>0?WGH.money(Number(v)):'—';
  const discountEscape=value=>escape(value);
  function discountSideValues(product,mode){
    const side=mode==='wholesale'?product.discount?.wholesale:product.discount?.retail;
    const base=mode==='wholesale'?Number(product.baseWholesalePrice||product.wholesalePrice||0):Number(product.baseRetailPrice||product.retailPrice||0);
    return {active:side?.active===true,oldPrice:Number(side?.oldPrice||base||0),newPrice:Number(side?.newPrice||0)};
  }
  function discountSelect(value=''){
    return `<option value="">No badge</option>${discountBadgeOptions.map(x=>`<option value="${discountEscape(x)}" ${x===value?'selected':''}>${discountEscape(x)}</option>`).join('')}`;
  }
  function selectedDiscountProducts(){
    return [...document.querySelectorAll('[data-discount-select]:checked')].map(x=>x.dataset.discountSelect).filter(Boolean);
  }
  function updateDiscountSelectionCount(){
    const count=selectedDiscountProducts().length;
    const out=document.querySelector('[data-discount-selection-count]');
    const panel=document.querySelector('[data-discount-bulk-panel]');
    if(out)out.textContent=String(count);
    if(panel)panel.hidden=count===0;
  }
  function renderDiscountCategoryFilter(){
    const select=document.querySelector('[data-discount-category-filter]');
    if(!select)return;
    const current=select.value||'all';
    select.innerHTML='<option value="all">All categories</option>'+WGH.categories.map(c=>`<option value="${discountEscape(c.id)}">${discountEscape(c.name)}</option>`).join('');
    select.value=[...select.options].some(o=>o.value===current)?current:'all';
  }
  function renderDiscountStudio(){
    const root=document.querySelector('[data-discount-products]');
    if(!root)return;
    renderDiscountCategoryFilter();
    const showBanner=document.querySelector('[data-discount-show-banner]');
    const showModal=document.querySelector('[data-discount-show-modal]');
    if(showBanner)showBanner.checked=discountDisplay.showBanner===true;
    if(showModal)showModal.checked=discountDisplay.showModal===true;
    const q=(document.querySelector('[data-discount-search]')?.value||'').trim().toLowerCase();
    const category=document.querySelector('[data-discount-category-filter]')?.value||'all';
    const list=discountProducts.filter(p=>{
      const hay=`${p.name||''} ${p.category||''} ${(p.colours||[]).join(' ')}`.toLowerCase();
      return (!q||hay.includes(q))&&(category==='all'||p.category===category);
    });
    root.innerHTML=list.map(p=>{
      const retail=discountSideValues(p,'retail');
      const wholesale=discountSideValues(p,'wholesale');
      const wholesaleReady=p.wholesaleAvailable!==false&&Number(p.baseWholesalePrice||p.wholesalePrice)>0;
      const badge=p.discount?.badge||'';
      const saleOn=retail.active||wholesale.active;
      return `<article class="discount-product-card ${saleOn?'has-sale':''}" data-discount-product="${discountEscape(p.id)}">
        <label class="discount-product-check"><input type="checkbox" data-discount-select="${discountEscape(p.id)}"><span>Select</span></label>
        <div class="discount-product-image"><img src="${discountEscape(p.image||'')}" alt="${discountEscape(p.name)}" loading="lazy">${saleOn?'<span class="discount-product-status">On sale</span>':''}</div>
        <div class="discount-product-body">
          <div class="discount-product-title"><div><span>${discountEscape(WGH.categoryName?.(p.category)||p.category||'Product')}</span><h3>${discountEscape(p.name)}</h3></div><strong>${discountMoney(p.retailPrice)}</strong></div>
          <div class="discount-admin-lane ${retail.active?'is-on':''}" data-discount-lane="retail">
            <div class="discount-admin-lane-head"><label><input type="checkbox" data-discount-active="retail" ${retail.active?'checked':''}><span>Retail sale</span></label><small>${retail.active?`${retail.oldPrice>retail.newPrice?Math.round((1-retail.newPrice/retail.oldPrice)*100):0}% off`:'Off'}</small></div>
            <div class="discount-admin-prices"><label>Old price<input min="0" step="0.01" inputmode="decimal" data-discount-old="retail" value="${retail.oldPrice||''}" type="number"></label><span>→</span><label>New price<input min="0" step="0.01" inputmode="decimal" data-discount-new="retail" value="${retail.newPrice||''}" type="number"></label></div>
          </div>
          <div class="discount-admin-lane ${wholesaleReady&&wholesale.active?'is-on':''} ${wholesaleReady?'':'is-off'}" data-discount-lane="wholesale">
            <div class="discount-admin-lane-head"><label><input type="checkbox" data-discount-active="wholesale" ${wholesaleReady&&wholesale.active?'checked':''} ${wholesaleReady?'':'disabled'}><span>Wholesale sale</span></label><small>${wholesaleReady?(wholesale.active?`${wholesale.oldPrice>wholesale.newPrice?Math.round((1-wholesale.newPrice/wholesale.oldPrice)*100):0}% off`:'Available'):'Not available'}</small></div>
            <div class="discount-admin-prices"><label>Old price<input min="0" step="0.01" inputmode="decimal" data-discount-old="wholesale" value="${wholesale.oldPrice||''}" type="number" ${wholesaleReady?'':'disabled'}></label><span>→</span><label>New price<input min="0" step="0.01" inputmode="decimal" data-discount-new="wholesale" value="${wholesale.newPrice||''}" type="number" ${wholesaleReady?'':'disabled'}></label></div>
          </div>
          <div class="discount-product-actions">
            <label>Badge<select data-discount-badge>${discountSelect(badge)}</select></label>
            <button class="button button-dark" type="button" data-discount-save="${discountEscape(p.id)}">Save</button>
          </div>
        </div>
      </article>`;
    }).join('')||'<div class="admin-empty"><span>0</span><h3>No products found</h3><p>Try another product name or category.</p></div>';
    root.querySelectorAll('[data-discount-active]').forEach(input=>input.addEventListener('change',()=>{const lane=input.closest('[data-discount-lane]');lane?.classList.toggle('is-on',input.checked);lane?.classList.toggle('is-off',!input.checked||input.disabled)}));
    root.querySelectorAll('[data-discount-select]').forEach(input=>input.addEventListener('change',updateDiscountSelectionCount));
    root.querySelectorAll('[data-discount-save]').forEach(btn=>btn.addEventListener('click',()=>saveDiscountProduct(btn.dataset.discountSave,btn)));
    updateDiscountSelectionCount();
  }
  function readDiscountCard(id){
    const card=document.querySelector(`[data-discount-product="${CSS.escape(id)}"]`);
    if(!card)return null;
    const lane=mode=>({active:!!card.querySelector(`[data-discount-active="${mode}"]`)?.checked,oldPrice:Number(card.querySelector(`[data-discount-old="${mode}"]`)?.value||0),newPrice:Number(card.querySelector(`[data-discount-new="${mode}"]`)?.value||0)});
    const retail=lane('retail'),wholesale=lane('wholesale');
    return {productId:id,retail,wholesale,badge:card.querySelector('[data-discount-badge]')?.value||'',active:retail.active||wholesale.active};
  }
  async function saveDiscountProduct(id,button){
    const data=readDiscountCard(id);
    if(!data)return;
    await WGH.withLoading(button,async()=>{await adminApi('/discount-save',data);WGH.showToast('Discount saved.','success');await loadDiscounts()},'Saving');
  }
  async function saveDiscountDisplay(button){
    const payload={showBanner:!!document.querySelector('[data-discount-show-banner]')?.checked,showModal:!!document.querySelector('[data-discount-show-modal]')?.checked};
    await WGH.withLoading(button,async()=>{
      const saved=await adminApi('/discount-settings-save',payload);
      discountDisplay={showBanner:saved.showBanner===true,showModal:saved.showModal===true};
      renderDiscountStudio();
      WGH.showToast('Sale message updated.','success');
    },'Saving');
  }
  async function loadDiscounts(){
    const [result,categoryResult]=await Promise.all([adminApi(`/discounts?ts=${Date.now()}`),adminApi('/categories')]);
    discountProducts=Array.isArray(result.products)?result.products:[];
    if(Array.isArray(categoryResult))categories=categoryResult.filter(x=>x.active!==false),WGH.categories=categories;
    discountDisplay=result.display||{showBanner:result.campaign?.showBanner===true,showModal:result.campaign?.showModal===true};
    renderDiscountStudio();
    if(discountStudioBound)return;
    discountStudioBound=true;
    document.querySelector('[data-discount-display-save]')?.addEventListener('click',e=>saveDiscountDisplay(e.currentTarget));
    document.querySelector('[data-discount-show-banner]')?.addEventListener('change',()=>saveDiscountDisplay(document.querySelector('[data-discount-display-save]')));
    document.querySelector('[data-discount-show-modal]')?.addEventListener('change',()=>saveDiscountDisplay(document.querySelector('[data-discount-display-save]')));
    document.querySelector('[data-discount-search]')?.addEventListener('input',renderDiscountStudio);
    document.querySelector('[data-discount-category-filter]')?.addEventListener('change',renderDiscountStudio);
    document.querySelector('[data-discount-select-all]')?.addEventListener('click',()=>{
      const boxes=[...document.querySelectorAll('[data-discount-select]')];
      if(!boxes.length)return;
      const all=boxes.every(x=>x.checked);
      boxes.forEach(x=>x.checked=!all);
      const btn=document.querySelector('[data-discount-select-all]');
      if(btn)btn.textContent=all?'Select all shown':'Clear shown';
      updateDiscountSelectionCount();
    });
    document.querySelector('[data-discount-clear-selection]')?.addEventListener('click',()=>{document.querySelectorAll('[data-discount-select]').forEach(x=>x.checked=false);const btn=document.querySelector('[data-discount-select-all]');if(btn)btn.textContent='Select all shown';updateDiscountSelectionCount()});
    document.querySelector('[data-discount-bulk-apply]')?.addEventListener('click',async e=>{
      const ids=selectedDiscountProducts();
      if(!ids.length)return WGH.showToast('Select at least one product first.');
      const mode=document.querySelector('[data-discount-bulk-mode]')?.value||'retail';
      const oldPrice=Number(document.querySelector('[data-discount-bulk-old]')?.value||0);
      const newPrice=Number(document.querySelector('[data-discount-bulk-new]')?.value||0);
      if(!(oldPrice>0&&newPrice>0&&newPrice<oldPrice))return WGH.showToast('New price must be lower than old price.');
      const badge=document.querySelector('[data-discount-bulk-badge]')?.value||'';
      const products=ids.map(id=>{
        const p=discountProducts.find(x=>x.id===id);
        const r=discountSideValues(p,'retail'),w=discountSideValues(p,'wholesale');
        if(mode==='retail')r.active=true,r.oldPrice=oldPrice,r.newPrice=newPrice;
        else if(p?.wholesaleAvailable!==false&&Number(p.baseWholesalePrice||p.wholesalePrice)>0)w.active=true,w.oldPrice=oldPrice,w.newPrice=newPrice;
        return {productId:id,retail:r,wholesale:w,active:r.active||w.active,badge};
      });
      await WGH.withLoading(e.currentTarget,async()=>{await adminApi('/discount-bulk-save',{products});WGH.showToast(`Discount added to ${ids.length} product${ids.length===1?'':'s'}.`,'success');await loadDiscounts()},'Saving');
    });
  }

  document.querySelector('[data-refresh-overview]')?.addEventListener('click',e=>runViewLoader('overview',()=>WGH.withLoading(e.currentTarget,()=>loadOverview(true),'Refreshing'),'Refreshing'));document.querySelector('[data-refresh-batches]')?.addEventListener('click',e=>runViewLoader('batches',()=>loadBatches(true),'Refreshing'));document.querySelector('[data-refresh-orders]')?.addEventListener('click',e=>runViewLoader('orders',()=>loadOrders(true),'Refreshing'));document.querySelector('[data-refresh-products]')?.addEventListener('click',e=>runViewLoader('products',()=>WGH.withLoading(e.currentTarget,loadProducts,'Refreshing'),'Refreshing'));document.querySelector('[data-refresh-discounts]')?.addEventListener('click',e=>runViewLoader('discounts',()=>WGH.withLoading(e.currentTarget,loadDiscounts,'Refreshing'),'Refreshing'));document.querySelector('[data-refresh-categories]')?.addEventListener('click',e=>runViewLoader('categories',()=>WGH.withLoading(e.currentTarget,loadCategoriesAdmin,'Refreshing'),'Refreshing'));document.querySelector('[data-refresh-customers]')?.addEventListener('click',e=>runViewLoader('customers',()=>loadCustomers(true),'Refreshing'));
  async function loadAnalytics(force=false){await ensureOrders(force);const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0),pieces=orders.reduce((s,o)=>s+Number(o.pieces||0),0),avg=orders.length?revenue/orders.length:0;const metrics=document.querySelector('[data-analytics-metrics]');if(metrics)metrics.innerHTML=[['Revenue',WGH.money(revenue)],['Average order',WGH.money(avg)],['Pieces',pieces],['Orders',orders.length]].map(([l,v],i)=>`<article class="admin-metric"><span>${i+1}</span><p>${l}</p><strong>${v}</strong></article>`).join('');const counts=Object.fromEntries(statuses.map(x=>[x,0]));orders.forEach(o=>counts[o.status]=(counts[o.status]||0)+1);const max=Math.max(1,...Object.values(counts));const bars=document.querySelector('[data-status-bars]');if(bars)bars.innerHTML=Object.entries(counts).filter(([,n])=>n).map(([k,n])=>`<div><span>${labels[k]||k}</span><i><b style="width:${n/max*100}%"></b></i><strong>${n}</strong></div>`).join('')||empty('No order data yet','Analytics will appear after the first order.');}
  async function notificationGo(n){
    const target=n?.target||'overview';
    showView(target);
    if(target==='orders' && n?.orderNumber){
      await ensureOrders(false);
      setTimeout(()=>openOrderDetail(n.orderNumber),80);
    }
  }
  async function deleteNotification(id, button){
    if(!id)return;
    const run=async()=>{await adminApi('/notification-delete',{id});notifications=notifications.filter(n=>n.id!==id);await loadNotificationPreview();if(document.querySelector('[data-view-panel="alerts"]')?.classList.contains('active'))await loadAlerts();};
    if(button) return WGH.withLoading(button,run,'Deleting');
    return run();
  }
  async function clearAllNotifications(button){
    if(!confirm('Permanently delete all saved notifications?'))return;
    const run=async()=>{await adminApi('/notifications-clear',{});notifications=[];await loadNotificationPreview();if(document.querySelector('[data-view-panel="alerts"]')?.classList.contains('active'))await loadAlerts();WGH.showToast('All notifications permanently deleted.','success')};
    if(button)return WGH.withLoading(button,run,'Clearing');
    return run();
  }
  async function loadAlerts(force=false){
    try{await ensureNotifications(force)}catch(e){notifications=[];console.warn('Could not load saved notifications',e)}
    const operational=[];
    const activeCount=Number(operationalSummary.activeOrders||0);
    if(activeCount)operational.push({id:'live-orders',live:true,title:`${activeCount} active order${activeCount===1?'':'s'}`,message:'Open Orders to review current customer orders.',target:'orders',icon:'fa-bag-shopping'});
    const openCount=Number(operationalSummary.openBatches||0);
    if(openCount)operational.push({id:'live-batches',live:true,title:`${openCount} open production batch${openCount===1?'':'es'}`,message:'Open Production batches to review capacity and production.',target:'batches',icon:'fa-layer-group'});
    const all=[...notifications.map(n=>({...n,icon:n.type==='order'?'fa-bag-shopping':'fa-bell'})),...operational];
    const el=document.querySelector('[data-admin-alerts]');
    if(el)el.innerHTML=all.length?`<div class="notification-feed-head"><div><strong>${notifications.filter(n=>!n.read).length} unread</strong><span>Saved notifications and live operational alerts</span></div>${notifications.length?'<button class="button button-outline" type="button" data-clear-notifications>Clear all</button>':''}</div>${all.map(n=>`<article class="admin-notification-row ${n.read?'read':''}" data-notification-row><button class="admin-notification-main" type="button" data-notification-open data-notification-id="${escape(n.id||'')}" data-notification-target="${escape(n.target||'overview')}" data-notification-order="${escape(n.orderNumber||'')}"><i class="fa-solid ${n.icon||'fa-bell'}"></i><div><strong>${escape(n.title)}</strong><p>${escape(n.message||n.copy||'')}</p></div><span>${n.live?'Live':date(n.createdAt)}</span></button>${n.live?'':`<button class="notification-delete" type="button" data-notification-delete="${escape(n.id||'')}" aria-label="Delete notification"><i class="fa-solid fa-xmark"></i></button>`}</article>`).join('')}`:empty('Nothing needs attention','New paid orders and production alerts will appear here.');
    el?.querySelector('[data-clear-notifications]')?.addEventListener('click',e=>clearAllNotifications(e.currentTarget));
    el?.querySelectorAll('[data-notification-delete]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteNotification(b.dataset.notificationDelete,b)});
    el?.querySelectorAll('[data-notification-open]').forEach(b=>b.onclick=async()=>{const n={id:b.dataset.notificationId,target:b.dataset.notificationTarget,orderNumber:b.dataset.notificationOrder};if(n.id&&!n.id.startsWith('live-'))await adminApi('/notification-read',{id:n.id});await notificationGo(n)});
  }

  async function loadTransactions(force=false){
    const root=document.querySelector('[data-transactions-table]'),metrics=document.querySelector('[data-transaction-metrics]');
    if(root)root.innerHTML='<tr><td colspan="6"><div class="admin-inline-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading transactions...</div></td></tr>';
    try{
      const tx=await ensureOrders(force);
      const paid=tx.filter(o=>String(o.paymentStatus||'').toLowerCase()==='paid'),manual=tx.filter(o=>String(o.paymentStatus||'').toLowerCase()==='manual'),value=tx.reduce((s,o)=>s+Number(o.total||0),0);
      if(metrics)metrics.innerHTML=[['Recorded payments',tx.length],['Paid online',paid.length],['Manual orders',manual.length],['Payment value',WGH.money(value)]].map(([l,v])=>`<article class="admin-metric"><p>${l}</p><strong>${v}</strong></article>`).join('');
      if(root)root.innerHTML=tx.map(o=>`<tr class="admin-click-row" data-order-detail="${escape(o.orderNumber)}"><td><strong>${escape(o.orderNumber)}</strong><small>${date(o.createdAt)} · ${time(o.createdAt)}</small></td><td><strong>${escape(o.customerName||'Customer')}</strong><small>${escape(o.customerEmail||'')}</small></td><td><code class="transaction-ref">${escape(o.paymentReference||'Not recorded')}</code></td><td><span class="status-pill ${String(o.paymentStatus).toLowerCase()==='paid'?'':'warning'}">${escape(o.paymentStatus||'Recorded')}</span></td><td><strong>${WGH.money(o.total)}</strong></td><td>${dateTime(o.createdAt)}</td></tr>`).join('')||'<tr><td colspan="6"><div class="admin-empty-row"><strong>No transactions found.</strong><span>If an order exists in Orders, press Refresh. All recorded orders are included.</span></div></td></tr>';
      tx.forEach(o=>{if(!orders.some(x=>x.orderNumber===o.orderNumber))orders.push(o)});
      root?.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.orderDetail));
    }catch(err){if(root)root.innerHTML=`<tr><td colspan="6"><div class="admin-empty-row error"><strong>Transactions could not load.</strong><span>${escape(WGH.friendlyError(err))}</span></div></td></tr>`;throw err}
  }

  async function loadReviews(){const root=document.querySelector('[data-reviews-list]');try{const data=await adminApi('/reviews');root.innerHTML=data.length?data.map(x=>`<article class="admin-notification"><i class="fa-solid fa-star"></i><div><strong>${escape(x.name||x.email||'Customer review')}</strong><p>${escape(x.review||x.message||'')}</p></div><span>${escape(x.rating||'')}</span></article>`).join(''):empty('No reviews yet','Approved customer reviews will appear here.')}catch(e){root.innerHTML=empty('Reviews unavailable',WGH.friendlyError(e))}}
  async function loadAbandoned(){const root=document.querySelector('[data-abandoned-list]');try{const data=await adminApi('/abandoned');const active=data.filter(x=>!x.dismissed);root.innerHTML=active.length?active.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).map(x=>`<article class="abandoned-cart-card ${x.recovered?'recovered':''}"><div class="abandoned-cart-head"><div><span>${x.recovered?'Recovered':'Needs follow-up'}</span><strong>${escape(x.name||x.email||x.phone||'Checkout visitor')}</strong><small>${escape(x.email||'')} ${x.phone?`· ${escape(x.phone)}`:''}${x.userId&&!x.email?' · Registered account':''}</small></div><b>${WGH.money(x.value||0)}</b></div><div class="abandoned-items">${(x.items||[]).slice(0,4).map(i=>`<span>${escape(i.name)} <b>×${Number(i.totalQuantity||1)}</b></span>`).join('')}</div><footer><span>${Number(x.pieces||0)} pieces · ${date(x.updatedAt||x.createdAt)}</span><div>${x.phone&&!x.recovered?`<a class="button button-outline" target="_blank" rel="noopener" href="https://wa.me/${String(x.phone).replace(/\D/g,'').replace(/^0/,'233')}?text=${encodeURIComponent(`Hi ${x.name||''}, you left some pieces in your cart at The Wholesale Ghana. If you need help completing your order, I’m happy to assist.`)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}${(x.email||x.userId)&&!x.recovered?`<button class="button button-dark" type="button" data-email-cart="${escape(x.id)}"><i class="fa-regular fa-envelope"></i> Email</button>`:''}<button class="button button-outline" type="button" data-dismiss-cart="${escape(x.id)}">Dismiss</button></div></footer></article>`).join(''):empty('No carts need follow-up','Checkout carts will appear here after a shopper enters contact details and leaves without paying.');root.querySelectorAll('[data-dismiss-cart]').forEach(b=>b.onclick=async()=>{await WGH.withLoading(b,async()=>{await adminApi('/abandoned-action',{id:b.dataset.dismissCart,action:'dismiss'});await loadAbandoned()},'Dismissing')});root.querySelectorAll('[data-email-cart]').forEach(b=>b.onclick=async()=>{await WGH.withLoading(b,async()=>{const result=await adminApi('/abandoned-email',{id:b.dataset.emailCart});WGH.showToast(`Recovery email sent to ${result.email}.`,'success');await loadAbandoned()},'Sending')})}catch(e){root.innerHTML=empty('Abandoned carts unavailable',WGH.friendlyError(e))}}
  async function loadMessages(){const root=document.querySelector('[data-messages-list]');try{const data=await adminApi('/messages');root.innerHTML=data.length?data.map(x=>`<article class="admin-notification"><i class="fa-solid fa-comment"></i><div><strong>${escape(x.name||x.email||'Message')}</strong><p>${escape(x.message||'')}</p></div><span>${date(x.createdAt)}</span></article>`).join(''):empty('Inbox is clear','New connected-form messages will appear here.')}catch(e){root.innerHTML=empty('Inbox is clear','No messages are available yet.')}}
  async function loadActivity(force=false){await ensureOrders(force);if(!batches.length){try{await ensureBatches(force)}catch{}}const items=[];orders.forEach(o=>(o.statusHistory||[]).forEach(h=>items.push({at:h.at,title:`${o.orderNumber} · ${labels[h.status]||h.status}`,copy:h.by?`Changed by ${h.by}`:'Order status updated'})));orders.forEach(o=>(o.adminNotes||[]).forEach(n=>items.push({at:n.at,title:`${o.orderNumber} · Internal note`,copy:`${n.by||'Admin'}: ${n.note}`})));batches.forEach(b=>(b.deliveryWindowHistory||[]).forEach(h=>items.push({at:h.at,title:`${WGH.prettyBatch(b.batchName||b.id)} · Delivery window changed`,copy:`${h.by||'Admin'} changed ${h.previous||'the previous estimate'} to ${h.current||'the new estimate'}`})));items.sort((a,b)=>String(b.at).localeCompare(String(a.at)));const root=document.querySelector('[data-activity-list]');if(root)root.innerHTML=items.length?items.slice(0,200).map(x=>`<article class="admin-notification"><i class="fa-solid fa-clock-rotate-left"></i><div><strong>${escape(x.title)}</strong><p>${escape(x.copy)}</p></div><span>${dateTime(x.at)}</span></article>`).join(''):empty('No activity yet','Status changes and admin notes will create an audit trail here.')}

  async function loadSettings(){const settings=await adminApi('/settings');const f=document.querySelector('[data-store-settings-form]');if(f){['businessName','businessEmail','whatsapp','instagram','batchCapacity','defaultMoq','pickupAddress'].forEach(k=>{if(f.elements[k])f.elements[k].value=settings[k]??(k==='batchCapacity'?150:k==='defaultMoq'?6:'')})}}
  document.querySelector('[data-refresh-transactions]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadTransactions(true),'Refreshing'));
document.querySelector('[data-refresh-international]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadInternational(true),'Refreshing'));
document.querySelector('[data-refresh-wholesale]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadWholesale(true),'Refreshing'));
document.querySelector('[data-refresh-reviews]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,loadReviews,'Refreshing'));
document.querySelector('[data-refresh-abandoned]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,loadAbandoned,'Refreshing'));
document.querySelector('[data-refresh-subscribers]')?.addEventListener('click',e=>{const loader=getViewLoader('subscribers');if(loader)return WGH.withLoading(e.currentTarget,loader,'Refreshing');});
document.querySelector('[data-refresh-messages]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,loadMessages,'Refreshing'));
document.querySelector('[data-refresh-activity]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadActivity(true),'Refreshing'));
document.querySelector('[data-refresh-analytics]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadAnalytics(true),'Refreshing'));
document.querySelector('[data-refresh-alerts]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,()=>loadAlerts(true),'Refreshing'));
document.querySelector('[data-refresh-settings]')?.addEventListener('click',e=>WGH.withLoading(e.currentTarget,loadSettings,'Refreshing'));

  document.querySelector('[data-store-settings-form]')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');await WGH.withLoading(btn,async()=>{await adminApi('/settings-save',Object.fromEntries(new FormData(e.currentTarget)));WGH.showToast('Store settings saved.','success')},'Saving settings')});
  document.querySelector('[data-admin-password-form]')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),password=String(new FormData(e.currentTarget).get('password')||'');await WGH.withLoading(btn,async()=>{await adminAuth.currentUser.updatePassword(password);e.currentTarget.reset();WGH.showToast('Admin password changed.','success')},'Updating password')});
  const adminEmailEl=document.querySelector('[data-admin-current-email]');window.addEventListener('wgh:auth',()=>{if(adminEmailEl)adminEmailEl.textContent=adminAuth?.currentUser?.email||''});
  let pendingAdminEmail='';document.querySelector('[data-admin-email-form]')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),email=String(new FormData(e.currentTarget).get('email')||'').trim(),msg=document.querySelector('[data-admin-security-message]');await WGH.withLoading(btn,async()=>{try{await adminRequest('/account/begin-email-change',{email},false);pendingAdminEmail=email;document.querySelector('[data-admin-email-code-form]').hidden=false;msg.textContent=`Verification code sent to ${email}.`}catch(err){msg.textContent=WGH.friendlyError(err)}},'Sending code')});
  document.querySelector('[data-admin-email-code-form]')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),code=String(new FormData(e.currentTarget).get('code')||''),msg=document.querySelector('[data-admin-security-message]');await WGH.withLoading(btn,async()=>{try{await adminRequest('/account/complete-email-change',{email:pendingAdminEmail,code},false);await adminAuth.currentUser.getIdToken(true);await adminAuth.currentUser.reload().catch(()=>{});if(adminEmailEl)adminEmailEl.textContent=pendingAdminEmail;msg.textContent='Admin email changed and verified.';e.currentTarget.hidden=true;WGH.showToast('Admin sign-in email updated.','success')}catch(err){msg.textContent=WGH.friendlyError(err)}},'Verifying')});

  function selectedOrderNumbers(){return [...document.querySelectorAll('[data-order-select]:checked')].map(x=>x.dataset.orderSelect)}
  function bindBulkOrderSelection(){const all=document.querySelector('[data-select-all-orders]'),checks=[...document.querySelectorAll('[data-order-select]')];const sync=()=>{const ids=[...new Set(selectedOrderNumbers())];document.querySelectorAll('[data-selected-orders-count]').forEach(x=>x.textContent=`${ids.length} selected`);if(all)all.checked=checks.length>0&&checks.every(x=>x.checked)};checks.forEach(x=>{x.onclick=e=>e.stopPropagation();x.onchange=()=>{document.querySelectorAll(`[data-order-select="${CSS.escape(x.dataset.orderSelect)}"]`).forEach(y=>y.checked=x.checked);sync()}});if(all)all.onchange=()=>{checks.forEach(x=>x.checked=all.checked);sync()};sync()}
  document.querySelector('[data-bulk-update]')?.addEventListener('click',async e=>{const ids=[...new Set(selectedOrderNumbers())],status=document.querySelector('[data-bulk-status]')?.value;if(!ids.length)return WGH.showToast('Select at least one order first.');if(!status)return WGH.showToast('Choose the new order status first.');await WGH.withLoading(e.currentTarget,async()=>{for(const id of ids)await adminApi('/status',{orderNumber:id,status});WGH.showToast(`${ids.length} order${ids.length===1?'':'s'} updated.`,'success');await loadOrders();await loadNotificationPreview()},'Updating selected')});
  function packingSlipHtml(o){const items=(o.items||[]).map(i=>`<section class="slip-item"><img src="${escape(i.image||'')}" alt=""><div><h3>${escape(i.name)}</h3>${(i.variants||[]).map(v=>`<p><b>${v.quantity}×</b> ${escape(v.colour||'')} · ${escape(v.size||'')}</p>`).join('')}</div><strong>${Number(i.totalQuantity||1)} pcs</strong></section>`).join('');const address=[o.delivery?.address,o.delivery?.city,o.delivery?.region,o.delivery?.country].filter(Boolean).join(', ')||'No delivery address saved';return `<section class="print-page"><article class="packing-slip"><header class="slip-head"><div><span class="brand">THE WHOLESALE GHANA</span><small>ORDER RECEIPT & PACKING SLIP</small></div><div class="slip-order"><small>ORDER NUMBER</small><strong>${escape(o.orderNumber)}</strong></div></header><section class="slip-intro"><div><span>PACK WITH CARE</span><h1>${escape(o.customerName||'Customer')}</h1><p>${o.pieces} piece${Number(o.pieces)===1?'':'s'} · ${escape(labels[o.status]||o.status||'Confirmed')}</p></div><div class="paid-chip"><small>PAYMENT</small><b>${escape(String(o.paymentStatus||'Paid').toUpperCase())}</b></div></section><div class="slip-grid"><div><small>CUSTOMER</small><b>${escape(o.customerName||'Customer')}</b><span>${escape(o.customerPhone||'No phone')}</span><span>${escape(o.customerEmail||'')}</span></div><div><small>${String(o.delivery?.fulfilment||'Delivery').toUpperCase()}</small><b>${escape(o.delivery?.fulfilment||'Delivery')}</b><span>${escape(address)}</span></div><div><small>PRODUCTION</small><b>${escape(WGH.prettyBatch(o.batchName)||'Unassigned')}</b><span>${escape(labels[o.status]||o.status||'Confirmed')}</span></div></div><section class="slip-products"><div class="section-label"><span>ORDER CONTENTS</span><b>${(o.items||[]).length} STYLE${(o.items||[]).length===1?'':'S'}</b></div><main>${items||'<p class="empty">No saved product details.</p>'}</main></section><section class="slip-payment"><div><small>PAYMENT REFERENCE</small><b>${escape(o.paymentReference||'Not recorded')}</b><span>${date(o.createdAt)}</span></div><div><span>Subtotal <b>${WGH.money(o.subtotal||0)}</b></span><span>Delivery <b>${WGH.money(o.deliveryFee||0)}</b></span><strong>TOTAL <b>${WGH.money(o.total||0)}</b></strong></div></section><footer><div><strong>Checked & packed</strong><span>Initials __________  Date __________</span></div><b>THANK YOU</b></footer></article></section>`}
  function printOrders(ids){const selected=orders.filter(o=>ids.includes(o.orderNumber));if(!selected.length)return WGH.showToast('Select at least one order first.');const w=open('','_blank');if(!w)return WGH.showToast('Your browser blocked the packing-slip window. Allow pop-ups for this site, then try again.');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>The Wholesale Ghana · Packing slips</title><style>@page{size:4in 6in;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#ece9e2;color:#181713;font-size:10px}.print-page{width:4in;height:6in;margin:0 auto 16px;padding:.16in .18in;background:#fff;overflow:hidden;break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}.packing-slip{height:100%;display:flex;flex-direction:column;transform-origin:top left}.slip-head{display:flex;justify-content:space-between;gap:10px;padding-bottom:9px;border-bottom:2px solid #171612}.slip-head>div:first-child{display:grid;gap:2px}.brand{font-size:13px;font-weight:900;letter-spacing:.06em}.slip-head small,.slip-grid small,.slip-payment small{font-size:6.5px;letter-spacing:.15em;color:#786f65}.slip-order{text-align:right;display:grid;gap:2px}.slip-order strong{font-size:15px}.slip-intro{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:9px 0}.slip-intro>div:first-child>span{font-size:6.5px;letter-spacing:.14em;font-weight:800}.slip-intro h1{font-size:18px;line-height:1;margin:3px 0 2px}.slip-intro p{margin:0;color:#675f56;font-size:8px}.paid-chip{border:1px solid #181713;padding:5px 7px;display:grid;text-align:right;gap:1px}.paid-chip small{font-size:5.8px;letter-spacing:.12em}.paid-chip b{font-size:8px}.slip-grid{display:grid;grid-template-columns:1fr 1.45fr 1fr;border:1px solid #d9d3c9}.slip-grid>div{padding:6px;border-right:1px solid #d9d3c9;display:grid;align-content:start;gap:2px;min-width:0}.slip-grid>div:last-child{border-right:0}.slip-grid b{font-size:8px}.slip-grid span{font-size:6.7px;line-height:1.35;word-break:break-word}.slip-products{flex:1;min-height:0;padding-top:8px;overflow:hidden}.section-label{display:flex;justify-content:space-between;border-bottom:1px solid #181713;padding-bottom:4px;font-size:6.5px;letter-spacing:.12em}.slip-products main{overflow:hidden}.slip-item{display:grid;grid-template-columns:34px 1fr auto;gap:6px;padding:5px 0;border-bottom:1px solid #e5dfd6;align-items:start}.slip-item img{width:34px;height:40px;object-fit:contain;background:#f4f1eb}.slip-item h3{font-size:8px;margin:0 0 2px;line-height:1.15}.slip-item p{font-size:6.5px;margin:1px 0;color:#615a52}.slip-item>strong{font-size:7px;white-space:nowrap}.slip-payment{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:7px 0;border-top:2px solid #181713}.slip-payment>div{display:grid;gap:2px}.slip-payment>div:last-child span,.slip-payment>div:last-child strong{display:flex;justify-content:space-between;gap:8px;font-size:7px}.slip-payment>div:last-child strong{margin-top:2px;padding-top:3px;border-top:1px solid #d9d3c9;font-size:9px}.slip-payment>div:first-child>b{font-size:7px;word-break:break-all}.slip-payment>div:first-child>span{font-size:6px;color:#786f65}footer{border-top:1px solid #181713;padding-top:6px;display:flex;justify-content:space-between;align-items:flex-end}footer>div{display:grid;gap:2px}footer strong{font-size:7px}footer span{font-size:6px;color:#786f65}footer>b{font-size:8px;letter-spacing:.13em}@media print{body{background:#fff}.print-page{margin:0}}}</style></head><body>${selected.map(packingSlipHtml).join('')}<script>window.addEventListener('load',()=>{document.querySelectorAll('.print-page').forEach(page=>{const slip=page.querySelector('.packing-slip');const max=page.clientHeight;if(slip.scrollHeight>max){const scale=Math.max(.72,max/slip.scrollHeight);slip.style.transform='scale('+scale+')';slip.style.width=(100/scale)+'%'}});setTimeout(()=>window.print(),180)})<\/script></body></html>`);w.document.close()}
  document.querySelector('[data-bulk-print]')?.addEventListener('click',()=>printOrders([...new Set(selectedOrderNumbers())]));
  async function loadAccounts(){accounts=await adminApi('/accounts');const tb=document.querySelector('[data-accounts-table]'),mob=document.querySelector('[data-accounts-mobile]');if(tb)tb.innerHTML=accounts.map((a,i)=>`<tr class="admin-click-row" data-account-index="${i}"><td><strong>${escape([a.firstName,a.lastName].filter(Boolean).join(' ')||'Customer')}</strong></td><td>${escape(a.email)}</td><td>${escape(a.phone||'-')}</td><td>${date(a.createdAt)}</td><td>${a.orderCount||0}</td></tr>`).join('')||'<tr><td colspan="5">No accounts yet.</td></tr>';if(mob)mob.innerHTML=accounts.map((a,i)=>`<article class="admin-mobile-card"><strong>${escape([a.firstName,a.lastName].filter(Boolean).join(' ')||a.email)}</strong><p>${escape(a.email)} · ${a.orderCount||0} orders</p></article>`).join('')}
  let categoryEditorId="";
  function resetCategoryForm(){const form=document.querySelector('[data-category-form]');if(!form)return;categoryEditorId="";form.elements.name.value="";form.elements.sortOrder.value=99;form.elements.active.checked=true;const title=document.querySelector('[data-category-editor-title]');if(title)title.textContent='Create category';}
  function openCategoryEditor(category){const form=document.querySelector('[data-category-form]');if(!form)return;categoryEditorId=category?.id||"";form.elements.name.value=category?.name||"";form.elements.sortOrder.value=Number(category?.sortOrder||99);form.elements.active.checked=category?.active!==false;const title=document.querySelector('[data-category-editor-title]');if(title)title.textContent=category?'Edit category':'Create category';form.scrollIntoView({behavior:'smooth',block:'start'});}
  async function loadCategoriesAdmin(){const root=document.querySelector('[data-admin-categories]');try{categories=await adminApi('/categories');categories=Array.isArray(categories)?categories:[];WGH.categories=categories.filter(c=>c.active!==false);const count=document.querySelector('[data-category-count]');if(count)count.textContent=categories.length;
    if(root)root.innerHTML=categories.map(c=>`<article class="admin-category-row ${c.active===false?'is-hidden':''}"><div><span class="category-row-number">${Number(c.sortOrder||99)}</span><div><strong>${escape(c.name||c.id)}</strong><small>${escape(c.id)} · ${c.active===false?'Hidden from store':'Visible in store'}</small></div></div><div><button class="button button-outline" type="button" data-edit-category="${escape(c.id)}">Edit</button><button class="text-button" type="button" data-toggle-category="${escape(c.id)}">${c.active===false?'Show':'Hide'}</button></div></article>`).join('')||empty('No categories','Create a category to organize the shop.');
    root?.querySelectorAll('[data-edit-category]').forEach(btn=>btn.onclick=()=>{const c=categories.find(x=>x.id===btn.dataset.editCategory);if(c)openCategoryEditor(c)});
    root?.querySelectorAll('[data-toggle-category]').forEach(btn=>btn.onclick=async()=>{const c=categories.find(x=>x.id===btn.dataset.toggleCategory);if(!c)return;await WGH.withLoading(btn,async()=>{await adminApi('/category-save',{id:c.id,name:c.name,sortOrder:c.sortOrder,active:c.active===false});await loadCategoriesAdmin()},c.active===false?'Showing':'Hiding')});
  }catch(err){if(root)root.innerHTML=`<div class="admin-empty error"><strong>Categories could not load.</strong><p>${escape(WGH.friendlyError(err))}</p></div>`;throw err}}
  const categoryForm=document.querySelector('[data-category-form]');
  categoryForm?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]'),name=String(form.elements.name.value||'').trim();if(!name)return;await WGH.withLoading(btn,async()=>{await adminApi('/category-save',{id:categoryEditorId,name,sortOrder:Number(form.elements.sortOrder.value||99),active:!!form.elements.active.checked});WGH.showToast(categoryEditorId?'Category updated.':'Category created.','success');resetCategoryForm();await loadCategoriesAdmin()},'Saving')});
  document.querySelector('[data-add-category]')?.addEventListener('click',()=>openCategoryEditor(null));
  document.querySelector('[data-cancel-category]')?.addEventListener('click',resetCategoryForm);

  async function loadSubscribers(){const root=document.querySelector('[data-subscribers-table]');try{const data=await adminApi('/subscribers');if(root)root.innerHTML=data.map(x=>`<tr><td><strong>${escape(x.email)}</strong></td><td>${escape(x.name||[x.firstName,x.lastName].filter(Boolean).join(' ')||'-')}</td><td><span class="status-pill">Subscribed</span><small>${escape(x.source||'')}</small></td><td>${dateTime(x.updatedAt||x.createdAt)}</td></tr>`).join('')||'<tr><td colspan="4">No subscribers yet.</td></tr>';return data;}catch(err){if(root)root.innerHTML=`<tr><td colspan="4"><div class="admin-empty-row error"><strong>Subscribers could not load.</strong><span>${escape(WGH.friendlyError(err))}</span></div></td></tr>`;throw err}}

  function isInternationalOrder(o){
    const d=o?.delivery||{};
    const country=String(d.country||d.countryName||d.countryCode||'').trim().toLowerCase();
    const code=String(d.countryCode||'').trim().toUpperCase();
    if(code==='GH'||country==='gh'||country.includes('ghana'))return false;
    return Boolean(country);
  }
  async function loadInternational(force=false){
    const root=document.querySelector('[data-international-list]');
    try{
      const all=await ensureOrders(force);
      const items=all.filter(isInternationalOrder);
      if(!root)return;
      root.innerHTML=items.length?items.map(o=>`<article class="admin-notification-row" data-order-detail="${escape(o.orderNumber)}"><div><strong>${escape(o.orderNumber)}</strong><p>${escape(o.customerName||o.customerEmail||'Customer')} · ${escape([o.delivery?.city,o.delivery?.country].filter(Boolean).join(', ')||'International destination')}</p><small>${o.pieces||0} pieces · ${WGH.money(o.total||0)} · ${escape(labels[o.status]||o.status||'Order confirmed')}</small></div><span>${date(o.createdAt)}</span></article>`).join(''):empty('No international orders','Orders with a destination outside Ghana will appear here.');
      root.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.orderDetail));
    }catch(err){if(root)root.innerHTML=empty('Could not load International orders',WGH.friendlyError(err));throw err}
  }
  function isWholesaleItem(item){return String(item?.mode||item?.orderType||'').toLowerCase()==='wholesale';}
  async function loadWholesale(force=false){
    const metrics=document.querySelector('[data-wholesale-metrics]'),root=document.querySelector('[data-wholesale-products]'),ordersRoot=document.querySelector('[data-wholesale-orders]');
    try{
      const [products,all]=await Promise.all([adminApi('/products'),ensureOrders(force)]);
      const wholesaleProducts=(Array.isArray(products)?products:[]).filter(p=>p.wholesaleAvailable!==false&&Number(p.wholesalePrice)>0&&p.active!==false);
      const wholesaleOrders=all.filter(o=>(o.items||[]).some(isWholesaleItem));
      window.__adminWholesaleOrders=wholesaleOrders;
      const pieces=wholesaleOrders.reduce((n,o)=>n+Number(o.pieces||0),0);
      const value=wholesaleOrders.reduce((n,o)=>n+Number(o.total||0),0);
      if(metrics)metrics.innerHTML=[['Wholesale styles',wholesaleProducts.length],['Wholesale orders',wholesaleOrders.length],['Wholesale pieces',pieces],['Wholesale sales',WGH.money(value)]].map(([l,v])=>`<article class="admin-metric"><p>${l}</p><strong>${v}</strong></article>`).join('');
      if(root)root.innerHTML=wholesaleProducts.map(p=>`<tr class="admin-click-row"><td><strong>${escape(p.name)}</strong><small>${escape(WGH.categoryName?.(p.category)||p.category||'')}</small></td><td>${WGH.money(p.wholesalePrice)}</td><td>${Number(p.moq||6)}</td><td>${(p.colours||[]).length}</td><td>${(p.sizes||[]).length}</td><td><span class="status-pill">${p.active===false?'Hidden':'Live'}</span></td></tr>`).join('')||'<tr><td colspan="6">No wholesale-ready products yet.</td></tr>';
      renderWholesaleOrders();

    }catch(err){if(root)root.innerHTML=`<tr><td colspan="6"><div class="admin-empty-row error"><strong>Wholesale could not load.</strong><span>${escape(WGH.friendlyError(err))}</span></div></td></tr>`;if(ordersRoot)ordersRoot.innerHTML=empty('Wholesale unavailable',WGH.friendlyError(err));throw err}
  }

  function renderWholesaleOrders(){
    const ordersRoot=document.querySelector('[data-wholesale-orders]');
    if(!ordersRoot)return;
    const source=Array.isArray(window.__adminWholesaleOrders)?window.__adminWholesaleOrders:[];
    const q=(document.querySelector('[data-wholesale-order-search]')?.value||'').trim().toLowerCase();
    const filter=document.querySelector('[data-wholesale-order-filter]')?.value||'all';
    const list=source.filter(o=>{
      const hay=`${o.orderNumber||''} ${o.customerName||''} ${o.customerEmail||''}`.toLowerCase();
      return (!q||hay.includes(q))&&(filter==='all'||String(o.status||'')===filter);
    });
    ordersRoot.innerHTML=list.map(o=>`<article class="admin-notification-row admin-click-row" data-order-detail="${escape(o.orderNumber)}"><div><strong>${escape(o.orderNumber)}</strong><p>${escape(o.customerName||o.customerEmail||'Customer')}</p><small>${o.pieces||0} pieces · ${WGH.money(o.total||0)} · ${escape(labels[o.status]||o.status||'Order')}</small></div><span>${dateTime(o.createdAt)}</span></article>`).join('')||empty('No wholesale orders found','Try another search or status.');
    ordersRoot.querySelectorAll('[data-order-detail]').forEach(b=>b.onclick=()=>openOrderDetail(b.dataset.orderDetail));
  }
  document.querySelector('[data-wholesale-order-search]')?.addEventListener('input',renderWholesaleOrders);
  document.querySelector('[data-wholesale-order-filter]')?.addEventListener('change',renderWholesaleOrders);

  let notificationOpen=false;async function loadNotificationPreview(force=false){
    try{
      await ensureNotifications(force);
    }catch(e){
      console.warn('Could not load saved notifications',e);
      notifications=[];
    }
    // Live counts come from the already-loaded operational summary. Avoid
    // downloading full collections just to render the notification popover.
    const live=[];const activeCount=Number(operationalSummary.activeOrders||0);if(activeCount)live.push({id:'live-orders',live:true,title:`${activeCount} active order${activeCount===1?'':'s'}`,message:'Review current orders',target:'orders',icon:'fa-bag-shopping'});
    const persistent=notifications.map(n=>({...n,icon:n.type==='order'?'fa-bag-shopping':n.type==='batch'?'fa-layer-group':'fa-bell'})),items=[...persistent,...live],unread=persistent.filter(x=>!x.read).length+live.length;
    document.querySelectorAll('[data-admin-notification-count]').forEach(x=>{x.textContent=unread;x.hidden=unread===0});
    document.querySelectorAll('[data-notification-preview]').forEach(root=>{root.innerHTML=items.length?items.slice(0,7).map(x=>`<div class="notification-preview-row ${x.read?'read':''}"><button type="button" class="notification-preview-main" data-notif-view="${escape(x.target||'overview')}" data-notif-id="${escape(x.id||'')}" data-notif-order="${escape(x.orderNumber||'')}"><i class="fa-solid ${x.icon}"></i><span><strong>${escape(x.title)}</strong><small>${escape(x.message||'')}</small></span>${!x.read&&!x.live?'<b></b>':''}</button>${x.live?'':`<button class="notification-preview-delete" type="button" data-notif-delete="${escape(x.id||'')}" aria-label="Delete notification"><i class="fa-solid fa-xmark"></i></button>`}</div>`).join(''):'<div class="notification-empty">Nothing needs attention right now.</div>';});
    document.querySelectorAll('[data-notif-view]').forEach(b=>b.onclick=async()=>{const n={id:b.dataset.notifId,target:b.dataset.notifView,orderNumber:b.dataset.notifOrder};if(n.id&&!n.id.startsWith('live-'))await adminApi('/notification-read',{id:n.id});closeNotificationPopovers();await notificationGo(n)});
    document.querySelectorAll('[data-notif-delete]').forEach(b=>b.onclick=async e=>{e.stopPropagation();await deleteNotification(b.dataset.notifDelete,b)});
    document.querySelectorAll('[data-notification-clear-all]').forEach(b=>{b.hidden=!persistent.length;b.onclick=()=>clearAllNotifications(b)});
  }
  function closeNotificationPopovers(){notificationOpen=false;document.querySelectorAll('[data-admin-notification-popover]').forEach(x=>x.hidden=true)}document.querySelectorAll('[data-admin-notification-toggle]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();notificationOpen=!notificationOpen;document.querySelectorAll('[data-admin-notification-popover]').forEach(x=>x.hidden=!notificationOpen);if(notificationOpen)loadNotificationPreview()});document.querySelectorAll('[data-notification-close]').forEach(b=>b.onclick=closeNotificationPopovers);document.querySelectorAll('[data-admin-view-jump]').forEach(b=>b.onclick=()=>{showView(b.dataset.adminViewJump);closeNotificationPopovers()});document.addEventListener('click',e=>{if(notificationOpen&&!e.target.closest('[data-admin-notification-wrap]'))closeNotificationPopovers();if(document.body.classList.contains('admin-menu-open')&&!e.target.closest('.admin-sidebar')&&!e.target.closest('[data-admin-menu]'))document.body.classList.remove('admin-menu-open')});document.querySelector('[data-admin-sidebar-backdrop]')?.addEventListener('click',()=>document.body.classList.remove('admin-menu-open'));
  let notificationAutoShown=false;function showNotificationPopoverOnLoad(){if(notificationAutoShown)return;notificationAutoShown=true;setTimeout(async()=>{await loadNotificationPreview();notificationOpen=true;document.querySelectorAll('[data-admin-notification-popover]').forEach(x=>x.hidden=false);setTimeout(()=>{if(notificationOpen)closeNotificationPopovers()},5000)},420)}
  waitForAuth();
})();
