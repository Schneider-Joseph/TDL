/* TDL Extras Core: non-destructive UI shells, task history, full local backup.
   Loaded AFTER TDL's existing inline script. Never replace or rename tdl.tasks.v1.
   Other feature modules register via window.TDLX.register(). */
(function(){
"use strict";
const $=(s,base=document)=>(base||document).querySelector(s);
const escape=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const copy=x=>JSON.parse(JSON.stringify(x));
const uid=()=>window.crypto&&crypto.randomUUID?crypto.randomUUID():"tdlx-"+Date.now()+"-"+Math.random().toString(16).slice(2);
const store=(key,defaultValue)=>{try{const v=JSON.parse(localStorage.getItem(key));return v===null?copy(defaultValue):v}catch(e){return copy(defaultValue)}};
const put=(key,obj)=>{try{localStorage.setItem(key,JSON.stringify(obj));return true}catch(e){alert("TDL could not save "+key+". Your previous stored data has not been cleared. Check available browser storage and export a backup.");return false}};
const tasks=()=>window.TDLAppBridge&&Array.isArray(window.TDLAppBridge.getTasks())?window.TDLAppBridge.getTasks():[];
const time=(ms)=>new Date(ms).toLocaleString();
const root=document.createElement("div");
root.id="tdlx-root";
root.innerHTML='<div id="tdlx-overlay" class="tdlx-overlay" hidden><section class="tdlx-dialog" role="dialog" aria-modal="true" aria-labelledby="tdlx-heading"><div class="tdlx-top"><h2 id="tdlx-heading">TDL</h2><button type="button" class="btn" id="tdlx-close">Close ✕</button></div><div class="tdlx-content" id="tdlx-content"></div></section></div><input type="file" id="tdlx-restore-file" accept=".json,application/json" hidden>';
document.body.appendChild(root);
const bar=document.createElement("nav");
bar.className="tdlx-header";
bar.setAttribute("aria-label","TDL extra tools");
bar.innerHTML='<button type="button" class="btn" data-tdlx-open="inbox" id="tdlx-bell">🔔 Inbox <span class="tdlx-pill" id="tdlx-unread" hidden>0</span></button><button type="button" class="btn" id="tdlx-undo" title="Undo last task change">↶ Undo</button><button type="button" class="btn" id="tdlx-redo" title="Redo last undone task change">↷ Redo</button><button type="button" class="btn" data-tdlx-open="history">Task history</button><button type="button" class="btn" data-tdlx-open="calendar">📆 Week</button><button type="button" class="btn" data-tdlx-open="planner">⬡ Planner</button><button type="button" class="btn" id="tdlx-backup">Full backup</button><button type="button" class="btn" id="tdlx-restore">Full restore</button>';
const header=document.querySelector("header");
if(header)header.insertAdjacentElement("afterend",bar);else document.body.insertBefore(bar,document.body.firstChild);
const screens={};
let active="", lastFocus=null;
function register(name,title,render){screens[name]={title,render};if(active===name)refresh()}
function open(name){
 if(!screens[name])return;
 lastFocus=document.activeElement;active=name;$("#tdlx-heading").textContent=screens[name].title;
 $("#tdlx-overlay").hidden=false;refresh();$("#tdlx-close").focus();
}
function close(){active="";$("#tdlx-overlay").hidden=true;$("#tdlx-content").innerHTML="";if(lastFocus&&lastFocus.focus)lastFocus.focus()}
function refresh(){if(active&&screens[active]){try{screens[active].render($("#tdlx-content"))}catch(e){console.error("TDL "+active+" panel failed:",e);$("#tdlx-content").innerHTML='<p role="alert">This panel could not load. Your task list has not been cleared. Close this window and check the browser Console.</p>'}}}
function toast(message){if(window.TDLAppBridge&&typeof window.TDLAppBridge.notify==="function")window.TDLAppBridge.notify(message);else console.info("TDL:",message)}
const historyKey="tdl.taskHistory.v1";
let silentHistory=false;
function history(){let h=store(historyKey,{version:1,entries:[],cursor:0});if(!h||!Array.isArray(h.entries)||!Number.isInteger(h.cursor))return {version:1,entries:[],cursor:0};h.cursor=Math.min(Math.max(0,h.cursor),h.entries.length);return h}
function historyWrite(h){return put(historyKey,h)}
function diff(before,after){
 let a=new Map(before.filter(x=>x&&typeof x.id==="string").map(x=>[x.id,x]));
 let b=new Map(after.filter(x=>x&&typeof x.id==="string").map(x=>[x.id,x]));
 let ids=new Set([...a.keys(),...b.keys()]);
 let changes=[];
 ids.forEach(id=>{const x=a.get(id)||null,y=b.get(id)||null;if(JSON.stringify(x)!==JSON.stringify(y))changes.push({id,before:x?copy(x):null,after:y?copy(y):null,beforeIndex:before.findIndex(t=>t&&t.id===id)})});
 return changes;
}
function describe(changes){
 if(changes.length===1){const x=changes[0];if(!x.before)return "Created "+(x.after?.title||"task");if(!x.after)return "Deleted "+(x.before.title||"task");if(x.before.completed!==x.after.completed)return (x.after.completed?"Completed ":"Reopened ")+(x.after.title||"task");return "Edited "+(x.after.title||"task")}
 if(changes.some(x=>x.before&&x.after&&x.before.completed!==x.after.completed)&&changes.some(x=>!x.before&&x.after))return "Completed recurring task";
 return "Updated "+changes.length+" task records";
}
function afterTaskSave(beforeRaw){
 if(silentHistory)return;
 try{
  const before=JSON.parse(beforeRaw||"[]"),after=tasks();
  if(!Array.isArray(before))return;
  const changes=diff(before,after);
  if(!changes.length)return;
  const h=history();h.entries=h.entries.slice(0,h.cursor);
  h.entries.push({id:uid(),at:Date.now(),label:describe(changes),changes:changes});
  if(h.entries.length>50)h.entries.splice(0,h.entries.length-50);
  h.cursor=h.entries.length;
  if(!historyWrite(h))toast("Task saved, but its Undo history was not saved. Export a full backup.");
  else showUndoToast(h.entries[h.entries.length-1].label);
  updateUndoButtons();
  document.dispatchEvent(new CustomEvent("tdlx:tasks-changed"));
 }catch(e){console.error("TDL history error:",e);toast("Task saved; history unavailable. Export a backup.")}
}
function same(a,b){return JSON.stringify(a)==JSON.stringify(b)}
function restoreChanges(changes,target){
 const current=tasks(),map=new Map(current.map(x=>[x.id,x]));
 for(const c of changes){const expected=target==="before"?c.after:c.before;if(!same(map.get(c.id)||null,expected))return false}
 let next=current.map(copy);
 for(const c of changes){const snapshot=target==="before"?c.before:c.after;const i=next.findIndex(t=>t.id===c.id);
  if(snapshot===null){if(i>=0)next.splice(i,1)}
  else if(i>=0)next[i]=copy(snapshot);
  else next.splice(Math.min(Math.max(0,c.beforeIndex),next.length),0,copy(snapshot));
 }
 const previous=current;silentHistory=true;
 try{window.TDLAppBridge.setTasks(next);window.TDLAppBridge.save();if(!same(JSON.parse(localStorage.getItem("tdl.tasks.v1")||"[]"),next)){window.TDLAppBridge.setTasks(previous);return false}window.TDLAppBridge.render();return true}
 catch(e){window.TDLAppBridge.setTasks(previous);console.error(e);return false}
 finally{silentHistory=false;document.dispatchEvent(new CustomEvent("tdlx:tasks-changed"))}
}
function undo(){
 const h=history();if(h.cursor<=0){toast("Nothing to undo.");return}
 const action=h.entries[h.cursor-1];
 if(!restoreChanges(action.changes,"before")){alert("Undo stopped: tasks have changed since this action. No task was overwritten.");return}
 h.cursor--;historyWrite(h);updateUndoButtons();toast("Undid: "+action.label);refresh();
}
function redo(){
 const h=history();if(h.cursor>=h.entries.length){toast("Nothing to redo.");return}
 const action=h.entries[h.cursor];
 if(!restoreChanges(action.changes,"after")){alert("Redo stopped: tasks no longer match the original state. No task was overwritten.");return}
 h.cursor++;historyWrite(h);updateUndoButtons();toast("Redid: "+action.label);refresh();
}
function updateUndoButtons(){const h=history();$("#tdlx-undo").disabled=h.cursor===0;$("#tdlx-redo").disabled=h.cursor>=h.entries.length}

let undoToastTimer=0;
const undoToast=document.createElement("div");
undoToast.className="tdlx-undo-toast";undoToast.hidden=true;undoToast.setAttribute("role","status");
undoToast.innerHTML='<span id="tdlx-toast-text"></span> <button type="button" class="btn" id="tdlx-toast-undo">Undo</button>';
document.body.appendChild(undoToast);
undoToast.querySelector("#tdlx-toast-undo").addEventListener("click",()=>{undo();undoToast.hidden=true});
function showUndoToast(label){
 undoToast.querySelector("#tdlx-toast-text").textContent=label;
 undoToast.hidden=false;window.clearTimeout(undoToastTimer);
 undoToastTimer=window.setTimeout(()=>{undoToast.hidden=true},10000);
}
function recoverDeleted(actionId,taskId){
 const h=history(),entry=h.entries.find(e=>e.id===actionId);
 const d=entry&&entry.changes.find(c=>c.id===taskId&&c.before&&!c.after);
 if(!d)return;
 if(tasks().some(t=>t.id===taskId)){alert("This task is already present. Nothing was overwritten.");return}
 if(!confirm("Restore deleted task: "+d.before.title+"?"))return;
 const previous=tasks(),next=previous.concat(copy(d.before));
 window.TDLAppBridge.setTasks(next);window.TDLAppBridge.save();
 if(localStorage.getItem("tdl.tasks.v1")!==JSON.stringify(next)){
  window.TDLAppBridge.setTasks(previous);alert("The restore could not be saved. Keep your backups and retry.");return;
 }
 window.TDLAppBridge.render();toast("Deleted task restored.");refresh();
}
register("history","Task history & recovery",function(container){
 const h=history();
 container.innerHTML='<p class="tdlx-help">Your recent task changes are stored locally on this device. Undo and Redo check for conflicting edits; this is not a substitute for a full backup. Up to 50 actions are retained.</p><div class="tdlx-actions"><button class="btn" type="button" data-history-action="undo" '+(h.cursor===0?"disabled":"")+'>↶ Undo</button><button class="btn" type="button" data-history-action="redo" '+(h.cursor>=h.entries.length?"disabled":"")+'>↷ Redo</button></div>'+
 (h.entries.length?h.entries.slice().reverse().map((e,i)=>'<div class="tdlx-card"><div class="tdlx-row"><strong>'+escape(e.label)+'</strong><span class="tdlx-muted">'+escape(time(e.at))+'</span></div><small class="tdlx-muted">'+e.changes.length+' affected record(s) · '+(h.entries.length-i<=h.cursor?"Applied":"Undone")+'</small>'+ (e.changes.filter(x=>x.before&&!x.after).map(x=>'<button type="button" class="btn" data-recover-action="'+escape(e.id)+'" data-recover-task="'+escape(x.id)+'">Restore deleted: '+escape(x.before.title)+'</button>').join(""))+'</div>').join(""):'<p class="tdlx-help">No task changes have been recorded since this feature was installed.</p>');
});
const validKeys=k=>/^tdl\.[A-Za-z][A-Za-z0-9]*\.v[0-9]+$/.test(k);
function fullSnapshot(){
 const data={};
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(validKeys(key))data[key]=localStorage.getItem(key)}
 return {app:"TDL",format:"full-local-v1",createdAt:new Date().toISOString(),origin:location.origin,entries:data};
}
function downloadJSON(value,name){
 const blob=new Blob([JSON.stringify(value,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function fullBackup(){try{const b=fullSnapshot();downloadJSON(b,"tdl-full-backup-"+new Date().toISOString().slice(0,10)+".json");toast("Full TDL backup downloaded. Check your Downloads folder.");return true}catch(e){alert("Backup failed: "+e.message);return false}}
function validateBackup(b){
 if(!b||b.app!=="TDL"||b.format!=="full-local-v1"||!b.entries||typeof b.entries!=="object"||Array.isArray(b.entries))throw Error("Not a supported TDL full backup. For old task-only backups use the original Import button.");
 const names=Object.keys(b.entries);
 if(!names.length||names.length>60)throw Error("Empty or oversized storage key list.");
 for(const k of names){if(!validKeys(k)||typeof b.entries[k]!=="string"||b.entries[k].length>8000000)throw Error("Invalid storage entry: "+k);
  if(k!=="tdl.notificationPrompt.v1")JSON.parse(b.entries[k]);
 }
 if(b.entries["tdl.tasks.v1"]){const t=JSON.parse(b.entries["tdl.tasks.v1"]);if(!Array.isArray(t)||!t.every(x=>x&&typeof x.id==="string"&&typeof x.title==="string"))throw Error("Invalid task records.")}
 if(b.entries["tdl.activities.v1"]){const a=JSON.parse(b.entries["tdl.activities.v1"]);if(!Array.isArray(a))throw Error("Invalid activities.")}
 if(b.entries["tdl.boards.v1"]){const a=JSON.parse(b.entries["tdl.boards.v1"]);if(!Array.isArray(a))throw Error("Invalid boards.")}
 if(b.entries["tdl.timeBlocks.v1"]){const a=JSON.parse(b.entries["tdl.timeBlocks.v1"]);if(!Array.isArray(a))throw Error("Invalid calendar blocks.")}
 return names;
}
async function restoreFile(file){
 if(!file||file.size>12000000){alert("That backup file is too large or missing.");return}
 try{
 const b=JSON.parse(await file.text()),names=validateBackup(b);
 const count=b.entries["tdl.tasks.v1"]?JSON.parse(b.entries["tdl.tasks.v1"]).length:0;
 const current=tasks().length;
 const detail="Backup: "+(b.createdAt||"unknown date")+"\nOrigin: "+(b.origin||"unknown")+"\nKeys to restore: "+names.length+"\nTasks in backup: "+count+"\nCurrent tasks: "+current+
 "\n\nThis REPLACES the listed storage keys (including tasks if included), but leaves other keys untouched. Changes are not merged. A safety backup will download first.\n\nProceed?";
 if(!confirm(detail))return;
 if(!fullBackup())return;
 // Capture previous values and restore them if any write fails.
 const old={};names.forEach(k=>old[k]=localStorage.getItem(k));
 try{names.forEach(k=>localStorage.setItem(k,b.entries[k]))}
 catch(e){for(const k of names){try{if(old[k]===null)localStorage.removeItem(k);else localStorage.setItem(k,old[k])}catch(rollbackError){console.error("Backup rollback issue",rollbackError)}}throw Error("The browser could not store the imported file. Previous values were restored where possible: "+e.message)}
 alert("Full TDL backup restored. TDL will reload to display it.");location.reload();
 }catch(e){alert("Full restore stopped without intentional data deletion: "+e.message)}
}
$("#tdlx-close").addEventListener("click",close);
$("#tdlx-overlay").addEventListener("click",e=>{if(e.target.id==="tdlx-overlay")close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&active){close()}});
bar.addEventListener("click",e=>{
 const openButton=e.target.closest("[data-tdlx-open]");if(openButton){open(openButton.dataset.tdlxOpen);return}
 if(e.target.closest("#tdlx-undo"))undo();
 if(e.target.closest("#tdlx-redo"))redo();
 if(e.target.closest("#tdlx-backup"))fullBackup();
 if(e.target.closest("#tdlx-restore"))$("#tdlx-restore-file").click();
});
$("#tdlx-restore-file").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)restoreFile(f)});
$("#tdlx-content").addEventListener("click",e=>{
 const recover=e.target.closest("[data-recover-action]");if(recover){recoverDeleted(recover.dataset.recoverAction,recover.dataset.recoverTask);return}
 const b=e.target.closest("[data-history-action]");if(!b)return;
 if(b.dataset.historyAction==="undo")undo();else if(b.dataset.historyAction==="redo")redo();
});
updateUndoButtons();
window.TDLX={register,open,close,refresh,escape,copy,uid,store,put,tasks,toast,afterTaskSave,undo,redo,fullBackup,updateBadge(n){const el=$("#tdlx-unread");el.hidden=!n;el.textContent=String(n)}};
})();
