/* TDL Notification Center: persistent, offline, in-app deadline inbox.
   Does NOT claim to send notifications while all app windows are closed. */
(function(){
"use strict";
const X=window.TDLX;if(!X)return;
const key="tdl.inbox.v1",max=250;
const $=(s,root=document)=>root.querySelector(s),esc=X.escape;
const dateKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const today=()=>dateKey(Date.now());
const asDate=t=>{if(!t.dueDate)return null;const d=new Date(t.dueDate+"T"+(t.dueTime||"23:59")+":00");return Number.isNaN(d.valueOf())?null:d};
let inbox=null,filter="unread";
function read(){const x=X.store(key,{version:1,items:[]});return x&&Array.isArray(x.items)?x:{version:1,items:[]}}
function saved(){inbox.items.sort((a,b)=>b.at-a.at);if(inbox.items.length>max){
 const active=inbox.items.filter(x=>!x.dismissedAt&&!x.resolvedAt);
 const old=inbox.items.filter(x=>x.dismissedAt||x.resolvedAt).slice(0,Math.max(0,max-active.length));
 inbox.items=active.concat(old).sort((a,b)=>b.at-a.at);
 }return X.put(key,inbox)}
function eligible(t,type,d){const due=d.valueOf(),now=Date.now();if(type==="overdue")return due<now; if(type==="due_today")return t.dueDate===today();return due>=now&&due-now<=120*60000}
function status(item){if(item.resolvedAt)return "resolved";if(item.dismissedAt)return "dismissed";if(item.snoozedUntil&&item.snoozedUntil>Date.now())return "snoozed";return item.readAt?"read":"unread"}
function unread(){return inbox.items.filter(x=>status(x)==="unread").length}
function scan(){
 if(!inbox)return;const now=Date.now(),actual=new Map(X.tasks().filter(t=>t&&typeof t.id==="string").map(t=>[t.id,t]));let changed=false;
 for(const item of inbox.items){if(item.resolvedAt)continue;const task=actual.get(item.taskId),d=task&&asDate(task);
  if(!task||task.completed||!d||!eligible(task,item.type,d)){item.resolvedAt=now;changed=true;}
 }
 for(const t of X.tasks()){
  if(!t||t.completed||!t.id)continue;const d=asDate(t);if(!d)continue;
  const types=[];
  if(d.valueOf()<now)types.push("overdue");
  else if(t.dueDate===today())types.push("due_today");
  else if(d.valueOf()-now<=120*60000)types.push("due_soon");
  for(const type of types){
   const eventKey=type+":"+t.id+":"+t.dueDate+":"+(t.dueTime||"end");
   if(inbox.items.some(x=>x.eventKey===eventKey))continue;
   inbox.items.push({id:X.uid(),eventKey,taskId:t.id,type,title:t.title,deadline:t.dueDate+" "+(t.dueTime||"end of day"),at:now,readAt:null,dismissedAt:null,snoozedUntil:null,resolvedAt:null});
   changed=true;
  }
 }
 if(changed)saved();X.updateBadge(unread());
}
function act(id,action){
 let item=inbox.items.find(x=>x.id===id);if(!item)return;
 if(action==="read"){item.readAt=Date.now();}
 else if(action==="dismiss"){item.dismissedAt=Date.now();item.readAt=item.readAt||Date.now();}
 else if(action==="snooze15"||action==="snooze60"||action==="snoozeTomorrow"){
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(9,0,0,0);
  item.snoozedUntil=action==="snoozeTomorrow"?tomorrow.valueOf():Date.now()+(action==="snooze15"?15:60)*60000;
  item.readAt=null;
 }
 saved();scan();X.refresh();
}
function openTask(item){
 if(!item)return;
 const t=X.tasks().find(x=>x.id===item.taskId);
 if(!t){alert("The linked task was deleted or is unavailable. The old reminder remains for reference.");return}
 item.readAt=Date.now();saved();X.updateBadge(unread());
 X.close();window.TDLAppBridge.openTask(t);
}
X.register("inbox","Notification Center",function(c){
 scan();
 const all=inbox.items.slice().sort((a,b)=>b.at-a.at);
 const visible=all.filter(x=>filter==="all"||(filter==="unread"?status(x)==="unread":["dismissed","resolved"].includes(status(x))));
 c.innerHTML='<p class="tdlx-help">In-app reminders are saved in this browser even if Chrome or macOS hides a notification. TDL detects new overdue items when you open it; it cannot send scheduled alerts while fully closed.</p>'+
 '<div class="tdlx-actions"><label class="tdlx-muted">Show <select id="tdlx-inbox-filter"><option value="unread">Unread</option><option value="all">All</option><option value="archived">Archived/resolved</option></select></label><button class="btn" id="tdlx-inbox-markall">Mark all read</button><span class="tdlx-muted">'+unread()+' unread · '+all.length+' stored</span></div>'+
 (visible.length?visible.map(item=>{const state=status(item),label=item.type==="due_today"?"Due today":item.type==="due_soon"?"Due soon":"Overdue";
  return '<div class="tdlx-card"><div class="tdlx-row"><strong>'+(state==="unread"?"● ":"○ ")+esc(label)+" — "+esc(item.title)+'</strong><small class="tdlx-muted">'+esc(new Date(item.at).toLocaleString())+'</small></div><p class="tdlx-muted">Deadline: '+esc(item.deadline)+' · '+esc(state)+'</p><div class="tdlx-actions"><button class="btn" data-inbox="open" data-id="'+esc(item.id)+'">Open task</button><button class="btn" data-inbox="read" data-id="'+esc(item.id)+'">Mark read</button><button class="btn" data-inbox="snooze15" data-id="'+esc(item.id)+'">15m</button><button class="btn" data-inbox="snooze60" data-id="'+esc(item.id)+'">1h</button><button class="btn" data-inbox="snoozeTomorrow" data-id="'+esc(item.id)+'">Tomorrow</button><button class="btn" data-inbox="dismiss" data-id="'+esc(item.id)+'">Dismiss</button></div></div>'
 }).join(""):'<div class="tdlx-card"><p>No reminders in this view.</p></div>');
 $("#tdlx-inbox-filter",c).value=filter;
 $("#tdlx-inbox-filter",c).addEventListener("change",e=>{filter=e.target.value;X.refresh()});
 $("#tdlx-inbox-markall",c).addEventListener("click",()=>{inbox.items.forEach(x=>{if(status(x)==="unread")x.readAt=Date.now()});saved();scan();X.refresh()});
 c.onclick=e=>{const b=e.target.closest("[data-inbox]");if(!b)return;const item=inbox.items.find(x=>x.id===b.dataset.id);if(b.dataset.inbox==="open")openTask(item);else act(b.dataset.id,b.dataset.inbox)};
});
inbox=read();scan();
document.addEventListener("tdlx:tasks-changed",()=>{scan()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)scan()});
window.setInterval(scan,60000);
})();
