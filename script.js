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

WGH.products = [{"id":"drapped-halter-mini-dress","name":"Drapped Halter Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Dark Brown","Black","Grey","Baby Blue"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A sculpted halter mini with soft draping through the bodice and a ruched, figure-skimming skirt.","details":"Halter neckline. Draped overlay. Ruched mini silhouette. Made to order.","care":"Gentle wash. Do not bleach. Steam on low heat and store hanging."},{"id":"ruffle-asymmetric-mini-dress","name":"Ruffle Asymmetric Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Pink","White","Black"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A playful asymmetric mini framed with cascading ruffles and delicate shoulder ties.","details":"Asymmetric hem. Ruffle trim. Adjustable tie straps. Made to order.","care":"Cold gentle wash. Do not bleach. Hang or lay flat to dry."},{"id":"ruche-wrap-mini-dress","name":"Ruche Wrap Mini Dress","category":"dresses","retailPrice":250,"wholesalePrice":140,"moq":6,"colours":["Black","Curry","White"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A deep wrap-front mini with gathered ruching that shapes the waist and hip.","details":"Deep V neckline. Wrap-effect front. Ruched mini skirt. Made to order.","care":"Gentle wash with similar colours. Avoid harsh bleach. Steam lightly."},{"id":"nael-mini-dress","name":"Naël Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Red","Orange","Black"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A clean strappy mini cut close to the body with a softly ruched skirt.","details":"Slim straps. V neckline. Body-skimming fit. Ruched mini length. Made to order.","care":"Cold gentle wash. Do not bleach. Dry away from direct heat."},{"id":"dante-capri","name":"DANTÉ CAPRI","category":"pants","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Army Green","Grey","Black","Brown"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A sporty capri trouser with a high waist, cropped flare and contrast side stripes.","details":"High rise. Capri length. Flared hem. Contrast side stripes. Made to order.","care":"Wash inside out on a gentle cycle. Do not bleach. Air dry."},{"id":"ruched-waist-pants","name":"Ruched Waist Pants","category":"pants","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Black","Red","Brown"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"Fluid flare pants finished with a gathered drawstring waist for a sculpted, adjustable fit.","details":"Ruched waist. Adjustable side ties. Wide flare leg. Made to order.","care":"Cold gentle wash. Tie drawstrings loosely before washing. Air dry."},{"id":"foldover-waist-flare-pants","name":"Foldover Waist Flare Pants","category":"pants","retailPrice":250,"wholesalePrice":145,"moq":6,"colours":["Brown","Black","Nude","Pink"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A soft foldover-waist pant with a cropped, flowing flare that moves easily.","details":"Foldover waistband. Cropped flare leg. Soft stretch feel. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape while damp and air dry."},{"id":"ruffle-button-top","name":"Ruffle Button Top","category":"tops","retailPrice":145,"wholesalePrice":80,"moq":6,"colours":["Black","Pink","Brown","Cream"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A fitted long-sleeve top framed with soft ruffles, a deep V neckline and polished button detailing.","details":"Ruffle-trim neckline. Front button closure. Fluted cuffs and hem. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape while damp and air dry."},{"id":"ribbed-contrast-top","name":"Ribbed Contrast Top","category":"tops","retailPrice":90,"wholesalePrice":55,"moq":6,"colours":["Black","White","Flamingo","Chartreuse"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A close-fitting ribbed top finished with crisp contrast binding for a clean, graphic edge.","details":"Soft ribbed knit. Contrast neckline, sleeve and hem binding. Short sleeves. Made to order.","care":"Cold gentle wash. Wash with similar colours. Do not bleach. Reshape and air dry."},{"id":"nunu-tie-waist-skirt-set","name":"Nunu Tie-waist Skirt Set","category":"two-pieces","retailPrice":300,"wholesalePrice":160,"moq":6,"colours":["Black","Olive"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A coordinated tie-waist skirt set designed as an easy statement piece.","details":"Two-piece set. Tie-waist skirt. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape and air dry."},{"id":"tube-top-set","name":"Tube Top Set","category":"two-pieces","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Yellow","Black","Grey"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A clean tube-top set with a streamlined, coordinated silhouette.","details":"Two-piece set. Strapless tube top. Coordinated bottoms. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape and air dry."},{"id":"halter-neck-top","name":"Halter Neck Top","category":"tops","retailPrice":100,"wholesalePrice":70,"moq":6,"colours":["White","Blue Black","Nude"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A minimal halter-neck top with a close, clean fit for everyday styling.","details":"Halter neckline. Fitted silhouette. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape and air dry."},{"id":"sculpted-high-neck-hugger-dress","name":"Sculpted High Neck Hugger Dress","category":"dresses","retailPrice":300,"wholesalePrice":150,"moq":6,"colours":["Black","Brown","Red","Army Green"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A floor-skimming high-neck hugger dress sculpted close through the body for a clean, elongated silhouette.","details":"High neckline. Sleeveless cut. Full-length fitted silhouette. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape while damp and air dry."},{"id":"ss-hugger-dress","name":"S.S. Hugger Dress","category":"dresses","retailPrice":300,"wholesalePrice":150,"moq":6,"colours":["Black","Brown","Nude","Army Green","Gray"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A short-sleeve maxi hugger dress with a softly flared hem and a smooth, body-defining fit.","details":"Crew neckline. Short sleeves. Sculpted maxi fit. Soft flare hem. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape and air dry."},{"id":"ls-hugger-dress","name":"LS HUGGER DRESS","category":"dresses","retailPrice":350,"wholesalePrice":160,"moq":6,"colours":["Grey","Emerald Green","Red","Black"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A long-sleeve hugger dress with a clean neckline, elongated fit and softly flared finish.","details":"Long sleeves. Full-length silhouette. Sculpted fit. Flared hem. Made to order.","care":"Cold gentle wash. Wash with similar colours. Do not bleach. Air dry."},{"id":"thin-strap-hugger-dress","name":"Thin Strap Hugger Dress","category":"dresses","retailPrice":250,"wholesalePrice":120,"moq":6,"colours":["Brown","Black","Nude","Pink","Grey","Royal Blue","Burgundy"],"sizes":["XS","S","M","L","XL","2XL"],"isNew":true,"available":true,"description":"A minimal thin-strap hugger dress cut close through the body before opening into a soft floor-length flare.","details":"Thin shoulder straps. Square-soft neckline. Full-length fitted silhouette. Flared hem. Made to order.","care":"Cold gentle wash. Do not bleach. Reshape while damp and air dry."}];

// Product imagery comes only from images.js. Edit filenames/URLs there, not here.
WGH.products.forEach(product => {
  const media = window.WGH_IMAGES?.products?.[product.id];
  if (!media) { product.images = []; product.colourImages = {}; return; }
  product.images = [...(media.all || [])];
  product.colourImages = Object.fromEntries(
    Object.entries(media.colours || {}).map(([colour, urls]) => [colour, [...urls]])
  );
  product.cardFeatureAlt = media.cardFeatureAlt || '';
});

WGH.money = amount => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(amount||0));
WGH.prettyBatch = value => {
  const raw=String(value||'').trim();
  if(!raw)return '';
  const match=raw.match(/^(?:batch\s*)?0*(\d+)$/i) || raw.match(/^batch\s*0*(\d+)(.*)$/i);
  if(match){
    const suffix=(match[2]||'').trim();
    return `Batch ${Number(match[1])}${suffix?` ${suffix}`:''}`;
  }
  return raw.replace(/\bBatch\s+0+(\d+)/gi,(_,n)=>`Batch ${Number(n)}`);
};
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

WGH.colourValue = name => ({black:'#151515',white:'#f7f5ef',cream:'#e8dfcf',ivory:'#eee9df',bone:'#ddd3c3',nude:'#d3b69c',brown:'#65402f','dark brown':'#4b2d23',cocoa:'#593d32',mocha:'#806451',espresso:'#3d2b24',sand:'#c9b79c',stone:'#999186',taupe:'#9b8b79',camel:'#b98b63',oat:'#d9ccb6',mushroom:'#988979',dust:'#bea99d',grey:'#8f9297',gray:'#8f9297','baby blue':'#b8d8ef',pink:'#ed8db2',flamingo:'#f45b8c',chartreuse:'#b7d92f',red:'#bd1725',orange:'#e66524',curry:'#d99a18','army green':'#626747',olive:'#6f7638','blue black':'#171b2b','emerald green':'#0c6b4f','royal blue':'#2452a4',burgundy:'#6d1733',yellow:'#f2cf63'}[String(name||'').toLowerCase()]||'#b7aea5');
WGH.productCard = (p,mode='retail') => { const colours=(p.colours||[]); const imageMap=p.colourImages||{}; const wholesaleReady=Number(p.wholesalePrice)>0; const priceLabel=mode==='wholesale'?(wholesaleReady?WGH.money(p.wholesalePrice):'Wholesale price pending'):WGH.money(p.retailPrice); return `<article class="product-card" data-product-card="${p.id}" data-feature-alt="${p.cardFeatureAlt?'1':'0'}"><a href="product.html?id=${encodeURIComponent(p.id)}&mode=${mode}" aria-label="View ${p.name}"><div class="product-card-image" data-card-gallery><img class="primary-image" data-card-image src="${p.images?.[0]||''}" alt="${p.name}" loading="lazy"><img class="hover-image" src="${p.cardFeatureAlt||p.images?.[1]||p.images?.[0]||''}" alt="${p.name} alternate colour" loading="lazy"></div><div class="product-card-copy"><div><h3>${p.name}</h3><p>${mode==='wholesale'?'MOQ '+p.moq+' · mix colours & sizes':'Made to order'}</p></div><strong>${priceLabel}</strong></div></a>${colours.length?`<div class="card-colours" aria-label="Available colours">${colours.map((c,i)=>`<button type="button" data-card-colour="${c}" data-card-src="${(imageMap[c]||[])[0]||p.images?.[i]||p.images?.[0]||''}" title="${c}" aria-label="Show ${c}"><i style="--swatch:${p.colourHexes?.[c]||WGH.colourValue(c)}"></i></button>`).join('')}<small data-card-colour-name>${colours[0]}</small></div>`:''}<button class="wishlist-card-button" type="button" data-wishlist="${p.id}" aria-label="Save ${p.name}"><i class="fa-regular fa-heart"></i></button></article>` };
WGH.loadProducts = async()=>{try{const data=await WGH.api('/catalog');if(Array.isArray(data)&&data.length){const legacy=new Set(['sculpt-column-dress','contour-button-top','signature-two-piece','second-skin-tee','tailored-flow-pants','soft-drape-mini','clean-line-vest','soft-knit-set']);const base=new Map(WGH.products.map(p=>[p.id,p]));data.filter(o=>!legacy.has(o.id)).forEach(o=>{const prev=base.get(o.id)||{};base.set(o.id,{...prev,...o})});WGH.products=[...base.values()].filter(p=>p.active!==false)}}catch{}return WGH.products};
WGH.bindProductCards = root=>{
  (root||document).querySelectorAll('[data-product-card]').forEach(card=>{
    const img=card.querySelector('[data-card-image]'),
          hover=card.querySelector('.hover-image'),
          name=card.querySelector('[data-card-colour-name]'),
          gallery=card.querySelector('[data-card-gallery]');
    let touched=false,startX=0,manualIndex=0;
    const buttons=[...card.querySelectorAll('[data-card-colour]')];
    const shopPage=document.body.classList.contains('shop-page');
    const featureAlt=card.dataset.featureAlt==='1';
    const featureAltSrc=featureAlt&&hover?hover.getAttribute('src'):'';

    const set=(b,{instant=false}={})=>{
      if(!b||!img)return;
      const index=Math.max(0,buttons.indexOf(b));
      manualIndex=index;
      card.dataset.activeColour=b.dataset.cardColour||'';
      buttons.forEach(x=>x.classList.toggle('active',x===b));
      if(name)name.textContent=b.dataset.cardColour||'';
      const swap=()=>{
        img.src=b.dataset.cardSrc||img.src;
        if(hover){
          if(featureAlt&&b.dataset.cardColour==='Black'&&featureAltSrc){
            hover.src=featureAltSrc;
          }else{
            const next=buttons[(index+1)%Math.max(buttons.length,1)];
            hover.src=next?.dataset.cardSrc||b.dataset.cardSrc||hover.src;
          }
        }
      };
      if(instant){swap();return;}
      img.classList.add('is-changing');
      setTimeout(()=>{swap();img.classList.remove('is-changing')},110);
    };

    buttons.forEach(b=>{
      if(!shopPage)b.addEventListener('mouseenter',()=>set(b));
      b.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();touched=true;set(b);
      });
    });

    if(!shopPage&&!featureAlt){
      gallery?.addEventListener('mouseenter',()=>{
        if(touched||buttons.length<2)return;
        set(buttons[(manualIndex+1)%buttons.length]);
      });
      gallery?.addEventListener('mouseleave',()=>{
        if(touched||!buttons.length)return;
        set(buttons[0]);
      });
    }

    gallery?.addEventListener('touchstart',e=>startX=e.touches[0].clientX,{passive:true});
    gallery?.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-startX;
      if(Math.abs(dx)<35||!buttons.length)return;
      touched=true;
      let i=Math.max(0,buttons.findIndex(b=>b.classList.contains('active')));
      i=(i+(dx<0?1:-1)+buttons.length)%buttons.length;
      set(buttons[i]);
    },{passive:true});

    if(buttons[0])set(buttons[0],{instant:true});
    card._wghSetColour=set;
    card._wghTouched=()=>touched;
  });

  (root||document).querySelectorAll('[data-wishlist]').forEach(btn=>{
    const read=()=>{try{return JSON.parse(localStorage.getItem('wgh_wishlist')||'[]')}catch{return[]}},
          sync=()=>{const on=read().includes(btn.dataset.wishlist);btn.classList.toggle('saved',on);btn.innerHTML=`<i class="fa-${on?'solid':'regular'} fa-heart"></i>`};
    sync();
    btn.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      let a=read();
      a=a.includes(btn.dataset.wishlist)?a.filter(x=>x!==btn.dataset.wishlist):[...a,btn.dataset.wishlist];
      localStorage.setItem('wgh_wishlist',JSON.stringify(a));
      sync();
      WGH.showToast(a.includes(btn.dataset.wishlist)?'Saved for later.':'Removed from saved items.','success');
    };
  });
};

WGH.panelCopy = {
  size:`<p class="eyebrow">Size guide</p><h2>Find your fit.</h2><p>Use this guide as a general reference. Measurements are in inches. If you are between sizes, choose the fit you prefer.</p><table><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody><tr><td>XS</td><td>30–32</td><td>24–26</td><td>34–36</td></tr><tr><td>S</td><td>32–34</td><td>26–28</td><td>36–38</td></tr><tr><td>M</td><td>34–36</td><td>28–30</td><td>38–40</td></tr><tr><td>L</td><td>36–39</td><td>30–33</td><td>40–43</td></tr><tr><td>XL</td><td>39–42</td><td>33–36</td><td>43–46</td></tr></tbody></table><p>Need help choosing? Contact us before placing your order.</p>`,
  faq:`<p class="eyebrow">FAQ</p><h2>Questions, answered.</h2><details open><summary>Are your pieces ready made?</summary><p>No. Our collection is made to order. Production begins after your paid order is assigned to a weekly production cycle.</p></details><details><summary>How long does my order take?</summary><p>Estimated delivery is 14 to 21 days after your assigned production cycle closes. We aim to complete and dispatch earlier whenever possible.</p></details><details><summary>What is the wholesale minimum?</summary><p>The standard minimum is 6 pieces per style. You may mix available colours and sizes within the 6 pieces.</p></details><details><summary>How do I track my order?</summary><p>Use your WGH order number and checkout email in Track Order. You can see each major stage without contacting us.</p></details><details><summary>Can my order move to a later cycle?</summary><p>Yes. If the current cycle reaches production capacity, new paid orders move automatically to the next available cycle.</p></details>`,
  policy:`<p class="eyebrow">Wholesale & retail policy</p><h2>Order with confidence.</h2><h3>Made to order</h3><p>All clothing is produced after purchase. Please review your size, colour, quantity and delivery details carefully before payment.</p><h3>Wholesale minimum</h3><p>Wholesale orders require at least 6 pieces per style. Available colours and sizes may be mixed within that minimum.</p><h3>Production cycle</h3><p>Orders are assigned to production cycles based on available capacity. If a cycle is full, the order moves to the next available cycle. Estimated timelines are shown as guidance rather than guaranteed delivery dates.</p><h3>Delivery fees</h3><p>Delivery is not charged at checkout. The applicable delivery fee is communicated after your order is confirmed, based on destination and delivery arrangement. Pickup is available from Joy City & The Clock Bar where offered.</p><h3>Changes, returns & refunds</h3><p>Because each piece is made to order, changes or change-of-mind cancellations may not be possible once production has started. If an item arrives damaged, defective, incorrect or materially different from what was ordered, contact us promptly so the order can be reviewed and an appropriate resolution arranged. Nothing in this policy limits rights that apply under Ghanaian law.</p><h3>Privacy & account data</h3><p>We use the details you provide to create and secure your account, process payment, fulfil and track orders, provide customer support and prevent fraud. Marketing emails are optional and are sent only when you subscribe or opt in. Transactional account and order emails are sent when needed to provide the service.</p><h3>Support</h3><p>For order, sizing or policy questions, contact us on WhatsApp at 0533357961, Instagram @the.wholesalegh, or email <a href="mailto:twholesalegh@gmail.com">twholesalegh@gmail.com</a>.</p>`,
  contact:`<p class="eyebrow">Contact</p><h2>We are here to help.</h2><p>For product questions, sizing support or an existing order, use the option that works best for you.</p><div class="contact-actions"><a class="button button-dark" href="https://wa.me/233533357961" target="_blank" rel="noopener">WhatsApp</a><a class="button button-outline" href="mailto:twholesalegh@gmail.com">Email us</a><a class="button button-outline" href="https://instagram.com/the.wholesalegh" target="_blank" rel="noopener">Instagram</a></div>`
};

WGH.openLayer = el => {if(!el)return;document.body.classList.add('no-scroll');document.querySelector('[data-drawer-backdrop]')?.classList.add('active');el.classList.add('active');el.setAttribute('aria-hidden','false')};
WGH.closeLayers = () => {document.body.classList.remove('no-scroll');document.querySelector('[data-drawer-backdrop]')?.classList.remove('active');document.querySelectorAll('.mobile-drawer,.side-panel,.info-panel').forEach(el=>{el.classList.remove('active');el.setAttribute('aria-hidden','true')})};
WGH.api = async (path,body,options={}) => {
  const headers={'Content-Type':'application/json',...(options.headers||{})};
  if(options.auth&&WGH.auth?.currentUser){const token=await WGH.auth.currentUser.getIdToken(false);headers.Authorization=`Bearer ${token}`;}
  const response=await fetch(`${WGH.API_BASE}${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
  let data={};try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(WGH.friendlyError(data.error||'We could not complete that request. Please try again.'));
  return data;
};

WGH.statuses=['order_confirmed','payment_received','cycle_assigned','cycle_closed','production','quality_control','packaging','ready_dispatch','dispatched','delivered'];
WGH.statusLabels={order_confirmed:'Order Confirmed',payment_received:'Payment Received',cycle_assigned:'Order Cycle Assigned',cycle_closed:'Order Cycle Closed',production:'Production',quality_control:'Quality Control',packaging:'Packaging',ready_dispatch:'Ready for Dispatch',dispatched:'Dispatched',delivered:'Delivered'};
WGH.renderTracking = order => {
  const current=Math.max(0,WGH.statuses.indexOf(order.status));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<section class="drawer-track-premium">
    <div class="drawer-track-hero"><div><span class="mini-label">${esc(order.orderNumber||'Your order')}</span><h3>${esc(WGH.statusLabels[order.status]||'In progress')}</h3><p>${order.estimatedDelivery?`Estimated delivery ${esc(order.estimatedDelivery)}`:'Your delivery estimate will update as production moves forward.'}</p></div><div class="track-cycle-badge"><span>Production cycle</span><strong>${esc(WGH.prettyBatch(order.batchName)||'Assigned')}</strong></div></div>
    <div class="drawer-stage-progress"><i style="width:${Math.max(5,((current+1)/WGH.statuses.length)*100)}%"></i></div>
    <div class="drawer-track-steps">${WGH.statuses.map((stage,i)=>`<div class="drawer-track-step ${i<current?'done':i===current?'current':''}"><span class="drawer-step-dot">${i<current?'<i class="fa-solid fa-check"></i>':''}</span><div><strong>${esc(WGH.statusLabels[stage])}</strong>${i===current?'<small>Current stage</small>':i<current?'<small>Completed</small>':''}</div></div>`).join('')}</div>
    <a class="drawer-track-open" href="tracking.html?order=${encodeURIComponent(order.orderNumber||'')}">Open full tracking <i class="fa-solid fa-arrow-right"></i></a>
  </section>`;
};

async function initFirebase(){
  try{
    const config=await WGH.api('/config');
    if(window.firebase&&config.firebase?.apiKey){
      let storeApp=firebase.apps.find(a=>a.name==='wgh-storefront');
      if(!storeApp)storeApp=firebase.initializeApp(config.firebase,'wgh-storefront');
      WGH.auth=storeApp.auth();
      await WGH.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      WGH.db=firebase.firestore?.();
      WGH.auth.onIdTokenChanged(async user=>{
        WGH.currentUser=user||null;
        document.body.classList.toggle('user-signed-in',!!user);
        const labels=[...document.querySelectorAll('[data-account-status]')];
        if(!user){
          WGH.currentProfile=null;
          labels.forEach(el=>{el.textContent='';el.hidden=true});
          window.dispatchEvent(new CustomEvent('wgh:auth',{detail:{user:null,profile:null}}));
          return;
        }
        try{const session=await WGH.api('/session-role',undefined,{auth:true});if(session?.role==='admin'){await WGH.auth.signOut();WGH.currentUser=null;WGH.currentProfile=null;labels.forEach(el=>{el.textContent='';el.hidden=true});return;}}catch{}
        let profile=null;
        try{profile=await WGH.api('/account/profile',undefined,{auth:true});}catch{}
        WGH.currentProfile=profile||null;
        const fallback=String(user.displayName||user.email||'Account').trim().split(/[\s@]+/)[0];
        const firstName=String(profile?.firstName||fallback||'Account').trim().split(/\s+/)[0];
        labels.forEach(el=>{el.textContent=firstName;el.hidden=false;el.setAttribute('aria-label',`Signed in as ${firstName}`)});
        window.dispatchEvent(new CustomEvent('wgh:auth',{detail:{user,profile}}));
      });
    }
  }catch(err){console.warn('Account services are not available yet.');}
}

function initSocialLinks(){
  document.querySelectorAll('a[aria-label="Snapchat"]').forEach(link=>{
    link.href='https://www.snapchat.com/add/the.wholesalegh';
    link.target='_blank';
    link.rel='noopener';
  });
}

function initHeader(){
  const header=document.getElementById('siteHeader');
  let lastY=Math.max(0,window.scrollY),ticking=false;
  const apply=()=>{
    const y=Math.max(0,window.scrollY),delta=y-lastY;
    if(header){
      header.classList.toggle('scrolled',y>24||document.body.classList.contains('shop-page')||document.body.classList.contains('product-page'));
      document.body.classList.toggle('at-page-top',y<8);
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
    e.preventDefault();const btn=form.querySelector('button[type="submit"]');const panel=form.closest('[data-track-panel]')||form.parentElement;const out=panel.querySelector('[data-tracking-result]');
    panel.classList.add('tracking-loading');
    await WGH.withLoading(btn,async()=>{
      const values=Object.fromEntries(new FormData(form));
      try{
        const order=await WGH.api('/track',values);
        form.hidden=true; panel.querySelectorAll(':scope > .eyebrow,:scope > h2').forEach(el=>el.hidden=true);
        out.innerHTML=WGH.renderTracking(order);out.classList.add('loaded');
        out.insertAdjacentHTML('afterbegin','<button class="track-drawer-back" type="button" data-track-drawer-back><i class="fa-solid fa-arrow-left"></i> Track another order</button>');
        out.querySelector('[data-track-drawer-back]').onclick=()=>{out.innerHTML='';out.classList.remove('loaded');form.hidden=false;panel.querySelectorAll(':scope > .eyebrow,:scope > h2').forEach(el=>el.hidden=false)};
      }catch(err){out.innerHTML=`<div class="friendly-message"><strong>We could not find that order.</strong><p>Check the order number and the email used at checkout, then try again.</p></div>`}
    },'Finding your order');
    panel.classList.remove('tracking-loading');
  }));
}

function initNewsletter(){
  const hydrate=()=>document.querySelectorAll('[data-newsletter-form] input[type="email"]').forEach(input=>{if(WGH.auth?.currentUser?.email&&!input.value)input.value=WGH.auth.currentUser.email});
  setTimeout(hydrate,800);setTimeout(hydrate,1800);window.addEventListener('wgh:auth',hydrate);
  document.querySelectorAll('[data-newsletter-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('button[type="submit"]');await WGH.withLoading(btn,async()=>{const email=String(new FormData(form).get('email')||form.querySelector('input[type="email"]')?.value||'').trim();await WGH.api('/newsletter',{email},{auth:!!WGH.auth?.currentUser});WGH.showToast('You are on the list.','success')},'Joining')}));
}


function initHome(){
  const rail=document.querySelector('[data-featured-products]');if(rail)WGH.loadProducts().then(()=>{const featuredIds=['sculpted-high-neck-hugger-dress','ruffle-button-top','ruched-waist-pants','nunu-tie-waist-skirt-set','drapped-halter-mini-dress'];const featured=featuredIds.map(id=>WGH.products.find(p=>p.id===id)).filter(Boolean);rail.innerHTML=featured.map(p=>WGH.productCard(p)).join('');WGH.bindProductCards(rail)});
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


function initAccountMenu(){
  document.querySelectorAll('.account-header-link').forEach(link=>{
    if(link.closest('.account-menu-wrap'))return;
    const wrap=document.createElement('div');wrap.className='account-menu-wrap';link.parentNode.insertBefore(wrap,link);wrap.appendChild(link);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='account-menu-mobile-toggle';toggle.setAttribute('aria-label','Account options');toggle.innerHTML='<i class="fa-solid fa-chevron-down"></i>';wrap.appendChild(toggle);
    const menu=document.createElement('div');menu.className='account-hover-menu';menu.innerHTML='<a href="account.html"><i class="fa-regular fa-user"></i><span>My account</span></a><a href="saved.html"><i class="fa-regular fa-heart"></i><span>Saved pieces</span></a><button type="button" data-edit-account-global><i class="fa-regular fa-pen-to-square"></i><span>Edit account details</span></button><button type="button" data-header-signout><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Sign out</span></button>';wrap.appendChild(menu);
    toggle.onclick=e=>{e.preventDefault();wrap.classList.toggle('open')};
    menu.querySelector('[data-header-signout]').onclick=async()=>{if(WGH.auth?.currentUser)await WGH.auth.signOut();location.href='account.html'};
    menu.querySelector('[data-edit-account-global]').onclick=()=>openAccountEditor();
    const sync=()=>{const signed=!!WGH.auth?.currentUser;toggle.hidden=!signed;menu.querySelector('[data-header-signout]').hidden=!signed;menu.querySelector('[data-edit-account-global]').hidden=!signed;if(!signed)wrap.classList.remove('open')};
    sync();window.addEventListener('wgh:auth',sync);
  });
}

async function openAccountEditor(){
  if(!WGH.auth?.currentUser){location.href='account.html';return;}
  let drawer=document.querySelector('[data-account-editor-global]');
  if(!drawer){
    drawer=document.createElement('aside');drawer.className='side-panel account-editor-global';drawer.dataset.accountEditorGlobal='';drawer.setAttribute('aria-hidden','true');drawer.innerHTML=`<button class="drawer-close" type="button" data-account-editor-close>×</button><p class="eyebrow">Account details</p><h2>Keep your details current.</h2><p class="account-editor-intro">Your saved delivery details prefill future checkouts. Changing your email requires a six-digit verification code.</p><form class="stack-form" data-global-profile-form><div class="field-grid"><label>First name<input name="firstName" required></label><label>Last name<input name="lastName" required></label><label class="full-field">Phone<input name="phone" required></label><label class="full-field">Default address<input name="address"></label><label>City<input name="city"></label><label>Region<input name="region"></label><label class="full-field">Country<input name="country" value="Ghana"></label></div><button class="button button-dark full" type="submit">Save account details</button></form><div class="account-email-change"><span class="mini-label">Sign-in email</span><strong data-current-account-email></strong><button class="text-link" type="button" data-start-email-change>Change email</button><form class="stack-form email-change-form" data-email-change-form hidden><label>New email<input type="email" name="email" required></label><button class="button button-outline full" type="submit">Send verification code</button></form><form class="stack-form email-code-form" data-email-code-form hidden><label>Verification code<input name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required></label><button class="button button-dark full" type="submit">Verify & change email</button></form><p class="auth-message" data-account-editor-message></p></div>`;document.body.appendChild(drawer);
    drawer.querySelector('[data-account-editor-close]').onclick=WGH.closeLayers;
    drawer.querySelector('[data-start-email-change]').onclick=()=>drawer.querySelector('[data-email-change-form]').hidden=false;
    drawer.querySelector('[data-global-profile-form]').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button');await WGH.withLoading(btn,async()=>{try{await WGH.api('/account/profile',Object.fromEntries(new FormData(e.currentTarget)),{auth:true});WGH.showToast('Account details saved.','success');window.dispatchEvent(new Event('wgh:profile-updated'))}catch(err){WGH.showToast(err)}},'Saving')};
    drawer.querySelector('[data-email-change-form]').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),email=new FormData(e.currentTarget).get('email');await WGH.withLoading(btn,async()=>{try{await WGH.api('/account/begin-email-change',{email},{auth:true});drawer.dataset.pendingEmail=email;drawer.querySelector('[data-email-code-form]').hidden=false;drawer.querySelector('[data-account-editor-message]').textContent=`Code sent to ${email}.`}catch(err){drawer.querySelector('[data-account-editor-message]').textContent=WGH.friendlyError(err)}},'Sending code')};
    drawer.querySelector('[data-email-code-form]').onsubmit=async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('button'),code=new FormData(e.currentTarget).get('code');await WGH.withLoading(btn,async()=>{try{await WGH.api('/account/complete-email-change',{email:drawer.dataset.pendingEmail,code},{auth:true});await WGH.auth.currentUser.getIdToken(true);await WGH.auth.currentUser.reload().catch(()=>{});drawer.querySelector('[data-current-account-email]').textContent=drawer.dataset.pendingEmail;drawer.querySelector('[data-account-editor-message]').textContent='Email changed and verified.';WGH.showToast('Email address updated.','success')}catch(err){drawer.querySelector('[data-account-editor-message]').textContent=WGH.friendlyError(err)}},'Verifying')};
  }
  try{const p=await WGH.api('/account/profile',undefined,{auth:true});const f=drawer.querySelector('[data-global-profile-form]');['firstName','lastName','phone','address','city','region','country'].forEach(k=>{if(f.elements[k])f.elements[k].value=p[k]||''});drawer.querySelector('[data-current-account-email]').textContent=WGH.auth.currentUser.email||p.email||'';}catch{}
  WGH.openLayer(drawer);
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  WGH.updateCartCount();initIcons();initSocialLinks();initHeader();initDrawers();initTracking();initNewsletter();initHome();initAccountMenu();initFirebase();
});
