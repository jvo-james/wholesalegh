(async()=>{
  const grid=document.querySelector('[data-shop-grid]');
  if(!grid)return;
  await Promise.all([WGH.loadProducts(), WGH.loadCategories()]);

  const params=new URLSearchParams(location.search);
  let mode=params.get('mode')==='wholesale'?'wholesale':'retail';
  if(mode==='wholesale' && !WGH.products.some(p=>p.wholesaleAvailable!==false&&Number(p.wholesalePrice)>0)) mode='retail';
  let category=params.get('sale')==='1'?'sale':(params.get('category')||'all');
  let sort=params.get('sort')||'featured';
  let query='';
  let cycleTimer=null,activeCard=null,scrolling=false,scrollTimer=null;
  const titles=Object.fromEntries([['all','Shop all'],['new','New arrivals'],['sale','Deals'],...WGH.categories.map(c=>[c.id,c.name])]);
  const categoryRoot=document.querySelector('[data-category-filter]');
  if(categoryRoot){
    categoryRoot.innerHTML=`<button data-category="all" type="button">All</button><button data-category="new" type="button">New arrivals</button><button data-category="sale" type="button">Deals</button>${WGH.categories.map(c=>`<button data-category="${c.id}" type="button">${c.name}</button>`).join('')}`;
  }

  function setupSearch(){
    const toolbar=document.querySelector('.shop-toolbar');
    if(!toolbar)return;
    let box=toolbar.querySelector('.shop-search');
    if(!box){
      box=document.createElement('label');
      box.className='shop-search';
      box.innerHTML='<i class="fa-solid fa-magnifying-glass"></i><input type="search" placeholder="Search styles or colours" aria-label="Search products"><div class="shop-search-suggestions" hidden></div>';
      toolbar.appendChild(box);
    }
    const input=box.querySelector('input'),suggest=box.querySelector('.shop-search-suggestions');
    if(input.dataset.bound==='1')return;
    input.dataset.bound='1';
    input.addEventListener('input',()=>{
      query=input.value.trim().toLowerCase();
      const matches=WGH.products.filter(p=>`${p.name} ${(p.colours||[]).join(' ')}`.toLowerCase().includes(query)).slice(0,4);
      suggest.innerHTML=query?matches.map(p=>`<a href="product.html?id=${p.id}&mode=${mode}">${p.name}<small>${(p.colours||[]).slice(0,3).join(' · ')}</small></a>`).join(''):'';
      suggest.hidden=!query||!matches.length;
      render();
    });
    input.addEventListener('blur',()=>setTimeout(()=>suggest.hidden=true,160));
  }

  function setupCycling(){
    if(cycleTimer)clearInterval(cycleTimer);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const obs=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting&&e.intersectionRatio>.72).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
      activeCard=visible[0]?.target||activeCard;
    },{threshold:[.72,.85,.95]});
    grid.querySelectorAll('[data-product-card]').forEach(c=>obs.observe(c));
    cycleTimer=setInterval(()=>{
      if(scrolling||!activeCard||activeCard._wghTouched?.()||activeCard.dataset.featureAlt==='1')return;
      const btns=[...activeCard.querySelectorAll('[data-card-colour]')];
      if(btns.length<2)return;
      let i=btns.findIndex(b=>b.classList.contains('active'));
      activeCard._wghSetColour?.(btns[(i+1)%btns.length]);
    },3800);
  }

  function render(){
    let list=[...WGH.products].filter(p=>{
      const isNew=WGH.productCreatedTime(p)>0;
      const isSale=mode==='wholesale'?p.discount?.wholesale?.active:p.discount?.retail?.active;
      const categoryMatch=category==='all'||(category==='new'?isNew:category==='sale'?!!isSale:p.category===category);
      return categoryMatch&&(!query||`${p.name} ${p.category} ${(p.colours||[]).join(' ')}`.toLowerCase().includes(query));
    });
    if(mode==='wholesale')list=list.filter(p=>p.wholesaleAvailable!==false&&Number(p.wholesalePrice)>0);
    if(sort==='price-low')list.sort((a,b)=>(mode==='wholesale'?a.wholesalePrice:a.retailPrice)-(mode==='wholesale'?b.wholesalePrice:b.retailPrice));
    if(sort==='price-high')list.sort((a,b)=>(mode==='wholesale'?b.wholesalePrice:b.retailPrice)-(mode==='wholesale'?a.wholesalePrice:a.retailPrice));
    if(sort==='newest')list.sort((a,b)=>WGH.productCreatedTime(b)-WGH.productCreatedTime(a));

    grid.innerHTML=list.map(p=>WGH.productCard(p,mode)).join('');
    WGH.bindProductCards(grid);
    document.querySelector('[data-product-count]').textContent=list.length;
    document.querySelector('[data-empty-state]').hidden=!!list.length;
    document.querySelector('[data-shop-title]').textContent=mode==='wholesale'&&category==='all'?'Wholesale':titles[category]||'Shop all';
    document.querySelector('[data-shop-subtitle]').textContent=mode==='wholesale'?'Build each style from 6 pieces and mix available colours and sizes within your minimum.':'Made-to-order pieces produced after purchase and tracked from production to delivery.';

    document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===category));
    const url=new URL(location.href);
    mode==='retail'?url.searchParams.delete('mode'):url.searchParams.set('mode',mode);
    if(category==='sale'){url.searchParams.delete('category');url.searchParams.set('sale','1')}else{url.searchParams.delete('sale');category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category)}
    sort==='featured'?url.searchParams.delete('sort'):url.searchParams.set('sort',sort);
    history.replaceState({},'',url);
    setupCycling();
  }

  setupSearch();
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
  const bindCategoryButtons=()=>document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;render()});
  bindCategoryButtons();
  const pop=document.querySelector('[data-sort-popover]');
  document.querySelector('[data-sort-toggle]').onclick=()=>pop.hidden=!pop.hidden;
  pop.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{sort=b.dataset.sort;pop.hidden=true;render()});
  window.addEventListener('scroll',()=>{scrolling=true;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>scrolling=false,220)},{passive:true});
  render();

  try{
    const ids=JSON.parse(localStorage.getItem('wgh_recently_viewed')||'[]');
    const recent=WGH.products.filter(p=>ids.includes(p.id)).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)).slice(0,5);
    const sec=document.querySelector('[data-shop-recent]'),root=document.querySelector('[data-shop-recent-list]');
    if(recent.length&&sec&&root){sec.hidden=false;root.innerHTML=recent.map(p=>WGH.productCard(p,mode)).join('');WGH.bindProductCards(root)}
  }catch{}
})();
