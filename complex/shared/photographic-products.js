/* Generated photographic illustrations. Actual supplied photos always take precedence. */
(() => {
 'use strict';
 const entries=new Map(),images=new Map(),urls=new Map();
 const statistics={version:'photographic-products-20261115',loadedSheets:0,products:0,errors:[]};
 async function prepare(venue,items,root){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(root+'products/manifest.json',{signal:controller.signal});if(!response.ok)throw Error('Product manifest '+response.status);
   const manifest=await response.json(),data=manifest.venues[venue];if(!data)return;
   await Promise.all(data.sheets.map(sheet=>new Promise(resolve=>{
    const image=new Image();let done=false;const timeout=setTimeout(()=>finish(false),12000);
    function finish(ok){if(done)return;done=true;clearTimeout(timeout);if(ok){images.set(sheet.file,image);statistics.loadedSheets++;}else statistics.errors.push(sheet.file);resolve();}
    image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=root+'products/'+sheet.file;
   })));
   for(const it of items){const spec=data.items[it.id];if(!it.photo&&spec&&images.has(spec.sheet)){entries.set(it.id,spec);it._generatedImage=true;statistics.products++;}}
   window.__photographicProducts=statistics;
  }catch(e){statistics.errors.push(String(e.message));window.__photographicProducts=statistics;}
  finally{clearTimeout(timer);}
 }
 function has(it){return !!it&&!it.photo&&entries.has(it.id);}
 function draw(g,it,x,y,w,h){
  if(!has(it))return false;const entry=entries.get(it.id),[sx,sy,sw,sh]=entry.rect,image=images.get(entry.sheet);
  const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;g.drawImage(image,sx,sy,sw,sh,x+(w-dw)/2,y+h-dh,dw,dh);return true;
 }
 function url(it){if(!has(it))return null;if(!urls.has(it.id)){const canvas=document.createElement('canvas');canvas.width=canvas.height=384;draw(canvas.getContext('2d'),it,12,12,360,360);urls.set(it.id,canvas.toDataURL('image/webp',.88));}return urls.get(it.id);}
 window.PhotographicProducts={prepare,has,draw,url,statistics,disclosure:'AI-generated product illustrations; appearance may differ from actual stock.'};
})();
