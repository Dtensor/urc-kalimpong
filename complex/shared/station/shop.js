const featured=['lipton-darjeeling-tea-250-g','coffee-nescafe-50g-jar','biscuit-parle-g-100g'];
const rupees = value => Number.isFinite(value) ? '₹'+value.toFixed(2) : 'Price at counter';
const venues={
  urc:{key:'bhandar.basket',easy:'../easy.html',title:'Canteen shelves',menu:'../../../menu.json',images:'../urc-products/manifest.json'},
  grocery:{key:'complex.cart.grocery',easy:'../easy.html?venue=grocery',title:'Grocery shelves',menu:'../../grocery/data.json',images:'../easy-products/manifest.json'},
  sabzi:{key:'complex.cart.sabzi',easy:'../easy.html?venue=sabzi',title:'Produce at the stall',menu:'../../sabzi/data.json',images:'../easy-products/manifest.json'},
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
  return EasyCore.cleanBasket(JSON.parse(localStorage.getItem(venues[venue].key)||'{}'),venue!=='urc');
}
function updateCount(){
  if (!venue || document.querySelector('#basket').hidden) return;
  let count=0;try{const bag=readBasket();count=['sabzi','grocery'].includes(venue)?Object.keys(bag).length:Object.values(bag).reduce((a,b)=>a+b,0);}catch{}
  document.querySelector('#basket').textContent=({grocery:'Grocery list · ',bakery:'Bakery basket · ',sabzi:'Produce list · ',urc:'Basket · '}[venue])+count;
}
function addItem(item,amount=1){
  const msg=node('p','','success');detail.querySelector('.success')?.remove();detail.append(msg);msg.setAttribute('role','status');
  try{
    const basket=readBasket(),qty=basket[item.id]||0;
    if(qty+amount>99){msg.textContent='This amount would exceed the basket limit.';return;}
    basket[item.id]=qty+amount;localStorage.setItem(venues[venue].key,JSON.stringify(basket));updateCount();
    msg.textContent=item.unit==='kg'?'In your basket · '+weightLabel(basket[item.id]):'Added to your basket · '+basket[item.id]+' of this item';
  }catch{msg.textContent='Your browser could not save this item.';}
}
function openBasket(){location.href=venues[venue].easy+'#list';}
function photo(item,full=false){
  if(venue!=='urc'){
    const row=shop.manifest?.items?.[venue+'/'+item.id];
    return row && row.name===item.name && row.original===(item.photo||null) && /^[a-f0-9]{20}\.webp$/.test(row.file)?'../easy-products/'+row.file:null;
  }
  const path=EasyCore.photo(item,shop.manifest,full);
  return path?'../'+path:null;
}
function productImage(path,cls){
  if(!path)return node('span','Photo unavailable','placeholder');
  const img=node('img',null,cls);img.src=path;img.alt='';img.loading='lazy';img.onerror=()=>img.replaceWith(node('span','Photo unavailable','placeholder'));return img;
}
function weightLabel(kg){return kg<1?Math.round(kg*1000)+' g':kg+' kg';}
function sourdoughPreview(){
  const figure=node('figure',null,'loaf-preview');
  const frame=node('div',null,'loaf-frame');
  const controls=node('div',null,'loaf-views');
  controls.setAttribute('role','group');
  controls.setAttribute('aria-label','Loaf view');
  const views=[
    ['Whole loaf','whole','The baker holds a round loaf with a wheat sprig scored into its crust.'],
    ['See inside','cut','The sliced loaf shows a golden crust around an airy, cream-coloured crumb.']
  ];
  for(const [label,file,description] of views){
    const image=node('img');
    image.alt=description;
    image.hidden=file!=='whole';
    image.src='hill-sourdough-'+file+'.webp';
    const choice=button(label,()=>{
      for(const view of frame.children)view.hidden=view!==image;
      for(const control of controls.children)control.setAttribute('aria-pressed',String(control===choice));
    },'loaf-view');
    choice.setAttribute('aria-pressed',String(!image.hidden));
    frame.append(image);
    controls.append(choice);
  }
  figure.append(frame,controls);
  return figure;
}
function weightChoice(item){
  const group=node('fieldset',null,'weight-choice');
  group.append(node('legend','Choose weight'));
  const total=node('output');total.setAttribute('aria-live','polite');
  function refresh(kg){
    total.textContent=Number.isFinite(item.price)?weightLabel(kg)+' · '+rupees(Math.round(item.price*100*kg)/100):'Price at counter';
  }
  for(const kg of [.25,.5,1]){
    const label=node('label'),radio=node('input');
    radio.type='radio';radio.name='weight';radio.value=String(kg);radio.checked=kg===.25;
    radio.onchange=()=>refresh(kg);label.append(radio,weightLabel(kg));group.append(label);
  }
  group.append(total);refresh(.25);return group;
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
    if(venue==='bakery' && id==='hill-sourdough'){
      picture=sourdoughPreview();
    }else if(illustrated && venue!=='urc'){
      picture=node('div',null,'pack '+({sabzi:'produce-closeup',bakery:'bread-closeup',grocery:'grocery-closeup'}[venue]));
      picture.style.backgroundPosition=venue==='grocery'?[15,59,90][illustration]+'% 56%':venue==='sabzi'?[2,48,95][illustration]+'% 45%':[18,54,92][illustration]+'% 62%';
    }else{
      picture=productImage(illustrated?'pack-'+illustration+'.webp':photo(item,true),'pack'+(illustrated?'':' reference'));
    }
    detail.append(picture,node('h2',item.name),node('p',rupees(item.price)+(venue!=='urc'&&item.unit?' / '+item.unit:''),'price'),node('p',venue==='sabzi'?'Sample produce prices. Confirm at the stall.':venue==='bakery'?'Sample bakery menu. Confirm the price and availability at the counter.':'Catalogue reference. Confirm price and availability at the counter.','note'));
    const weights=['sabzi','grocery'].includes(venue)&&item.unit==='kg'?weightChoice(item):null;
    if(weights)detail.append(weights);
    const add=button(item.status==='out'?'Currently unavailable':'Add to basket',()=>addItem(item,weights?Number(weights.querySelector(':checked').value):item.unit==='kg'&&venue==='bakery'?.25:1),'primary');
    add.disabled=item.status==='out';detail.append(add);
  }
  const all=button('My basket',()=>window.dispatchEvent(new Event('km-open-basket')));detail.append(all);
  const list=node('a','View shop list →');list.href=venues[venue].easy+'#list';list.style.marginLeft='12px';detail.append(list);
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
    const thumbnail=venue==='bakery' && item.id==='hill-sourdough'?'hill-sourdough-whole.webp':photo(item);
    card.append(productImage(thumbnail),node('strong',item.name),node('span',rupees(item.price)+(['sabzi','grocery'].includes(venue)?' / '+item.unit:'')));
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
  const data=name==='urc'?raw:EasyCore.normalizeShop(raw);
  return {items:data.items,groups:data.groups,byId:new Map(data.items.map(i=>[i.id,i])),
    departments:new Map(data.categories.map(c=>[c.id,c.group])),manifest,limit:18};
}
async function showVenue(name){
  if(name===venue && (shop||catalogues.has(name))){updateCount();return;}
  venue=name;shop=null;
  const bakery=name==='bakery',produce=name==='sabzi';
  $('#catalogue-title').textContent=venues[name].title;
  $('.sectionhead a').href=venues[name].easy;
  $('#sample-note').hidden=name==='urc';
  $('#sample-note').textContent=name==='grocery'?'Sample grocery prices. Confirm at the counter.':produce?'Sample produce prices. Confirm at the stall.':'Sample bakery menu. Confirm prices and availability at the counter.';
  $('#search').value='';$('#search').placeholder=name==='grocery'?'Search rice, dal, tea…':produce?'Search tomatoes, iskus, greens…':bakery?'Search bread, cake, biscuits…':'Search tea, soap, a watch…';
  $('#search').setAttribute('aria-label',name==='grocery'?'Search the grocery shelves':produce?'Search the produce stall':bakery?'Search the bakery menu':'Search the canteen catalogue');
  $('#group').replaceChildren(new Option(name!=='urc'?'All sections':'All departments',''));
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
