const featured=['lipton-darjeeling-tea-250-g','coffee-nescafe-50g-jar','biscuit-parle-g-100g'];
const rupees = value => Number.isFinite(value) ? '₹'+value.toFixed(2) : 'Price at counter';
const venues={
  urc:{key:'bhandar.basket',easy:'../easy.html',title:'Canteen shelves',menu:'../../../menu.json',images:'../urc-products/manifest.json'},
  bakery:{key:'complex.cart.bakery',easy:'../easy.html?venue=bakery',title:'Bakehouse menu',menu:'../../bakery/data.json',images:'../easy-products/manifest.json'}
};
let venue,shop;
const catalogues=new Map();
function node(tag,text,cls){
  const el=document.createElement(tag);
  if(text!=null)el.textContent=text;
  if(cls)el.className=cls;
  return el;
}
function readBasket(){
  return EasyCore.cleanBasket(JSON.parse(localStorage.getItem(venues[venue].key)||'{}'),venue==='bakery');
}
function updateCount(){
  let count=0;try{count=Object.values(readBasket()).reduce((a,b)=>a+b,0);}catch{}
  document.querySelector('#basket').textContent=(venue==='bakery'?'Bakery basket · ':'Basket · ')+count;
}
function addItem(item){
  const msg=node('p','','success');detail.querySelector('.success')?.remove();detail.append(msg);msg.setAttribute('role','status');
  try{
    const basket=readBasket(),qty=basket[item.id]||0;
    if(qty>=99){msg.textContent='This item has reached the basket limit.';return;}
    basket[item.id]=Math.min(99,qty+(venue==='bakery'&&item.unit==='kg'?.25:1));localStorage.setItem(venues[venue].key,JSON.stringify(basket));updateCount();
    msg.textContent='Added to your basket · '+basket[item.id]+' of this item';
  }catch{msg.textContent='Your browser could not save this item.';}
}
function openBasket(){location.href=venues[venue].easy+'#list';}
function photo(item,full=false){
  if(venue==='bakery'){
    const row=shop.manifest?.items?.['bakery/'+item.id];
    return row && row.name===item.name && row.original===(item.photo||null) && /^[a-f0-9]{20}\.webp$/.test(row.file)?'../easy-products/'+row.file:null;
  }
  const path=EasyCore.photo(item,shop.manifest,full);
  return path?'../'+path:null;
}
function productImage(path,cls){
  if(!path)return node('span','Photo unavailable','placeholder');
  const img=node('img',null,cls);img.src=path;img.alt='';img.loading='lazy';img.onerror=()=>img.replaceWith(node('span','Photo unavailable','placeholder'));return img;
}
async function pick(id,illustration){
  const atVenue=venue;
  if(!shop && catalogues.has(venue)){
    try{await catalogues.get(venue);}catch{}
    if(atVenue!==venue || sheet.open)return;
  }
  const item=shop?.byId.get(id);detail.replaceChildren();sheet.setAttribute('aria-label',item?.name||'Catalogue');
  if(!item){detail.append(node('h2',shop?'Item unavailable':'Catalogue unavailable'),node('p',shop?'This pack is absent from the current catalogue.':'Open Easy shopping for the catalogue and your saved basket.'));}
  else{
    const illustrated=Number.isInteger(illustration);
    let picture;
    if(illustrated && venue==='bakery'){
      picture=node('div',null,'pack bread-closeup');
      picture.style.backgroundPosition=[18,54,92][illustration]+'% 62%';
    }else{
      picture=productImage(illustrated?'pack-'+illustration+'.webp':photo(item,true),'pack'+(illustrated?'':' reference'));
    }
    detail.append(picture,node('h2',item.name),node('p',rupees(item.price)+(venue==='bakery'&&item.unit?' / '+item.unit:''),'price'),node('p',venue==='bakery'?'Sample bakery menu. Confirm the price and availability at the counter.':'Catalogue reference. Confirm price and availability at the counter.','note'));
    const add=button(item.status==='out'?'Currently unavailable':'Add to basket',()=>addItem(item),'primary');
    add.disabled=item.status==='out';detail.append(add);
  }
  const list=node('a','View basket →');list.href=venues[venue].easy+'#list';list.style.marginLeft='12px';detail.append(list);
  sheet.showModal();
}
function drawCards(){
  const term=EasyCore.norm($('#search').value),dept=$('#group').value;
  const words=term.split(/\s+/).filter(Boolean);
  const results=shop.items.filter(i=>(!dept||shop.departments.get(i.category)===dept)&&words.every(w=>EasyCore.norm(i.name).includes(w)));
  $('#matches').textContent=results.length?results.length.toLocaleString('en-IN')+' items':'No items match your search.';
  const cards=$('#cards');cards.replaceChildren();
  for(const item of results.slice(0,shop.limit)){
    const card=button('',()=>pick(item.id),'card');
    card.append(productImage(photo(item)),node('strong',item.name),node('span',rupees(item.price)));
    if(item.status==='out')card.append(node('span','Currently unavailable','unavailable'));
    cards.append(card);
  }
  $('#more').hidden=results.length<=shop.limit;
}
function startShop(){
  window.addEventListener('storage',updateCount);window.addEventListener('pageshow',updateCount);
  $('#filters').onsubmit=e=>e.preventDefault();
  $('#search').oninput=$('#group').onchange=()=>{if(shop){shop.limit=18;drawCards();}};
  $('#more').onclick=()=>{shop.limit+=18;drawCards();};
}
async function readJSON(path){
  const response=await fetch(path);
  if(!response.ok)throw Error('Catalogue request failed');
  return response.json();
}
async function loadVenue(name){
  const config=venues[name];
  const [raw,manifest]=await Promise.all([readJSON(config.menu),readJSON(config.images).catch(()=>null)]);
  const data=name==='bakery'?EasyCore.normalizeShop(raw):raw;
  return {items:data.items,groups:data.groups,byId:new Map(data.items.map(i=>[i.id,i])),
    departments:new Map(data.categories.map(c=>[c.id,c.group])),manifest,limit:18};
}
async function showVenue(name){
  if(name===venue && (shop||catalogues.has(name)))return;
  venue=name;shop=null;
  const bakery=name==='bakery';
  $('#catalogue-title').textContent=venues[name].title;
  $('.sectionhead a').href=venues[name].easy;
  $('#sample-note').hidden=!bakery;
  $('#search').value='';$('#search').placeholder=bakery?'Search bread, cake, biscuits…':'Search tea, soap, a watch…';
  $('#search').setAttribute('aria-label',bakery?'Search the bakery menu':'Search the canteen catalogue');
  $('#group').replaceChildren(new Option(bakery?'All sections':'All departments',''));
  $('#matches').textContent='Opening the catalogue…';$('#cards').replaceChildren();$('#more').hidden=true;updateCount();
  if(!catalogues.has(name))catalogues.set(name,loadVenue(name));
  try{
    const result=await catalogues.get(name);
    if(venue!==name)return;
    shop=result;shop.limit=18;
    for(const group of shop.groups)$('#group').add(new Option(group.label,group.id));
    drawCards();
  }catch{
    catalogues.delete(name);
    if(venue===name)$('#matches').textContent='The catalogue could not be opened. Try Easy shopping or reload this page.';
  }
}
