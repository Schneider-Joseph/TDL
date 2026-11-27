// Optional real-browser regression checks; setup and commands are in tests/README.md.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.TDL_TEST_URL||'http://127.0.0.1:8000/app/';
const browser=await chromium.launch({
 executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),
 headless:true,args:['--no-sandbox']
});
const morning={id:'morning',title:'Morning medium',category:'Personal',priority:'medium',dueDate:'2026-11-27',dueTime:'08:00',createdAt:Date.parse('2026-11-27T09:00:00-05:00'),completed:false};
const evening={...morning,id:'evening',title:'Evening high',priority:'high',dueTime:'18:00',createdAt:morning.createdAt-1000};
const old={id:'old',title:'Old report',category:'Homework',priority:'medium',createdAt:Date.parse('2026-10-01T10:00:00-04:00'),completed:false};

async function check(name,tasks,run,time='2026-11-27T10:00:00-05:00'){
 const context=await browser.newContext({timezoneId:'America/New_York',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.clock.install({time:new Date(time)});
  await page.addInitScript(tasks=>{
   localStorage.setItem('tdl.notificationPrompt.v1','answered');
   localStorage.setItem('tdl.alarm.v1',JSON.stringify({sound:false}));
   localStorage.setItem('tdl.tasks.v1',JSON.stringify(tasks));
  },tasks);
  await page.goto(base);
  await run(page);
  assert.deepEqual(errors,[]);
  console.log('PASS',name);
 }finally{await context.close();}
}

try{
 await check('due sorting includes clock time; Today respects priority and newest selections',[morning,evening],async page=>{
  assert.deepEqual(await page.locator('.task-title').allTextContents(),['Morning medium','Evening high']);
  await page.locator('.side [data-view=today]').click();
  await page.locator('#sort').selectOption('priority');
  assert.deepEqual(await page.locator('.task-title').allTextContents(),['Evening high','Morning medium']);
  await page.locator('#sort').selectOption('newest');
  assert.deepEqual(await page.locator('.task-title').allTextContents(),['Morning medium','Evening high']);
 });

 await check('date-only deadlines agree across Dashboard, Inbox and Calendar through midnight',[{...morning,dueTime:''}],async page=>{
  assert.equal(await page.locator('#overdueCount').textContent(),'0');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tdl.inbox.v1')).items.filter(i=>!i.resolvedAt).map(i=>i.type)),['due_today']);
  await page.locator('.tdlx-header [data-tdlx-open=calendar]').click();
  assert.equal(await page.locator('[data-cal=task].is-overdue').count(),0);
  await page.clock.fastForward(61000);
  assert.equal(await page.locator('#overdueCount').textContent(),'1');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tdl.inbox.v1')).items.some(i=>!i.resolvedAt&&i.type==='overdue')),true);
  await page.evaluate(()=>TDLX.refresh());
  assert.equal(await page.locator('[data-cal=task].is-overdue').count(),1);
 },'2026-11-27T23:59:30-05:00');

 await check('invalid imported deadlines are ignored and second-level deadlines remain valid',[
  {...morning,id:'invalid',title:'Invalid imported date',dueDate:'2026-02-30'},
  {...morning,dueTime:'12:00:30'}
 ],async page=>{
  assert.equal(await page.locator('#overdueCount').textContent(),'0');
  const reminders=await page.evaluate(()=>JSON.parse(localStorage.getItem('tdl.inbox.v1')).items);
  assert.equal(reminders.some(i=>i.taskId==='invalid'),false);
  assert.equal(reminders.some(i=>i.taskId==='morning'&&i.type==='due_today'),true);
  assert.equal(await page.evaluate(()=>TDLInputUtils.taskDeadline({dueDate:'2026-03-08',dueTime:'02:30'})),null);
  await page.clock.fastForward(61000);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tdl.inbox.v1')).items.filter(i=>i.taskId==='morning'&&!i.resolvedAt).map(i=>i.type)),['overdue']);
 },'2026-11-27T12:00:15-05:00');

 await check('failed Momentum shrink preserves task age, commitments, history and saved data',[old],async page=>{
  await page.locator('#tdlx-momentum').click();
  const before=await page.evaluate(()=>({age:TDLMomentum.getAge('old'),state:TDLMomentum.getState(),tasks:localStorage.getItem('tdl.tasks.v1'),history:localStorage.getItem('tdl.taskHistory.v1')}));
  await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='tdl.tasks.v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};
  });
  page.once('dialog',dialog=>dialog.accept('Write one paragraph'));
  await page.locator('[data-momentum=shrink][data-id=old]').click();
  const after=await page.evaluate(()=>({age:TDLMomentum.getAge('old'),state:TDLMomentum.getState(),tasks:localStorage.getItem('tdl.tasks.v1'),history:localStorage.getItem('tdl.taskHistory.v1')}));
  assert.deepEqual(after,before);
  assert.match(await page.locator('#toast').textContent(),/Could not save/);
 });

 await check('deleting a focused task stops its block and unlocks the Dashboard timer',[old],async page=>{
  await page.locator('#tdlx-momentum').click();
  await page.locator('[data-momentum=doNow][data-id=old]').click();
  assert.equal(await page.evaluate(()=>TDLMomentum.getState().focus.running),true);
  assert.equal(await page.evaluate(()=>{TDLAppBridge.setTasks([]);const saved=TDLAppBridge.save();TDLAppBridge.render();return saved;}),true);
  assert.equal(await page.evaluate(()=>TDLMomentum.getState().focus.running),false);
  assert.equal(await page.evaluate(()=>TDLMomentum.getState().focus.taskId),'');
  assert.equal(await page.evaluate(()=>TDLMomentum.getState().sessions.length),0);
  await page.locator('#tdlx-home').click();
  await page.locator('#timerStart').click();
  assert.equal(await page.evaluate(()=>TDLAppBridge.isTimerRunning()),true);
 });

 await check('Do 2 minutes cannot reset task age or commitments while another timer runs',[old,{...old,id:'other',title:'Another old report'}],async page=>{
  const before=await page.evaluate(()=>({age:TDLMomentum.getAge('old'),committed:TDLMomentum.getState().committed}));
  await page.locator('#timerStart').click();
  await page.locator('#tdlx-momentum').click();
  await page.locator('[data-momentum=doNow][data-id=old]').click();
  assert.equal(await page.evaluate(()=>TDLMomentum.getAge('old')),before.age);
  assert.deepEqual(await page.evaluate(()=>TDLMomentum.getState().committed),before.committed);
  await page.locator('#tdlx-home').click();
  await page.locator('#timerReset').click();
  await page.locator('#tdlx-momentum').click();
  await page.locator('[data-momentum=doNow][data-id=old]').click();
  const running=await page.evaluate(()=>TDLMomentum.getState());
  await page.locator('[data-momentum-tab=today]').click();
  await page.locator('[data-momentum=doNow][data-id=other]').click();
  assert.deepEqual(await page.evaluate(()=>TDLMomentum.getState()),running);
 });
}finally{await browser.close();}
