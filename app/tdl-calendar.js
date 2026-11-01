/* TDL Calendar: full-page 24-hour weekly timeline + agenda.
   Existing tdl.timeBlocks.v1 data remains compatible; task due dates never move when work blocks move.
   All data and date/time interpretation are browser-local. */
(function(){
"use strict";
const X=window.TDLX;if(!X)return;
const key="tdl.timeBlocks.v1",esc=X.escape;
const $=(q,r=document)=>r.querySelector(q);
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const localTime=d=>ymd(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
const at=str=>{const d=new Date(str);return Number.isFinite(d.getTime())?d:null};
const addDays=(date,n)=>{const d=new Date(date);d.setDate(d.getDate()+n);return d};
const getWeek=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const minutes=d=>d.getHours()*60+d.getMinutes();
const timeLabel=d=>d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
const dayLabel=d=>d.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
const HOUR_HEIGHT=54,DAY_HEIGHT=24*HOUR_HEIGHT;
let monday=getWeek(new Date()),blocks=read(),editing="",calendarForm=false,draftStart="",view="week";
function read(){const data=X.store(key,[]);return Array.isArray(data)?data.filter(b=>b&&typeof b.id==="string"&&typeof b.title==="string"&&typeof b.start==="string"&&typeof b.end==="string"):[]}
function save(next){
 if(next.length>500){alert("TDL supports up to 500 scheduled work blocks. Export a full backup before adding more.");return false}
 if(!X.put(key,next))return false;
 blocks=next;return true
}
function getTask(id){return X.tasks().find(t=>t.id===id)}
function showTask(id){const task=getTask(id);if(!task){alert("That task is no longer available.");return}X.close();window.TDLAppBridge.openTask(task)}
function validTimes(start,end){
 const a=at(start),b=at(end);
 return !!(a&&b&&b>a&&localTime(a)===start&&localTime(b)===end);
}
function weekDays(){return Array.from({length:7},(_,i)=>addDays(monday,i))}
function dayDue(d){return X.tasks().filter(t=>t.dueDate===ymd(d)).sort((a,b)=>(a.dueTime||"").localeCompare(b.dueTime||""))}
function daySegments(d){
 const dayStart=new Date(d.getFullYear(),d.getMonth(),d.getDate());
 const dayEnd=addDays(dayStart,1);
 const result=[];
 for(const block of blocks){
  const a=at(block.start),b=at(block.end);
  if(!a||!b||b<=a||b<=dayStart||a>=dayEnd)continue;
  const segStart=a>dayStart?a:dayStart,segEnd=b<dayEnd?b:dayEnd;
  result.push({block,start:segStart,end:segEnd,top:(segStart-dayStart)/60000*HOUR_HEIGHT/60,height:Math.max(22,(segEnd-segStart)/60000*HOUR_HEIGHT/60),begin:segStart.valueOf(),finish:segEnd.valueOf(),continuation:a<dayStart,continues:b>dayEnd});
 }
 result.sort((a,b)=>a.begin-b.begin||b.finish-a.finish);
 // Give overlapping work blocks separate horizontal lanes, with no hidden data.
 let group=[],groupEnd=-Infinity;
 function allocate(){
  if(!group.length)return;
  const laneEnds=[];
  for(const event of group){
   let lane=laneEnds.findIndex(end=>end<=event.begin);
   if(lane<0){lane=laneEnds.length;laneEnds.push(event.finish)}else laneEnds[lane]=event.finish;
   event.lane=lane;
  }
  group.forEach(e=>e.lanes=laneEnds.length);
 }
 for(const event of result){
  if(event.begin>=groupEnd){allocate();group=[];groupEnd=-Infinity}
  group.push(event);groupEnd=Math.max(groupEnd,event.finish);
 }
 allocate();
 return result;
}
function defaults(){
 const now=new Date();
 let start;
 if(draftStart)start=at(draftStart);
 if(!start){
  const weekEnd=addDays(monday,7),inViewedWeek=now>=monday&&now<weekEnd;
  start=inViewedWeek?new Date(now):new Date(monday);
  start.setSeconds(0,0);start.setMinutes(0);
  start.setHours(inViewedWeek?Math.min(23,start.getHours()+1):9);
 }
 return {title:"",taskId:"",start:localTime(start),end:localTime(new Date(start.getTime()+3600000)),notes:""}
}
function blockForm(block){
 const one=block||defaults();
 const options=X.tasks().filter(t=>!t.completed||t.id===one.taskId).map(t=>'<option value="'+esc(t.id)+'" '+(t.id===one.taskId?"selected":"")+'>'+esc(t.title)+'</option>').join("");
 return '<section class="tdlx-calendar-editor" aria-label="Work block editor"><div class="tdlx-calendar-editor-head"><div><span class="tdlx-page-eyebrow">TIME BLOCK</span><h3>'+(block?"Edit scheduled work":"Schedule focused work")+'</h3><p class="tdlx-help">Work blocks are your plan. They never modify task deadlines.</p></div><button class="btn" type="button" data-cal="cancel">Close editor ✕</button></div>'+
 '<form id="tdlx-block-form" class="tdlx-form"><label class="full">What are you working on?<input required maxlength="160" name="title" value="'+esc(one.title)+'" placeholder="e.g. Network Security lab"></label>'+
 '<label>Start time<input required name="start" type="datetime-local" value="'+esc(one.start)+'"></label>'+
 '<label>End time<input required name="end" type="datetime-local" value="'+esc(one.end)+'"></label>'+
 '<label class="full">Linked TDL task (optional)<select name="taskId"><option value="">No task linked</option>'+options+'</select></label>'+
 '<label class="full">Notes<textarea name="notes" maxlength="1500" placeholder="What will a successful session produce?">'+esc(one.notes||"")+'</textarea></label>'+
 '<div class="tdlx-calendar-editor-actions"><button class="btn primary" type="submit">'+(block?"Save changes":"Create work block")+'</button><button type="button" class="btn" data-cal="cancel">Cancel</button>'+(block?'<button type="button" class="btn tdlx-danger-action" data-cal="delete">Delete block</button>':"")+'</div></form></section>';
}
function dueChip(t){
 const complete=!!t.completed;
 const overdue=!complete&&at(t.dueDate+"T"+(t.dueTime||"23:59"))<new Date();
 return '<button type="button" class="tdlx-calendar-due '+(complete?"is-complete":overdue?"is-overdue":"")+'" data-cal="task" data-id="'+esc(t.id)+'" title="Open task: '+esc(t.title)+'">'+
 '<span class="tdlx-calendar-due-dot"></span><span class="tdlx-calendar-due-label">'+esc(t.title)+'</span>'+
 '<small>'+esc(t.dueTime||"End of day")+'</small></button>';
}
function blockLabel(event){
 const start=at(event.block.start),end=at(event.block.end);
 return timeLabel(start)+" – "+timeLabel(end);
}
function eventChip(event){
 const e=event,block=e.block;
 const left=100*e.lane/e.lanes,width=100/e.lanes;
 const top=Math.max(0,e.top),height=Math.min(DAY_HEIGHT-top,e.height);
 return '<button type="button" draggable="true" class="tdlx-calendar-event" data-cal="edit" data-block="'+esc(block.id)+'" style="top:'+top.toFixed(2)+'px;height:'+height.toFixed(2)+'px;left:calc('+left.toFixed(4)+'% + 3px);width:calc('+width.toFixed(4)+'% - 6px)" title="'+esc(block.title)+' — '+esc(blockLabel(e))+'; click to edit, drag to move days">'+
 '<span class="tdlx-calendar-event-name">'+esc(block.title)+'</span>'+
 '<small>'+esc(e.continuation?"↳ Continuing":blockLabel(e))+'</small></button>';
}
function weeklyTimeline(days){
 const dayHeaders=days.map(d=>'<div class="tdlx-calendar-day-head '+(ymd(d)===ymd(new Date())?"is-today":"")+'"><span>'+esc(d.toLocaleDateString(undefined,{weekday:"short"}))+'</span><strong>'+d.getDate()+'</strong></div>').join("");
 const dueRows=days.map(d=>'<div class="tdlx-calendar-all-day" data-cal-day="'+ymd(d)+'">'+dayDue(d).map(dueChip).join("")+'</div>').join("");
 const hours=Array.from({length:24},(_,i)=>'<div class="tdlx-calendar-hour" style="top:'+(i*HOUR_HEIGHT)+'px"><span>'+String(i).padStart(2,"0")+':00</span></div>').join("");
 const grids=days.map(d=>'<div class="tdlx-calendar-day-track '+(ymd(d)===ymd(new Date())?"is-today":"")+'" data-cal-day="'+ymd(d)+'" tabindex="0" role="group" aria-label="'+esc(dayLabel(d))+'; click an hour to schedule work">'+daySegments(d).map(eventChip).join("")+'</div>').join("");
 return '<div class="tdlx-calendar-scroll" role="region" aria-label="Weekly calendar grid" tabindex="0"><div class="tdlx-calendar-grid">'+
 '<div class="tdlx-calendar-corner"><span>GMT '+esc(String(-new Date().getTimezoneOffset()/60))+'</span></div>'+dayHeaders+
 '<div class="tdlx-calendar-all-day-heading">DEADLINES</div>'+dueRows+
 '<div class="tdlx-calendar-hours" style="height:'+DAY_HEIGHT+'px">'+hours+'</div>'+grids+'</div></div>'+
 '<div class="tdlx-calendar-legend"><span><i class="tdlx-legend-work"></i> Planned focus</span><span><i class="tdlx-legend-due"></i> Task deadlines</span><span>Click empty time to schedule · Drag work blocks between days</span></div>';
}
function agenda(days){
 return '<div class="tdlx-calendar-agenda">'+days.map(d=>{
  const due=dayDue(d),work=daySegments(d).filter(e=>!e.continuation);
  return '<section class="tdlx-calendar-agenda-day"><div class="tdlx-calendar-agenda-date"><span>'+esc(d.toLocaleDateString(undefined,{weekday:"long"}))+'</span><strong>'+esc(d.toLocaleDateString(undefined,{month:"short",day:"numeric"}))+'</strong></div><div class="tdlx-calendar-agenda-items">'+
  (due.map(t=>'<div class="tdlx-agenda-row"><span class="tdlx-agenda-type is-due">DEADLINE</span>'+dueChip(t)+'</div>').join(""))+
  (work.map(e=>'<div class="tdlx-agenda-row"><span class="tdlx-agenda-type is-work">'+esc(timeLabel(at(e.block.start)))+'</span><button class="tdlx-agenda-work" type="button" data-cal="edit" data-block="'+esc(e.block.id)+'"><strong>'+esc(e.block.title)+'</strong><small>'+esc(blockLabel(e))+'</small></button></div>').join(""))+
  (!due.length&&!work.length?'<p class="tdlx-muted">Nothing scheduled. Use + Schedule work to make a plan.</p>':"")+'</div></section>';
 }).join("")+'</div>';
}
function render(c){
 // Keep scroll position when changing a work block or refreshing a page.
 const prev=$("#tdlx-calendar-scroll-anchor",c)||$(".tdlx-calendar-scroll",c);
 const previousScroll=prev?prev.scrollTop:null;
 const previousHorizontal=prev?prev.scrollLeft:null;
 const days=weekDays(),last=days[6];
 const countDue=days.reduce((n,d)=>n+dayDue(d).filter(t=>!t.completed).length,0);
 const countBlocks=blocks.filter(b=>{const start=at(b.start),end=at(b.end);return !!(start&&end&&start<addDays(last,1)&&end>monday)}).length;
 c.innerHTML='<div class="tdlx-calendar-topline"><div><div class="tdlx-page-eyebrow">YOUR WEEK AT A GLANCE</div>'+
 '<h3 class="tdlx-calendar-title">'+esc(monday.toLocaleDateString(undefined,{month:"long",day:"numeric"}))+' <span>—</span> '+esc(last.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}))+'</h3>'+
 '<div class="tdlx-calendar-summary"><span><b>'+countDue+'</b> active deadlines</span><span><b>'+countBlocks+'</b> work blocks</span></div></div>'+
 '<div class="tdlx-calendar-top-actions"><div class="tdlx-calendar-range-actions"><button class="btn" type="button" data-cal="previous" aria-label="Previous week">←</button><button class="btn" type="button" data-cal="today">This week</button><button class="btn" type="button" data-cal="next" aria-label="Next week">→</button></div>'+
 '<div class="tdlx-calendar-mode" role="group" aria-label="Calendar display"><button type="button" data-cal="modeWeek" class="btn '+(view==="week"?"is-current":"")+'" aria-pressed="'+(view==="week")+'">Timeline</button><button type="button" data-cal="modeAgenda" class="btn '+(view==="agenda"?"is-current":"")+'" aria-pressed="'+(view==="agenda")+'">Agenda</button></div>'+
 '<button class="btn primary" type="button" data-cal="new">＋ Schedule work</button></div></div>'+
 (calendarForm?blockForm(blocks.find(b=>b.id===editing)):"")+
 '<div class="tdlx-calendar-surface">'+(view==="week"?weeklyTimeline(days):agenda(days))+'</div>'+
 '<div class="tdlx-calendar-footnote"><strong>Two kinds of time, one calendar.</strong> Deadlines come directly from tasks and never move when you drag or edit a green scheduled work block. All changes remain on this device.</div>';
 const scroller=$(".tdlx-calendar-scroll",c);
 if(scroller){scroller.scrollTop=previousScroll===null?6*HOUR_HEIGHT:previousScroll;scroller.scrollLeft=previousHorizontal===null?0:previousHorizontal}
 const form=$("#tdlx-block-form",c);
 if(form)form.onsubmit=e=>{
  e.preventDefault();
  const fd=new FormData(form),title=String(fd.get("title")||"").trim();
  const start=String(fd.get("start")||""),end=String(fd.get("end")||"");
  if(!title||!validTimes(start,end)){alert("Enter a title and a valid start/end time. The end must be later. Times skipped during daylight-saving changes aren't allowed.");return}
  const data={id:editing||X.uid(),title:title.slice(0,160),taskId:String(fd.get("taskId")||""),start,end,notes:String(fd.get("notes")||"").slice(0,1500)};
  const next=editing?blocks.map(b=>b.id===editing?data:b):blocks.concat(data);
  if(save(next)){calendarForm=false;editing="";draftStart="";monday=getWeek(at(start));X.refresh();X.toast("Work block saved. Task deadline unchanged.")}
 };
 c.onclick=e=>{
  const b=e.target.closest("[data-cal]");
  if(b){
   const action=b.dataset.cal;
   if(action==="task"){showTask(b.dataset.id);return}
   if(action==="new"){editing="";draftStart="";calendarForm=true;X.refresh();return}
   if(action==="edit"){editing=b.dataset.block;draftStart="";calendarForm=true;X.refresh();return}
   if(action==="cancel"){calendarForm=false;editing="";draftStart="";X.refresh();return}
   if(action==="delete"){
    const old=blocks.find(x=>x.id===editing);
    if(old&&confirm('Delete scheduled work "'+old.title+'"? The linked task will NOT be deleted.')){
     if(save(blocks.filter(x=>x.id!==editing))){editing="";calendarForm=false;X.refresh()}
    }return
   }
   if(action==="previous"||action==="next"){monday=addDays(monday,action==="previous"?-7:7);calendarForm=false;editing="";X.refresh();return}
   if(action==="today"){monday=getWeek(new Date());calendarForm=false;editing="";X.refresh();return}
   if(action==="modeWeek"||action==="modeAgenda"){view=action==="modeWeek"?"week":"agenda";X.refresh();return}
  }
  const day=e.target.closest(".tdlx-calendar-day-track");
  if(day&&e.target===day){
   const bounds=day.getBoundingClientRect();
   const offset=Math.max(0,Math.min(DAY_HEIGHT-30,e.clientY-bounds.top));
   const quarter=Math.round(offset/HOUR_HEIGHT*60/15)*15;
   const hour=Math.min(23,Math.floor(quarter/60)),minute=quarter%60;
   draftStart=day.dataset.calDay+"T"+pad(hour)+":"+pad(minute);
   editing="";calendarForm=true;X.refresh();
   const first=$("#tdlx-block-form input[name=title]",c);if(first)first.focus();
  }
 };
 c.onkeydown=e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;
  const day=e.target.closest(".tdlx-calendar-day-track");
  if(!day||e.target!==day)return;
  e.preventDefault();draftStart=day.dataset.calDay+"T09:00";editing="";calendarForm=true;X.refresh();
  const first=$("#tdlx-block-form input[name=title]",c);if(first)first.focus()
 };
 c.ondragstart=e=>{
  const b=e.target.closest("[data-block]");
  if(b&&e.dataTransfer){e.dataTransfer.setData("text/plain",b.dataset.block);e.dataTransfer.effectAllowed="move"}
 };
 c.ondragover=e=>{if(e.target.closest("[data-cal-day]"))e.preventDefault()};
 c.ondrop=e=>{
  const day=e.target.closest("[data-cal-day]");if(!day||!e.dataTransfer)return;
  e.preventDefault();const id=e.dataTransfer.getData("text/plain"),block=blocks.find(x=>x.id===id);if(!block)return;
  const start=at(block.start),end=at(block.end);if(!start||!end)return;
  const oldDay=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);
  const dayDate=at(day.dataset.calDay+"T12:00");if(!dayDate)return;
  const offsetDays=Math.round((dayDate-oldDay)/86400000);
  const newStart=localTime(addDays(start,offsetDays)),newEnd=localTime(addDays(end,offsetDays));
  if(!validTimes(newStart,newEnd)){alert("The moved work block would have invalid local times. Edit the start/end manually.");return}
  if(save(blocks.map(b=>b.id===id?{...b,start:newStart,end:newEnd}:b))){X.refresh();X.toast("Work block moved; assignment due date unchanged.")}
 };
}
X.register("calendar","Weekly Calendar",render);
document.addEventListener("tdlx:tasks-changed",()=>{if(X.getPage&&X.getPage()==="calendar")X.refresh()});
})();
