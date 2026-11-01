/*
 TDL Studio UI contract test; no third-party packages or real user tasks.
 Run from repository root: node tests/ui-contract.mjs
 This is a source-structure test, not a real browser rendering test.
*/
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = path => fs.readFileSync(path,"utf8");
const html = read("app/index.html");
const theme = read("app/tdl-theme.css");
const sw = read("app/sw.js");
const core = read("app/tdl-extras-core.js");
const manifest = JSON.parse(read("app/manifest.webmanifest"));
const paths = ["app/tdl-extras-core.js","app/tdl-inbox.js","app/tdl-calendar.js","app/tdl-planner.js"];

function contains(source,needle,label){
 assert.ok(source.includes(needle),label+" is missing: "+needle);
}
contains(html,'href="./tdl-theme.css"',"Theme stylesheet");
assert.ok(html.indexOf('href="./tdl-theme.css"') > html.indexOf("</style>"),"Theme must load after legacy CSS");
contains(html,'class="header-utilities"',"Native Tools menu");
contains(html,'class="header-actions"',"Header layout");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,"Duplicate HTML element IDs");
for(const id of ["add","settingsOpen","export","importBtn","quickAdd","title","category","taskList","focusTask","todayCount"]){
 contains(html,'id="'+id+'"',"Existing task control");
}
for(const id of ["tdlx-bell","tdlx-undo","tdlx-redo","tdlx-backup","tdlx-restore"]){
 contains(core,'id="'+id+'"',"Extension control");
}
for(const part of ['data-tdlx-open="calendar"','data-tdlx-open="planner"','data-tdlx-open="history"','class="tdlx-tabs"','class="tdlx-tools"']){
 contains(core,part,"Navigation structure");
}
contains(html,'var KEY="tdl.tasks.v1"',"Original task storage key");
contains(html,"window.TDLAppBridge=","Existing task bridge");
for(const path of paths){
 const name=path.split("/").pop();
 contains(html,'src="./'+name+'"',"Loaded script");
 contains(sw,'"./'+name+'"',"Offline-cached script");
}
contains(sw,'"./tdl-theme.css"',"Offline-cached theme");
contains(html,'href="./tdl-workspace.css"',"Full workspace stylesheet");
contains(sw,'"./tdl-workspace.css"',"Offline-cached workspace stylesheet");
const workspace=read("app/tdl-workspace.css");
for(const selector of [".tdlx-page[hidden]","body.tdlx-page-open",".tdlx-calendar-grid",".tdlx-calendar-event",".tdlx-inbox-layout",".tdlx-board-viewport","max-width:550px"]){
 contains(workspace,selector,"Full workspace layout");
}
for(const marker of ['id="tdlx-page"','id="tdlx-page-content"','hashchange','pathRoute()','navigate("home")','getPage:()=>pageActive']){
 contains(core,marker,"Hash-addressable workspace routing");
}
contains(read("app/tdl-calendar.js"),'tdlx-calendar-grid',"Calendar timeline");
contains(read("app/tdl-calendar.js"),'tdlx-calendar-agenda',"Calendar agenda view");
contains(read("app/tdl-inbox.js"),'tdlx-inbox-layout',"Inbox full page");
assert.ok(!html.includes('id="focusModal"'),"Random focus prompt must be removed");

for(const selector of ["--ui-accent:","--ui-surface:","--ui-radius:",".header-utilities",".tdlx-header",".task{",".stat{",".tdlx-dialog","prefers-reduced-motion","max-width:780px","max-width:550px"]){
 contains(theme,selector,"Design token/selector");
}
contains(theme,".tdlx-pill[hidden]","Hidden unread indicator");
contains(theme,".header-utilities:not([open])","Closed header Tools menu rule");
contains(theme,".tdlx-tools:not([open])","Closed workspace More tools menu rule");
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,"Missing original inline app JS");
for(const [path,source] of [["original inline app",inline],...paths.map(path=>[path,read(path)]),["app/sw.js",sw]]){
 new vm.Script(source,{filename:path});
 console.log("PASS syntax: "+path);
}
assert.equal(manifest.start_url,"./index.html","PWA entry changed unexpectedly");
assert.equal(manifest.scope,"./","PWA scope changed unexpectedly");
assert.equal(manifest.theme_color,"#090f18","Manifest theme mismatch");
console.log("PASS Studio UI controls, cache, CSS contract and original data key.");
console.log("Verify routes #inbox / #week / #planner, scheduling, keyboard and responsive layout in Chrome.");
