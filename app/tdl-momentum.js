/* TDL Momentum — local-first accountability without destructive automatic rules.
 * Sidecar keys: tdl.momentum.v1 / tdl.completionLog.v1.
 * The original tdl.tasks.v1 array and all existing task fields remain owned by TDL.
 * This feature never clears storage and never deletes a task without confirmation. */
(function(){
"use strict";
const X=window.TDLX, bridge=window.TDLAppBridge;
if(!X||!bridge)return;
const STATE_KEY="tdl.momentum.v1",LOG_KEY="tdl.completionLog.v1";
const $=(q,root=document)=>root.querySelector(q),esc=X.escape;
const DAY_MS=86400000,THREE_DAYS=3*DAY_MS;
const today=()=>dayKey(new Date());
const dayKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const fromDay=s=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(s)))return null;const [y,m,d]=s.split("-").map(Number),v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null};
const dayNumber=s=>{const d=fromDay(s);return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY_MS:NaN};
const daysBetween=(start,end)=>Math.max(0,Math.round(dayNumber(end)-dayNumber(start)));
const dayOfTimestamp=ts=>dayKey(new Date(ts));
const taskList=()=>X.tasks();
const openTasks=()=>taskList().filter(t=>t&&!t.completed&&typeof t.id==="string");
const unique=xs=>[...new Set(xs)];
const safeTimestamp=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):0;
const initialTasks=taskList();
const newestCreation=initialTasks.reduce((max,t)=>Math.max(max,safeTimestamp(t.createdAt)),0);
function defaults(){return {version:1,cap:3,day:today(),committed:[],carryover:[],touches:{},firstSeen:{},lastAddedAt:newestCreation||Date.now(),restUntil:"",focus:{taskId:"",durationMs:0,remainingMs:0,endsAt:0,running:false,startedAt:0},sessions:[]}}
function read(){
 const s=X.store(STATE_KEY,null),d=defaults();
 if(!s||s.version!==1||typeof s!=="object")return d;
 return {version:1,cap:[3,4,5].includes(s.cap)?s.cap:3,day:fromDay(s.day)?s.day:today(),
  committed:Array.isArray(s.committed)?unique(s.committed.filter(x=>typeof x==="string")):[],
  carryover:Array.isArray(s.carryover)?s.carryover.filter(x=>x&&typeof x.id==="string"&&fromDay(x.from)).slice(0,250):[],
  touches:s.touches&&typeof s.touches==="object"&&!Array.isArray(s.touches)?s.touches:{},
  firstSeen:s.firstSeen&&typeof s.firstSeen==="object"&&!Array.isArray(s.firstSeen)?s.firstSeen:{},
  lastAddedAt:safeTimestamp(s.lastAddedAt)||d.lastAddedAt,
  restUntil:fromDay(s.restUntil)?s.restUntil:"",
  focus:s.focus&&typeof s.focus==="object"?{...d.focus,...s.focus}:d.focus,
  sessions:Array.isArray(s.sessions)?s.sessions.filter(x=>x&&typeof x.at==="number"&&typeof x.taskId==="string").slice(-1500):[]};
}
let state=read(),snapshot=X.copy(taskList()),log=readLog(),tab="today",pulse=null,focusTicker=null;
// Persist the first-visit baseline immediately; otherwise the 3-day inactivity clock would restart on every reload.
if(localStorage.getItem(STATE_KEY)===null)X.put(STATE_KEY,state);
function readLog(){
 const l=X.store(LOG_KEY,[]);
 return Array.isArray(l)?l.filter(x=>x&&typeof x.taskId==="string"&&typeof x.at==="number"&&typeof x.title==="string").slice(-5000):[];
}
function save(){return X.put(STATE_KEY,state)}
function saveLog(){return X.put(LOG_KEY,log)}
function taskById(id){return taskList().find(t=>t.id===id)}
function rollover(){
 const now=today();if(now===state.day)return false;
 const pending=new Map(state.carryover.map(x=>[x.id,x]));
 for(const id of state.committed){const task=taskById(id);
  if(task&&!task.completed&&!pending.has(id))pending.set(id,{id,from:state.day})}
 state.carryover=[...pending.values()].filter(x=>taskById(x.id)&&!taskById(x.id).completed).slice(0,250);
 state.committed=[];state.day=now;
 save();return true;
}
function tidy(){
 let changed=rollover();
 const existing=new Set(taskList().map(t=>t.id));
 const unfinished=new Set(openTasks().map(t=>t.id));
 // Completed tasks stay in today's plan and continue occupying their original slot.
 const commitments=state.committed.filter(id=>existing.has(id)).slice(0,state.cap);
 const carry=state.carryover.filter(x=>unfinished.has(x.id));
 if(JSON.stringify(commitments)!==JSON.stringify(state.committed)){state.committed=commitments;changed=true}
 if(JSON.stringify(carry)!==JSON.stringify(state.carryover)){state.carryover=carry;changed=true}
 if(changed)save();
 return changed;
}
function firstSeenAt(t){
 if(safeTimestamp(t.createdAt))return safeTimestamp(t.createdAt);
 if(!state.firstSeen[t.id]){state.firstSeen[t.id]=Date.now();save()}
 return state.firstSeen[t.id];
}
function lastTouched(t){
 return Math.max(firstSeenAt(t),safeTimestamp(t.updatedAt),safeTimestamp(state.touches[t.id]));
}
function age(t){return daysBetween(dayOfTimestamp(lastTouched(t)),today())}
function aged(){return openTasks().filter(t=>age(t)>=30).sort((a,b)=>age(b)-age(a))}
function tone(a){return a>=30?"decision":a>=15?"critical":a>=8?"fading":a>=3?"aging":"fresh"}
function dueInactivity(){
 if(state.restUntil&&today()<=state.restUntil)return false;
 return Date.now()-state.lastAddedAt>=THREE_DAYS;
}
function activityChanges(){
 const current=X.copy(taskList()),oldMap=new Map(snapshot.map(t=>[t.id,t]));
 let changed=false;
 for(const t of current){
  const old=oldMap.get(t.id);
  if(!old){state.lastAddedAt=Date.now();changed=true}
  const previousComplete=!!(old&&old.completed),complete=!!t.completed;
  // Imported/already-finished records have no verifiable completion time; never invent one.
  if(old&&!previousComplete&&complete){
   if(state.focus.taskId===t.id)endFocus();
   log.push({id:X.uid(),taskId:t.id,title:t.title,category:t.category||"Personal",at:Date.now()});
   changed=true;
  }else if(previousComplete&&!complete){
   const last=log.findLastIndex?log.findLastIndex(x=>x.taskId===t.id):-1;
   let index=last;
   if(index<0){for(let i=log.length-1;i>=0;i--)if(log[i].taskId===t.id){index=i;break}}
   if(index>=0){log.splice(index,1);changed=true}
  }
 }
 snapshot=current;
 if(log.length>5000)log=log.slice(-5000);
 if(changed){save();saveLog()}
 tidy();updatePulse();if(X.getPage&&X.getPage()==="accountability")X.refresh();
}
function mutate(next){
 const previous=X.copy(taskList());
 bridge.setTasks(next);bridge.save();
 const actual=JSON.stringify(taskList());
 // save() may fail while leaving memory changed. Verify persisted data before claiming success.
 if(localStorage.getItem("tdl.tasks.v1")!==actual){bridge.setTasks(previous);X.toast("Could not save task changes. No task was intentionally deleted.");return false}
 bridge.render();return true;
}
function shrink(taskId,forRollover=false){
 const t=taskById(taskId);if(!t||t.completed)return false;
 const answer=window.prompt("Rewrite this as one smaller, achievable next action:",t.title);
 if(answer===null)return false;
 const title=answer.trim().slice(0,160);
 if(!title){X.toast("Enter a smaller actionable task title.");return false}
 if(title===t.title){X.toast("Change the task to a smaller next step.");return false}
 const next=taskList().map(x=>x.id===taskId?{...x,title,updatedAt:Date.now()}:x);
 if(!mutate(next))return false;
 state.touches[taskId]=Date.now();
 state.carryover=state.carryover.filter(x=>x.id!==taskId);
 if(forRollover&&state.committed.length<state.cap)state.committed.push(taskId);
 save();X.toast("Task shrunk. Its prior version remains in Undo history.");
 return true;
}
function deleteTask(taskId){
 const t=taskById(taskId);if(!t)return false;
 if(!window.confirm('Delete "'+t.title+'"? This removes it from the task list. Recent task history may allow Undo, and a Full backup is safer.'))return false;
 if(!mutate(taskList().filter(x=>x.id!==taskId)))return false;
 state.committed=state.committed.filter(id=>id!==taskId);
 state.carryover=state.carryover.filter(x=>x.id!==taskId);
 save();X.toast("Task deleted. Use Undo if this was a mistake.");return true;
}
function recommit(taskId){
 tidy();
 if(state.carryover.length&& !state.carryover.some(x=>x.id===taskId)){
  X.toast("Review carried-over tasks before committing something new.");return false;
 }
 if(dueInactivity()){
  X.toast("It's been more than three days since you added a task. Add something useful or deliberately declare a rest day first.");return false
 }
 if(aged().some(t=>t.id!==taskId)){
  X.toast("Resolve your 30-day task decisions before adding a new commitment.");return false
 }
 if(state.committed.includes(taskId)){state.carryover=state.carryover.filter(x=>x.id!==taskId);save();return true}
 if(state.committed.length>=state.cap){X.toast("Today's commitment limit is full. Remove one commitment or return a carried task to your backlog.");return false}
 const t=taskById(taskId);
 if(!t||t.completed)return false;
 if(age(t)>=30){X.toast("This task needs its 30-day decision. Choose Do it or Shrink it first.");return false}
 state.committed.push(taskId);state.carryover=state.carryover.filter(x=>x.id!==taskId);
 save();updatePulse();X.refresh();return true;
}
function dropCommit(taskId){
 if(state.committed.includes(taskId)&&taskById(taskId)?.completed){X.toast("A completed task keeps its slot until midnight. The daily cap is a real cap.");return}
 state.committed=state.committed.filter(id=>id!==taskId);
 state.carryover=state.carryover.filter(x=>x.id!==taskId);
 save();updatePulse();X.refresh();
}
function shrinkAndRecommit(taskId){
 if(!shrink(taskId,true))return;
 updatePulse();X.refresh();
}
function doNow(taskId){
 const t=taskById(taskId);if(!t||t.completed)return;
 if(!state.committed.includes(taskId)&&state.committed.length>=state.cap){
  X.toast("Today's slots are full. Uncommit a task first.");return
 }
 state.touches[taskId]=Date.now();
 state.carryover=state.carryover.filter(x=>x.id!==taskId);
 if(!state.committed.includes(taskId))state.committed.push(taskId);
 save();tab="focus";startFocus(taskId,2);X.refresh();updatePulse();
}
function openNewTask(){
 X.navigate("home");
 const add=$("#add");if(add)add.click();
}
function weekMonday(date){
 const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
 d.setDate(d.getDate()-((d.getDay()+6)%7));return d;
}
function mondayKey(){return dayKey(weekMonday(new Date()))}
function weekDays(){const d=weekMonday(new Date());return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return dayKey(x)})}
function weekly(){
 const days=weekDays(),events=log.filter(x=>days.includes(dayOfTimestamp(x.at)));
 const sessions=state.sessions.filter(x=>days.includes(dayOfTimestamp(x.at)));
 return {days,events,sessions,minutes:Math.round(sessions.reduce((n,s)=>n+Number(s.minutes||0),0)),completed:events.length};
}
function streak(){
 const days=unique(log.map(x=>dayOfTimestamp(x.at)).concat(state.sessions.map(x=>dayOfTimestamp(x.at))));
 const index=days.map(dayNumber).filter(Number.isFinite).sort((a,b)=>b-a);
 if(!index.length)return 0;
 const todayNum=dayNumber(today());
 if(todayNum-index[0]>2)return 0;
 let count=1,prev=index[0];
 for(let i=1;i<index.length;i++){if(prev-index[i]>2)break;count++;prev=index[i]}
 return count;
}
function timeFormat(ms){
 const total=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
}
function recordFocus(){
 const id=state.focus.taskId,task=taskById(id),minutes=Math.round((state.focus.durationMs||0)/60000);
 if(id&&minutes){
  state.sessions.push({id:X.uid(),taskId:id,taskTitle:task?.title||"Deleted task",minutes,at:Date.now(),finished:true});
  state.sessions=state.sessions.slice(-1500)
 }
}
function focusClock(){
 const f=state.focus;
 if(!f.running)return false;
 const remaining=Math.max(0,(f.endsAt||0)-Date.now());
 if(remaining>0)return false;
 f.remainingMs=0;f.endsAt=0;f.running=false;
 recordFocus();save();
 X.toast("Focus block complete. You can finish the task or start another session.");
 return true;
}
function startFocus(taskId,minutes){
 if(bridge.isTimerRunning&&bridge.isTimerRunning()){X.toast("Pause your dashboard timer before starting a Momentum focus block.");return false}
 if(state.focus.running){X.toast("One task at a time. Finish, pause, or end the current block.");return false}
 const t=taskById(taskId);
 if(!t||t.completed||!state.committed.includes(taskId)){X.toast("Commit to an active task first.");return false}
 const durationMs=minutes*60000;
 state.focus={taskId,durationMs,remainingMs:durationMs,endsAt:Date.now()+durationMs,running:true,startedAt:Date.now()};
 state.touches[taskId]=Date.now();save();return true;
}
function resume(){
 const f=state.focus;if(!f.taskId||f.running||f.remainingMs<=0)return;
 f.endsAt=Date.now()+f.remainingMs;f.running=true;save()
}
function pause(){
 const f=state.focus;if(!f.running)return;
 f.remainingMs=Math.max(0,f.endsAt-Date.now());f.endsAt=0;f.running=false;save()
}
function endFocus(){
 state.focus={taskId:"",durationMs:0,remainingMs:0,endsAt:0,running:false,startedAt:0};
 save()
}
function completeTask(taskId){
 if(!bridge.completeTask){X.toast("Task completion is unavailable. Use the task list checkbox.");return false}
 const done=bridge.completeTask(taskId);
 if(done&&state.focus.taskId===taskId)endFocus();
 tidy();updatePulse();X.refresh();return done;
}
function relative(ts){return new Date(ts).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function renderPulse(){
 if(!pulse)return;
 tidy();
 const carry=state.carryover.length,old=aged().length,nudge=dueInactivity(),w=weekly(),friday=new Date().getDay()===5;
 const signals=[];
 if(carry)signals.push('<span class="tdlm-pulse-signal warning">'+carry+' task'+(carry===1?"":"s")+' need a new commitment</span>');
 if(old)signals.push('<span class="tdlm-pulse-signal aging">'+old+' task'+(old===1?"":"s")+' reached 30 days</span>');
 if(nudge)signals.push('<span class="tdlm-pulse-signal warning">No new task in 3+ days — add one or declare a rest day</span>');
 if(friday)signals.push('<span class="tdlm-pulse-signal good">Friday recap: '+w.completed+' finished · '+w.minutes+' focused minutes</span>');
 const main=signals.length?signals.join(""):'<span class="tdlm-pulse-signal good">'+state.committed.length+'/'+state.cap+' commitments selected for today</span>';
 pulse.innerHTML='<div class="tdlm-pulse-left"><span class="tdlm-pulse-label">MOMENTUM</span><div class="tdlm-pulse-signals">'+main+'</div></div>'+
 '<button type="button" class="btn tdlm-pulse-open">Open Momentum ↗</button>';
}
function updatePulse(){renderPulse()}
function safeActionButton(action,id,label,extra=""){
 return '<button type="button" class="btn '+extra+'" data-momentum="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
}
function renderCarryover(){
 const carry=state.carryover;
 if(!carry.length)return "";
 return '<section class="tdlm-priority tdlm-carry"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">MIDNIGHT REVIEW</span><h3>Yesterday is over. Choose what stays.</h3><p>Unfinished commitments do not silently roll into another day. Decide what each one deserves.</p></div><span class="tdlm-counter">'+carry.length+' decisions</span></div>'+
 '<div class="tdlm-decision-list">'+carry.map(x=>{
  const t=taskById(x.id);
  if(!t)return "";
  return '<article class="tdlm-decision"><div><strong>'+esc(t.title)+'</strong><small>Committed '+esc(x.from)+' · '+age(t)+' days since last touch</small></div><div class="tdlm-card-actions">'+
   safeActionButton("recommit",t.id,"Recommit today","primary")+
   safeActionButton("carryShrink",t.id,"Shrink + recommit")+
   safeActionButton("backlog",t.id,"Return to backlog")+
   safeActionButton("delete",t.id,"Delete")+'</div></article>';
 }).join("")+'</div><p class="tdlm-hint">Returning a task to the backlog is an explicit decision, not automatic rollover. Deletion always asks first.</p></section>';
}
function renderDecay(){
 const old=aged();if(!old.length)return "";
 return '<section class="tdlm-priority tdlm-decay"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">30-DAY DECISION</span><h3>These tasks need an answer.</h3><p>A month untouched is a signal to act, reduce the scope, or remove the task. None will be deleted automatically.</p></div><span class="tdlm-counter">'+old.length+' aging</span></div><div class="tdlm-decision-list">'+old.map(t=>
 '<article class="tdlm-decision"><div><strong>'+esc(t.title)+'</strong><small>Untouched for '+age(t)+' days · '+esc(t.category||"Personal")+'</small></div><div class="tdlm-card-actions">'+
 safeActionButton("doNow",t.id,"Do 2 minutes","primary")+safeActionButton("shrink",t.id,"Shrink it")+safeActionButton("delete",t.id,"Delete")+'</div></article>'
 ).join("")+'</div></section>';
}
function renderInactivity(){
 if(!dueInactivity())return "";
 const ago=Math.floor((Date.now()-state.lastAddedAt)/DAY_MS);
 return '<section class="tdlm-priority tdlm-inactivity"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">INACTIVITY CHECK</span><h3>Nothing new in '+ago+' days.</h3><p>Add one useful task, or deliberately declare today a rest day. We won’t fabricate a task just to maintain a streak.</p></div></div>'+
 '<div class="tdlm-card-actions">'+safeActionButton("newTask","","＋ Add a task","primary")+safeActionButton("rest","","Intentional rest today")+'</div></section>';
}
function renderToday(){
 tidy();
 const ready=openTasks().filter(t=>!state.committed.includes(t.id)),committed=state.committed.map(taskById).filter(Boolean);
 const blockers=state.carryover.length;
 const capacity=state.cap-state.committed.length;
 const total=taskList().length;
 return '<div class="tdlm-top-grid"><div class="tdlm-summary-main"><span class="tdlx-page-eyebrow">DAILY HARD CAP</span><div class="tdlm-count">'+state.committed.length+' <span>/ '+state.cap+' commitments</span></div><p>Commit deliberately. The backlog can be as large as it needs to be; today cannot.</p>'+
 '<div class="tdlm-cap-select"><label for="tdlm-cap">Daily limit</label><select id="tdlm-cap" aria-label="Daily commitment maximum"><option value="3">3 tasks</option><option value="4">4 tasks</option><option value="5">5 tasks</option></select></div></div>'+
 '<div class="tdlm-summary-side"><span class="tdlx-page-eyebrow">MOMENTUM</span><strong>'+streak()+'<small> active days</small></strong><p>One missed day is forgiven between active days.</p><div class="tdlm-summary-dots">'+Array.from({length:state.cap},(_,i)=>'<i class="'+(i<state.committed.length?"filled":"")+'"></i>').join("")+'</div></div></div>'+
 renderCarryover()+renderDecay()+renderInactivity()+
 '<section class="tdlm-panel"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">THE DAY IN FRONT OF YOU</span><h3>Today’s commitments</h3><p>'+(blockers?"Resolve yesterday’s review before selecting fresh commitments.":capacity?"Make fewer promises. Finish them.":"You’ve reached your daily cap. Remove a commitment to make room.")+'</p></div><span class="tdlm-counter">'+state.committed.length+' / '+state.cap+'</span></div>'+
 '<div class="tdlm-committed">'+(committed.length?committed.map((t,i)=>'<article class="tdlm-committed-item '+(t.completed?"is-completed":"")+'"><div class="tdlm-commit-num">'+(t.completed?"✓":String(i+1).padStart(2,"0"))+'</div><div class="tdlm-task-text"><strong>'+esc(t.title)+'</strong><span>'+esc(t.category||"Personal")+' · '+(t.completed?"Completed today’s commitment":age(t)+' days since touch')+'</span></div><div class="tdlm-card-actions">'+(t.completed?'<span class="tdlm-done-badge">Done · slot retained</span>':safeActionButton("doNow",t.id,"Focus","primary")+safeActionButton("uncommit",t.id,"Remove"))+'</div></article>').join(""):'<div class="tdlm-empty">Your day is still open. Choose up to '+state.cap+' tasks below.</div>')+'</div></section>'+
 '<section class="tdlm-panel"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">BACKLOG</span><h3>Choose what deserves today.</h3><p>Adding to the backlog is unrestricted. Daily commitments are not.</p></div><button type="button" class="btn" data-momentum="newTask">＋ New task</button></div>'+
 '<div class="tdlm-backlog">'+(ready.length?ready.sort((a,b)=>age(b)-age(a)).map(t=>'<article class="tdlm-backlog-item"><div class="tdlm-task-text"><strong>'+esc(t.title)+'</strong><span><em class="tdlm-decay-pill '+tone(age(t))+'">'+age(t)+'d untouched</em> '+esc(t.category||"Personal")+(t.dueDate?" · due "+esc(t.dueDate):"")+'</span></div>'+safeActionButton("recommit",t.id,age(t)>=30?"Review first":"＋ Commit",capacity>0&&!blockers&&age(t)<30?"primary":"")+'</article>').join(""):'<div class="tdlm-empty">No uncommitted tasks. You have '+total+' saved task records.</div>')+'</div></section>';
}
function renderFocus(){
 tidy();focusClock();
 const active=state.committed.map(taskById).filter(Boolean);
 const f=state.focus,locked=f.taskId&&taskById(f.taskId)&&!taskById(f.taskId).completed?taskById(f.taskId):null;
 const running=!!f.running,paused=!!(locked&&!running&&f.remainingMs>0);
 const countdown=running?Math.max(0,f.endsAt-Date.now()):Math.max(0,f.remainingMs||0);
 return '<div class="tdlm-focus-page"><div class="tdlm-focus-eyebrow"><span class="tdlx-page-eyebrow">ONE TASK. ONE WINDOW OF ATTENTION.</span><span class="tdlm-focus-online">● Private co-working space · no other participants connected</span></div>'+
 '<div class="tdlm-focus-room"><div class="tdlm-focus-room-glow"></div><div class="tdlm-focus-center"><div class="tdlm-focus-room-label">CURRENT PRIORITY</div>'+
 '<h3>'+esc(locked?.title||"Choose one task to begin")+'</h3><p>'+(locked?"Stay with this one. Your timer does not produce surprise quizzes.":"Pick a commitment from today’s list below. Only one can be active at once.")+'</p>'+
 '<div class="tdlm-focus-clock" id="tdlm-focus-clock" aria-live="off">'+(locked?timeFormat(countdown):"02:00")+'</div>'+
 '<div class="tdlm-focus-progress"><div id="tdlm-focus-progress-bar" style="width:'+(f.durationMs?Math.max(0,Math.min(100,100-100*countdown/f.durationMs)):0).toFixed(2)+'%"></div></div>'+
 '<div class="tdlm-focus-controls">'+
 (running?safeActionButton("focusPause",f.taskId,"Pause","primary")+safeActionButton("focusEnd",f.taskId,"End block"):paused?safeActionButton("focusResume",f.taskId,"Resume","primary")+safeActionButton("focusEnd",f.taskId,"End block"):locked?safeActionButton("focus2",locked.id,"Start 2 minutes","primary")+safeActionButton("focus25",locked.id,"Start 25 minutes")+safeActionButton("focusEnd",locked.id,"Choose another"):'<span class="tdlm-focus-helper">Choose a task below to begin.</span>')+
 '</div>'+(locked?safeActionButton("complete",locked.id,"✓ Mark task complete"):"")+
 '</div></div>'+
 '<div class="tdlm-focus-picks"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">YOUR COMMITMENTS</span><h3>Choose your single task</h3></div><span class="tdlm-counter">'+active.length+' available</span></div>'+
 (active.length?active.map(t=>'<button type="button" class="tdlm-focus-pick '+(locked?.id===t.id?"selected":"")+'" data-momentum="focusPick" data-id="'+esc(t.id)+'" '+(running&&locked?.id!==t.id?'disabled title="Finish or pause and end the active block to switch tasks"':"")+'><strong>'+esc(t.title)+'</strong><small>'+esc(t.category||"Personal")+'</small></button>').join(""):'<div class="tdlm-empty">No tasks committed yet. Go to Today to choose one.</div>')+
 '</div><p class="tdlm-hint">This is a solo, offline co-working-style focus room. It does not simulate other people or claim to connect you with live participants. A future real co-working room would require online accounts and a server.</p></div>';
}
function renderInsights(){
 const w=weekly(),labels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],counts=w.days.map(day=>w.events.filter(e=>dayOfTimestamp(e.at)===day).length),max=Math.max(1,...counts);
 const types=new Map();
 for(const e of w.events)types.set(e.category,(types.get(e.category)||0)+1);
 const recent=log.slice(-40).reverse().filter(x=>w.days.includes(dayOfTimestamp(x.at)));
 return '<div class="tdlm-insights-summary"><div><span class="tdlx-page-eyebrow">THIS WEEK</span><strong>'+w.completed+'</strong><small>finished tasks</small></div><div><span class="tdlx-page-eyebrow">FOCUS TIME</span><strong>'+w.minutes+'</strong><small>focused minutes</small></div><div><span class="tdlx-page-eyebrow">FORGIVING STREAK</span><strong>'+streak()+'</strong><small>active days</small></div></div>'+
 '<section class="tdlm-panel"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">'+(new Date().getDay()===5?"YOUR FRIDAY RECAP":"WEEKLY PROGRESS")+'</span><h3>'+esc(w.days[0])+' — '+esc(w.days[6])+'</h3><p>Completed tasks are logged when you mark them finished. Historical completions before Momentum was installed have no reliable completion timestamp.</p></div></div>'+
 '<div class="tdlm-weekly-chart" role="img" aria-label="Completed tasks: '+counts.map((c,i)=>labels[i]+" "+c).join(", ")+'">'+counts.map((count,i)=>'<div class="tdlm-weekday"><span class="tdlm-bar-count">'+count+'</span><div class="tdlm-bar-track"><div class="tdlm-bar" style="height:'+Math.round(100*count/max)+'%"></div></div><span>'+labels[i]+'</span></div>').join("")+'</div>'+
 '<div class="tdlm-insight-categories"><strong>By category</strong><span>'+(types.size?[...types].sort((a,b)=>b[1]-a[1]).map(([name,count])=>esc(name)+": "+count).join(" · "):"No completed tasks recorded this week.")+'</span></div></section>'+
 '<section class="tdlm-panel"><div class="tdlm-section-head"><div><span class="tdlx-page-eyebrow">AUTOMATIC COMPLETION LOG</span><h3>What you actually finished</h3><p>Recorded locally from the moment this feature was installed.</p></div></div>'+
 '<div class="tdlm-completion-log">'+(recent.length?recent.map(t=>'<div class="tdlm-completion-row"><span>✓</span><div><strong>'+esc(t.title)+'</strong><small>'+esc(t.category)+'</small></div><time>'+esc(new Date(t.at).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}))+'</time></div>').join(""):'<div class="tdlm-empty">Your completed tasks will appear here as you finish them.</div>')+'</div></section>';
}
function render(container){
 tidy();focusClock();
 const tabs=[["today","Today"],["focus","Single-task focus"],["insights","Weekly review"]];
 const w=weekly();
 container.innerHTML='<div class="tdlm-workspace"><div class="tdlm-tabs" role="group" aria-label="Momentum sections">'+tabs.map(([id,label])=>'<button type="button" data-momentum-tab="'+id+'" aria-pressed="'+(tab===id)+'" class="'+(tab===id?"active":"")+'">'+label+(id==="insights"&&new Date().getDay()===5?'<span class="tdlm-friday-indicator">Friday</span>':"")+'</button>').join("")+'</div>'+
 (tab==="today"?renderToday():tab==="focus"?renderFocus():renderInsights())+'</div>';
 const cap=$("#tdlm-cap",container);if(cap){
  cap.value=String(state.cap);cap.onchange=e=>{
   const requested=Number(e.target.value);
   if(requested<state.committed.length){X.toast("Remove existing commitments before reducing the limit.");e.target.value=String(state.cap);return}
   state.cap=requested;save();X.refresh();updatePulse()
  }
 }
 container.onclick=e=>{
  const tabEl=e.target.closest("[data-momentum-tab]");
  if(tabEl){tab=tabEl.dataset.momentumTab;X.refresh();return}
  const b=e.target.closest("[data-momentum]");if(!b)return;
  const action=b.dataset.momentum,id=b.dataset.id||"";
  if(action==="newTask"){openNewTask();return}
  if(action==="rest"){state.restUntil=today();save();X.refresh();updatePulse();return}
  if(action==="recommit"){recommit(id);return}
  if(action==="uncommit"||action==="backlog"){dropCommit(id);return}
  if(action==="carryShrink"){shrinkAndRecommit(id);return}
  if(action==="shrink"){if(shrink(id))X.refresh();return}
  if(action==="delete"){if(deleteTask(id))X.refresh();return}
  if(action==="doNow"){doNow(id);return}
  if(action==="focusPick"){
   if(state.focus.running&&state.focus.taskId!==id){X.toast("End the active block before switching tasks.");return}
   if(state.focus.taskId!==id){state.focus={taskId:id,durationMs:0,remainingMs:0,endsAt:0,running:false,startedAt:0};save()}X.refresh();return;
  }
  if(action==="focus2"||action==="focus25"){if(startFocus(id,action==="focus2"?2:25))X.refresh();return}
  if(action==="focusPause"){pause();X.refresh();return}
  if(action==="focusResume"){resume();X.refresh();return}
  if(action==="focusEnd"){endFocus();X.refresh();return}
  if(action==="complete"){completeTask(id);return}
 };
}
X.register("accountability","Momentum",render);
pulse=document.createElement("section");pulse.id="tdlm-pulse";pulse.className="tdlm-pulse";pulse.setAttribute("aria-label","Momentum status");
const intro=$(".intro");if(intro)intro.insertAdjacentElement("afterend",pulse);
else{const header=$("header");if(header)header.insertAdjacentElement("afterend",pulse)}
pulse.addEventListener("click",e=>{if(e.target.closest(".tdlm-pulse-open"))X.navigate("accountability")});
document.addEventListener("tdlx:tasks-changed",activityChanges);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){tidy();focusClock();updatePulse();if(X.getPage&&X.getPage()==="accountability")X.refresh()}});
window.setInterval(()=>{
 const newDay=rollover(),finished=focusClock();
 if(newDay||finished){updatePulse();if(X.getPage&&X.getPage()==="accountability")X.refresh()}
 const clock=$("#tdlm-focus-clock"),bar=$("#tdlm-focus-progress-bar");
 if(clock&&state.focus.taskId){
  const left=state.focus.running?Math.max(0,state.focus.endsAt-Date.now()):state.focus.remainingMs;
  clock.textContent=timeFormat(left);
  if(bar)bar.style.width=(state.focus.durationMs?Math.max(0,Math.min(100,100*(1-left/state.focus.durationMs))):0).toFixed(2)+"%";
 }
},1000);
tidy();focusClock();updatePulse();
window.TDLMomentum={getState:()=>X.copy(state),getLog:()=>X.copy(log),getAge:id=>{const t=taskById(id);return t?age(t):null},getWeek:()=>X.copy(weekly()),recommit,rollover};
})();