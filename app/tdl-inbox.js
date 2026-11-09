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
let inbox=read(),filter="unread",viewSignature="";
function read(){const x=X.store(key,{version:1,items:[]});return x&&Array.isArray(x.items)?x:{version:1,items:[]}}
function saved(){inbox.items.sort((a,b)=>b.at-a.at);if(inbox.items.length>max){
 const active=inbox.items.filter(x=>!x.dismissedAt&&!x.resolvedAt);
 const old=inbox.items.filter(x=>x.dismissedAt||x.resolvedAt).slice(0,Math.max(0,max-active.length));
 inbox.items=active.concat(old).sort((a,b)=>b.at-a.at);
 }return X.put(key,inbox)}
function eligible(t,type,d){const due=d.valueOf(),now=Date.now();if(type==="overdue")return due<now; if(type==="due_today")return t.dueDate===today();return due>=now&&due-now<=120*60000}
function status(item){if(item.resolvedAt)return "resolved";if(item.dismissedAt)return "dismissed";if(item.snoozedUntil&&item.snoozedUntil>Date.now())return "snoozed";return item.readAt?"read":"unread"}
function unread(){return inbox.items.filter(x=>status(x)==="unread").length}
function scan(refreshView=true){
 if(!inbox)return;const now=Date.now(),actual=new Map(X.tasks().filter(t=>t&&typeof t.id==="string").map(t=>[t.id,t]));let changed=false;
 for(const item of inbox.items){
  const task=actual.get(item.taskId),d=task&&asDate(task);
  const sameEvent=task&&item.eventKey===item.type+":"+task.id+":"+task.dueDate+":"+(task.dueTime||"end");
  const current=!!(sameEvent&&task&&!task.completed&&d&&eligible(task,item.type,d));
  if(current){
   if(item.resolvedAt){item.resolvedAt=null;changed=true;}
   const deadline=task.dueDate+" "+(task.dueTime||"end of day");
   if(item.title!==task.title||item.deadline!==deadline){item.title=task.title;item.deadline=deadline;changed=true;}
  }else if(!item.resolvedAt){item.resolvedAt=now;changed=true;}
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
 const signature=JSON.stringify(inbox.items.map(item=>[item.id,status(item),item.title,item.deadline]));
 const refresh=signature!==viewSignature;viewSignature=signature;
 if(refreshView&&refresh&&X.getPage&&X.getPage()==="inbox")X.refresh();
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
 saved();scan(false);X.refresh();
}
function openTask(item){
 if(!item)return;
 const t=X.tasks().find(x=>x.id===item.taskId);
 if(!t){alert("The linked task was deleted or is unavailable. The old reminder remains for reference.");return}
 item.readAt=Date.now();saved();X.updateBadge(unread());
 X.close();window.TDLAppBridge.openTask(t);
}
X.register("inbox","Notification Center",function(c){
 scan(false);
 const all=inbox.items.slice().sort((a,b)=>b.at-a.at);
 const stateCounts={unread:0,archived:0,all:all.length};
 for(const item of all){const s=status(item);if(s==="unread")stateCounts.unread++;if(s==="dismissed"||s==="resolved")stateCounts.archived++}
 const visible=all.filter(item=>filter==="all"||(filter==="unread"?status(item)==="unread":["dismissed","resolved"].includes(status(item))));
 const entries=visible.map(item=>{
  const state=status(item);
  const label=item.type==="due_today"?"Due today":item.type==="due_soon"?"Approaching deadline":"Overdue";
  const stateClass=item.type==="overdue"?"is-overdue":item.type==="due_today"?"is-today":"is-upcoming";
  return '<article class="tdlx-inbox-entry '+(state==="unread"?"is-unread":"")+'"><div class="tdlx-inbox-icon '+stateClass+'" aria-hidden="true">'+(item.type==="overdue"?"!":item.type==="due_today"?"●":"↗")+'</div>'+
   '<div class="tdlx-inbox-entry-body"><div class="tdlx-inbox-entry-top"><span class="tdlx-inbox-kicker">'+esc(label)+'</span><span class="tdlx-inbox-timestamp">'+esc(new Date(item.at).toLocaleString())+'</span></div>'+
   '<h3>'+esc(item.title)+'</h3><p>Deadline: '+esc(item.deadline)+' <span aria-hidden="true">·</span> '+esc(state)+'</p>'+
   '<div class="tdlx-inbox-entry-actions"><button class="btn primary" type="button" data-inbox="open" data-id="'+esc(item.id)+'">Open task</button>'+
   (state==="unread"?'<button class="btn" type="button" data-inbox="read" data-id="'+esc(item.id)+'">Mark read</button>':"")+
   (state!=="dismissed"&&state!=="resolved"?'<details class="tdlx-inbox-snooze"><summary class="btn">Remind later ⌄</summary><div class="tdlx-inbox-snooze-menu"><button class="btn" data-inbox="snooze15" data-id="'+esc(item.id)+'" type="button">In 15 minutes</button><button class="btn" data-inbox="snooze60" data-id="'+esc(item.id)+'" type="button">In 1 hour</button><button class="btn" data-inbox="snoozeTomorrow" data-id="'+esc(item.id)+'" type="button">Tomorrow morning</button></div></details><button class="btn" type="button" data-inbox="dismiss" data-id="'+esc(item.id)+'">Dismiss</button>':"")+'</div></div></article>';
 }).join("");
 const filterTab=(value,label,count)=>'<button type="button" class="tdlx-inbox-filter '+(filter===value?"is-active":"")+'" data-filter="'+value+'" aria-pressed="'+(filter===value)+'"><span>'+label+'</span><strong>'+count+'</strong></button>';
 c.innerHTML='<div class="tdlx-inbox-overview"><div class="tdlx-inbox-overview-main"><span class="tdlx-page-eyebrow">NOTIFICATION CENTER</span><div class="tdlx-inbox-big-count">'+stateCounts.unread+'<span> unread</span></div><p>Your reminders, all in one place. Nothing here changes an assignment deadline.</p></div>'+
 '<button class="btn" id="tdlx-inbox-markall" type="button" '+(!stateCounts.unread?"disabled":"")+'>✓ Mark all as read</button></div>'+
 '<div class="tdlx-inbox-layout"><nav class="tdlx-inbox-sidebar" aria-label="Filter reminders"><div class="tdlx-page-eyebrow">FILTERS</div>'+
 filterTab("unread","Unread",stateCounts.unread)+filterTab("all","All reminders",stateCounts.all)+filterTab("archived","Archived",stateCounts.archived)+
 '<p>Reminders are generated while TDL is open. They are kept locally in this browser, not pushed from a server.</p></nav>'+
 '<div class="tdlx-inbox-feed"><div class="tdlx-inbox-feed-head"><h3>'+(filter==="unread"?"Unread reminders":filter==="all"?"All reminders":"Archived reminders")+'</h3><span>'+visible.length+' items</span></div>'+
 (entries||'<div class="tdlx-inbox-empty"><div aria-hidden="true">✓</div><h3>All clear</h3><p>'+(filter==="unread"?"No unread reminders right now.":"Nothing in this category yet.")+'</p></div>')+'</div></div>';
 const mark=$("#tdlx-inbox-markall",c);
 if(mark)mark.addEventListener("click",()=>{inbox.items.forEach(item=>{if(status(item)==="unread")item.readAt=Date.now()});saved();scan(false);X.refresh()});
 c.onclick=e=>{
  const tab=e.target.closest("[data-filter]");
  if(tab){filter=tab.dataset.filter;X.refresh();return}
  const b=e.target.closest("[data-inbox]");if(!b)return;
  const item=inbox.items.find(x=>x.id===b.dataset.id);
  if(b.dataset.inbox==="open")openTask(item);else act(b.dataset.id,b.dataset.inbox)
 };
});
scan();
document.addEventListener("tdlx:tasks-changed",()=>{scan()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)scan()});
window.setInterval(scan,60000);
})();
