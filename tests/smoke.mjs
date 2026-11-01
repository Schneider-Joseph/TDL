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
  ...["tdl-extras-core.js","tdl-inbox.js","tdl-calendar.js","tdl-planner.js"]
    .map(name=>({name,source:fs.readFileSync("app/"+name,"utf8")}))
];

const ids = new Map();
const docListeners = new Map();
const records = new Map();
let downloaded = [];

class FakeElement {
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
const fakeHeader = new FakeElement("header");
function query(selector){
  if(selector==="header")return fakeHeader;
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
const fakeLocation={protocol:"http:",origin:"http://localhost:8000",reload(){}};
const fakeNotification=function(){};
fakeNotification.permission="denied";
fakeNotification.requestPermission=async()=> "denied";
const fakeWindow={
  Notification:fakeNotification,
  isSecureContext:true,
  crypto:{randomUUID},
  setInterval(){},
  setTimeout(){},
  clearInterval(){},
  clearTimeout(){},
  addEventListener(){}
};
const urls=new Map();
let nextUrl=0;
class FakeBlob{
  constructor(parts){this.content=parts.join("")}
}
const FakeURL={
  createObjectURL(blob){const url="blob:fake-"+(++nextUrl);urls.set(url,blob.content);return url},
  revokeObjectURL(_url){}
};
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
  FormData:class{},
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
const bridge=fakeWindow.TDLAppBridge,X=fakeWindow.TDLX;
assert.ok(bridge&&X,"New feature bridge/core missing");
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
test("inbox/history/week/planner panels initialize",()=>{
  for(const name of ["inbox","history","calendar","planner"]){
    X.open(name);
    assert.equal(query("#tdlx-overlay").hidden,false);
    assert.ok(query("#tdlx-content").innerHTML.length>0);
  }
  X.close();
});
test("full backup contains tasks and the extension collections",()=>{
  X.fullBackup();
  assert.ok(downloaded.length>0);
  const output=JSON.parse(urls.get(downloaded.at(-1).url));
  assert.equal(output.format,"full-local-v1");
  assert.ok(output.entries["tdl.tasks.v1"]);
  assert.ok(output.entries["tdl.taskHistory.v1"]);
  assert.ok(output.entries["tdl.inbox.v1"]);
});

console.log("\nTDL simulated smoke checks passed.");
console.log("Reminder: also test in real Chrome (installed and normal tab), using fake tasks on localhost.");
