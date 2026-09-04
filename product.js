(() => {
  const params=new URLSearchParams(location.search);
  const product=WGH.products.find(p=>p.id===params.get('id'))||WGH.products[0];
  let mode=params.get('mode')==='wholesale'?'wholesale':'retail';
  let colour=product.colours[0],size=product.sizes[1]||product.sizes[0],qty=1;
  let variants=[{colour:product.colours[0],size:product.sizes[1]||product.sizes[0],quantity:1}];
  const $=s=>document.querySelector(s);

  document.title=`${product.name} | The Wholesale Ghana`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',`${product.name} by The Wholesale Ghana. Shop made-to-order in retail or wholesale quantities with flexible colour and size selection.`);
  $('[data-product-name]').textContent=product.name;$('[data-breadcrumb-name]').textContent=product.name;$('[data-product-description]').textContent=product.description;$('[data-product-category]').textContent=product.category;$('[data-product-details]').textContent=product.details;
  $('[data-product-gallery]').innerHTML=[...product.images,...product.images].slice(0,4).map((src,i)=>`<figure><img src="${src}" alt="${product.name} ${i+1}" ${i?'loading="lazy"':''}></figure>`).join('');
  $('[data-colour-options]').innerHTML=product.colours.map(c=>`<button type="button" class="colour-option" data-colour="${c}"><i style="background:${colourHex(c)}"></i>${c}</button>`).join('');
  $('[data-size-options]').innerHTML=product.sizes.map(s=>`<button type="button" class="size-option" data-size="${s}">${s}</button>`).join('');

  function colourHex(c){const map={Black:'#111',Brown:'#704f3e',Cream:'#eee4d5',Nude:'#c7a48d',Cocoa:'#704b3a',Espresso:'#3b2922',Sand:'#ccb9a0',Bone:'#e9e0d5',White:'#fff',Taupe:'#a7917e',Stone:'#aaa194',Mocha:'#8a6754',Ivory:'#f5efe4',Dust:'#b7a397',Camel:'#b78a5d',Oat:'#d7c8af',Mushroom:'#9f8c7c'};return map[c]||'#b7a397'}
  function render(){
    document.querySelectorAll('[data-purchase-mode]').forEach(b=>b.classList.toggle('active',b.dataset.purchaseMode===mode));
    $('[data-retail-builder]').hidden=mode!=='retail';$('[data-wholesale-builder]').hidden=mode!=='wholesale';
    $('[data-product-price]').textContent=WGH.money(mode==='wholesale'?product.wholesalePrice:product.retailPrice);$('[data-price-note]').textContent=mode==='wholesale'?'Wholesale price per piece':'Retail price';
    document.querySelectorAll('[data-colour]').forEach(b=>b.classList.toggle('active',b.dataset.colour===colour));document.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('active',b.dataset.size===size));
    $('[data-selected-colour]').textContent=colour;$('[data-qty]').textContent=qty;
    renderVariants();
  }
  function renderVariants(){
    const holder=$('[data-variant-builder]');
    holder.innerHTML=variants.map((v,i)=>`<div class="variant-row" data-variant-index="${i}"><select data-v-colour aria-label="Colour">${product.colours.map(c=>`<option ${c===v.colour?'selected':''}>${c}</option>`).join('')}</select><select data-v-size aria-label="Size">${product.sizes.map(s=>`<option ${s===v.size?'selected':''}>${s}</option>`).join('')}</select><div class="mini-qty"><button type="button" data-v-minus>−</button><span>${v.quantity}</span><button type="button" data-v-plus>+</button></div><button type="button" class="remove-variant" data-v-remove aria-label="Remove">×</button></div>`).join('');
    const total=variants.reduce((s,v)=>s+v.quantity,0);$('[data-wholesale-count]').textContent=total;$('[data-moq-bar]').style.width=`${Math.min(100,total/product.moq*100)}%`;$('[data-moq-message]').textContent=total>=product.moq?`Minimum reached. Your ${total}-piece mix is ready.`:`Add ${product.moq-total} more piece${product.moq-total===1?'':'s'} to reach the minimum.`;
    holder.querySelectorAll('.variant-row').forEach(row=>{const i=+row.dataset.variantIndex;row.querySelector('[data-v-colour]').addEventListener('change',e=>variants[i].colour=e.target.value);row.querySelector('[data-v-size]').addEventListener('change',e=>variants[i].size=e.target.value);row.querySelector('[data-v-minus]').addEventListener('click',()=>{variants[i].quantity=Math.max(1,variants[i].quantity-1);renderVariants()});row.querySelector('[data-v-plus]').addEventListener('click',()=>{variants[i].quantity++;renderVariants()});row.querySelector('[data-v-remove]').addEventListener('click',()=>{if(variants.length>1){variants.splice(i,1);renderVariants()}})});
  }
  document.querySelectorAll('[data-purchase-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.purchaseMode;render()}));
  document.querySelectorAll('[data-colour]').forEach(b=>b.addEventListener('click',()=>{colour=b.dataset.colour;render()}));
  document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{size=b.dataset.size;render()}));
  $('[data-qty-minus]').addEventListener('click',()=>{qty=Math.max(1,qty-1);render()});$('[data-qty-plus]').addEventListener('click',()=>{qty++;render()});
  $('[data-add-variant]').addEventListener('click',()=>{variants.push({colour:product.colours[0],size:product.sizes[0],quantity:1});renderVariants()});
  $('[data-add-to-bag]').addEventListener('click',()=>{
    const total=mode==='wholesale'?variants.reduce((s,v)=>s+v.quantity,0):qty;if(mode==='wholesale'&&total<product.moq)return WGH.showToast(`Wholesale minimum is ${product.moq} pieces per style.`);
    const item={key:`${product.id}-${Date.now()}`,productId:product.id,name:product.name,image:product.images[0],orderType:mode,unitPrice:mode==='wholesale'?product.wholesalePrice:product.retailPrice,totalQuantity:total,variants:mode==='wholesale'?variants.map(v=>({...v})):[{colour,size,quantity:qty}]};const cart=WGH.getCart();cart.push(item);WGH.saveCart(cart);WGH.showToast(`${total} piece${total===1?'':'s'} added to your bag.`);
  });
  $('[data-related-products]').innerHTML=WGH.products.filter(p=>p.id!==product.id).slice(0,5).map(p=>WGH.productCard(p,mode)).join('');
  render();
})();
