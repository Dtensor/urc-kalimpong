const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'chromium',out='navigation-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});const results=[];
try{const phone=engine==='webkit',context=await browser.newContext({viewport:phone?{width:440,height:796}:{width:1366,height:820},deviceScaleFactor:1,isMobile:phone,hasTouch:phone,reducedMotion:'reduce'});
await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,opts){return original.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...opts,preserveDrawingBuffer:true}:opts);};});
const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function pause(){await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));}async function resume(){await page.evaluate(()=>{delete document.hidden;});}
async function shot(name){await pause();await page.waitForTimeout(500);await page.screenshot({path:`${out}/${engine}-${name}.jpg`,type:'jpeg',quality:88,timeout:90000});await resume();}
for(const venue of ['bakery','sabzi','grocery']){
 await page.goto(`http://127.0.0.1:8765/complex/${venue}/`,{waitUntil:'domcontentloaded'});
 await page.locator(venue==='bakery'?'#enterQ':venue==='sabzi'?'#quiet':'#goquiet').click({timeout:90000});
 await page.waitForFunction(v=>v==='bakery'?window.__bakery?.inside:v==='sabzi'?window.__sabzi?.ready:window.__groc?.state.entered,venue);
 await pause();
 const data=await page.evaluate(v=>{window.navAPI=v==='bakery'?__bakery:v==='sabzi'?__sabzi.S3:__groc;return navAPI.navigation();},venue);
 const bad=data.views.filter(x=>!x.fits||x.distance<2.799);results.push({venue,engine,count:data.views.length,bad:bad.map(x=>({id:x.target.id,distance:x.distance,maxX:x.maxX,maxY:x.maxY}))});
 fs.writeFileSync(`${out}/${engine}-${venue}-geometry.json`,JSON.stringify(data,null,2));
 // All destinations must be walkable and contain the full target bay within the camera.
 assert.equal(bad.length,0,venue+' unsafe or cropped shelf destinations: '+JSON.stringify(results.at(-1).bad));
 const dock=venue==='sabzi'?'#chips':'#wings';
 const controls=await page.locator(dock).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,display:getComputedStyle(el).display,buttons:el.querySelectorAll('button').length};});results.at(-1).controls=controls;
 assert(controls.width>100&&controls.height>=40&&controls.y>=0&&controls.y+controls.height<= (phone?796:820)+1,'Visible warp controls');
 await page.locator(dock+' button').first().click();await resume();
 await page.waitForFunction(()=>!!navAPI.navigation().selected);await page.waitForTimeout(1800);
 // Bakery/grocery calm arrivals are immediate; sabzi retains a short walk animation.
 if(venue==='sabzi')await page.waitForTimeout(12000);
 const state=await page.evaluate(()=>navAPI.navigation());assert.equal(state.fov,70);assert(state.marker);
 await shot(venue+'-shelf');
 await pause();
 // A zoomed-in camera must reset on the next shelf jump.
 await page.locator('#gl').dispatchEvent('wheel',{deltaY:-900});
 await page.locator(dock+' button').last().click();await resume();await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>navAPI.navigation().fov),70);
 if(venue==='sabzi')await page.waitForTimeout(12000);
 await shot(venue+'-last-section');assert.deepEqual(errors,[]);
}
await context.close();}
catch(e){results.push({engine,pass:false,error:e.message});throw e;}finally{fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(results,null,2));console.log('NAV_CASE '+JSON.stringify(results));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
