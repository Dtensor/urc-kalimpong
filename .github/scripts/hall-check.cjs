const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='hall-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});const results=[];
try{for(const [device,width,height]of[['desktop',1366,820],['phone',440,796]]){
 const row={device,engine,errors:[],missing:[]};const ctx=await browser.newContext({viewport:{width,height},hasTouch:device==='phone',isMobile:device==='phone',deviceScaleFactor:1,reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,o){return get.call(this,k,/^(webgl2?|experimental-webgl)$/.test(k)?{...o,preserveDrawingBuffer:true}:o);};});
 const page=await ctx.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE|WebGL/i.test(m.text()))row.errors.push(m.text());});
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&r.status()>=400)row.missing.push(r.url());});
 async function capture(name){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));try{await page.waitForTimeout(250);await page.screenshot({path:`${out}/${engine}-${device}-${name}.jpg`,type:'jpeg',quality:84,timeout:90000});}finally{await page.evaluate(()=>{delete document.hidden;});}}
 try{
  await page.goto('http://127.0.0.1:8765/mall/',{waitUntil:'domcontentloaded'});
  await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
  await page.waitForFunction(()=>__mall?.hall?.loaded.length>=9&&KalimpongExperience.diagnostics?.materials>0);
  await page.waitForTimeout(900);row.hall=await page.evaluate(()=>__mall.hall);assert.equal(row.hall.fans,4);assert.deepEqual(row.hall.errors,[]);
  row.geometry=await page.evaluate(()=>({draws:__mall.draws,triangles:__mall.tris,items:__mall.items,wings:__mall.wings}));assert.equal(row.geometry.items,1715);assert.equal(row.geometry.wings,7);
  await capture('entrance');
  // Click real open ground in the default entrance view; no forced camera pose.
  const before=await page.evaluate(()=>({x:__mall.pos.x,z:__mall.pos.z}));
  const ground={x:width*.62,y:height*.8};assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,ground),'gl');
  await page.mouse.click(ground.x,ground.y);await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(400);
  const after=await page.evaluate(()=>({x:__mall.pos.x,z:__mall.pos.z}));row.ground={before,after,distance:Math.hypot(after.x-before.x,after.z-before.z)};assert(row.ground.distance>.2,'Default-view ground click moves the visitor');
  await page.locator('#q').fill('shampoo');assert.equal(await page.locator('#results [data-id]').count(),28);
  await page.locator('#results [data-id]').first().click();await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(900);await capture('shelf');
  await page.locator('#wings [data-w="hall"]').click();await page.waitForFunction(()=>!__mall.auto);await page.waitForTimeout(350);
  // System reduced motion freezes every new ambient animation.
  const frozen=await page.evaluate(()=>__mall.hall.phase);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__mall.hall.phase),frozen);
  if(device==='desktop'){
   await page.emulateMedia({reducedMotion:'no-preference'});await page.reload({waitUntil:'domcontentloaded'});await page.locator('#quiet').click();await page.locator('#intro').waitFor({state:'hidden'});
   await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="calm"]').setChecked(false);await page.locator('#kx-panel .kx-close').click();
   const start=await page.evaluate(()=>__mall.hall.phase);await page.waitForTimeout(600);assert(await page.evaluate(()=>__mall.hall.phase)>start,'Ambient motion advances');
   await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="calm"]').setChecked(true);await page.locator('#kx-panel .kx-close').click();
   const stopped=await page.evaluate(()=>__mall.hall.phase);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>__mall.hall.phase),stopped,'Calm view freezes ambient motion');row.motion='moves normally; freezes with system reduce motion and Calm view';
  }
  for(const quality of ['original','detail','balanced']){await page.locator('#kx-trigger').click();await page.locator('#kx-panel [name="quality"]').selectOption(quality);await page.locator('#kx-panel .kx-close').click();await page.waitForTimeout(150);}
  assert.deepEqual(row.errors,[]);assert.deepEqual(row.missing,[]);row.pass=true;
 }catch(e){row.pass=false;row.failure=e.message;await capture('failure').catch(()=>{});}
 results.push(row);fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('HALL_CASE '+JSON.stringify(row));await ctx.close();
}}finally{await browser.close();}if(results.length!==2||results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
