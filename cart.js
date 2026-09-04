(() => {
  let cart=WGH.getCart();
  const itemsEl=document.querySelector('[data-cart-items]');
  const emptyEl=document.querySelector('[data-cart-empty]');
  const summary=document.querySelector('[data-order-summary]');
  const subtotal=()=>cart.reduce((sum,item)=>sum+Number(item.unitPrice||0)*Number(item.totalQuantity||0),0);
  const fee=()=>WGH.processingFee(subtotal());
  const total=()=>subtotal()+fee();

  function render(){
    const empty=!cart.length;emptyEl.hidden=!empty;summary.hidden=empty;
    itemsEl.innerHTML=cart.map((item,index)=>`<article class="cart-item refined-cart-item"><a class="cart-item-image" href="product.html?id=${item.productId}&mode=${item.orderType}"><img src="${item.image}" alt="${item.name}"></a><div class="cart-item-info"><div class="cart-item-topline"><p class="eyebrow">${item.orderType}</p><strong class="cart-item-price mobile-price">${WGH.money(item.unitPrice*item.totalQuantity)}</strong></div><h3>${item.name}</h3><div class="cart-item-meta">${item.totalQuantity} piece${item.totalQuantity===1?'':'s'} · ${WGH.money(item.unitPrice)} each</div><div class="cart-item-variants">${item.variants.map(v=>`<div><span>${v.colour}</span><span>Size ${v.size}</span><strong>Qty ${v.quantity}</strong></div>`).join('')}</div><div class="cart-item-actions"><button type="button" data-edit="${index}">Change options</button><button type="button" data-remove="${index}">Remove</button></div></div><strong class="cart-item-price desktop-price">${WGH.money(item.unitPrice*item.totalQuantity)}</strong></article>`).join('');
    document.querySelector('[data-subtotal]').textContent=WGH.money(subtotal());
    document.querySelector('[data-processing-fee]').textContent=WGH.money(fee());
    document.querySelector('[data-total]').textContent=WGH.money(total());
    document.querySelector('[data-checkout-subtotal]').textContent=WGH.money(subtotal());
    document.querySelector('[data-checkout-fee]').textContent=WGH.money(fee());
    document.querySelector('[data-checkout-total]').textContent=WGH.money(total());
    document.querySelector('[data-checkout-items]').innerHTML=cart.map(item=>`<div class="checkout-review-item"><img src="${item.image}" alt=""><div><strong>${item.name}</strong><span>${item.totalQuantity} piece${item.totalQuantity===1?'':'s'} · ${item.orderType}</span><small>${item.variants.map(v=>`${v.quantity} ${v.colour} / ${v.size}`).join(' · ')}</small></div><strong>${WGH.money(item.unitPrice*item.totalQuantity)}</strong></div>`).join('');
    WGH.updateCartCount();
    document.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{cart.splice(+b.dataset.remove,1);WGH.saveCart(cart);render();WGH.showToast('Item removed from your bag.')}));
    document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const i=cart[+b.dataset.edit];location.href=`product.html?id=${i.productId}&mode=${i.orderType}`}));
  }

  function estimatedCycle(){
    const now=new Date(),day=now.getDay(),daysToSunday=(7-day)%7,close=new Date(now);close.setDate(now.getDate()+daysToSunday);close.setHours(23,59,59,999);const start=new Date(close),end=new Date(close);start.setDate(close.getDate()+14);end.setDate(close.getDate()+21);const fmt=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});return {name:'Current weekly cycle',delivery:`${fmt(start)} – ${fmt(end)}`};
  }
  const cycle=estimatedCycle();document.querySelector('[data-delivery-preview]').textContent=`Current estimate: ${cycle.delivery}`;document.querySelector('[data-cycle-name]').textContent=cycle.name;document.querySelector('[data-cycle-delivery]').textContent=cycle.delivery;
  const area=document.querySelector('[data-cart-delivery-area]'),areaOut=document.querySelector('[data-cart-delivery-estimate]');if(area){area.value=sessionStorage.getItem('wgh_delivery_area')||'';const syncArea=()=>{sessionStorage.setItem('wgh_delivery_area',area.value);const copy={accra:'Local delivery estimate will be confirmed with your exact address.',tema:'Tema delivery estimate will be confirmed with your exact address.',kumasi:'Kumasi delivery is available; the final fee is calculated before dispatch.',ghana:'Nationwide Ghana delivery is available. Final fee depends on location.',international:'International order — delivery timing and fee are confirmed separately.'};areaOut.textContent=copy[area.value]||'Delivery pricing will be confirmed at checkout.'};area.onchange=syncArea;syncArea()}

  const drawer=document.querySelector('[data-checkout-drawer]');
  document.querySelector('[data-checkout-open]')?.addEventListener('click',e=>{if(!cart.length)return;WGH.setLoading(e.currentTarget,true,'Opening checkout');setTimeout(()=>{WGH.setLoading(e.currentTarget,false);drawer.classList.add('active');drawer.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');const email=document.querySelector('[data-checkout-form] [name="email"]');if(WGH.auth?.currentUser?.email&&!email.value)email.value=WGH.auth.currentUser.email;},260)});
  document.querySelector('[data-checkout-close]')?.addEventListener('click',()=>{drawer.classList.remove('active');drawer.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll')});

  document.querySelector('[data-checkout-form]').addEventListener('submit',async e=>{
    e.preventDefault();if(!cart.length)return;const form=e.currentTarget,btn=form.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(form));
    await WGH.withLoading(btn,async()=>{
      try{
        const payload={customer:{firstName:data.firstName,lastName:data.lastName,email:data.email,phone:data.phone,address:data.address,city:data.city,region:data.region},items:cart,madeToOrderAccepted:data.madeToOrderAccepted==='on'};
        const init=await WGH.api('/initialize-payment',payload,{auth:!!WGH.auth?.currentUser});
        document.querySelector('[data-checkout-fee]').textContent=WGH.money(init.processingFee);document.querySelector('[data-checkout-total]').textContent=WGH.money(init.total);
        if(!window.PaystackPop)throw new Error('Secure payment did not load. Please refresh the page and try again.');
        const popup=new PaystackPop();
        popup.newTransaction({key:init.publicKey,email:data.email,amount:init.amountKobo,reference:init.reference,currency:'GHS',onSuccess:async tx=>{const verifyBtn=btn;WGH.setLoading(verifyBtn,true,'Confirming payment');try{const confirmed=await WGH.api('/verify-payment',{reference:tx.reference});completeOrder(confirmed,data.email)}catch(err){WGH.showToast(err)}finally{WGH.setLoading(verifyBtn,false)}},onCancel:()=>WGH.showToast('Payment was not completed. Your bag is still here.')});
      }catch(err){WGH.showToast(err);}
    },'Preparing payment');
  });

  function completeOrder(order,email){
    const local={...order,email,status:order.status||'order_confirmed'};const orders=JSON.parse(localStorage.getItem(WGH.ORDER_KEY)||'[]');orders.unshift(local);localStorage.setItem(WGH.ORDER_KEY,JSON.stringify(orders.slice(0,20)));WGH.saveCart([]);cart=[];drawer.classList.remove('active');document.body.classList.remove('no-scroll');document.querySelector('[data-success-order]').textContent=order.orderNumber;document.querySelector('[data-success-batch]').textContent=order.batchName;document.querySelector('[data-success-delivery]').textContent=order.estimatedDelivery;document.querySelector('[data-success-screen]').hidden=false;render();
  }
  document.querySelector('[data-share-cart]')?.addEventListener('click',async()=>{if(!cart.length)return;const text=['The Wholesale Ghana bag',...cart.map(i=>`${i.name} — ${i.totalQuantity} piece${i.totalQuantity===1?'':'s'} — ${WGH.money(i.unitPrice*i.totalQuantity)}`),`Total: ${WGH.money(total())}`].join('\n');try{await navigator.share({title:'My Wholesale Ghana bag',text,url:location.href})}catch{await navigator.clipboard?.writeText(text);WGH.showToast('Cart summary copied.','success')}});

  render();
})();
