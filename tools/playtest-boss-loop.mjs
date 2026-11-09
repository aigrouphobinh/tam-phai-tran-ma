// Optional browser QA. Game runtime does not depend on Playwright.
import {createRequire} from 'node:module';
import {mkdir,writeFile,mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createGameServer} from '../server.mjs';
import {BOSS_FORMS} from '../boss-cycle.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'docs/qa/boss-loop');
const dataDir=await mkdtemp(join(tmpdir(),'tam-phai-browser-'));
await mkdir(out,{recursive:true});
const app=await createGameServer({port:0,dataDir,restore:false}),origin='http://127.0.0.1:'+app.server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']:[]});
const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
const errors=[],httpErrors=[],checks=[];let previewServer;
context.on('page',p=>{p.on('pageerror',e=>errors.push({url:p.url(),message:e.message}));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))httpErrors.push({url:r.url(),status:r.status()});});});
await context.addInitScript(()=>{
 const raf=requestAnimationFrame.bind(window),waiting=[];
 window.requestAnimationFrame=cb=>raf(t=>{if(window.__qaFreeze)waiting.push(cb);else cb(t);});
 window.__qaResume=()=>{window.__qaFreeze=false;waiting.splice(0).forEach(cb=>requestAnimationFrame(cb));};
 window.__qaDraws=[];
 const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(...a){
  if(a[0]?.src?.includes('arena-background.webp'))window.__qaDraws=[];
  if(a[0]?.src?.includes('/assets/characters/')){window.__qaDraws.push({path:new URL(a[0].src).pathname,sx:a[1],sy:a[2],argc:a.length});if(window.__qaDraws.length>500)window.__qaDraws.splice(0,250);}
  return draw.apply(this,a);
 };
});
const state=()=>app.state();
function isolatePractice(){for(const p of app.raid.players.values()){p.x=p.tx;p.y=p.ty;p.nextAttack=app.raid.elapsed+9999;}app.raid.nextAttack=app.raid.elapsed+9999;app.raid.nextShield=app.raid.elapsed+9999;app.raid.nextAdds=app.raid.elapsed+9999;app.raid.nextIllusion=app.raid.elapsed+9999;}
async function freeze(page){await page.evaluate(()=>window.__qaFreeze=true);await page.waitForTimeout(60);}
async function resume(page){await page.evaluate(()=>window.__qaResume());}
async function shot(page,name){await freeze(page);await page.locator('#game').screenshot({path:join(out,name+'.jpg'),type:'jpeg',quality:90,timeout:15000});await resume(page);}
try{
 const control=await context.newPage();await control.goto(origin);
 await control.locator('[data-action=demo]').click();await control.locator('[data-action=squad]').click();
 await control.waitForFunction(()=>document.querySelector('#player-count').textContent==='3');isolatePractice();
 assert.equal(state().bossCycle.remaining,4);checks.push('Local control room defaults to endless boss loop with four removable outer pieces');
 // Keep the control room iframe from competing with the full-size OBS capture.
 await control.frameLocator('#arena').locator('#game').waitFor();
 for(const f of control.frames())if(f!==control.mainFrame())await f.evaluate(()=>window.__qaFreeze=true);
 const obs=await context.newPage();await obs.setViewportSize({width:540,height:960});await obs.goto(origin+'/obs');
 await obs.waitForFunction(()=>window.__qaDraws.some(d=>d.path.includes('boss-red-states')));
 await obs.locator('#audio-enable').click();await obs.waitForFunction(()=>document.querySelector('#audio-enable').hidden);
 assert.equal(await obs.locator('#audio-status').isVisible(),false);checks.push('All local audio tracks decode; loot/morph sound mappings use existing assets');
 await shot(obs,'honglien-full');
 for(let n=1;n<=3;n++){
  await control.locator('[data-action=boss-hit]').click();
  await control.waitForFunction(n=>document.querySelectorAll('#armor-pieces .broken').length===n,n);
  assert.equal(state().bossCycle.stage,n);
 }
 await control.waitForFunction(()=>document.querySelector('#cloth-total').textContent==='3');
 await obs.waitForTimeout(180);
 assert.equal(state().bossCycle.remaining,1);await shot(obs,'honglien-one-layer');
 checks.push('75/50/25 percent HP thresholds remove three actual accessory layers; covered base and final decoration remain');
 for(let step=1;step<=4;step++){
  const previous=state().bossCycle.wave;
  await control.locator('[data-action=boss-transform]').click();
  if(step===1){
   await obs.waitForTimeout(150);await shot(obs,'transform');
  }
  await control.waitForFunction(expected=>document.querySelector('#boss-wave').textContent==='DẠNG '+expected,previous+1);
  const s=state(),form=BOSS_FORMS[step%4];assert.equal(s.bossCycle.form.id,form.id);assert.equal(s.count,3);
  assert.equal(s.bossCycle.loot.total,step*3);assert.equal(s.bossCycle.remaining,4);isolatePractice();
  await obs.waitForFunction(asset=>window.__qaDraws.some(d=>d.path.includes(asset+'-states')),form.asset);
  if(step<=3)await shot(obs,form.id);
 }
 checks.push('Four distinct live boss atlases transform in order and loop back to Hong Lien at wave 5');
 checks.push('12 cloth materials survive four transformations and roster remains intact');
 await control.setViewportSize({width:390,height:844});assert.ok(await control.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 checks.push('New loop controls and material counter fit a 390px mobile viewport');
 await obs.close();
 const studio=await context.newPage();await studio.goto(origin+'/animation-studio');
 await studio.waitForFunction(()=>document.querySelector('#asset-status').textContent.includes('Đã nạp 15'));
 await studio.locator('#actor').selectOption('boss');
 for(const form of BOSS_FORMS){
  await studio.locator('#boss-form').selectOption(form.id);
  for(const label of ['Đứng chờ','Chạy','Tấn công','Tụ pháp','Trúng đòn','Gục ngã','Hồi sinh','Chiến thắng']){
   await studio.getByRole('button',{name:label,exact:true}).click();
   await studio.locator('#scrub').evaluate(el=>{el.value='600';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await studio.waitForTimeout(35);
   const pose=JSON.parse(await studio.locator('#pose').textContent());assert.equal(pose.formId,form.id);assert.ok(pose.frame>=1);
  }
 }
 checks.push('Animation Studio previews and scrubs all eight states on each of the four covered boss forms');
 await studio.close();await control.close();
 // Smoke-test the built SharedWorker version as well as the real local server.
 const dist=join(root,'dist');
 const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.webp':'image/webp','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.zip':'application/zip'};
 previewServer=http.createServer(async(req,res)=>{try{const p=resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(dist+sep)&&p!==dist)throw Error('path');let bytes,name=p;try{bytes=await readFile(name);}catch{name=join(p,'index.html');bytes=await readFile(name);}res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404).end();}});
 await new Promise(ok=>previewServer.listen(0,'127.0.0.1',ok));
 const preview=await context.newPage();await preview.goto('http://127.0.0.1:'+previewServer.address().port);
 await preview.locator('[data-action=demo]').click();await preview.locator('[data-action=squad]').click();
 await preview.waitForFunction(()=>document.querySelector('#player-count').textContent==='3');
 await preview.locator('[data-action=boss-transform]').click();
 await preview.waitForFunction(()=>document.querySelector('#boss-wave').textContent==='DẠNG 2');
 assert.match(await preview.locator('#boss-name').textContent(),/Băng Nguyệt/);
 assert.equal(await preview.locator('#cloth-total').textContent(),'3');
 checks.push('Built static practice shares boss progression and cloth inventory through SharedWorker');
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 const report={testedAt:new Date().toISOString(),browser:browser.version(),environment:'Controlled practice on headless Linux; Windows OBS FPS and real TikTok LIVE are not verified by this test',checks,consoleErrors:errors,failedResponses:httpErrors};
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 await browser.close();if(previewServer){previewServer.closeAllConnections();await new Promise(ok=>previewServer.close(ok));}
 app.server.closeAllConnections();await app.close();await rm(dataDir,{recursive:true,force:true});
}
