/* The Wholesale Ghana shared storefront logic. Public Firebase web settings are returned by /config. Secrets stay server-side. */
window.WGH = window.WGH || {};

WGH.API_BASE = '/.netlify/functions/wgh';
WGH.CURRENCY = 'GHS';
WGH.CART_KEY = 'wgh_cart_v2';
WGH.ORDER_KEY = 'wgh_orders_v2';
WGH.PROCESSING_RATE = 0.0295;

WGH.icons = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8.5h13l-1 11h-11z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z"/><path d="M9 8.5c.5 2.4 2.1 4 4.5 5l1.5-1.2 2 1c-.3 1.6-1.5 2.7-3.1 2.8-3.5-.6-6-3-6.7-6.5.1-1.2.8-2.3 1.8-2.8Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 7 8 6 8-6"/></svg>',
  snapchat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-2.8 0-4.5 2.1-4.5 5.1 0 .9.1 1.6-.2 2.2-.4.8-1.2 1.1-2 1.4-.7.3-.8.8-.1 1.2.7.4 1.5.5 1.8 1.3.3.8-.4 1.5-.9 2 .9.2 1.7.3 2.4.9.8.7 1.5 1.9 3.5 1.9s2.7-1.2 3.5-1.9c.7-.6 1.5-.7 2.4-.9-.5-.5-1.2-1.2-.9-2 .3-.8 1.1-.9 1.8-1.3.7-.4.6-.9-.1-1.2-.8-.3-1.6-.6-2-1.4-.3-.6-.2-1.3-.2-2.2C16.5 5.1 14.8 3 12 3Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.1a4.1 4.1 0 1 1-3.2-4V13a1.8 1.8 0 1 0 .7 1.4V4h2.5c.4 2.2 1.7 3.6 4 4v2.5c-1.5-.2-2.8-.8-4-1.7"/></svg>'
};

WGH.products = [
  {id:'sculpt-column-dress',name:'Sculpt Column Dress',category:'dresses',isNew:true,retailPrice:420,wholesalePrice:285,moq:6,colours:['Black','Cocoa','Cream','Nude'],sizes:['XS','S','M','L','XL'],description:'A fitted column dress with a soft square neckline and a clean full-length shape.',details:'Soft stretch finish. Sleeveless. Maxi length. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=86']},
  {id:'contour-button-top',name:'Contour Button Top',category:'tops',isNew:true,retailPrice:230,wholesalePrice:155,moq:6,colours:['Black','Brown','Cream','Nude'],sizes:['XS','S','M','L','XL'],description:'A fitted button-front top with a clean neckline and an easy everyday shape.',details:'Close fit. Button front. Soft hand feel. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=86']},
  {id:'signature-two-piece',name:'Signature Two-Piece Set',category:'sets',isNew:true,retailPrice:510,wholesalePrice:345,moq:6,colours:['Espresso','Sand','Black','Bone'],sizes:['XS','S','M','L','XL'],description:'A matching two-piece set with an elongated top and straight-leg trousers.',details:'Two-piece set. Relaxed structure. Full length. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=86']},
  {id:'second-skin-tee',name:'Second Skin Tee',category:'basics',isNew:false,retailPrice:165,wholesalePrice:110,moq:6,colours:['White','Black','Cocoa','Taupe'],sizes:['XS','S','M','L','XL'],description:'A close-fitting everyday tee with a smooth neckline and neat short sleeves.',details:'Stretch jersey feel. Fitted shape. Everyday basic. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=86']},
  {id:'tailored-flow-pants',name:'Tailored Flow Pants',category:'pants',isNew:false,retailPrice:290,wholesalePrice:195,moq:6,colours:['Black','Espresso','Stone','Cream'],sizes:['XS','S','M','L','XL'],description:'A long tailored trouser that falls cleanly from the waist with a relaxed wide leg.',details:'High rise. Straight wide leg. Full length. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=86']},
  {id:'soft-drape-mini',name:'Soft Drape Mini Dress',category:'dresses',isNew:false,retailPrice:350,wholesalePrice:235,moq:6,colours:['Black','Mocha','Ivory','Dust'],sizes:['XS','S','M','L','XL'],description:'A feminine mini dress with soft draping and a defined waist.',details:'Mini length. Soft drape. Fitted waist. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=86']},
  {id:'clean-line-vest',name:'Clean Line Vest',category:'tops',isNew:false,retailPrice:195,wholesalePrice:130,moq:6,colours:['Black','Cream','Camel','White'],sizes:['XS','S','M','L','XL'],description:'A sleeveless fitted top with a high neckline and a clean finish.',details:'Sleeveless. High neckline. Close fit. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=86']},
  {id:'soft-knit-set',name:'Soft Knit Set',category:'sets',isNew:false,retailPrice:460,wholesalePrice:310,moq:6,colours:['Oat','Cocoa','Black','Mushroom'],sizes:['XS','S','M','L','XL'],description:'A soft matching set with a fitted top and relaxed trousers for everyday wear.',details:'Two-piece set. Soft stretch feel. Easy fit. Made to order in Ghana.',images:['https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=86','https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=86']}
];

WGH.money = amount => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(amount||0));
WGH.getCart = () => { try{return JSON.parse(localStorage.getItem(WGH.CART_KEY))||[]}catch{return[]} };
WGH.saveCart = cart => { localStorage.setItem(WGH.CART_KEY,JSON.stringify(cart)); WGH.updateCartCount(); };
WGH.cartPieces = () => WGH.getCart().reduce((sum,item)=>sum+Number(item.totalQuantity||1),0);
WGH.updateCartCount = () => document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=WGH.cartPieces());
WGH.processingFee = subtotal => Math.round(Number(subtotal||0)*WGH.PROCESSING_RATE*100)/100;

WGH.showToast = (message,type='') => {
  const el=document.querySelector('[data-toast]');
  if(!el)return;
  el.textContent=WGH.friendlyError(message);
  el.dataset.type=type;
  el.classList.add('show');
  clearTimeout(WGH.toastTimer);
  WGH.toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
};

WGH.friendlyError = error => {
  const raw=String(error?.message||error||'Something went wrong. Please try again.');
  const code=String(error?.code||'');
  if(code.includes('auth/user-not-found')||code.includes('auth/invalid-credential')||/invalid credential/i.test(raw)) return 'We could not find an account with those details. You can create an account instead.';
  if(code.includes('auth/wrong-password')) return 'That password does not match this account. Please try again.';
  if(code.includes('auth/email-already-in-use')) return 'An account already exists with this email. Please sign in instead.';
  if(code.includes('auth/weak-password')) return 'Please choose a stronger password with at least 6 characters.';
  if(code.includes('auth/too-many-requests')) return 'There have been too many attempts. Please try again a little later.';
  if(code.includes('auth/network-request-failed')||/network|failed to fetch/i.test(raw)) return 'We could not connect right now. Please check your internet connection and try again.';
  if(/Email service is not configured|RESEND_API_KEY/i.test(raw)) return 'Verification email is not connected on the deployed site yet. Add RESEND_API_KEY in Netlify Environment Variables, then redeploy.';
  if(/Resend could not send this email/i.test(raw)) return raw;
  if(/Firebase Admin environment variables|service-account JSON is invalid/i.test(raw)) return 'Account storage is not connected correctly on the deployed site. Check the Firebase Admin environment variables in Netlify, then redeploy.';
  if(/Paystack environment variables/i.test(raw)) return 'Secure payment is not configured on the deployed site yet.';
  if(/invalid order status|request failed/i.test(raw)) return 'We could not complete that request right now. Please try again.';
  return raw.replace(/^Firebase:\s*/i,'').replace(/\(auth\/[\w-]+\)\.?/g,'').trim();
};

WGH.setLoading = (button,loading,label='') => {
  if(!button)return;
  if(loading){
    if(!button.dataset.originalHtml)button.dataset.originalHtml=button.innerHTML;
    button.disabled=true;button.classList.add('is-loading');
    button.innerHTML=`<span class="button-spinner" aria-hidden="true"></span><span>${label||'Please wait'}</span>`;
  }else{
    button.disabled=false;button.classList.remove('is-loading');
    if(button.dataset.originalHtml){button.innerHTML=button.dataset.originalHtml;delete button.dataset.originalHtml;}
  }
};

WGH.withLoading = async (button,fn,label='Please wait') => {
  WGH.setLoading(button,true,label);
  try{return await fn();}finally{WGH.setLoading(button,false);}
};

WGH.colourValue = name => ({black:'#151515',white:'#f4f2ec',cream:'#e8dfcf',ivory:'#eee9df',bone:'#ddd3c3',nude:'#c9aa93',brown:'#6c4937',cocoa:'#593d32',mocha:'#806451',espresso:'#3d2b24',sand:'#c9b79c',stone:'#999186',taupe:'#9b8b79',camel:'#b98b63',oat:'#d9ccb6',mushroom:'#988979',dust:'#bea99d'}[String(name||'').toLowerCase()]||'#b7aea5');
WGH.productCard = (p,mode='retail') => { const colours=(p.colours||[]).slice(0,5); const imageMap=p.colourImages||{}; return `<article class="product-card" data-product-card="${p.id}"><a href="product.html?id=${encodeURIComponent(p.id)}&mode=${mode}" aria-label="View ${p.name}"><div class="product-card-image" data-card-gallery><img class="primary-image" data-card-image src="${p.images?.[0]||''}" alt="${p.name}" loading="lazy"><img class="hover-image" src="${p.images?.[1]||p.images?.[0]||''}" alt="${p.name} alternate view" loading="lazy"></div><div class="product-card-copy"><div><h3>${p.name}</h3><p>${mode==='wholesale'?'Wholesale · MOQ '+p.moq:'Made to order'}</p></div><strong>${WGH.money(mode==='wholesale'?p.wholesalePrice:p.retailPrice)}</strong></div></a>${colours.length?`<div class="card-colours" aria-label="Available colours">${colours.map((c,i)=>`<button type="button" data-card-colour="${c}" data-card-src="${(imageMap[c]||[])[0]||p.images?.[i]||p.images?.[0]||''}" title="${c}" aria-label="Show ${c}"><i style="--swatch:${WGH.colourValue(c)}"></i></button>`).join('')}<small data-card-colour-name>${colours[0]}</small></div>`:''}<button class="wishlist-card-button" type="button" data-wishlist="${p.id}" aria-label="Save ${p.name}"><i class="fa-regular fa-heart"></i></button></article>` };
WGH.loadProducts = async()=>{try{const data=await WGH.api('/catalog');if(Array.isArray(data)&&data.length){const base=new Map(WGH.products.map(p=>[p.id,p]));data.forEach(o=>{const prev=base.get(o.id)||{};base.set(o.id,{...prev,...o})});WGH.products=[...base.values()].filter(p=>p.active!==false)}}catch{}return WGH.products};
WGH.bindProductCards = root=>{(root||document).querySelectorAll('[data-product-card]').forEach(card=>{const img=card.querySelector('[data-card-image]'),name=card.querySelector('[data-card-colour-name]');let touched=false,startX=0;const buttons=[...card.querySelectorAll('[data-card-colour]')];const set=(b)=>{if(!b||!img)return;buttons.forEach(x=>x.classList.toggle('active',x===b));img.classList.add('is-changing');setTimeout(()=>{img.src=b.dataset.cardSrc||img.src;img.classList.remove('is-changing')},110);if(name)name.textContent=b.dataset.cardColour};buttons.forEach(b=>{b.addEventListener('mouseenter',()=>set(b));b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();touched=true;set(b)})});const gallery=card.querySelector('[data-card-gallery]');gallery?.addEventListener('touchstart',e=>startX=e.touches[0].clientX,{passive:true});gallery?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)<35||!buttons.length)return;touched=true;let i=Math.max(0,buttons.findIndex(b=>b.classList.contains('active')));i=(i+(dx<0?1:-1)+buttons.length)%buttons.length;set(buttons[i])},{passive:true});if(buttons[0])set(buttons[0]);card._wghSetColour=set;card._wghTouched=()=>touched});(root||document).querySelectorAll('[data-wishlist]').forEach(btn=>{const read=()=>{try{return JSON.parse(localStorage.getItem('wgh_wishlist')||'[]')}catch{return[]}},sync=()=>{const on=read().includes(btn.dataset.wishlist);btn.classList.toggle('saved',on);btn.innerHTML=`<i class="fa-${on?'solid':'regular'} fa-heart"></i>`};sync();btn.onclick=e=>{e.preventDefault();e.stopPropagation();let a=read();a=a.includes(btn.dataset.wishlist)?a.filter(x=>x!==btn.dataset.wishlist):[...a,btn.dataset.wishlist];localStorage.setItem('wgh_wishlist',JSON.stringify(a));sync();WGH.showToast(a.includes(btn.dataset.wishlist)?'Saved for later.':'Removed from saved items.','success')}});};


WGH.panelCopy = {
  size:`<p class="eyebrow">Size guide</p><h2>Find your fit.</h2><p>Use this guide as a general reference. Measurements are in inches. If you are between sizes, choose the fit you prefer.</p><table><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody><tr><td>XS</td><td>30–32</td><td>24–26</td><td>34–36</td></tr><tr><td>S</td><td>32–34</td><td>26–28</td><td>36–38</td></tr><tr><td>M</td><td>34–36</td><td>28–30</td><td>38–40</td></tr><tr><td>L</td><td>36–39</td><td>30–33</td><td>40–43</td></tr><tr><td>XL</td><td>39–42</td><td>33–36</td><td>43–46</td></tr></tbody></table><p>Need help choosing? Contact us before placing your order.</p>`,
  faq:`<p class="eyebrow">FAQ</p><h2>Questions, answered.</h2><details open><summary>Are your pieces ready made?</summary><p>No. Our collection is made to order. Production begins after your paid order is assigned to a weekly production cycle.</p></details><details><summary>How long does my order take?</summary><p>Estimated delivery is 14 to 21 days after your assigned production cycle closes. We aim to complete and dispatch earlier whenever possible.</p></details><details><summary>What is the wholesale minimum?</summary><p>The standard minimum is 6 pieces per style. You may mix available colours and sizes within the 6 pieces.</p></details><details><summary>How do I track my order?</summary><p>Use your WGH order number and checkout email in Track Order. You can see each major stage without contacting us.</p></details><details><summary>Can my order move to a later cycle?</summary><p>Yes. If the current cycle reaches production capacity, new paid orders move automatically to the next available cycle.</p></details>`,
  policy:`<p class="eyebrow">Wholesale & retail policy</p><h2>Order with confidence.</h2><h3>Made to order</h3><p>All clothing is produced after purchase. Please review your selected size, colour and quantity before payment.</p><h3>Wholesale minimum</h3><p>Wholesale orders require at least 6 pieces per style. Colours and sizes can be mixed within the minimum.</p><h3>Production cycle</h3><p>Orders are assigned to weekly production cycles. If a cycle is full, the order moves to the next available cycle.</p><h3>Estimated delivery</h3><p>The standard estimate is 14 to 21 days after your assigned cycle closes. This is an estimate rather than a guaranteed delivery date.</p><h3>Changes and cancellations</h3><p>Because production planning begins quickly, order changes may not be possible after production starts. Contact us as soon as possible if you notice an error.</p>`,
  contact:`<p class="eyebrow">Contact</p><h2>We are here to help.</h2><p>For product questions, sizing support or an existing order, use the option that works best for you.</p><div class="contact-actions"><a class="button button-dark" href="https://wa.me/233000000000" target="_blank" rel="noopener">WhatsApp</a><a class="button button-outline" href="mailto:hello@thewholesaleghana.com">Email us</a><a class="button button-outline" href="https://instagram.com/" target="_blank" rel="noopener">Instagram</a></div>`
};

WGH.openLayer = el => {if(!el)return;document.body.classList.add('no-scroll');document.querySelector('[data-drawer-backdrop]')?.classList.add('active');el.classList.add('active');el.setAttribute('aria-hidden','false')};
WGH.closeLayers = () => {document.body.classList.remove('no-scroll');document.querySelector('[data-drawer-backdrop]')?.classList.remove('active');document.querySelectorAll('.mobile-drawer,.side-panel,.info-panel').forEach(el=>{el.classList.remove('active');el.setAttribute('aria-hidden','true')})};
WGH.api = async (path,body,options={}) => {
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(options.auth&&WGH.auth?.currentUser)headers.Authorization=`Bearer ${await WGH.auth.currentUser.getIdToken()}`;
  const response=await fetch(`${WGH.API_BASE}${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(WGH.friendlyError(data.error||'We could not complete that request. Please try again.'));
  return data;
};

WGH.statuses=['order_confirmed','payment_received','cycle_assigned','cycle_closed','production','quality_control','packaging','ready_dispatch','dispatched','delivered'];
WGH.statusLabels={order_confirmed:'Order Confirmed',payment_received:'Payment Received',cycle_assigned:'Order Cycle Assigned',cycle_closed:'Order Cycle Closed',production:'Production',quality_control:'Quality Control',packaging:'Packaging',ready_dispatch:'Ready for Dispatch',dispatched:'Dispatched',delivered:'Delivered'};
WGH.renderTracking = order => {
  const current=Math.max(0,WGH.statuses.indexOf(order.status));
  return `<div class="track-card"><div class="track-card-head"><span>${order.orderNumber}</span><strong>${order.batchName||'Production cycle assigned'}</strong></div><div class="track-estimate"><span>Estimated delivery</span><strong>${order.estimatedDelivery||'We will update this shortly'}</strong></div><ol class="tracking-timeline">${WGH.statuses.map((s,i)=>`<li class="${i<current?'done':i===current?'current':''}"><span class="timeline-dot"></span><div><strong>${WGH.statusLabels[s]}</strong>${i===current?'<small>Current stage</small>':''}</div></li>`).join('')}</ol></div>`;
};

async function initFirebase(){
  try{
    const config=await WGH.api('/config');
    if(window.firebase&&config.firebase?.apiKey){
      if(!firebase.apps.length)firebase.initializeApp(config.firebase);
      WGH.auth=firebase.auth();
      await WGH.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      WGH.db=firebase.firestore?.();
      WGH.auth.onAuthStateChanged(user=>{
        WGH.currentUser=user||null;
        document.querySelectorAll('[data-account-status]').forEach(el=>{const verified=!!user?.emailVerified;el.textContent=verified?'Signed In':'';el.hidden=!verified});
        document.body.classList.toggle('user-signed-in',!!user?.emailVerified);window.dispatchEvent(new CustomEvent('wgh:auth',{detail:{user}}));
      });
    }
  }catch(err){console.warn('Account services are not available yet.');}
}

function initHeader(){
  const header=document.getElementById('siteHeader');
  let lastY=Math.max(0,window.scrollY),ticking=false;
  const apply=()=>{
    const y=Math.max(0,window.scrollY),delta=y-lastY;
    if(header){
      header.classList.toggle('scrolled',y>24||document.body.classList.contains('shop-page')||document.body.classList.contains('product-page'));
      document.body.classList.toggle('at-page-top',y<120);
      if(y<20){document.body.classList.remove('scroll-down');document.body.classList.add('scroll-up');}
      else if(delta>5){document.body.classList.add('scroll-down');document.body.classList.remove('scroll-up');}
      else if(delta<-5){document.body.classList.add('scroll-up');document.body.classList.remove('scroll-down');}
    }
    lastY=y;ticking=false;
  };
  window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(apply);ticking=true;}},{passive:true});
  apply();
}

function initDrawers(){
  document.querySelectorAll('[data-menu-open]').forEach(b=>b.addEventListener('click',()=>WGH.openLayer(document.querySelector('[data-menu-drawer]'))));
  document.querySelectorAll('[data-menu-close],[data-track-close],[data-panel-close],[data-drawer-backdrop]').forEach(b=>b.addEventListener('click',WGH.closeLayers));
  document.querySelectorAll('[data-track-open]').forEach(b=>b.addEventListener('click',()=>{WGH.closeLayers();WGH.openLayer(document.querySelector('[data-track-panel]'))}));
  document.querySelectorAll('[data-panel-open]').forEach(b=>b.addEventListener('click',()=>{const panel=document.querySelector('[data-info-panel]');const content=panel?.querySelector('[data-panel-content]');if(content)content.innerHTML=WGH.panelCopy[b.dataset.panelOpen]||'';WGH.closeLayers();WGH.openLayer(panel)}));
}

function initTracking(){
  document.querySelectorAll('[data-track-form]').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();const btn=form.querySelector('button[type="submit"]');const out=form.parentElement.querySelector('[data-tracking-result]');
    await WGH.withLoading(btn,async()=>{
      const values=Object.fromEntries(new FormData(form));
      try{const order=await WGH.api('/track',values);out.innerHTML=WGH.renderTracking(order)}catch(err){out.innerHTML=`<div class="friendly-message"><strong>We could not find that order.</strong><p>Check the order number and the email used at checkout, then try again.</p></div>`}
    },'Finding your order');
  }));
}

function initNewsletter(){
  const hydrate=()=>document.querySelectorAll('[data-newsletter-form] input[type="email"]').forEach(input=>{if(WGH.auth?.currentUser?.email&&!input.value)input.value=WGH.auth.currentUser.email});
  setTimeout(hydrate,800);setTimeout(hydrate,1800);window.addEventListener('wgh:auth',hydrate);
  document.querySelectorAll('[data-newsletter-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]');await WGH.withLoading(btn,async()=>{const email=String(new FormData(form).get('email')||form.querySelector('input[type="email"]')?.value||'').trim();await WGH.api('/newsletter',{email},{auth:!!WGH.auth?.currentUser});WGH.showToast('You are on the list.','success')},'Joining')}));
}


function initHome(){
  const rail=document.querySelector('[data-featured-products]');if(rail)WGH.loadProducts().then(()=>{rail.innerHTML=WGH.products.filter(p=>p.isNew).slice(0,5).map(p=>WGH.productCard(p)).join('');WGH.bindProductCards(rail)});
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}

function initIcons(){
  document.querySelectorAll('[data-icon="user"]').forEach(el=>el.innerHTML=WGH.icons.user);
  document.querySelectorAll('[data-icon="bag"]').forEach(el=>el.innerHTML=WGH.icons.bag);
  document.querySelectorAll('[data-icon="arrow"]').forEach(el=>el.innerHTML=WGH.icons.arrow);
  document.querySelectorAll('[data-icon="instagram"]').forEach(el=>el.innerHTML='<i class="fa-brands fa-instagram"></i>');
  document.querySelectorAll('[data-icon="whatsapp"]').forEach(el=>el.innerHTML='<i class="fa-brands fa-whatsapp"></i>');
  document.querySelectorAll('[data-icon="mail"]').forEach(el=>el.innerHTML='<i class="fa-regular fa-envelope"></i>');
  document.querySelectorAll('[data-icon="snapchat"]').forEach(el=>el.innerHTML='<i class="fa-brands fa-snapchat"></i>');
  document.querySelectorAll('[data-icon="tiktok"]').forEach(el=>el.innerHTML='<i class="fa-brands fa-tiktok"></i>');
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  WGH.updateCartCount();initIcons();initHeader();initDrawers();initTracking();initNewsletter();initHome();initFirebase();
});
