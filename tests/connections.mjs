/* TDL Connections graph tests. Dependency-free, Node 18+.
 * Uses in-memory fake localStorage, fake tasks, and a simulated page.
 * No live browser profile or actual saved user data is accessed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const js=fs.readFileSync("app/tdl-connections.js","utf8");
let counter=0,confirmed=true,lastToast="",route="",renderCount=0,uiRender=null;
const tasks=[
 {id:"a",title:"Design schema",category:"Project",completed:false,createdAt:100},
 {id:"b",title:"Implement API",category:"Project",completed:false,createdAt:200},
 {id:"c",title:"Deploy to staging",category:"Project",completed:false,createdAt:300},
 {id:"d",title:"Write documentation",category:"Project",completed:false,createdAt:400},
 {id:"e",title:"Review <injected> & validate",category:"Project",completed:false,createdAt:500}
];
const storage=new Map([["tdl.tasks.v1",JSON.stringify(tasks)]]);
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
class E{
 constructor(){this.innerHTML="";this.value="";this.dataset={};this.style={}}
 querySelector(){return null}
 querySelectorAll(){return []}
}
const node=new E();
const listeners=new Map();
const doc={
 querySelector:()=>null,
 addEventListener:(k,f)=>listeners.set(k,f)
};
const localStorage={
 getItem:k=>storage.get(k)??null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
const X={
 store:(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??clone(def)}catch(_e){return clone(def)}},
 put:(k,value)=>{localStorage.setItem(k,JSON.stringify(value));return true},
 copy:clone,uid:()=> "link-"+(++counter),escape:esc,
 tasks:()=>tasks,
 register:(name,title,fn)=>{assert.equal(name,"connections");uiRender=fn},
 navigate:name=>{route=name},
 getPage:()=>route,
 refresh:()=>{if(route==="connections"&&uiRender)uiRender(node)},
 toast:message=>{lastToast=message}
};
const bridge={
 render:()=>{renderCount++},
 openTask:()=>{},
 getTasks:()=>tasks
};
const windowMock={TDLX:X,TDLAppBridge:bridge,confirm:()=>confirmed};
vm.runInNewContext(js,{window:windowMock,document:doc,localStorage,console,Date},{
 filename:"app/tdl-connections.js"
});
const C=windowMock.TDLConnections;
assert.ok(C,"Connections module did not install");
function test(name,fn){fn();console.log("PASS",name)}
const add=(from,to,type)=>C.add(from,to,type);
const count=()=>C.getEdges().length;

test("Does not migrate or rewrite original tasks",()=>{
 assert.equal(count(),0);
 assert.equal(storage.get("tdl.tasks.v1"),JSON.stringify(tasks));
});
test("Directed prerequisite and inverse blocked-by summary",()=>{
 assert.ok(add("a","b","blocks").ok);
 assert.ok(add("b","c","blocks").ok);
 assert.equal(C.summary("b").blocked,1);
 assert.equal(C.summary("c").blocked,1);
 assert.equal(C.isBlocked("b"),true);
 assert.equal(C.blockers("b")[0].title,"Design schema");
 assert.equal(C.summary("a").blocked,0);
});
test("Cycles, self links and duplicate dependencies are rejected",()=>{
 assert.equal(add("c","a","blocks").ok,false);
 assert.equal(add("a","a","blocks").ok,false);
 assert.equal(add("a","b","blocks").ok,false);
 assert.equal(add("b","a","blocks").ok,false);
 assert.equal(count(),2);
});
test("Two-way related task connection is canonical and unique",()=>{
 assert.ok(add("a","d","related").ok);
 assert.equal(C.summary("a").total,2);
 assert.equal(C.summary("d").total,1);
 assert.equal(add("d","a","related").ok,false);
});
test("Parent hierarchy allows one parent and no cycles",()=>{
 assert.ok(add("a","b","parent").ok);
 assert.ok(add("b","c","parent").ok);
 assert.equal(add("c","a","parent").ok,false);
 assert.equal(add("d","c","parent").ok,false);
 assert.equal(C.parents("b")[0].id,"a");
 assert.equal(C.children("a")[0].id,"b");
});
test("Child progress counts depend on actual task completion",()=>{
 tasks.find(t=>t.id==="b").completed=true;
 assert.equal(C.summary("a").children,1);
 assert.equal(C.summary("a").childrenDone,1);
 tasks.find(t=>t.id==="b").completed=false;
});
test("Completed prerequisite unlocks the dependent; deleting it does not",()=>{
 tasks.find(t=>t.id==="a").completed=true;
 assert.equal(C.isBlocked("b"),false);
 const removed=tasks.splice(tasks.findIndex(t=>t.id==="a"),1)[0];
 assert.equal(C.isBlocked("b"),true,"A missing prerequisite must not silently unlock its dependent");
 assert.equal(C.blockers("b")[0].missing,true);
 assert.ok(C.getEdges().some(e=>e.from==="a"&&e.to==="b"));
 assert.equal(add("c","a","blocks").ok,false,"Missing endpoints are not valid new links");
 tasks.push(removed);
 assert.equal(C.isBlocked("b"),false,"Restoring original task ID must restore its link");
});
test("Orphan connections remain in backup data and protect cycle checks",()=>{
 const removed=tasks.splice(tasks.findIndex(t=>t.id==="b"),1)[0];
 assert.equal(add("c","a","blocks").ok,false,"Existing dependency path through orphan references still prevents cycle");
 assert.ok(C.getEdges().some(e=>e.to==="b"));
 tasks.push(removed);
});
test("Task list changes do not damage saved relationships",()=>{
 tasks.find(t=>t.id==="c").title="Ship production build";
 assert.equal(C.getEdges().length,5);
 C.openTask("c");
 assert.equal(route,"connections");
 assert.ok(node.innerHTML.includes("Ship production build"));
 assert.ok(node.innerHTML.includes("PREREQUISITES"));
 assert.ok(node.innerHTML.includes("All relationships"));
 assert.ok(node.innerHTML.includes("RELATIONSHIP EDITOR"));
});
test("User text is escaped before rendering in HTML",()=>{
 C.openTask("e");
 assert.ok(node.innerHTML.includes("&lt;injected&gt;"));
 assert.ok(!node.innerHTML.includes("<injected>"));
});
test("Unlink always requires explicit confirmation, never deletes a task",()=>{
 const id=C.getEdges().find(e=>e.type==="related").id;
 confirmed=false;
 assert.equal(C.remove(id),false);
 assert.equal(count(),5);
 confirmed=true;
 assert.equal(C.remove(id),true);
 assert.equal(count(),4);
 assert.equal(tasks.length,5);
});
test("Invalid relationships and missing targets are safely refused",()=>{
 assert.equal(add("a","d","hack").ok,false);
 assert.equal(add("a","not-found","related").ok,false);
 assert.equal(add("no-task","a","related").ok,false);
 assert.equal(count(),4);
});
test("No link operation mutates the user's original task records",()=>{
 assert.equal(storage.get("tdl.tasks.v1"),JSON.stringify([
  {id:"a",title:"Design schema",category:"Project",completed:false,createdAt:100},
  {id:"b",title:"Implement API",category:"Project",completed:false,createdAt:200},
  {id:"c",title:"Deploy to staging",category:"Project",completed:false,createdAt:300},
  {id:"d",title:"Write documentation",category:"Project",completed:false,createdAt:400},
  {id:"e",title:"Review <injected> & validate",category:"Project",completed:false,createdAt:500}
 ]));
 assert.ok(renderCount>0);
 assert.equal(JSON.parse(storage.get("tdl.connections.v1")).version,1);
});
console.log("TDL Connections graph integrity tests passed. Real browser acceptance still required.");
