(() => {
  const grid=document.querySelector('[data-shop-grid]');if(!grid)return;
  const params=new URLSearchParams(location.search);
  let mode=params.get('mode')==='wholesale'?'wholesale':'retail';
  let category=params.get('category')||'all';
  let sort='featured';
  const titles={all:'Shop all',new:'New arrivals',tops:'Tops',dresses:'Dresses',sets:'Two-piece sets',pants:'Pants',basics:'Basics'};

  function render(){
    let list=[...WGH.products].filter(p=>category==='all'||(category==='new'?p.isNew:p.category===category));
    if(sort==='price-low')list.sort((a,b)=>(mode==='wholesale'?a.wholesalePrice:a.retailPrice)-(mode==='wholesale'?b.wholesalePrice:b.retailPrice));
    if(sort==='price-high')list.sort((a,b)=>(mode==='wholesale'?b.wholesalePrice:b.retailPrice)-(mode==='wholesale'?a.wholesalePrice:a.retailPrice));
    if(sort==='newest')list.sort((a,b)=>Number(b.isNew)-Number(a.isNew));
    grid.innerHTML=list.map(p=>WGH.productCard(p,mode)).join('');
    document.querySelector('[data-product-count]').textContent=list.length;
    document.querySelector('[data-empty-state]').hidden=list.length!==0;
    document.querySelector('[data-shop-title]').textContent=mode==='wholesale'&&category==='all'?'Wholesale':titles[category]||'Shop all';
    document.querySelector('[data-shop-subtitle]').textContent=mode==='wholesale'?'Build each style from 6 pieces and mix available colours and sizes within your minimum.':'Made-to-order pieces produced after purchase and tracked from production to delivery.';
    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===category));
    const url=new URL(location.href);mode==='retail'?url.searchParams.delete('mode'):url.searchParams.set('mode',mode);category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category);history.replaceState({},'',url);
  }

  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render()}));
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;render()}));
  const pop=document.querySelector('[data-sort-popover]');
  document.querySelector('[data-sort-toggle]').addEventListener('click',()=>pop.hidden=!pop.hidden);
  pop.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{sort=b.dataset.sort;pop.hidden=true;render()}));
  render();
})();
