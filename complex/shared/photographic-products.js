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
 // One mesh per atlas keeps the photographic displays inexpensive on mobile.
 function createBatch(THREE,scene){
  const groups=new Map();let count=0;
  function add(it,matrix,w,h){
   if(!has(it))return false;const entry=entries.get(it.id),im=images.get(entry.sheet),[sx,sy,sw,sh]=entry.rect;
   const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
   if(!groups.has(entry.sheet))groups.set(entry.sheet,{positions:[],uvs:[]});const group=groups.get(entry.sheet);
   const corners=[[-dw/2,0,sx,sy+sh],[dw/2,0,sx+sw,sy+sh],[dw/2,dh,sx+sw,sy],[-dw/2,dh,sx,sy]];
   for(const index of [0,1,2,0,2,3]){const [x,y,u,v]=corners[index],p=new THREE.Vector3(x,y,0).applyMatrix4(matrix);group.positions.push(p.x,p.y,p.z);group.uvs.push(u/im.width,1-v/im.height);}count++;return true;
  }
  function finish(){
   for(const [file,g] of groups){const texture=new THREE.Texture(images.get(file));texture.encoding=THREE.sRGBEncoding;texture.needsUpdate=true;texture.anisotropy=2;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(g.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(g.uvs,2));geometry.computeBoundingSphere();
    const material=new THREE.MeshBasicMaterial({map:texture,alphaTest:.12,side:THREE.DoubleSide,toneMapped:false});scene.add(new THREE.Mesh(geometry,material));}
   statistics.displayCards=count;statistics.displayDrawCalls=groups.size;
  }
  return {add,finish};
 }
 window.PhotographicProducts={prepare,has,draw,url,createBatch,statistics,disclosure:'AI-generated product illustrations; appearance may differ from actual stock.'};
})();
