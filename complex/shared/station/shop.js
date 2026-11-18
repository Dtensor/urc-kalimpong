const featured=['lipton-darjeeling-tea-250-g','coffee-nescafe-50g-jar','biscuit-parle-g-100g'];
const rupees = value => Number.isFinite(value) ? '₹'+value.toFixed(2) : 'Price at counter';
const shop={items:[],departments:new Map(),byId:new Map(),manifest:null,limit:18,ready:false};
const basketKey='bhandar.basket';
function node(tag,text,cls){
  const el=document.createElement(tag);
  if(text!=null)el.textContent=text;
  if(cls)el.className=cls;
  return el;
}
function readBasket(){
  return EasyCore.cleanBasket(JSON.parse(localStorage.getItem(basketKey)||'{}'),false);
}
function updateCount(){
  let count=0;try{count=Object.values(readBasket()).reduce((a,b)=>a+b,0);}catch{}
  document.querySelector('#basket').textContent='Basket · '+count;
}
function addItem(item){
  const msg=node('p','','success');detail.querySelector('.success')?.remove();detail.append(msg);msg.setAttribute('role','status');
  try{
    const basket=readBasket(),qty=basket[item.id]||0;
    if(qty>=99){msg.textContent='This item has reached the basket limit.';return;}
    basket[item.id]=qty+1;localStorage.setItem(basketKey,JSON.stringify(basket));updateCount();
    msg.textContent='Added to your basket · '+basket[item.id]+' of this item';
  }catch{msg.textContent='Your browser could not save this item.';}
}
function openBasket(){location.href='../easy.html#list';}
function photo(item,full=false){
  const path=EasyCore.photo(item,shop.manifest,full);
  return path?'../'+path:null;
}
function productImage(path,cls){
  if(!path)return node('span','Photo unavailable','placeholder');
  const img=node('img',null,cls);img.src=path;img.alt='';img.loading='lazy';img.onerror=()=>img.replaceWith(node('span','Photo unavailable','placeholder'));return img;
}
function pick(id,illustration){
  const item=shop.byId.get(id);detail.replaceChildren();sheet.setAttribute('aria-label',item?.name||'Catalogue');
  if(!item){detail.append(node('h2',shop.ready?'Item unavailable':'Catalogue unavailable'),node('p',shop.ready?'This pack is absent from the current catalogue.':'Open Easy shopping for the catalogue and your saved basket.'));}
  else{
    const illustrated=Number.isInteger(illustration);
    detail.append(productImage(illustrated?'pack-'+illustration+'.webp':photo(item,true),'pack'+(illustrated?'':' reference')),node('h2',item.name),node('p',rupees(item.price),'price'),node('p',illustrated?'Illustrated pack. Confirm price and availability at the counter.':'Catalogue reference. Confirm at the counter.','note'));
    const add=button(item.status==='out'?'Currently unavailable':'Add to basket',()=>addItem(item),'primary');
    add.disabled=item.status==='out';detail.append(add);
  }
  const list=node('a','View basket →');list.href='../easy.html#list';list.style.marginLeft='12px';detail.append(list);
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
async function startShop(){
  updateCount();
  window.addEventListener('storage',updateCount);window.addEventListener('pageshow',updateCount);
  $('#filters').onsubmit=e=>e.preventDefault();
  $('#search').oninput=$('#group').onchange=()=>{shop.limit=18;if(shop.ready)drawCards();};
  $('#more').onclick=()=>{shop.limit+=18;drawCards();};
  const json=async path=>{const r=await fetch(path);if(!r.ok)throw Error('Catalogue request failed');return r.json();};
  try{
    const [catalogue,manifest]=await Promise.all([json('../../../menu.json'),json('../urc-products/manifest.json').catch(()=>null)]);
    shop.items=catalogue.items;shop.manifest=manifest;
    shop.byId=new Map(shop.items.map(i=>[i.id,i]));shop.departments=new Map(catalogue.categories.map(c=>[c.id,c.group]));
    for(const group of catalogue.groups)$('#group').add(new Option(group.label,group.id));
    shop.ready=true;drawCards();
  }catch{$('#matches').textContent='The catalogue could not be opened. Try Easy shopping or reload this page.';}
}
