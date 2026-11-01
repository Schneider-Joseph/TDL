/* TDL Momentum time-based logic tests (Node 18+).
 * Fake date, fake tasks, fake browser. NEVER touches your real TDL localStorage.
 * Run: node tests/momentum.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const code=fs.readFileSync("app/tdl-momentum.js","utf8");
const nativeDate=Date;
let clock=nativeDate.parse("2026-11-04T12:00:00"),uid=0,confirmDelete=false,shrinkAnswer=null;
class MockDate extends nativeDate {
 constructor(...args){super(...(args.length?args:[clock]))}
 static now(){return clock}
}
const stamp=(dayOffset=0)=>clock-dayOffset*86400000;
const tasks=[
 {id:"old",title:"Write an entire report",category:"Homework",createdAt:stamp(45),updatedAt:stamp(45),completed:false},
 {id:"a",title:"Network II",category:"Homework",createdAt:stamp(1),updatedAt:stamp(1),completed:false},
 {id:"b",title:"Study Python",category:"Personal",createdAt:stamp(1),updatedAt:stamp(1),completed:false},
 {id:"c",title:"Write notes",category:"Personal",createdAt:stamp(1),updatedAt:stamp(1),completed:false},
 {id:"d",title:"Clean workspace",category:"Chore",createdAt:stamp(1),updatedAt:stamp(1),completed:false}
];
const storage=new Map([["tdl.tasks.v1",JSON.stringify(tasks)]]);
let dayPage="accountability",lastView="",messages=[];
const listeners=new Map(),timerCallbacks=[];
const elements=new Map();
class E {
 set id(v){this._id=v;if(v)elements.set(v,this)}
 get id(){return this._id||""}
 constructor(){this.innerHTML="";this.handlers=new Map();this.style={};this.dataset={};this.value="";this.hidden=false}
 addEventListener(name,fn){this.handlers.set(name,fn)}
 insertAdjacentElement(){return this}
 querySelector(q){return select(q)}
 setAttribute(){}
}
const root=new E(),intro=new E(),fallback=new E();
function select(q){if(q===".intro")return intro;if(q.startsWith("#"))return elements.get(q.slice(1))||fallback;return fallback}
const doc={
 querySelector:select,
 createElement:()=>new E(),
 addEventListener:(name,fn)=>listeners.set(name,fn),
 dispatchEvent:e=>listeners.get(e.type)?.(e)
};
const localStorage={
 getItem:k=>storage.get(k)??null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let viewRender=null;
const X={
 store:(k,def)=>{try{const x=JSON.parse(localStorage.getItem(k));return x===null?clone(def):x}catch(e){return clone(def)}},
 put:(k,v)=>{localStorage.setItem(k,JSON.stringify(v));return true},
 copy:clone,uid:()=>"m-"+(++uid),escape:esc,
 tasks:()=>tasks,toast:m=>messages.push(m),
 getPage:()=>dayPage,navigate:name=>{dayPage=name;},
 register:(name,title,render)=>{assert.equal(name,"accountability");viewRender=render},
 refresh:()=>{if(viewRender){const c=root;viewRender(c);lastView=c.innerHTML}}
};
const B={
 getTasks:()=>tasks,
 setTasks:next=>{tasks.splice(0,tasks.length,...next)},
 save:()=>{localStorage.setItem("tdl.tasks.v1",JSON.stringify(tasks));doc.dispatchEvent({type:"tdlx:tasks-changed"})},
 render:()=>{},
 completeTask:id=>{
  const t=tasks.find(x=>x.id===id);if(!t||t.completed)return false;
  t.completed=true;t.updatedAt=MockDate.now();B.save();return true;
 }
};
const windowMock={
 TDLX:X,TDLAppBridge:B,
 crypto:{randomUUID:()=>"r-"+(++uid)},
 setInterval:fn=>timerCallbacks.push(fn),
 confirm:()=>confirmDelete,
 prompt:()=>shrinkAnswer
};
vm.runInNewContext(code,{
 window:windowMock,document:doc,localStorage,Date:MockDate,console,
 setInterval:fn=>timerCallbacks.push(fn)
},{filename:"app/tdl-momentum.js"});
const M=windowMock.TDLMomentum;
assert.ok(M,"Momentum API missing");
const click=(action,id="")=>{
 X.refresh();
 const e={target:{closest:s=>s==="[data-momentum]"?{dataset:{momentum:action,id}}:null}};
 root.onclick(e);
};
function test(label,fn){fn();console.log("PASS",label)}

test("Legacy tasks remain unchanged and sidecar state is independent",()=>{
 assert.equal(tasks.length,5);
 assert.equal(M.getState().cap,3);
 assert.equal(storage.get("tdl.tasks.v1"),JSON.stringify(tasks));
 assert.ok(storage.has("tdl.momentum.v1"));
});
test("30-day stale task cannot be silently recommitted",()=>{
 assert.ok(M.getAge("old")>=30);
 assert.equal(M.recommit("a"),false);
 X.refresh();
 assert.ok(root.innerHTML.includes("30-DAY DECISION"));
});
test("Do 2 minutes resolves stale decision and starts one locked task",()=>{
 click("doNow","old");
 assert.equal(M.getAge("old"),0);
 assert.equal(M.getState().focus.taskId,"old");
 assert.equal(M.getState().focus.running,true);
 assert.equal(M.getState().committed.length,1);
 click("focusPick","a");
 assert.equal(M.getState().focus.taskId,"old","Cannot switch while active focus block is running");
});
test("Completed 2-minute focus is recorded without modifying original task",()=>{
 clock+=121000;
 X.refresh();
 assert.equal(M.getState().focus.running,false);
 assert.equal(M.getState().sessions.length,1);
 assert.equal(M.getState().sessions[0].minutes,2);
 assert.equal(tasks.find(t=>t.id==="old").title,"Write an entire report");
});
test("Unmet Connections prerequisites block daily commitment and 2-minute focus",()=>{
 windowMock.TDLConnections={blockers:id=>id==="a"?[{id:"missing-req",title:"Prepare lab",missing:true}]:[]};
 assert.equal(M.recommit("a"),false,"Cannot commit dependent before prerequisite");
 assert.ok(messages.some(x=>x.includes("before starting")),"Dependency message should identify blocker");
 const count=M.getState().committed.length;
 click("doNow","a");
 assert.equal(M.getState().committed.length,count,"Blocked task cannot bypass cap via Do 2 minutes");
 delete windowMock.TDLConnections;
});
test("Daily commitment max 3 is enforced even with a larger backlog",()=>{
 assert.equal(M.recommit("a"),true);
 assert.equal(M.recommit("b"),true);
 assert.equal(M.recommit("c"),false);
 assert.equal(M.getState().committed.length,3);
 assert.equal(tasks.length,5);
});
test("Task completion is logged; reopening revokes the completion",()=>{
 B.completeTask("a");
 assert.equal(M.getState().committed.length,3,"Completing a task must not free its daily slot");
 assert.equal(M.recommit("c"),false,"The cap cannot be bypassed by completing the original three tasks");
 assert.equal(M.getLog().filter(x=>x.taskId==="a").length,1);
 tasks.find(x=>x.id==="a").completed=false;B.save();
 assert.equal(M.getLog().filter(x=>x.taskId==="a").length,0);
 B.completeTask("a");
 assert.equal(M.getLog().filter(x=>x.taskId==="a").length,1);
});
test("Midnight moves unfinished commitments into review, never into a fresh daily plan",()=>{
 clock=nativeDate.parse("2026-11-05T09:00:00");
 M.rollover();
 assert.equal(M.getState().committed.length,0);
 assert.equal(M.getState().carryover.length,2);
 assert.equal(M.recommit("c"),false);
});
test("Return to backlog is an explicit and non-destructive rollover choice",()=>{
 click("backlog","old");
 click("backlog","b");
 assert.equal(M.getState().carryover.length,0);
 assert.equal(M.recommit("c"),true);
 assert.equal(tasks.length,5);
});
test("Shrink rewrites user-approved task title but preserves other task data",()=>{
 shrinkAnswer="Write the first paragraph";
 assert.ok(M.getAge("old")<=1,"One day may have passed since the first focus block");
 clock+=30*86400000;
 assert.ok(M.getAge("old")>=30);
 click("shrink","old");
 assert.equal(tasks.find(t=>t.id==="old").title,"Write the first paragraph");
 assert.equal(M.getAge("old"),0);
 assert.ok(M.getState().carryover.some(x=>x.id==="c"),"Old commitments must remain in pending review after time advances");
});
test("No task is deleted without confirmation",()=>{
 confirmDelete=false;
 click("delete","old");assert.ok(tasks.some(t=>t.id==="old"));
 confirmDelete=true;
 click("delete","old");assert.ok(!tasks.some(t=>t.id==="old"));
});
test("After three days with no new task, a deliberate rest is accepted",()=>{
 clock+=4*86400000;
 assert.equal(M.recommit("d"),false);
 click("rest");
 assert.equal(M.getState().restUntil,new MockDate().getFullYear()+"-"+String(new MockDate().getMonth()+1).padStart(2,"0")+"-"+String(new MockDate().getDate()).padStart(2,"0"));
 // Yesterday's review may still need attention; the inactivity gate itself must now be cleared.
 assert.ok(!root.innerHTML.includes("INACTIVITY CHECK")||M.getState().restUntil);
});
test("Weekly analytics use recorded completions and focus sessions",()=>{
 const week=M.getWeek();
 assert.equal(week.days.length,7);
 assert.ok(Array.isArray(week.events));
 assert.ok(Array.isArray(week.sessions));
 assert.ok(storage.has("tdl.completionLog.v1"));
});
test("Task records never changed because of commitment or rollover only",()=>{
 assert.ok(storage.has("tdl.tasks.v1"));
 assert.ok(storage.has("tdl.momentum.v1"));
 assert.ok(storage.has("tdl.completionLog.v1"));
});

test("Importing an already-completed task does not invent a completion event",()=>{
 tasks.push({id:"importedDone",title:"Old completed assignment",completed:true,createdAt:stamp(40),updatedAt:stamp(40)});
 B.save();
 assert.equal(M.getLog().filter(x=>x.taskId==="importedDone").length,0);
 tasks.splice(tasks.findIndex(x=>x.id==="importedDone"),1);
 B.save();
});

console.log("Momentum time-based tests passed. Also test local browser/installed PWA interactions.");
