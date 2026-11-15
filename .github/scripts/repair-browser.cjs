const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='repair-evidence';fs.mkdirSync(out,{recursive:true});
const reviewed=JSON.parse(fs.readFileSync('.github/scripts/reviewed-replacements.json')).items;
const manifest=JSON.parse(fs.readFileSync('complex/shared/urc-products/manifest.json'));
(async()=>{const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});const results=[];
try{for(const [device,width,height]of[['desktop',1366,820],['phone',440,796]]){
 const row={device,engine,errors:[],missing:[],products:[]};
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:device==='phone',isMobile:device==='phone',deviceScaleFactor:1,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,o){return get.call(this,k,/^(webgl2?|experimental-webgl)$/.test(k)?{...o,preserveDrawingBuffer:true}:o);};});
 const page=await ctx.newPage();page.setDefaultTimeout(120000);
 // Test-only access to the existing closure's detail renderer. No shipped app hook,
 // fake photo data, camera override or altered rendering logic is introduced.
 await page.route('http://127.0.0.1:8765/mall/',async route=>{
  const response=await route.fetch();const source=await response.text();
  const anchor='window.__fps = 0; window.__mall =';assert(source.includes(anchor));
  await route.fulfill({response,body:source.replace(anchor,'window.__repairHold=id=>hold(BYID.get(id)); '+anchor)});
 });
 page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE|WebGL/i.test(m.text()))row.errors.push(m.text());});
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&r.status()>=400)row.missing.push(r.url());});
 async function capture(name){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));try{await page.waitForTimeout(250);await page.screenshot({path:`${out}/${engine}-${device}-${name}.jpg`,type:'jpeg',quality:87,timeout:90000});}finally{await page.evaluate(()=>{delete document.hidden;});}}
 try{
  await page.goto('http://127.0.0.1:8765/mall/',{waitUntil:'domcontentloaded'});
  await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.waitForFunction(()=>__mall.hall.frames>=12&&__mall.photos.pending===0&&__mall.photos.queued===0);
  assert.equal(await page.evaluate(()=>__mall.items),1715);assert.equal(await page.evaluate(()=>__mall.photos.withheld),1);
  for(const product of reviewed){
   await page.locator('#q').fill(product.name);const search=page.locator(`#results [data-id="${product.id}"]`);await search.waitFor();
   const thumbnail=search.locator('img');assert((await thumbnail.getAttribute('src')).endsWith(manifest.items[product.id].file));
   await search.click();await page.waitForFunction(()=>!__mall.auto);
   await page.waitForFunction(()=>__mall.photos.pending===0&&__mall.photos.queued===0);
   // Exercise the production detail renderer after real search navigation.
   await page.evaluate(id=>__repairHold(id),product.id);
   await page.locator('#hold').waitFor({state:'visible'});assert.equal(await page.locator('#kx-trigger').isVisible(),false);
   await page.waitForFunction(()=>[...document.querySelectorAll('#obj .front img')].some(im=>im.complete&&im.naturalWidth>0));
   assert.equal(await page.locator('#obj .front').evaluate(el=>getComputedStyle(el).visibility),'visible');
   assert.equal(await page.locator('#obj .back').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   const detail=await page.locator('#obj .front img').first().getAttribute('src');assert(detail.endsWith(manifest.items[product.id].full));
   assert(await page.locator('#card').innerText().then(t=>t.includes(product.name)));
   const imageState=await page.locator('#obj .front img').first().evaluate(im=>({width:im.naturalWidth,height:im.naturalHeight}));
   const stats=await page.evaluate(()=>__mall.photos);assert(stats.resident+stats.pending<=stats.budget);assert.equal(stats.errors,0);
   const requestUrls=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
   assert(!requestUrls.some(url=>url.endsWith(product.original)),`Rejected original requested: ${product.id}`);
   row.products.push({id:product.id,detail,imageState});
   await capture(product.id);
   if(product.id==='henko-detergent-bar'){
    const box=await page.locator('#stagehand').boundingBox(),x=box.x+box.width*.15,y=box.y+box.height*.5,dx=Math.PI/.012;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:12});await page.mouse.up();
    assert.equal(await page.locator('#obj .front').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    assert.equal(await page.locator('#obj .back').evaluate(el=>getComputedStyle(el).visibility),'visible');
    await capture('henko-turned');
    await page.mouse.move(x+dx,y);await page.mouse.down();await page.mouse.move(x,y,{steps:12});await page.mouse.up();
    assert.equal(await page.locator('#obj .front').evaluate(el=>getComputedStyle(el).visibility),'visible');
   }
   if(device==='phone'&&product.id==='henko-detergent-bar'){
    await page.setViewportSize({width:796,height:440});const f=await page.evaluate(()=>__mall.hall.frames);await page.waitForFunction(n=>__mall.hall.frames>=n+3,f);
    assert.equal(await page.locator('#kx-trigger').isVisible(),false);await capture('henko-landscape');
   }
   await page.locator('#card .close').click();
   await page.locator('#hold').waitFor({state:'hidden'});assert.equal(await page.locator('#kx-trigger').isVisible(),true);
   if(device==='phone')await page.setViewportSize({width,height});
  }
  await page.locator('#q').fill('Ariel Oxyblue');await page.locator('#results [data-id="ariel-oxyblue-2-kg-washing-pow"]').click();await page.waitForFunction(()=>!__mall.auto);
  await page.evaluate(()=>__repairHold('ariel-oxyblue-2-kg-washing-pow'));
  assert.equal(await page.locator('#obj .front img').count(),0);assert((await page.locator('#card').innerText()).includes('Photograph being checked'));
  await page.locator('#card .close').click();
  await page.locator('#q').fill('shampoo');assert.equal(await page.locator('#results [data-id]').count(),28);
  await page.locator('#results [data-id]').first().click();await page.waitForFunction(()=>!__mall.auto);
  await capture('shelf');
  if(device==='phone'){await page.setViewportSize({width:796,height:440});const f=await page.evaluate(()=>__mall.hall.frames);await page.waitForFunction(n=>__mall.hall.frames>=n+3,f);await capture('landscape');}
  row.photos=await page.evaluate(()=>__mall.photos);assert.equal(row.photos.errors,0);assert.deepEqual(row.errors,[]);assert.deepEqual(row.missing,[]);row.pass=true;
 }catch(e){row.pass=false;row.failure=e.stack;await capture('failure').catch(()=>{});}
 results.push(row);fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('REPAIR_CASE '+JSON.stringify(row));await ctx.close();
}}finally{await browser.close();}if(results.length!==2||results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
