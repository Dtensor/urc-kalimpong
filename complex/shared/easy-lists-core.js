/* Saved-list records contain only selected product details, never live inventory. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EasyListsCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const shops=['urc','bakery','sabzi','grocery'],venues=shops.concat('cinema');
const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=200&&!['__proto__','constructor','prototype'].includes(id);
function cart(value,v){const out=Object.create(null);if(!value||typeof value!=='object'||Array.isArray(value))return out;Object.keys(value).slice(0,2000).forEach(id=>{const q=value[id];if(safeId(id)&&Number.isFinite(q)&&q>0&&q<=99&&(v!=='urc'||Number.isInteger(q)))out[id]=Math.round(q*1000)/1000;});return out;}
function key(v){return v==='urc'?'bhandar.basket':'complex.cart.'+v;}
function item(value,v){if(!value||!safeId(value.id))return null;return {id:value.id,name:text(value.name||value.title,300)||value.id,unit:v==='urc'?'pack':text(value.unit,40)||'each',price:Number.isFinite(value.price)&&value.price>=0?value.price:null,status:['in','out','preview'].includes(value.status)?value.status:'unknown'};}
function rows(items,basket,v){const map=new Map((items||[]).map(it=>[it.id,it]));return Object.keys(cart(basket,v)).map(id=>Object.assign(item(map.get(id)||{id},v),{quantity:basket[id]}));}
function cleanRows(value,v){if(!Array.isArray(value))return [];const seen=new Set();return value.slice(0,2000).map(r=>{const it=item(r,v);if(!it||seen.has(it.id)||!cart({[it.id]:r.quantity},v)[it.id])return null;seen.add(it.id);return Object.assign(it,{quantity:cart({[it.id]:r.quantity},v)[it.id]});}).filter(Boolean);}
function cleanSaved(value){if(!Array.isArray(value))return [];const ids=new Set();return value.slice(0,20).map(s=>{if(!s||!safeId(s.id)||ids.has(s.id)||!text(s.name,60).trim())return null;ids.add(s.id);const groups={};shops.forEach(v=>{const r=cleanRows(s.shops&&s.shops[v],v);if(r.length)groups[v]=r;});return Object.keys(groups).length?{id:s.id,name:text(s.name,60).trim(),createdAt:text(s.createdAt,40),shops:groups}:null;}).filter(Boolean);}
function total(lines){let paise=0,unknown=0;lines.forEach(r=>{if(Number.isFinite(r.price))paise+=Math.round(r.price*100*r.quantity);else unknown++;});return {paise,unknown};}
function compare(saved,items,basket,v){const map=new Map((items||[]).map(it=>[it.id,item(it,v)]));const existing=cart(basket,v);return cleanRows(saved,v).map(old=>{const now=map.get(old.id),reason=!now?'missing':now.name!==old.name||now.unit!==old.unit?'identity':now.status!=='in'?'unavailable':now.price==null?'unknown-price':now.price!==old.price?'price':'';const eligible=!!now&&!['missing','identity','unavailable'].includes(reason);return {old,current:now||null,reason,eligible,checked:eligible&&!reason,existing:existing[old.id]||0,target:Math.max(existing[old.id]||0,old.quantity)};});}
function merge(basket,review,selected,v){const out=cart(basket,v);review.forEach(row=>{if(row.eligible&&selected.includes(row.old.id))out[row.old.id]=Math.max(out[row.old.id]||0,row.old.quantity);});return out;}
function same(a,b,v){const x=cart(a,v),y=cart(b,v),keys=Object.keys(x);return keys.length===Object.keys(y).length&&keys.every(k=>x[k]===y[k]);}
return {shops,venues,text,safeId,cart,key,item,rows,cleanRows,cleanSaved,total,compare,merge,same};
});
