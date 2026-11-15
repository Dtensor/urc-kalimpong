/* Small, deterministic shopping helpers. No model calls or automatic purchase decisions. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EasyCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const aliases={sabun:'soap','साबुन':'soap',soaps:'soap',toothpastes:'toothpaste','टूथपेस्ट':'toothpaste',manjan:'toothpaste','मंजन':'toothpaste',chai:'tea','चाय':'tea',chini:'sugar','चीनी':'sugar','चिनी':'sugar',chawal:'rice','चावल':'rice','चामल':'rice','आटा':'atta','आटा चाहिए':'atta','दाल':'dal','दूध':'milk',doodh:'milk','तेल':'oil',tel:'oil','शैम्पू':'shampoo','शैंपू':'shampoo',shampoos:'shampoo','बिस्कुट':'biscuits',biscuit:'biscuits','नमक':'salt',namak:'salt','डिटर्जेंट':'detergent',detergents:'detergent','सर्फ':'detergent','पेस्ट':'toothpaste'};
const nums={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,'एक':1,'दो':2,'तीन':3,'चार':4,'पाँच':5,'पांच':5,ek:1,do:2,teen:3};
function norm(s){return String(s||'').toLowerCase().replace(/[०-९]/g,c=>'०१२३४५६७८९'.indexOf(c)).replace(/[’']/g,'').replace(/[^a-z0-9\u0900-\u097f\s.]/g,' ').replace(/\s+/g,' ').trim();}
function words(s){return norm(s).split(' ').map(w=>aliases[w]||w).filter(Boolean);}
function parse(text){return String(text||'').slice(0,1000).split(/[,;\n]+|\s+(?:and|aur|और|तथा|&|plus)\s+/i).map(raw=>{
 let query=raw.trim().replace(/^(?:please\s+)?(?:i\s+(?:want|need|would like)|can i have|buy|add|मुझे|चाहिए)\s+/i,'').replace(/\s+(?:please|चाहिए|चाहिये)$/i,'').trim();
 if(!query)return null;
 let quantity=1,maxPrice=null;const price=query.match(/(?:under|below|less than|up to|upto)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/i)||query.match(/(?:₹\s*)?(\d+(?:\.\d{1,2})?)\s*(?:रुपये|रुपए)?\s*(?:से कम|तक)/);
 if(price){maxPrice=Number(price[1]);query=query.replace(price[0],'').trim();}
 const token=query.split(/\s+/)[0],n=nums[token.toLowerCase()]||(/^\d+$/.test(norm(token))?Number(norm(token)):0);
 const rest=query.slice(token.length).trim();if(n>0&&rest&&!/^(?:kg|g|gm|ml|l|litre|liter|किलो|ग्राम|लीटर)\b/i.test(rest)){quantity=Math.min(99,n);query=rest.replace(/^(?:packs?|packets?|bottles?|bars?|pieces?)\s+(?:of\s+)?/i,'');}
 return {raw:raw.trim(),query,quantity,maxPrice};
 }).filter(Boolean);}
function search(items,request,categories){const tokens=words(request.query).filter(w=>!['please','show','me','some','of','the','for'].includes(w));if(!tokens.length)return [];
 const cats=categories||{};return items.map((it,index)=>{
  if(request.maxPrice!=null&&(!Number.isFinite(it.price)||it.price>request.maxPrice))return null;
  const name=words(it.name),category=words(cats[it.category]||'');let score=0;
  for(const token of tokens){const exact=name.includes(token),prefix=token.length>=3&&name.some(w=>w.startsWith(token));const inCat=category.includes(token);if(!exact&&!prefix&&!inCat)return null;score+=exact?6:prefix?3:1;}
  if(tokens.includes('soap')&&it.category==='soap')score+=5;
  return {it,score,index};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.it);}
function photo(it,manifest,full){const m=manifest&&manifest.items&&manifest.items[it.id];if(!m||m.original!==(it.img||'')||m.status==='withheld'||m.status==='missing')return '';
 if(m.replacement&&m.name!==it.name)return '';
 if(full&&m.replacement&&/^[a-f0-9]{20}-full\.(png|jpg|webp)$/.test(m.full||''))return 'urc-products/'+m.full;
 return /^[a-f0-9]{20}\.webp$/.test(m.file||'')?'urc-products/'+m.file:'';}
function cleanBasket(value){const out=Object.create(null);if(!value||typeof value!=='object'||Array.isArray(value))return out;for(const id of Object.keys(value)){const q=value[id];if(id!=='__proto__'&&id!=='constructor'&&Number.isInteger(q)&&q>0&&q<=99)out[id]=q;}return out;}
function total(items,basket){let paise=0,unknown=0,count=0;const map=new Map(items.map(it=>[it.id,it]));for(const id of Object.keys(basket)){const q=basket[id],it=map.get(id);count+=q;if(!it||!Number.isFinite(it.price))unknown++;else paise+=Math.round(it.price*100)*q;}return {paise,unknown,count};}
return {norm,words,parse,search,photo,cleanBasket,total};
});
