const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='products-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});const results=[];
try{for(const [device,width,height]of[['desktop',1366,820],['phone',440,796]]){
 const row={device,engine,errors:[],missing:[]};const ctx=await browser.newContext({viewport:{width,height},hasTouch:device==='phone',isMobile:device==='phone',deviceScaleFactor:1,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,o){return get.call(this,k,/^(webgl2?|experimental-webgl)$/.test(k)?{...o,preserveDrawingBuffer:true}:o);};});
 const page=await ctx.newPage();page.setDefaultTimeout(120000);
 page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE|WebGL/i.test(m.text()))row.errors.push(m.text());});
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&r.status()>=400)row.missing.push(r.url());});
 async function capture(name){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));try{await page.waitForTimeout(250);await page.screenshot({path:`${out}/${engine}-${device}-${name}.jpg`,type:'jpeg',quality:84,timeout:90000});}finally{await page.evaluate(()=>{delete document.hidden;});}}
 try{
  // Baseline and candidate use the same browser, device, server and catalogue.
  await page.goto('http://127.0.0.1:8765/baseline/mall/',{waitUntil:'domcontentloaded'});
  await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.waitForFunction(()=>__mall.hall.frames>=12);await page.waitForLoadState('networkidle');
  row.baselineImages=await page.evaluate(()=>{const r=performance.getEntriesByType('resource').filter(x=>x.name.includes('/static/items/'));return {requests:r.length,bytes:r.reduce((s,x)=>s+x.encodedBodySize,0)};});
  await page.goto('http://127.0.0.1:8765/mall/?devicecheck=1',{waitUntil:'domcontentloaded'});
  await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.waitForFunction(()=>__mall?.hall?.loaded.length>=9&&__mall.hall.loaded.length===__mall.hall.mapsExpected&&KalimpongExperience.diagnostics?.materials>0);
  await page.waitForTimeout(900);row.hall=await page.evaluate(()=>__mall.hall);assert.equal(row.hall.fans,4);assert.deepEqual(row.hall.errors,[]);
  row.geometry=await page.evaluate(()=>({draws:__mall.draws,triangles:__mall.tris,items:__mall.items,wings:__mall.wings}));assert.equal(row.geometry.items,1715);assert.equal(row.geometry.wings,7);
  await page.waitForFunction(()=>__mall.hall.frames>=12&&__mall.photos.pending===0&&__mall.photos.queued===0);await page.waitForLoadState('networkidle');
  row.candidateImages=await page.evaluate(()=>{const r=performance.getEntriesByType('resource').filter(x=>x.name.includes('/urc-products/')&&x.name.includes('.webp'));return {requests:r.length,bytes:r.reduce((s,x)=>s+x.encodedBodySize,0)};});
  row.photoStats=await page.evaluate(()=>__mall.photos);assert.equal(row.photoStats.withheld,6);assert.equal(row.photoStats.errors,0);
  assert(row.photoStats.resident+row.photoStats.pending<=row.photoStats.budget);assert(row.candidateImages.bytes<row.baselineImages.bytes*.65,'Entrance image transfer should fall materially');
  await capture('entrance');
  // Click real open ground in the default entrance view; no forced camera pose.
  const before=await page.evaluate(()=>({x:__mall.pos.x,z:__mall.pos.z}));
  const ground={x:width*.62,y:height*.8};assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,ground),'gl');
  await page.mouse.click(ground.x,ground.y);await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(400);
  const after=await page.evaluate(()=>({x:__mall.pos.x,z:__mall.pos.z}));row.ground={before,after,distance:Math.hypot(after.x-before.x,after.z-before.z)};assert(row.ground.distance>.2,'Default-view ground click moves the visitor');
  await page.locator('#q').fill('shampoo');assert.equal(await page.locator('#results [data-id]').count(),28);
  await page.locator('#results [data-id]').first().click();await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(900);await page.waitForFunction(()=>__mall.photos.pending===0&&__mall.photos.queued===0);await capture('shelf');
  row.shelfPhotos=await page.evaluate(()=>__mall.photos);assert(row.shelfPhotos.resident>0);assert(row.shelfPhotos.optimized>0);
  // Turn away and back. Cached images should remount without new downloads.
  const facing=await page.evaluate(()=>__mall.yaw), hitsBefore=await page.evaluate(()=>__mall.photos.cacheHits);
  let scan=await page.evaluate(()=>__mall.photos.streams);await page.evaluate(()=>{__mall.yaw+=Math.PI;});
  await page.waitForFunction(n=>__mall.photos.streams>n,scan);await page.waitForFunction(()=>__mall.photos.pending===0&&__mall.photos.queued===0);
  scan=await page.evaluate(()=>__mall.photos.streams);await page.evaluate(y=>{__mall.yaw=y;},facing);
  await page.waitForFunction(n=>__mall.photos.streams>n,scan);await page.waitForFunction(()=>__mall.photos.pending===0&&__mall.photos.queued===0);
  row.returnPhotos=await page.evaluate(()=>__mall.photos);assert(row.returnPhotos.cacheHits>hitsBefore);assert(row.returnPhotos.resident+row.returnPhotos.pending<=row.returnPhotos.budget);
  await page.locator('#q').fill('Johnson Baby Lotion');await page.locator('#results [data-id="johnson-baby-lotion-200-ml"]').click();await page.waitForFunction(()=>!__mall.auto);
  // The optional device check is local, works on touch-size screens and reports real frame intervals.
  await page.locator('#urc-check-trigger').click();await page.locator('#urc-check [data-start]').click();await page.waitForFunction(()=>__urcDeviceCheck.report,{},{timeout:50000});
  row.deviceCheck=await page.evaluate(()=>__urcDeviceCheck.report);assert(row.deviceCheck.samples>0);assert.equal(row.deviceCheck.interrupted,false);await page.locator('#urc-check [data-close]').click();
  if(device==='phone'){await page.setViewportSize({width:796,height:440});const landscapeFrame=await page.evaluate(()=>__mall.hall.frames);await page.waitForFunction(f=>__mall.hall.frames>=f+3,landscapeFrame);await capture('landscape');assert(await page.locator('#urc-check-trigger').isVisible());await page.setViewportSize({width,height});}

  await page.locator('#wings [data-w="hall"]').click();await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(350);
  // System reduced motion freezes every new ambient animation.
  const frozen=await page.evaluate(()=>__mall.hall);await page.waitForFunction(f=>__mall.hall.frames>=f+3,frozen.frames);assert.equal(await page.evaluate(()=>__mall.hall.phase),frozen.phase);
  if(device==='desktop'){
   await page.emulateMedia({reducedMotion:'no-preference'});await page.reload({waitUntil:'domcontentloaded'});await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
   await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="calm"]').setChecked(false);await page.locator('#kx-panel .kx-close').click();
   const start=await page.evaluate(()=>__mall.hall);await page.waitForFunction(f=>__mall.hall.frames>=f+3,start.frames);assert(await page.evaluate(()=>__mall.hall.phase)>start.phase,'Ambient motion advances across rendered frames');
   await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="calm"]').setChecked(true);await page.locator('#kx-panel .kx-close').click();
   const stopped=await page.evaluate(()=>__mall.hall);await page.waitForFunction(f=>__mall.hall.frames>=f+3,stopped.frames);assert.equal(await page.evaluate(()=>__mall.hall.phase),stopped.phase,'Calm view freezes motion while frames continue');row.motion='moves normally; freezes with system reduce motion and Calm view';
  }
  for(const quality of ['original','detail','balanced']){await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="quality"]').selectOption(quality);await page.locator('#kx-panel .kx-close').click();await page.waitForTimeout(150);}
  assert.deepEqual(row.errors,[]);assert.deepEqual(row.missing,[]);row.pass=true;
 }catch(e){row.pass=false;row.failure=e.stack;await capture('failure').catch(()=>{});}
 results.push(row);fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('PRODUCTS_CASE '+JSON.stringify(row));await ctx.close();
}}finally{await browser.close();}if(results.length!==2||results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
