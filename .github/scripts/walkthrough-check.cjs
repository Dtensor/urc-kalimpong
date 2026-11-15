const {chromium,webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const engine=process.env.ENGINE||'webkit',out='walkthrough-evidence';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'?{args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader']}: {})});const result={engine,checks:[]};
try{const context=await browser.newContext({viewport:{width:440,height:796},hasTouch:true,isMobile:true,reducedMotion:'no-preference',deviceScaleFactor:1});
await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,opts){return original.call(this,kind,/^(webgl2?|experimental-webgl)$/.test(kind)?{...opts,preserveDrawingBuffer:true}:opts);};});
const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765/complex/bakery/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__bakery?.ready);await page.evaluate(()=>renderer.setPixelRatio(.5));
await page.locator('#enterQ').click();await page.waitForFunction(()=>__bakery.inside&&!__bakery.gliding,{},{timeout:120000});result.entry=await page.evaluate(()=>__bakery.state());result.checks.push('normal-motion entrance completed');
async function pose(){return page.evaluate(()=>__bakery.state());}
async function reset(){await page.evaluate(()=>{__bakery.look(0,4.4,0,0);vel.set(0,0);});await page.waitForTimeout(300);}
const box=await page.locator('#stick').boundingBox();assert(box&&box.width>80);const cx=box.x+box.width/2,cy=box.y+box.height/2;
result.hit=await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.closest('#stick')?.id,[cx,cy]);assert.equal(result.hit,'stick');
async function drag(dx,dy){const before=await pose();await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+dx,cy+dy,{steps:4});await page.waitForTimeout(1400);const held=await page.evaluate(()=>({x:stick.x,y:stick.y,id:stick.id}));await page.mouse.up();await page.waitForTimeout(300);return {before,after:await pose(),held};}
await reset();result.forward=await drag(0,-40);assert(result.forward.after.z<result.forward.before.z-.25,'Joystick forward must walk');
await reset();result.sideways=await drag(40,0);
await reset();await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.waitForTimeout(250);result.keyboard=await pose();assert(result.keyboard.z<4.1,'Keyboard walking');
await page.evaluate(()=>{__bakery.look(0,4.4,0,-.35);vel.set(0,0);});await page.waitForTimeout(350);
const point=await page.evaluate(()=>{cam.updateMatrixWorld();const p=new THREE.Vector3(0,0,1.5).project(cam);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
result.floorPoint=point;await page.mouse.click(point.x,point.y);await page.waitForTimeout(500);result.floorStarted=await page.evaluate(()=>__bakery.gliding);await page.waitForFunction(()=>!__bakery.gliding);result.floor=await pose();assert(result.floor.z<3.8,'Floor tap walks toward floor destination');
// Capture the actual walk control and arrival without a test-forced camera pose.
await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}));await page.waitForTimeout(500);await page.screenshot({path:`${out}/${engine}-walking.jpg`,type:'jpeg',quality:85,timeout:90000});
result.errors=errors;assert.deepEqual(errors,[]);
assert(result.sideways.after.x>result.sideways.before.x+.25,'Joystick right must move sideways like the other shops');assert(Math.abs(result.sideways.after.yaw-result.sideways.before.yaw)<.05,'Joystick should not unexpectedly steer the view');result.pass=true;
await context.close();}catch(e){result.pass=false;result.error=e.message;throw e;}finally{fs.writeFileSync(`${out}/${engine}-results.json`,JSON.stringify(result,null,2));console.log('WALK_CASE '+JSON.stringify(result));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
