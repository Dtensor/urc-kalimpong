const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const out='browser-evidence';fs.mkdirSync(out,{recursive:true});
const cases=[],venues=[['urc','mall/','#quiet'],['plaza','complex/','#enterQuiet'],['bakery','complex/bakery/','#enterQ'],['sabzi','complex/sabzi/','#quiet'],['grocery','complex/grocery/','#goquiet'],['cinema','complex/cinema/','#quiet']];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try {
  for(const [device,width,height] of [['desktop',1366,820],['phone',390,844]])for(const [venue,route,enter] of venues){
   if(process.env.KALIMPONG_CASES&&!process.env.KALIMPONG_CASES.split(',').includes(`${venue}:${device}`))continue;
   const row={venue,device,errors:[],missing:[]};
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:device==='phone',hasTouch:device==='phone',reducedMotion:'reduce',acceptDownloads:true});
   await ctx.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,options){
     return getContext.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...options,preserveDrawingBuffer:true}:options);
    };
   });
   const page=await ctx.newPage();page.setDefaultTimeout(30000);
   const takeScreenshot=page.screenshot.bind(page);
   page.screenshot=async options=>{
    // Let the last visible WebGL frame drain before readback on software GPUs.
    // The page's normal visibility-aware loop resumes immediately afterwards.
    await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
    try{await page.waitForTimeout(350);return await takeScreenshot({...options,timeout:60000});}
    finally{await page.evaluate(()=>{delete document.hidden;}).catch(()=>{});}
   };
   // Keep this read-only verification isolated from any optional live counter.
   await page.route('**/api/**',r=>r.fulfill({status:404,body:'Offline acceptance'}));
   page.on('pageerror',e=>row.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))row.errors.push(m.text())});
   page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8765/')&&!r.url().includes('/api/')&&r.status()>=400)row.missing.push(r.url())});
   try {
    await page.goto('http://127.0.0.1:8765/'+route,{waitUntil:'domcontentloaded'});
    await page.locator(enter).click({timeout:60000});
    await page.waitForFunction(()=>window.KalimpongExperience?.diagnostics?.materials>0,{},{timeout:30000});
    await page.waitForTimeout(1200);
    row.diagnostics=await page.evaluate(()=>KalimpongExperience.diagnostics);
    assert.equal(await page.evaluate(()=>KalimpongExperience.calm),true);
    assert.equal(await page.evaluate(()=>KalimpongExperience.settings.map),device!=='phone');
    await page.screenshot({path:`${out}/${venue}-${device}-balanced.jpg`,type:'jpeg',quality:78,timeout:30000});
    await page.locator('#kx-trigger').click();
    await page.locator('#kx-panel [name="quality"]').selectOption('original');
    await page.locator('#kx-panel .kx-close').click();
    await page.waitForTimeout(250);
    await page.screenshot({path:`${out}/${venue}-${device}-original.jpg`,type:'jpeg',quality:78});
    await page.locator('#kx-trigger').click();
    await page.locator('#kx-panel [name="quality"]').selectOption('detail');
    await page.locator('#kx-panel [name="map"]').setChecked(false);
    await page.locator('#kx-panel .kx-close').click();
    await page.waitForTimeout(350);
    await page.screenshot({path:`${out}/${venue}-${device}-detail.jpg`,type:'jpeg',quality:78});
    await page.locator('#kx-trigger').click();
    await page.locator('#kx-panel [name="quality"]').selectOption('balanced');
    const download=page.waitForEvent('download');await page.locator('#kx-save').click();
    const saved=await download;assert.equal(await saved.failure(),null);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#kx-panel').evaluate(e=>e.open),false);
    if(venue==='urc'){
     await page.locator('#q').fill('shampoo');
     row.shampoo=await page.locator('#results [data-id]').count();assert.equal(row.shampoo,28);
     assert.equal(await page.locator('#kx-trigger').isVisible(),false,'Settings must not obscure search results');
     if(device==='phone')assert((await page.locator('#results').boundingBox()).width>width*.9,'Phone results should use full width');
     await page.screenshot({path:`${out}/urc-${device}-search.jpg`,type:'jpeg',quality:78});
     await page.locator('#results [data-id]').first().click();
     assert.equal(await page.locator('#kx-trigger').isVisible(),true,'Settings return after selecting a result');
     await page.waitForFunction(()=>window.__mall&&!window.__mall.auto,{},{timeout:45000});
     await page.waitForTimeout(1000);
     await page.screenshot({path:`${out}/urc-${device}-shelf.jpg`,type:'jpeg',quality:78});
    }
    assert.equal(row.errors.length,0,'Runtime/shader errors: '+row.errors.join('; '));
    assert.equal(row.missing.length,0,'Missing assets: '+row.missing.join('; '));
    row.pass=true;
   }catch(e){row.pass=false;row.failure=e.message;await page.screenshot({path:`${out}/${venue}-${device}-failure.jpg`,type:'jpeg',quality:78,timeout:10000}).catch(()=>{});}
   cases.push(row);fs.writeFileSync(`${out}/results.json`,JSON.stringify({cases},null,2));console.log('KALIMPONG_CASE '+JSON.stringify(row));await ctx.close();
  }
 }finally{await browser.close()}
 const expected=process.env.KALIMPONG_CASES?process.env.KALIMPONG_CASES.split(',').length:12;
 if(cases.length!==expected||cases.some(r=>!r.pass))process.exitCode=1;
})();    page.screenshot=async options=>{
     for(let attempt=0;attempt<2;attempt++){
      await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));
      try{await page.waitForTimeout(350);return await takeScreenshot({...options,timeout:60000});}
      catch(error){if(attempt || !/Timeout/.test(error.message))throw error;row.captureRetries=(row.captureRetries||0)+1;}
      finally{await page.evaluate(()=>{delete document.hidden;}).catch(()=>{});}
      // The first compositor readback can time out on SwiftShader even while the
      // fallback capture succeeds. Resume a fresh frame, then retry the capture only.
      await page.waitForTimeout(1500);
     }
    };

