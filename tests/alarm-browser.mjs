// Optional browser acceptance: see tests/README.md.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.TDL_TEST_URL||'http://127.0.0.1:8000/app/';
fs.mkdirSync('work/alarm-qa',{recursive:true});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});const c=await b.newContext({viewport:{width:1440,height:1000},permissions:['notifications']});const p=await c.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  localStorage.setItem('tdl.notificationPrompt.v1','answered');window.__alarmSources=[];
  const proto=AudioContext.prototype,createSource=proto.createBufferSource,createGain=proto.createGain;
  proto.createBufferSource=function(){const source=createSource.call(this),record={source,ctx:this,stopped:false},start=source.start.bind(source),stop=source.stop.bind(source);source.start=function(at){record.at=at;return start(at)};source.stop=function(){record.stopped=true;return stop()};window.__alarmSources.push(record);return source};
  proto.createGain=function(){const gain=createGain.call(this),connect=gain.connect.bind(gain),ctx=this;gain.connect=function(dest){const analyser=ctx.createAnalyser();connect(analyser);analyser.connect(dest);window.__alarmAnalyser=analyser;return dest};return gain};
 });
 await p.clock.install();await p.goto(base,{waitUntil:'domcontentloaded'});await p.evaluate(()=>navigator.serviceWorker.ready);
 if(!await p.locator('#timerDisplay').isVisible())await p.locator('#timerDurationEntry summary').click();await p.locator('#timerDisplay').fill('1');await p.locator('#timerDisplay').press('Tab');await p.locator('#timerStart').click();
 await p.waitForFunction(()=>window.__alarmSources.length>0);assert.ok(await p.evaluate(()=>__alarmSources.at(-1).at>__alarmSources.at(-1).ctx.currentTime+55));
 await p.locator('#settingsOpen').click();assert.equal(await p.locator('#alarmPreview').isDisabled(),true);await p.locator('#settingsClose').click();
 await p.locator('.tdlx-header [data-tdlx-open=calendar]').click();await p.clock.fastForward(61000);await p.locator('#tdl-alarm-dialog[open]').waitFor();
 assert.equal(await p.locator('#timerDisplay').inputValue(),'00:00');await p.waitForFunction(()=>__alarmSources.at(-1).ctx.state==='running'&&__alarmSources.at(-1).at<=__alarmSources.at(-1).ctx.currentTime);
 await p.waitForFunction(()=>{const samples=new Float32Array(2048);__alarmAnalyser.getFloatTimeDomainData(samples);return samples.some(x=>Math.abs(x)>.001)});
 assert.equal(await p.evaluate(()=>__alarmSources.at(-1).source.loop),true);await p.clock.fastForward(10000);assert.equal(await p.locator('#tdl-alarm-dialog').evaluate(e=>e.open),true);
 await p.screenshot({path:'work/alarm-qa/desktop.png'});await p.locator('#tdl-alarm-stop').click();assert.equal(await p.evaluate(()=>__alarmSources.at(-1).stopped),true);assert.equal(await p.title(),'TDL — Your workspace');
 console.log('PASS real scheduled Web Audio, audible sample output, repeated alarm, any-workspace alert, persistent Stop dialog and title restore');
 await p.locator('#tdlx-home').click();if(!await p.locator('#timerDisplay').isVisible())await p.locator('#timerDurationEntry summary').click();await p.locator('#timerDisplay').fill('1');await p.locator('#timerDisplay').press('Tab');await p.locator('#timerStart').click();await p.clock.fastForward(30000);await p.locator('#timerStart').click();assert.equal(await p.evaluate(()=>__alarmSources.at(-1).stopped),true);await p.clock.fastForward(90000);assert.equal(await p.locator('#tdl-alarm-dialog').evaluate(e=>e.open),false);
 await p.locator('#timerStart').click();await p.clock.fastForward(31000);await p.locator('#tdl-alarm-dialog[open]').waitFor();await p.locator('#tdl-alarm-stop').click();await p.locator('#timerReset').click();
 if(!await p.locator('#timerDisplay').isVisible())await p.locator('#timerDurationEntry summary').click();await p.locator('#timerDisplay').fill('1');await p.locator('#timerDisplay').press('Tab');await p.locator('#timerStart').click();await p.locator('#timerReset').click();await p.clock.fastForward(65000);assert.equal(await p.locator('#tdl-alarm-dialog').evaluate(e=>e.open),false);
 console.log('PASS pause/resume uses remaining time; reset cancels future sound and alerts');
 await p.locator('#settingsOpen').click();await p.locator('#alarmPreview').click();await p.locator('#tdl-alarm-dialog[open]').waitFor();assert.equal(await p.locator('#tdl-alarm-title').textContent(),'Alarm preview');await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#tdl-alarm-dialog').open);
 await p.locator('#alarmSoundEnabled').uncheck();await p.locator('#alarmVolume').fill('50');await p.locator('#settingsClose').click();await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.locator('#alarmSoundEnabled').isChecked(),false);assert.equal(await p.locator('#alarmVolume').inputValue(),'50');
 const prior=await p.evaluate(()=>__alarmSources.length);if(!await p.locator('#timerDisplay').isVisible())await p.locator('#timerDurationEntry summary').click();await p.locator('#timerDisplay').fill('1');await p.locator('#timerDisplay').press('Tab');await p.locator('#timerStart').click();await p.clock.fastForward(61000);await p.locator('#tdl-alarm-dialog[open]').waitFor();assert.equal(await p.evaluate(()=>__alarmSources.length),prior);assert.match(await p.locator('#tdl-alarm-audio-status').textContent(),/Sound is off/);await p.locator('#tdl-alarm-stop').click();
 console.log('PASS sound preview, Escape, saved volume/sound preferences and visual-only mode');
 await p.locator('#settingsOpen').click();await p.locator('#alarmSoundEnabled').check();await p.locator('#settingsClose').click();await p.locator('#add').click();await p.locator('#title').fill('Alarm focus test');await p.locator('#form [type=submit]').click();const tasks=await p.evaluate(()=>localStorage.getItem('tdl.tasks.v1'));
 await p.locator('#tdlx-momentum').click();await p.locator('[data-momentum=recommit]').click();await p.locator('[data-momentum=doNow]').click();assert.equal(await p.evaluate(()=>TDLMomentum.getState().focus.running),true);await p.clock.fastForward(121000);await p.locator('#tdl-alarm-dialog[open]').waitFor();assert.match(await p.locator('#tdl-alarm-detail').textContent(),/Alarm focus test/);await p.locator('#tdl-alarm-stop').click();assert.equal(await p.evaluate(()=>TDLMomentum.getState().focus.running),false);assert.equal(await p.evaluate(()=>localStorage.getItem('tdl.tasks.v1')),tasks);
 console.log('PASS Momentum focus completion uses the shared alarm and leaves task data unchanged');
 await p.setViewportSize({width:390,height:844});await p.locator('#settingsOpen').click();await p.locator('#alarmPreview').click();await p.screenshot({path:'work/alarm-qa/mobile.png'});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1);await p.locator('#tdl-alarm-stop').click();await p.locator('#settingsClose').click();
 await c.setOffline(true);await p.reload({waitUntil:'domcontentloaded'});await p.locator('#settingsOpen').click();await p.locator('#alarmPreview').click();await p.locator('#tdl-alarm-dialog[open]').waitFor();await p.locator('#tdl-alarm-stop').click();assert.deepEqual(errors,[]);console.log('PASS mobile alert, offline alarm assets and zero JS errors');await b.close();
})();
