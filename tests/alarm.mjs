// Alarm lifecycle checks with fake audio and notifications, never real task data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('app/tdl-alarm.js','utf8');
function setup({audio=true,blocked=false,permission='granted',delayedResume=false}={}){
 const ids=new Map(),store=new Map(),sources=[],contexts=[],notifications=[],closed=[],listeners={};
 let resolveResume,resolveNotification;
 class E{
  constructor(){this.handlers={};this.open=false;this.value='75';this.textContent='';this.checked=true;this.disabled=false;}
  setAttribute(){}querySelector(q){if(!ids.has(q))ids.set(q,new E());return ids.get(q)}
  set innerHTML(v){this.html=v}addEventListener(n,f){this.handlers[n]=f}focus(){}showModal(){this.open=true}close(){this.open=false}
 }
 const body=new E();let dialog;body.appendChild=e=>{dialog=e};
 const document={title:'TDL — Your workspace',createElement:()=>new E(),body,querySelector:q=>{if(!ids.has(q))ids.set(q,new E());return ids.get(q)}};
 class Audio{
  constructor(){this.state='suspended';this.currentTime=10;this.sampleRate=8000;contexts.push(this)}
  addEventListener(){}resume(){if(blocked)return Promise.reject(Error('Denied'));if(delayedResume)return new Promise(r=>{resolveResume=()=>{this.state='running';r()}});this.state='running';return Promise.resolve()}
  createGain(){return {gain:{value:0},connect(){}}}
  createBuffer(_channels,size){const samples=new Float32Array(size);return {getChannelData:()=>samples}}
  createBufferSource(){const s={stopped:false,connect(){},start(at){this.at=at},stop(){this.stopped=true},disconnect(){}};sources.push(s);return s}
 }
 const reg={showNotification(title,options){notifications.push({title,options});return new Promise(r=>{resolveNotification=r})},getNotifications:({tag})=>Promise.resolve([{close(){closed.push(tag)}}])};
 const navigator={serviceWorker:{getRegistration:()=>Promise.resolve(reg)},vibrate(){}};
 const window={addEventListener:(name,f)=>{listeners[name]=f},focus(){}};if(audio)window.AudioContext=Audio;
 const Notification={permission};window.Notification=Notification;
 vm.runInNewContext(code,{document,window,navigator,Notification,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console,Date,Promise,Float32Array,Math,Number,JSON});
 return {alarm:window.TDLAlarm,dialog:()=>dialog,ids,sources,contexts,notifications,closed,document,store,resolveResume:()=>resolveResume(),resolveNotification:()=>resolveNotification(),listeners};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
let s=setup();assert.equal(s.contexts.length,0,'Audio must wait for a user gesture');
s.alarm.arm('dashboard',60000,'Study');await flush();assert.equal(s.sources.length,1);assert.equal(s.sources[0].loop,true);assert.ok(s.sources[0].at>=69);assert.ok(s.sources[0].buffer.getChannelData(0).some(n=>n!==0),'Chime buffer contains audible samples');assert.equal(s.ids.get('#alarmPreview').disabled,true);
s.alarm.disarm('momentum');assert.equal(s.sources[0].stopped,false,'Other timer cannot cancel owner');
s.alarm.disarm('dashboard');assert.equal(s.sources[0].stopped,true);assert.equal(s.dialog().open,false);assert.equal(s.ids.get('#alarmPreview').disabled,false);
console.log('PASS gesture-only audio initialization, scheduled looping chime, owner isolation and pause cancellation');
s=setup();s.alarm.arm('dashboard',60000,'Study');await flush();s.alarm.finish('dashboard','Study');await flush();assert.ok(s.sources[0].stopped,'A suspended audio clock is re-aligned at completion');assert.equal(s.sources.at(-1).at,10);assert.equal(s.dialog().open,true);assert.match(s.document.title,/Time’s up/);assert.equal(s.notifications.length,1);s.alarm.finish('dashboard','Study');await flush();assert.equal(s.notifications.length,1,'Completion is idempotent');
s.alarm.stop();s.resolveNotification();await flush();assert.equal(s.sources.at(-1).stopped,true);assert.equal(s.dialog().open,false);assert.equal(s.document.title,'TDL — Your workspace');assert.ok(s.closed.length,'An asynchronous notification is closed even if Stop was pressed first');
console.log('PASS expiry alert, elapsed audio-clock recovery, one notification, persistent dialog and Stop cleanup');
s=setup({delayedResume:true});s.alarm.arm('dashboard',60000);s.alarm.stop();s.resolveResume();await flush();assert.equal(s.sources.length,0,'Stopped timer must never start sound after audio unlock resolves');
console.log('PASS no ghost alarm after asynchronous audio unlock');
for(const options of [{audio:false},{blocked:true},{permission:'denied'}]){s=setup(options);s.alarm.arm('dashboard',0);await flush();s.alarm.finish('dashboard','Focus timer');await flush();assert.equal(s.dialog().open,true);s.alarm.stop();assert.equal(s.dialog().open,false);if(options.permission==='denied')assert.equal(s.notifications.length,0);}
console.log('PASS visual/Stop fallback without sound or notification permission');
s=setup();const toggle=s.ids.get('#alarmSoundEnabled');toggle.checked=false;toggle.handlers.change();s.alarm.arm('dashboard',0);s.alarm.finish('dashboard','Focus timer');await flush();assert.equal(s.contexts.length,0);assert.equal(s.dialog().open,true);assert.deepEqual([...s.store.keys()],['tdl.alarm.v1']);
console.log('PASS sound preference, visual-only completion, and isolated preference storage');
