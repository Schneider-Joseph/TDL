/* TDL Week: read existing task deadlines; manage separate planned work blocks.
   Drag a block to a day, or use the edit form. Never changes task due dates. */
(function(){
"use strict";
const X=window.TDLX;if(!X)return;
const key="tdl.timeBlocks.v1",esc=X.escape;
const $=(q,r=document)=>r.querySelector(q);
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const localTime=d=>ymd(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
const at=str=>{const d=new Date(str);return !Number.isNaN(d.valueOf())?d:null};
const label=s=>{const d=at(s);return d?d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):String(s||"")};
const addDays=(date,n)=>{let d=new Date(date);d.setDate(d.getDate()+n);return d};
const getWeek=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
let monday=getWeek(new Date()),blocks=read(),editing="",calendarForm=false;
function read(){const x=X.store(key,[]);return Array.isArray(x)?x.filter(b=>b&&typeof b.id==="string"&&typeof b.title==="string"&&typeof b.start==="string"&&typeof b.end==="string"):[]}
function save(next){if(next.length>500){alert("TDL supports up to 500 time blocks. Export or delete older blocks first.");return false}if(!X.put(key,next))return false;blocks=next;return true}
function getTask(id){return X.tasks().find(t=>t.id===id)}
function showTask(id){const t=getTask(id);if(!t){alert("That task is no longer available.");return}X.close();window.TDLAppBridge.openTask(t)}
function validTimes(start,end){
 const a=at(start),b=at(end);
 if(!a||!b||b<=a)return false;
 return localTime(a)===start&&localTime(b)===end;
}
function blockForm(c,b){
 const now=new Date(),start=new Date(now);start.setSeconds(0,0);start.setMinutes(0);start.setHours(Math.min(23,start.getHours()+1));
 const end=new Date(start.getTime()+3600000);
 const one=b||{title:"",taskId:"",start:localTime(start),end:localTime(end),notes:""};
 const options=X.tasks().filter(t=>!t.completed||t.id===one.taskId).map(t=>'<option value="'+esc(t.id)+'" '+(t.id===one.taskId?"selected":"")+'>'+esc(t.title)+'</option>').join("");
 return '<form id="tdlx-block-form" class="tdlx-form"><label class="full">Block name<input required maxlength="160" name="title" value="'+esc(one.title)+'" placeholder="Study Network Security"></label>'+
 '<label>Starts<input required name="start" type="datetime-local" value="'+esc(one.start)+'"></label><label>Ends<input required name="end" type="datetime-local" value="'+esc(one.end)+'"></label>'+
 '<label class="full">Linked task (optional)<select name="taskId"><option value="">None — independent block</option>'+options+'</select></label>'+
 '<label class="full">Notes<textarea name="notes" maxlength="1500">'+esc(one.notes||"")+'</textarea></label>'+
 '<div class="tdlx-actions"><button class="btn primary" type="submit">'+(b?"Save changes":"Add block")+'</button><button type="button" class="btn" data-cal="cancel">Cancel</button></div></form>';
}
function render(c){
 const first=monday,last=addDays(first,6);
 const days=Array.from({length:7},(_,i)=>addDays(first,i));
 c.innerHTML='<p class="tdlx-help">The deadline shown for each task is NOT the same as your planned work time. Move/edit a green study block without moving your assignment due date. Everything here is stored only in this browser.</p>'+
 '<div class="tdlx-actions"><button type="button" class="btn" data-cal="previous">← Previous week</button><strong>'+esc(first.toLocaleDateString(undefined,{month:"short",day:"numeric"}))+" – "+esc(last.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}))+'</strong><button type="button" class="btn" data-cal="next">Next week →</button><button type="button" class="btn" data-cal="today">Today</button><button type="button" class="btn primary" data-cal="new">+ Schedule work</button></div>'+
 '<div class="tdlx-week">'+days.map(d=>{
  const day=ymd(d);
  const due=X.tasks().filter(t=>t.dueDate===day).sort((a,b)=>(a.dueTime||"").localeCompare(b.dueTime||""));
  const work=blocks.filter(b=>at(b.start)&&ymd(at(b.start))===day).sort((a,b)=>a.start.localeCompare(b.start));
  const entries=due.map(t=>'<button type="button" class="tdlx-item task '+(!t.completed&&new Date(t.dueDate+"T"+(t.dueTime||"23:59"))<new Date()?"over":"")+'" data-cal="task" data-id="'+esc(t.id)+'" title="Open task">● '+esc(t.title)+'<small>Deadline '+esc(t.dueTime||"end of day")+(t.completed?" · done":"")+'</small></button>').join("");
  const workHtml=work.map(b=>'<button type="button" draggable="true" class="tdlx-item block" data-cal="edit" data-block="'+esc(b.id)+'" title="Click to edit or drag to another day">▰ '+esc(b.title)+'<small>'+esc(label(b.start))+' – '+esc(label(b.end))+'</small></button>').join("");
  return '<section class="tdlx-day '+(day===ymd(new Date())?"today":"")+'" data-cal-day="'+day+'"><h3>'+esc(d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}))+'</h3>'+entries+workHtml+(!due.length&&!work.length?'<small>No scheduled items</small>':'')+'</section>';
 }).join("")+'</div>'+
 (calendarForm?'<h3>'+(editing?"Edit work block":"Schedule work block")+'</h3>'+blockForm(c,blocks.find(b=>b.id===editing)):'<p class="tdlx-help">Tip: drag a green work block to a different day on desktop, or click it to edit its exact start/end time. On phones, use the edit form.</p>')+
 '<div class="tdlx-card"><strong>Planned work blocks</strong><p class="tdlx-muted">'+blocks.length+' locally saved · separate from task deadlines. Back them up with Full backup.</p></div>';
 const form=$("#tdlx-block-form",c);
 if(form)form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),title=String(fd.get("title")||"").trim(),start=String(fd.get("start")||""),end=String(fd.get("end")||"");
  if(!title||!validTimes(start,end)){alert("Enter a title and a valid start/end time. The end must be after the start. Times that don't exist because of daylight saving are rejected.");return}
  const data={id:editing||X.uid(),title:title.slice(0,160),taskId:String(fd.get("taskId")||""),start,end,notes:String(fd.get("notes")||"").slice(0,1500)};
  const next=editing?blocks.map(b=>b.id===editing?data:b):blocks.concat(data);
  if(save(next)){calendarForm=false;editing="";monday=getWeek(at(start));X.refresh();X.toast("Work block saved. Task deadline unchanged.")}
 };
 c.onclick=e=>{const b=e.target.closest("[data-cal]");if(!b)return;
  const action=b.dataset.cal;
  if(action==="task"){showTask(b.dataset.id);return}
  if(action==="new"){editing="";calendarForm=true;X.refresh();return}
  if(action==="edit"){editing=b.dataset.block;calendarForm=true;X.refresh();return}
  if(action==="cancel"){editing="";calendarForm=false;X.refresh();return}
  if(action==="previous"||action==="next"){monday=addDays(monday,action==="previous"?-7:7);calendarForm=false;X.refresh();return}
  if(action==="today"){monday=getWeek(new Date());calendarForm=false;X.refresh();return}
 };
 c.ondragstart=e=>{const b=e.target.closest("[data-block]");if(b&&e.dataTransfer){e.dataTransfer.setData("text/plain",b.dataset.block);e.dataTransfer.effectAllowed="move"}};
 c.ondragover=e=>{if(e.target.closest("[data-cal-day]"))e.preventDefault()};
 c.ondrop=e=>{const dayEl=e.target.closest("[data-cal-day]");if(!dayEl||!e.dataTransfer)return;e.preventDefault();const id=e.dataTransfer.getData("text/plain"),b=blocks.find(x=>x.id===id);if(!b)return;
  const start=at(b.start),end=at(b.end),oldDay=ymd(start),newDay=dayEl.dataset.calDay;
  const toDate=at(newDay+"T12:00"),fromDate=at(oldDay+"T12:00");
  const days=Math.round((toDate-fromDate)/86400000);
  const ns=localTime(addDays(start,days)),ne=localTime(addDays(end,days));
  if(!validTimes(ns,ne)){alert("That move creates an invalid time. Use the edit form instead.");return}
  if(save(blocks.map(x=>x.id===id?Object.assign({},x,{start:ns,end:ne}):x)))X.refresh();
 };
 // Deleting a block is deliberately separated from the task's delete operation.
 if(calendarForm&&editing){const form=$("#tdlx-block-form",c);const del=document.createElement("button");del.type="button";del.className="btn";del.textContent="Delete this block";del.onclick=()=>{if(confirm("Delete this scheduled work block? The linked task will NOT be deleted.")){if(save(blocks.filter(x=>x.id!==editing))){editing="";calendarForm=false;X.refresh()}}};form.appendChild(del)}
}
X.register("calendar","Weekly Calendar",render);
document.addEventListener("tdlx:tasks-changed",()=>{const el=document.querySelector("#tdlx-heading");if(el&&el.textContent==="Weekly Calendar")X.refresh()});
})();
