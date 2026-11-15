const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='photo-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});
 const results=[];
 try{
  const phone=engine==='webkit',width=phone?440:1366,height=phone?796:820;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:phone,hasTouch:phone,reducedMotion:'reduce'});
  await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,opts){return original.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...opts,preserveDrawingBuffer:true}:opts);};});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&r.status()>=400)missing.push(r.url());});
  const capture=async name=>{for(let retry=0;retry<2;retry++){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));try{await page.waitForTimeout(retry?2000:400);await page.screenshot({path:`${out}/${engine}-${name}.jpg`,type:'jpeg',quality:86,timeout:90000});return;}catch(e){if(retry)throw e;}finally{await page.evaluate(()=>{delete document.hidden;});}}};
  await page.goto('http://127.0.0.1:8765/complex/bakery/',{waitUntil:'domcontentloaded'});await page.locator('#enterQ').click({timeout:90000});
  await page.waitForFunction(()=>__bakery.inside&&!__bakery.gliding);assert.equal(await page.evaluate(()=>__photographicProducts.products),55);assert.equal(await page.evaluate(()=>__photographicProducts.loadedSheets),7);assert.deepEqual(await page.evaluate(()=>__photographicProducts.errors),[]);
  await capture('bakery-arrival');
  await page.evaluate(()=>__bakery.look(-5.3,-7,Math.PI/2,.16));await page.waitForTimeout(700);await capture('bread');
  await page.evaluate(()=>__bakery.look(3.7,-5.5,-Math.PI/2,.16));await page.waitForTimeout(700);await capture('counter');
  const ids=await page.evaluate(()=>__bakery.items());assert.equal(ids.length,56);
  // Product detail and labels stay available after replacing the 3D shelf illustration.
  if(engine==='chromium')await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
  await page.evaluate(()=>__bakery.hold('milk-bread-400g'));assert(await page.locator('#hold').isVisible());assert((await page.locator('#hold').innerText()).includes('Milk Bread'));await capture('product-detail');
  if(engine==='chromium')await page.evaluate(()=>{delete document.hidden;});
  results.push({venue:'bakery',engine,pass:true,photography:await page.evaluate(()=>__photographicProducts),errors:[...errors],missing:[...missing]});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  for(const venue of ['sabzi','grocery']){
   await page.goto(`http://127.0.0.1:8765/complex/${venue}/`,{waitUntil:'domcontentloaded'});
   await page.locator(venue==='sabzi'?'#quiet':'#goquiet').click({timeout:90000});
   await page.waitForFunction(v=>v==='sabzi'?window.__sabzi?.ready:window.__groc?.state.entered,venue);
   const stats=await page.evaluate(()=>__photographicProducts);
   assert.equal(stats.products,venue==='sabzi'?55:66);assert.equal(stats.loadedSheets,venue==='sabzi'?7:9);assert.deepEqual(stats.errors,[]);
   assert(stats.displayCards>=stats.products);assert.equal(stats.displayDrawCalls,stats.loadedSheets);
   await capture(venue+'-arrival');
   if(venue==='sabzi')await page.evaluate(()=>__sabzi.S3.look(-1.2,-1.5,Math.PI/2,-.25));
   else await page.evaluate(()=>{const a=__groc.anch['mustard-oil-1l'].stand;Object.assign(__groc.cam,{x:a.x,z:a.z,yaw:a.yaw,pitch:-.12});});
   await page.waitForTimeout(700);await capture(venue+'-display');
   if(engine==='chromium')await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
   await page.evaluate(v=>v==='sabzi'?__sabzi.hold('tomato'):__groc.holdId('mustard-oil-1l'),venue);
   assert(await page.locator('#hold').isVisible());assert((await page.locator('#card').innerText()).includes('AI-generated'));
   assert.equal(await page.locator('#obj .back').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   assert(await page.locator('#obj .front img').evaluate(el=>el.complete&&el.naturalWidth>0));
   await capture(venue+'-detail');
   if(engine==='chromium')await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
   await page.locator(venue==='sabzi'?'#card [data-add]':'#card [data-a="add"]').click();
   const basket=await page.evaluate(v=>v==='sabzi'?__sabzi.BASKET():__groc.basket(),venue);assert(basket[venue==='sabzi'?'tomato':'mustard-oil-1l']>0);
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
   results.push({venue,engine,pass:true,photography:stats,basket,errors:[...errors],missing:[...missing]});
  }
  // Same scene, normal startup, all six early hints reused exactly once by TextureLoader.
  await page.goto('http://127.0.0.1:8765/complex/',{waitUntil:'domcontentloaded'});await page.locator('#enterQuiet').click({timeout:90000});await page.waitForFunction(()=>__plazaShowcase.statistics.mapsLoaded===6);
  const maps=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/scanned/')&&r.name.endsWith('.jpg')).map(r=>({name:r.name.split('/').pop(),start:r.startTime,end:r.responseEnd,type:r.initiatorType})));
  assert.equal(maps.length,6,'Preload must not cause duplicate texture requests');assert(maps.every(m=>m.type==='link'),'Texture requests should be discovered in HTML');assert.equal(await page.evaluate(()=>__plazaShowcase.statistics.mapErrors.length),0);
  await capture('plaza');results.push({venue:'plaza',engine,pass:true,maps,errors:[...errors],missing:[...missing]});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await context.close();
 }catch(e){results.push({engine,pass:false,failure:e.message});throw e;}
 finally{fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('PHOTO_CASE '+JSON.stringify(results));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
