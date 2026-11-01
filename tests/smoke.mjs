/*
 * TDL local smoke test — no third-party packages, no real browser data.
 * Run from repository root: node tests/smoke.mjs
 *
 * This uses a minimal fake DOM to exercise initialization and core persistence.
 * It is NOT equivalent to Playwright/real Chrome interaction testing.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";

const html = fs.readFileSync("app/index.html", "utf8");
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, "TDL inline source was not found");
const scripts = [
  {name:"app/index.html (inline)", source:inline},
  ...["tdl-extras-core.js","tdl-inbox.js","tdl-calendar.js","tdl-planner.js","tdl-momentum.js"]
    .map(name=>({name,source:fs.readFileSync("app/"+name,"utf8")}))
];

const ids = new Map();
const docListeners = new Map();
const records = new Map();
let downloaded = [];

class FakeElement {
  set id(value){this._id=String(value);if(this._id)ids.set(this._id,this)}
  get id(){return this._id||""}
  constructor(tag="div"){
    this.tagName=tag.toUpperCase();
    this.dataset={};
    this.style={};
    this.value="";
    this.textContent="";
    this.hidden=false;
    this.checked=false;
    this.disabled=false;
    this._innerHTML="";
    this.handlers=new Map();
    this.classList={
      add(){},
      remove(){},
      toggle(){return false},
      contains(){return true}
    };
  }
  set innerHTML(value){
    this._innerHTML=String(value);
    for (const match of this._innerHTML.matchAll(/\bid="([^"]+)"/g)){
      if (!ids.has(match[1])) ids.set(match[1],new FakeElement());
    }
  }
  get innerHTML(){return this._innerHTML}
  querySelector(selector){return query(selector)}
  querySelectorAll(){return []}
  addEventListener(type,handler){
    if(!this.handlers.has(type))this.handlers.set(type,[]);
    this.handlers.get(type).push(handler);
  }
  appendChild(child){return child}
  insertAdjacentElement(_position,child){return child}
  setAttribute(_name,_value){}
  removeAttribute(_name){}
  getAttribute(_name){return null}
  reset(){}
  focus(){}
  blur(){}
  remove(){}
  scrollIntoView(){}
  closest(_selector){return null}
  click(){if(this.download)downloaded.push({filename:this.download,url:this.href})}
}

for (const match of html.matchAll(/\bid="([^"]+)"/g)){
  ids.set(match[1],new FakeElement());
}
const fakeDefault = new FakeElement();
const fakeWrap = new FakeElement();
const fakeHeader = new FakeElement("header");
function query(selector){
  if(selector==="header")return fakeHeader;
  if(selector===".wrap")return fakeWrap;
  if(selector.startsWith("#"))return ids.get(selector.slice(1))||fakeDefault;
  return fakeDefault;
}
const fakeDocument={
  body:new FakeElement("body"),
  hidden:false,
  activeElement:null,
  querySelector:query,
  querySelectorAll:()=>[],
  createElement:tag=>new FakeElement(tag),
  addEventListener(type,handler){
    if(!docListeners.has(type))docListeners.set(type,[]);
    docListeners.get(type).push(handler);
  },
  dispatchEvent(event){for(const handler of docListeners.get(event.type)||[])handler(event)}
};
const fakeLocalStorage={
  get length(){return records.size},
  key(i){return [...records.keys()][i]??null},
  getItem(k){return records.has(k)?records.get(k):null},
  setItem(k,v){records.set(k,String(v))},
  removeItem(k){records.delete(k)}
};
const fakeLocation={protocol:"http:",origin:"http://localhost:8000",hash:"",reload(){}};
const fakeNotification=function(){};
fakeNotification.permission="denied";
fakeNotification.requestPermission=async()=> "denied";
const windowListeners=new Map();
const fakeWindow={
  Notification:fakeNotification,
  isSecureContext:true,
  crypto:{randomUUID},
  setInterval(){},
  setTimeout(){},
  clearInterval(){},
  clearTimeout(){},
  addEventListener(type,handler){
    if(!windowListeners.has(type))windowListeners.set(type,[]);
    windowListeners.get(type).push(handler);
  }
};
function dispatchWindow(type){for(const f of windowListeners.get(type)||[])f({type})}
const urls=new Map();
let nextUrl=0;
class FakeBlob{
  constructor(parts){this.content=parts.join("")}
}
const FakeURL={
  createObjectURL(blob){const url="blob:fake-"+(++nextUrl);urls.set(url,blob.content);return url},
  revokeObjectURL(_url){}
};
let formValues={};
const sandbox={
  window:fakeWindow,
  document:fakeDocument,
  localStorage:fakeLocalStorage,
  navigator:{},
  location:fakeLocation,
  Notification:fakeNotification,
  crypto:fakeWindow.crypto,
  CustomEvent:class{constructor(type){this.type=type}},
  alert:message=>{throw new Error("Unexpected alert: "+message)},
  confirm:()=>true,
  prompt:()=>null,
  Blob:FakeBlob,
  URL:FakeURL,
  FileReader:class{},
  FormData:class{get(name){return formValues[name]??""}},
  console,
  setTimeout(){},
  clearTimeout(){}
};
vm.createContext(sandbox);
for(const {name,source} of scripts){
  try{
    new vm.Script(source,{filename:name}).runInContext(sandbox);
    console.log("PASS startup:",name);
  }catch(error){
    console.error("FAIL startup:",name);
    throw error;
  }
}
const bridge=fakeWindow.TDLAppBridge,X=fakeWindow.TDLX,M=fakeWindow.TDLMomentum;
assert.ok(bridge&&X&&M,"New feature bridge/core/Momentum missing");
const saved=()=>JSON.parse(fakeLocalStorage.getItem("tdl.tasks.v1")||"[]");
const hist=()=>JSON.parse(fakeLocalStorage.getItem("tdl.taskHistory.v1")||"{}");
const inbox=()=>JSON.parse(fakeLocalStorage.getItem("tdl.inbox.v1")||'{"items":[]}');

function test(name,fn){
  fn();
  console.log("PASS behavior:",name);
}

test("create task without renaming legacy storage key",()=>{
  const date=new Date();
  const today=[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  bridge.getTasks().push({id:"test-1",title:"Study",category:"Homework",completed:false,dueDate:today,subtasks:[]});
  bridge.save();
  assert.equal(saved()[0].title,"Study");
  assert.equal(hist().entries.length,1);
});
test("inbox records tasks due today",()=>{
  assert.ok(inbox().items.some(x=>x.taskId==="test-1"));
});
test("undo/redo task creation",()=>{
  X.undo();assert.equal(saved().length,0);
  X.redo();assert.equal(saved().length,1);
});
test("undo/redo a task title edit",()=>{
  bridge.getTasks()[0].title="Study networking";bridge.save();
  X.undo();assert.equal(saved()[0].title,"Study");
  X.redo();assert.equal(saved()[0].title,"Study networking");
});
test("deleted-task history has a restore action",()=>{
  bridge.getTasks().splice(0,1);bridge.save();
  X.open("history");
  assert.ok(query("#tdlx-content").innerHTML.includes("Restore deleted:"));
  X.undo();assert.equal(saved().length,1);
});
test("atomic logical undo of recurring completion plus next occurrence",()=>{
  bridge.getTasks()[0].completed=true;
  bridge.getTasks().push({id:"test-next",seriesId:"test-1",title:"Study networking",dueDate:"2026-11-07",completed:false,subtasks:[]});
  bridge.save();
  assert.equal(saved().length,2);
  X.undo();
  assert.equal(saved().length,1);
  assert.equal(saved()[0].completed,false);
  X.redo();
  assert.equal(saved().length,2);
});
test("Inbox, Calendar and Planner are full pages with shareable routes",()=>{
  for(const [name,hash,marker] of [
    ["inbox","#inbox","tdlx-inbox-layout"],
    ["calendar","#week","tdlx-calendar-grid"],
    ["planner","#planner","Create first board"]
  ]){
    X.open(name);
    assert.equal(fakeLocation.hash,hash);
    assert.equal(query("#tdlx-page").hidden,false);
    assert.equal(query("#tdlx-overlay").hidden,true);
    assert.ok(query("#tdlx-page-content").innerHTML.includes(marker),"Missing "+name+" page content");
  }
  X.close();
  assert.equal(fakeLocation.hash,"#home");
  assert.equal(query("#tdlx-page").hidden,true);
  assert.equal(saved().length,2,"Navigation must never replace task data");
});
test("Task history is still a separate modal and can close independently",()=>{
  X.open("calendar");
  X.open("history");
  assert.equal(query("#tdlx-overlay").hidden,false);
  assert.ok(query("#tdlx-content").innerHTML.includes("recent task changes"));
  X.close();
  assert.equal(query("#tdlx-overlay").hidden,true);
  assert.equal(X.getPage(),"calendar");
  X.close();
});
test("Direct URL route, Back/Forward and dashboard return",()=>{
  fakeLocation.hash="#inbox";dispatchWindow("hashchange");
  assert.equal(X.getPage(),"inbox");
  fakeLocation.hash="#week";dispatchWindow("hashchange");
  assert.equal(X.getPage(),"calendar");
  fakeLocation.hash="#planner";dispatchWindow("hashchange");
  assert.equal(X.getPage(),"planner");
  fakeLocation.hash="#home";dispatchWindow("hashchange");
  assert.equal(X.getPage(),"");
});
test("Timeline, agenda and schedule editor preserve task deadlines",()=>{
  const before=JSON.stringify(saved());
  X.open("calendar");
  let page=query("#tdlx-page-content");
  assert.ok(page.innerHTML.includes("tdlx-calendar-grid"));
  page.onclick({target:{closest:sel=>sel==="[data-cal]"?{dataset:{cal:"modeAgenda"}}:null}});
  assert.ok(page.innerHTML.includes("tdlx-calendar-agenda"));
  page.onclick({target:{closest:sel=>sel==="[data-cal]"?{dataset:{cal:"modeWeek"}}:null}});
  page.onclick({target:{closest:sel=>sel==="[data-cal]"?{dataset:{cal:"new"}}:null}});
  assert.ok(page.innerHTML.includes("tdlx-block-form"));
  formValues={title:"Study session",taskId:"test-1",start:"2026-11-02T10:00",end:"2026-11-02T11:30",notes:"Practice"};
  query("#tdlx-block-form").onsubmit({preventDefault(){}});
  const work=JSON.parse(fakeLocalStorage.getItem("tdl.timeBlocks.v1"));
  assert.equal(work.length,1);
  assert.equal(work[0].title,"Study session");
  assert.equal(JSON.stringify(saved()),before,"Calendar must not change task records");
  assert.ok(page.innerHTML.includes("Study session"));
  X.close();
});
test("Random focus questions are absent but timer and focus history remain",()=>{
  assert.ok(!html.includes('id="focusModal"'));
  assert.ok(!inline.includes("maybeFocusCheck"));
  assert.ok(!inline.includes("scheduleFocusCheck"));
  assert.ok(!inline.includes("focusQuestions"));
  assert.ok(html.includes('id="timerStart"'));
  assert.ok(html.includes('id="focusHistory"'));
  assert.ok(html.includes('tdl.focusSessions.v1'));
});
test("Momentum page is a full page and not a dialog",()=>{
  X.open("accountability");
  assert.equal(fakeLocation.hash,"#momentum");
  assert.equal(query("#tdlx-page").hidden,false);
  assert.equal(query("#tdlx-overlay").hidden,true);
  assert.ok(query("#tdlx-page-content").innerHTML.includes("DAILY HARD CAP"));
  assert.ok(query("#tdlx-page-content").innerHTML.includes("DAILY HARD CAP"));
  X.close();
});
test("Momentum commits only open tasks and keeps original storage separate",()=>{
  const original=JSON.stringify(saved());
  const open=saved().find(t=>!t.completed);
  assert.ok(open,"An open recurring test task must exist");
  assert.equal(M.recommit(open.id),true);
  assert.equal(M.getState().committed.length,1);
  assert.equal(JSON.stringify(saved()),original,"Daily commitment cannot change original task records");
  assert.ok(fakeLocalStorage.getItem("tdl.momentum.v1"));
});
test("Momentum completion log tracks task transitions and Undo",()=>{
  const id=saved().find(t=>!t.completed)?.id;
  assert.ok(id);
  const prior=M.getLog().filter(x=>x.taskId===id).length;
  bridge.completeTask(id);
  assert.equal(M.getLog().filter(x=>x.taskId===id).length,prior+1);
  X.undo();
  assert.equal(M.getLog().filter(x=>x.taskId===id).length,prior);
  X.redo();
  assert.equal(M.getLog().filter(x=>x.taskId===id).length,prior+1);
});
test("Momentum Friday/weekly analytics have separate saved metadata",()=>{
  const week=M.getWeek();
  assert.equal(week.days.length,7);
  assert.ok(Array.isArray(week.events));
  assert.ok(Array.isArray(M.getLog()));
  assert.ok(fakeLocalStorage.getItem("tdl.completionLog.v1"));
});
test("full backup contains tasks and the extension collections",()=>{
  X.fullBackup();
  assert.ok(downloaded.length>0);
  const output=JSON.parse(urls.get(downloaded.at(-1).url));
  assert.equal(output.format,"full-local-v1");
  assert.ok(output.entries["tdl.tasks.v1"]);
  assert.ok(output.entries["tdl.taskHistory.v1"]);
  assert.ok(output.entries["tdl.inbox.v1"]);
  assert.ok(output.entries["tdl.momentum.v1"]);
  assert.ok(output.entries["tdl.completionLog.v1"]);
});

console.log("\nTDL simulated smoke checks passed.");
console.log("Reminder: also test in real Chrome (installed and normal tab), using fake tasks on localhost.");
