const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='showcase-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});
 const results=[];
 try{for(const [device,width,height] of (engine==='webkit'?[['phone',440,956]]:process.env.SHOWCASE_POLISH==='1'?[['desktop',1366,820]]:[['desktop',1366,820],['phone',440,956]])){
  const row={engine,device,viewport:[width,height],kind:'software-rendered lab; not an actual iPhone',errors:[],missing:[]};
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:device==='phone',hasTouch:device==='phone',reducedMotion:'reduce'});
  await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,opts){return original.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...opts,preserveDrawingBuffer:true}:opts);};});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))row.errors.push(m.text());});
  page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&r.status()>=400)row.missing.push(r.url());});
  const capture=async name=>{
   for(let attempt=0;attempt<2;attempt++){
    await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
    try{await page.waitForTimeout(attempt?2000:400);await page.screenshot({path:`${out}/${engine}-${device}-${name}.jpg`,type:'jpeg',quality:85,timeout:attempt?90000:45000});return;}
    catch(e){if(attempt)throw e;console.log('CAPTURE_RETRY '+name+' '+e.message.split('\n')[0]);}
    finally{await page.evaluate(()=>{delete document.hidden;});}
   }
  };
  try{
   await page.goto('http://127.0.0.1:8765/complex/?devicecheck=1',{waitUntil:'domcontentloaded'});await page.locator('#enterQuiet').click({timeout:90000});
   await page.waitForFunction(()=>window.__plazaShowcase?.statistics.mapsLoaded===6,{},{timeout:60000});
   row.geometry=await page.evaluate(()=>__plazaShowcase.statistics);row.render=await page.evaluate(()=>__plaza.info());
   assert.equal(row.geometry.mapErrors.length,0);assert.equal(row.geometry.openings,13);assert.equal(row.geometry.trees,46);assert(row.geometry.addedDrawCalls<=8);assert(row.geometry.addedTriangles<65000);assert(row.render.calls<220);
   if(device==='phone')assert((await page.locator('#toast').boundingBox()).y>=(await page.locator('#where').boundingBox()).y+20,'Phone hint must sit below the header and location label');
   // Hide the opt-in test panel only for clean architectural evidence.
   await page.locator('#phone-check').evaluate(e=>e.hidden=true);await page.waitForTimeout(500);await capture('arrival');
   await page.evaluate(()=>__plaza.jump(4.7,-7.8,Math.atan2(4.7,7.2),.12));await page.waitForTimeout(700);await capture('arches');
   // Visible scene dragging must turn the camera, and the list route stays usable.
   const before=await page.evaluate(()=>__plaza.pos().yaw);await page.mouse.move(width*.42,height*.55);await page.mouse.down();await page.mouse.move(width*.6,height*.55,{steps:8});await page.mouse.up();
   assert(Math.abs((await page.evaluate(()=>__plaza.pos().yaw))-before)>.1);
   // Software Chromium can starve its own input synchronization while rendering.
   // Rendering is covered by the captures above; exercise DOM controls while paused.
   if(engine==='chromium'){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));row.controlCheckPaused=true;}
   await page.locator('#listBtn').click({noWaitAfter:true});assert(await page.locator('#listClose').isVisible());await page.locator('#listClose').click({noWaitAfter:true});
   await page.locator('#kx-trigger').click({noWaitAfter:true});await page.locator('#kx-panel [name="quality"]').selectOption('detail');await page.locator('#kx-panel .kx-close').click({noWaitAfter:true});
   await page.locator('#kx-trigger').click({noWaitAfter:true});await page.locator('#kx-panel [name="quality"]').selectOption('balanced');await page.locator('#kx-panel .kx-close').click({noWaitAfter:true});
   if(engine==='chromium')await page.evaluate(()=>{delete document.hidden;});
   if(device==='phone'){
    await page.locator('#phone-check').evaluate(e=>e.hidden=false);await page.locator('#phone-check button').first().click();
    await page.waitForFunction(()=>window.__plazaDeviceCheck?.report,{},{timeout:45000});row.phoneCheck=await page.evaluate(()=>__plazaDeviceCheck.report);
    assert(row.phoneCheck.samples>10);assert.equal(row.phoneCheck.interrupted,false);assert.equal(await page.locator('#phone-check textarea').inputValue(),JSON.stringify(row.phoneCheck,null,2));await capture('phone-check');
   }else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.deepEqual(row.errors,[]);assert.deepEqual(row.missing,[]);row.pass=true;
  }catch(e){row.pass=false;row.failure=e.message;await capture('failure').catch(()=>{});}
  results.push(row);fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('SHOWCASE_CASE '+JSON.stringify(row));await context.close();
 }}finally{await browser.close();}
 if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
