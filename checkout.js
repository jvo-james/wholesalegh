(()=>{
let cart=WGH.getCart();if(!cart.length){location.replace('cart.html');return;}const form=document.querySelector('[data-checkout-form]'),items=document.querySelector('[data-checkout-items]');
const submitBtn=form.querySelector('.checkout-submit');
const subtotal=()=>cart.reduce((s,i)=>s+Number(i.unitPrice||0)*Number(i.totalQuantity||0),0),fee=()=>WGH.processingFee(subtotal()),total=()=>subtotal()+fee();

function selectedCountry(){
  const input=form.elements.country;
  try{
    if(window.jQuery&&window.jQuery.fn.countrySelect){
      const data=window.jQuery(input).countrySelect('getSelectedCountryData');
      if(data&&data.name)return {name:data.name,code:String(data.iso2||'').toUpperCase()};
    }
  }catch{}
  return {name:String(input?.value||'Ghana').trim()||'Ghana',code:String(form.elements.countryCode?.value||'GH').toUpperCase()};
}
function syncCountryState(){
  const c=selectedCountry(),isGhana=(c.code||'GH')==='GH',delivery=form.elements.fulfilment.value==='delivery';
  if(form.elements.countryCode)form.elements.countryCode.value=c.code||'GH';
  const note=document.querySelector('[data-international-note]');
  if(note)note.hidden=isGhana||!delivery;
  const ghRegion=form.elements.region,internationalRegion=form.elements.regionInternational;
  if(ghRegion){
    ghRegion.hidden=!isGhana;
    ghRegion.disabled=!delivery||!isGhana;
    ghRegion.required=delivery&&isGhana;
  }
  if(internationalRegion){
    internationalRegion.hidden=isGhana;
    internationalRegion.disabled=!delivery||isGhana;
    internationalRegion.required=delivery&&!isGhana;
  }
  validateCheckout();
}
function setupCountrySelector(){
  const input=form.elements.country;
  if(!input)return;
  if(window.jQuery&&window.jQuery.fn.countrySelect){
    const $country=window.jQuery(input);
    $country.countrySelect({defaultCountry:'gh',preferredCountries:['gh','ng','gb','us','ca','za','ke','ci','tg']});
    $country.on('change countrychange',syncCountryState);
    const data=$country.countrySelect('getSelectedCountryData');
    if(data?.name)input.value=data.name;
    if(form.elements.countryCode)form.elements.countryCode.value=String(data?.iso2||'gh').toUpperCase();
  }else{
    input.value=input.value||'Ghana';
  }
  syncCountryState();
}
function validateCheckout(){
  if(!submitBtn)return;
  const ready=form.checkValidity();
  submitBtn.disabled=!ready;
  submitBtn.setAttribute('aria-disabled',String(!ready));
  const small=submitBtn.querySelector('small');
  if(small)small.textContent=ready?'Your details are complete · continue to secure payment':'Complete the required fields to continue';
}
let abandonTimer;const saveAbandoned=()=>{clearTimeout(abandonTimer);abandonTimer=setTimeout(()=>{const email=String(form.elements.email?.value||'').trim(),phone=String(form.elements.phone?.value||'').trim();if(!email&&!phone)return;WGH.api('/abandoned-cart',{email,phone,name:`${form.elements.firstName?.value||''} ${form.elements.lastName?.value||''}`.trim(),items:cart}).catch(()=>{})},700)};form.addEventListener('input',saveAbandoned);
const render=()=>{items.innerHTML=cart.map(i=>`<article class="checkout-line-item"><img src="${i.image}" alt=""><div><strong>${i.name}</strong><span>${i.orderType} · ${i.totalQuantity} piece${i.totalQuantity===1?'':'s'}</span><small>${(i.variants||[]).map(v=>`${v.quantity}× ${v.colour} / ${v.size}`).join(' · ')}</small></div><b>${WGH.money(i.unitPrice*i.totalQuantity)}</b></article>`).join('');document.querySelector('[data-checkout-subtotal]').textContent=WGH.money(subtotal());document.querySelector('[data-checkout-fee]').textContent=WGH.money(fee());document.querySelector('[data-checkout-total]').textContent=WGH.money(total());document.querySelector('[data-review-mobile-total]').textContent=WGH.money(total())};
const pieces=cart.reduce((sum,i)=>sum+Number(i.totalQuantity||1),0);WGH.api('/capacity-preview',{pieces}).then(c=>{const el=document.querySelector('[data-batch-soft-note]');if(!el)return;el.classList.toggle('limited',!!c.limited);el.innerHTML=`<i class="fa-solid fa-layer-group"></i><div><strong>${c.veryLimited?'Current production cycle has very limited space remaining.':c.limited?'Current production cycle has limited space remaining.':'Production space is currently available.'}</strong><p>Your paid order will be assigned automatically to the earliest cycle with room for ${pieces} piece${pieces===1?'':'s'}.</p></div>`}).catch(()=>{});
const now=new Date(),close=new Date(now);close.setDate(now.getDate()+((7-now.getDay())%7));const a=new Date(close),b=new Date(close);a.setDate(a.getDate()+14);b.setDate(b.getDate()+21);const fmt=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});document.querySelector('[data-cycle-delivery]').textContent=`${fmt(a)} – ${fmt(b)}`;
const deliveryFields=document.querySelector('[data-delivery-fields]'),pickupFields=document.querySelector('[data-pickup-fields]');
function syncFulfilment(){
  const delivery=form.elements.fulfilment.value==='delivery';
  deliveryFields.hidden=!delivery;
  pickupFields.hidden=delivery;
  deliveryFields.querySelectorAll('input,select').forEach(el=>{
    if(['region','regionInternational'].includes(el.name))return;
    el.required=delivery&&['country','city','address'].includes(el.name);
  });
  document.querySelector('[data-delivery-label]').textContent=delivery?'Communicated after order':'Pickup · No delivery fee';
  syncCountryState();
  validateCheckout();
}
form.querySelectorAll('[name=fulfilment]').forEach(r=>r.addEventListener('change',syncFulfilment));
form.addEventListener('input',validateCheckout);
form.addEventListener('change',validateCheckout);
document.querySelector('[data-review-toggle]').addEventListener('click',e=>{const aside=document.querySelector('[data-order-review]');aside.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',aside.classList.contains('open'))});
async function hydrateProfile(){let tries=0;while(!WGH.auth&&tries++<30)await new Promise(r=>setTimeout(r,100));if(!WGH.auth)return;await new Promise(resolve=>{const off=WGH.auth.onAuthStateChanged(async user=>{off();if(!user)return resolve();try{const p=await WGH.api('/account/profile',undefined,{auth:true});const values={firstName:p.firstName,lastName:p.lastName,email:user.email,phone:p.phone,address:p.address,city:p.city,region:p.region,country:p.country||'Ghana',address2:p.address2};Object.entries(values).forEach(([k,v])=>{if(k==='region')return;if(form.elements[k]&&v)form.elements[k].value=v});
if(values.country&&window.jQuery&&window.jQuery.fn.countrySelect){
  try{
    const isoByName={ghana:'gh',nigeria:'ng','united kingdom':'gb','united states':'us',canada:'ca','south africa':'za',kenya:'ke'};
    const iso=isoByName[String(values.country).toLowerCase()];
    if(iso)window.jQuery(form.elements.country).countrySelect('selectCountry',iso);
  }catch{}
}
syncCountryState();
if(values.region){
  const c=selectedCountry();
  if(c.code==='GH'&&form.elements.region)form.elements.region.value=values.region;
  else if(form.elements.regionInternational)form.elements.regionInternational.value=values.region;
}
['firstName','lastName','email','phone'].forEach(k=>{if(form.elements[k]){form.elements[k].readOnly=true;form.elements[k].classList.add('locked-field')}});document.querySelector('[data-saved-profile-note]').hidden=false;syncCountryState();validateCheckout();}catch{}resolve();});});}
form.addEventListener('submit',async e=>{e.preventDefault();validateCheckout();if(submitBtn?.disabled){form.reportValidity();return;}const btn=submitBtn,data=Object.fromEntries(new FormData(form));const country=selectedCountry();data.country=country.name;data.countryCode=country.code;data.region=country.code==='GH'?String(form.elements.region?.value||''):String(form.elements.regionInternational?.value||'');await WGH.withLoading(btn,async()=>{try{if(WGH.auth?.currentUser&&data.fulfilment==='delivery')await WGH.api('/account/profile',{address:data.address,address2:data.address2,city:data.city,region:data.region,country:data.country},{auth:true});const customer={firstName:data.firstName,lastName:data.lastName,email:data.email,phone:data.phone,address:data.fulfilment==='delivery'?data.address:'Pickup',address2:data.address2||'',city:data.fulfilment==='delivery'?data.city:'',region:data.fulfilment==='delivery'?data.region:'',country:data.country||'Ghana',countryCode:data.countryCode||'GH',fulfilment:data.fulfilment};const init=await WGH.api('/initialize-payment',{customer,items:cart,madeToOrderAccepted:data.madeToOrderAccepted==='on',fulfilment:data.fulfilment,country:data.country,countryCode:data.countryCode,notes:data.notes},{auth:!!WGH.auth?.currentUser});if(!window.PaystackPop)throw new Error('Secure payment did not load. Refresh and try again.');new PaystackPop().newTransaction({key:init.publicKey,email:data.email,amount:init.amountKobo,reference:init.reference,currency:'GHS',onSuccess:async tx=>{WGH.setLoading(btn,true,'Confirming payment');try{const order=await WGH.api('/verify-payment',{reference:tx.reference});const record={...order,email:data.email,customer,items:cart,status:order.status||'order_confirmed',fulfilment:data.fulfilment};sessionStorage.setItem('wgh_last_order',JSON.stringify(record));const orders=JSON.parse(localStorage.getItem(WGH.ORDER_KEY)||'[]');orders.unshift(record);localStorage.setItem(WGH.ORDER_KEY,JSON.stringify(orders.slice(0,20)));WGH.saveCart([]);await WGH.api('/abandoned-recovered',{email:data.email,orderNumber:order.orderNumber||''}).catch(()=>{});location.href=`confirmation.html?order=${encodeURIComponent(order.orderNumber||'')}`;}catch(err){WGH.showToast(err)}finally{WGH.setLoading(btn,false)}},onCancel:()=>WGH.showToast('Payment was not completed. Your bag is still saved.')});}catch(err){WGH.showToast(err)}},'Preparing payment')});render();setupCountrySelector();syncFulfilment();validateCheckout();hydrateProfile();
})();
