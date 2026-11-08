// Optional real-browser acceptance suite. See tests/README.md.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TDL_TEST_URL||'http://127.0.0.1:8000/app/';
fs.mkdirSync('work/kinetic-qa',{recursive:true});
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'America/New_York'});const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('tdl.notificationPrompt.v1','answered'));
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.locator('#add').click();await page.locator('#title').fill('Prepare project review');await page.locator('#category').fill('Projects');await page.locator('#form [type=submit]').click();
const tasks=await page.evaluate(()=>localStorage.getItem('tdl.tasks.v1'));
await page.mouse.move(500,260);await page.waitForTimeout(300);assert.equal(await page.locator('.kinetic-cursor').evaluate(e=>getComputedStyle(e).opacity),'1');
const first=await page.locator('.kinetic-cursor').evaluate(e=>e.getBoundingClientRect().x);
await page.mouse.move(800,260);await page.waitForTimeout(500);const next=await page.locator('.kinetic-cursor').evaluate(e=>e.getBoundingClientRect().x);assert.ok(next>first+200);
await page.locator('#add').hover();await page.waitForTimeout(150);assert.equal(await page.locator('.kinetic-cursor-core').textContent(),'CREATE ↗');assert.equal(await page.locator('.kinetic-cursor').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
await page.mouse.move(530,320);await page.screenshot({path:'work/kinetic-qa/desktop.png',fullPage:true});
assert.equal(await page.locator('#kinetic-chrome').evaluate(e=>e.classList.contains('is-ready')),true);console.log('PASS live WebGL sculpture, spring cursor movement, contextual hover and click-through');
for(const theme of ['graphite','paper','forest','dusk']){
 await page.locator('header .appearance-open').click();await page.locator('[data-theme-choice='+theme+']').click();await page.keyboard.press('Escape');
 for(const route of ['','inbox','week','planner','connections','momentum']){
  await page.goto(base+(route?'#'+route:''),{waitUntil:'domcontentloaded'});await page.waitForTimeout(60);
  for(const width of [1440,1024,768,390,320]){
   await page.setViewportSize({width,height:1050});
   const extra=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(extra<=1,`${theme}/${route}/${width}: body overflow ${extra}`);
  }
  await page.setViewportSize({width:1440,height:1050});
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('tdl.tasks.v1')),tasks);console.log('PASS',theme,'6 workspaces × 5 viewports; task data unchanged');
}
await page.goto(base,{waitUntil:'domcontentloaded'});
await page.locator('#settingsOpen').click();await page.locator('#kinetic-motion').uncheck();await page.locator('#settingsClose').click();await page.mouse.move(700,250);assert.equal(await page.locator('.kinetic-cursor').evaluate(e=>getComputedStyle(e).display),'none');await page.reload();assert.equal(await page.locator('html').getAttribute('data-motion'),'off');console.log('PASS motion opt-out and reload persistence');
await page.locator('#settingsOpen').click();await page.locator('#kinetic-motion').check();await page.locator('#settingsClose').click();
await page.emulateMedia({reducedMotion:'reduce'});await page.mouse.move(800,220);assert.equal(await page.locator('.kinetic-cursor').evaluate(e=>getComputedStyle(e).display),'none');console.log('PASS reduced-motion disables animated cursor');await page.emulateMedia({reducedMotion:'no-preference'});
await page.locator('.kinetic-jump').click();assert.equal(await page.locator('#search').evaluate(e=>e===document.activeElement),true);
await page.locator('#taskList [data-action=edit]').click();await page.locator('#title').fill('Review ready');await page.locator('#form [type=submit]').click();await page.locator('#taskList [data-action=toggle]').click();assert.equal(await page.locator('#doneCount').textContent(),'1');await page.locator('#tdlx-undo').click();assert.equal(await page.locator('#openCount').textContent(),'1');
await page.locator('#timerStart').click();assert.equal(await page.locator('.timer-card').evaluate(e=>e.classList.contains('is-running')),true);await page.locator('#timerReset').click();console.log('PASS task create/edit/complete/undo, jump control, timer running state');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/kinetic-qa/mobile.png',fullPage:true});
await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForTimeout(300);await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('.kinetic-title').waitFor();await page.locator('header .appearance-open').click();await page.locator('[data-theme-choice=graphite]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('html').getAttribute('data-theme'),'graphite');console.log('PASS offline shell and themes');
assert.deepEqual(errors,[]);
const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const tp=await touch.newPage();await tp.addInitScript(()=>localStorage.setItem('tdl.notificationPrompt.v1','answered'));await tp.goto(base,{waitUntil:'domcontentloaded'});assert.equal(await tp.locator('.kinetic-cursor').evaluate(e=>getComputedStyle(e).display),'none');console.log('PASS touch cursor suppression and zero browser JS errors');await browser.close();
})();
