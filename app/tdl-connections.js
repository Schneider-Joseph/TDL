/* TDL Connections — offline-first relational task graph.
 * Edge storage is independent from tdl.tasks.v1. Missing endpoints are PRESERVED,
 * not purged: restoring a deleted task restores its connections automatically.
 * Valid link types: blocks (directed), parent (directed), related (symmetric).
 */
(function(){
"use strict";
const X=window.TDLX, bridge=window.TDLAppBridge;
if(!X||!bridge)return;
const KEY="tdl.connections.v1", MAX_EDGES=750,esc=X.escape;
const $=(s,r=document)=>r.querySelector(s);
const TYPES=new Set(["blocks","related","parent"]);
const title=t=>t?String(t.title||"Untitled task"):"Missing task";
let selected="", search="", feedback="",filter="all",graph=load();
function taskMap(){return new Map(X.tasks().filter(t=>t&&typeof t.id==="string").map(t=>[t.id,t]))}
function load(){
 const raw=X.store(KEY,{version:1,edges:[]});
 if(!raw||raw.version!==1||!Array.isArray(raw.edges))return {version:1,edges:[]};
 const ids=new Set();
 return {version:1,edges:raw.edges.filter(e=>{
  if(!e||typeof e.id!=="string"||typeof e.from!=="string"||typeof e.to!=="string"||!TYPES.has(e.type)||e.from===e.to||ids.has(e.id))return false;
  ids.add(e.id);return true
 }).slice(0,MAX_EDGES)};
}
function edges(){return graph.edges}
function activeEdges(){const map=taskMap();return edges().filter(e=>map.has(e.from)&&map.has(e.to))}
function getTask(id){return taskMap().get(id)||null}
function blockers(id){
 const map=taskMap();
 // A deleted prerequisite must NOT silently unlock its dependent task.
 return edges().filter(e=>e.type==="blocks"&&e.to===id&&map.has(id)&&(!map.has(e.from)||!map.get(e.from).completed))
  .map(e=>map.get(e.from)||{id:e.from,title:"Missing prerequisite ("+e.from+")",completed:false,missing:true});
}
function isBlocked(id){return blockers(id).length>0}
function children(id){const map=taskMap();return edges().filter(e=>e.type==="parent"&&e.from===id&&map.has(e.to)).map(e=>map.get(e.to))}
function parents(id){const map=taskMap();return edges().filter(e=>e.type==="parent"&&e.to===id&&map.has(e.from)).map(e=>map.get(e.from))}
function connections(id){return edges().filter(e=>e.from===id||e.to===id)}
function summary(id){
 const t=getTask(id),these=connections(id),unmet=blockers(id),kids=children(id);
 return {total:these.length,blocked:unmet.length,blockedBy:unmet.map(t=>t.id),
  ready:!!t&&!t.completed&&!unmet.length,children:kids.length,childrenDone:kids.filter(t=>t.completed).length,
  incompleteChildren:kids.filter(t=>!t.completed).length,orphan:these.filter(e=>!getTask(e.from)||!getTask(e.to)).length};
}
function canonical(from,to,type){
 if(type==="related"&&from>to)return {from:to,to:from,type};
 return {from,to,type}
}
function reaches(start,target,type){
 const visited=new Set(),queue=[start];
 while(queue.length){
  const here=queue.shift();
  if(here===target)return true;
  if(visited.has(here))continue;
  visited.add(here);
  // Include orphan references in cycle checks; restoring a deleted task must not create a cycle.
  for(const e of edges())if(e.type===type&&e.from===here)queue.push(e.to);
 }
 return false;
}
function addLink(from,to,type){
 if(!TYPES.has(type))return {ok:false,error:"Select a valid relationship."};
 if(typeof from!=="string"||typeof to!=="string"||from===to)return {ok:false,error:"A task cannot connect to itself."};
 const map=taskMap();
 if(!map.has(from)||!map.has(to))return {ok:false,error:"One of these tasks is missing. Restore it first."};
 if(edges().length>=MAX_EDGES)return {ok:false,error:"Reached 750 connections. Export a full backup before expanding the graph."};
 const e=canonical(from,to,type);
 if(edges().some(x=>x.from===e.from&&x.to===e.to&&x.type===e.type))return {ok:false,error:"These tasks already have that relationship."};
 if((type==="blocks"||type==="parent")&&reaches(e.to,e.from,type))return {ok:false,error:"That link creates a circular "+(type==="blocks"?"dependency":"parent/child hierarchy")+". Choose a different direction."};
 if(type==="parent"&&edges().some(x=>x.type==="parent"&&x.to===e.to))return {ok:false,error:"A child already has a parent. Remove the previous parent relationship first."};
 const next={version:1,edges:edges().concat({id:X.uid(),from:e.from,to:e.to,type:e.type,createdAt:Date.now()})};
 if(!X.put(KEY,next))return {ok:false,error:"Saving failed. Existing connections were preserved."};
 graph=next;refreshViews();return {ok:true};
}
function removeLink(id){
 const e=edges().find(x=>x.id===id);if(!e)return false;
 if(!window.confirm("Remove this relationship? The connected tasks will stay exactly as they are."))return false;
 const next={version:1,edges:edges().filter(x=>x.id!==id)};
 if(!X.put(KEY,next))return false;
 graph=next;refreshViews();return true
}
function refreshViews(){
 // Refresh original task cards to display new status chips without changing saved tasks.
 if(bridge.render)bridge.render();
 if(X.getPage&&X.getPage()==="connections")X.refresh();
}
function safeView(id){
 selected=getTask(id)?id:"";
 if(selected)search="";
 X.navigate("connections");X.refresh();
}
function pickTask(id){if(!getTask(id))return;selected=id;feedback="";X.refresh()}
function nodeStatus(t){
 if(!t)return '<span class="tdlc-status missing">Missing</span>';
 if(t.completed)return '<span class="tdlc-status done">Completed</span>';
 const n=blockers(t.id).length;
 return n?'<span class="tdlc-status blocked">'+n+' prerequisite'+(n===1?"":"s")+' incomplete</span>':'<span class="tdlc-status ready">Ready</span>';
}
function displayConnection(e,current){
 const map=taskMap(),a=map.get(e.from),b=map.get(e.to);
 let type="",other="";
 if(e.type==="related"){type="Related to";other=e.from===current?e.to:e.from}
 else if(e.type==="blocks"){type=e.from===current?"Blocks":"Blocked by";other=e.from===current?e.to:e.from}
 else{type=e.from===current?"Parent of":"Child of";other=e.from===current?e.to:e.from}
 const target=map.get(other);
 return '<div class="tdlc-edge-row"><span class="tdlc-edge-type '+e.type+'">'+esc(type)+'</span><span class="tdlc-edge-name">'+
  (target?'<button class="tdlc-text-link" type="button" data-conn="pick" data-id="'+esc(target.id)+'">'+esc(title(target))+'</button>':'<strong class="tdlc-missing">Missing task ('+esc(other)+')</strong>')+
  '<small>'+ (target?nodeStatus(target):'Restoring the task with the original ID reconnects this link')+'</small></span>'+
  '<button class="btn" type="button" data-conn="remove" data-id="'+esc(e.id)+'" aria-label="Remove relation with '+esc(other)+'">Unlink</button></div>';
}
function taskChip(t,marker){
 return '<button type="button" class="tdlc-mini-task" data-conn="pick" data-id="'+esc(t.id)+'"><span>'+esc(title(t))+'</span>'+nodeStatus(t)+'</button>';
}
function graphView(id){
 const selectedTask=getTask(id);if(!selectedTask)return "";
 const map=taskMap(),toLeft=[],toRight=[],related=[],parentsList=[],childList=[];
 for(const e of edges()){
  if(e.type==="blocks"){
   if(e.to===id&&map.has(e.from))toLeft.push(map.get(e.from));
   if(e.from===id&&map.has(e.to))toRight.push(map.get(e.to))
  }else if(e.type==="related"&&(e.from===id||e.to===id)){
   const other=map.get(e.from===id?e.to:e.from);if(other)related.push(other)
  }else if(e.type==="parent"){
   if(e.to===id&&map.has(e.from))parentsList.push(map.get(e.from));
   if(e.from===id&&map.has(e.to))childList.push(map.get(e.to))
  }
 }
 const left=toLeft.slice(0,5),right=toRight.slice(0,5);
 const yPositions=n=>Array.from({length:n},(_,i)=>Math.round(25+(i+0.5)*400/n));
 const leftY=yPositions(left.length),rightY=yPositions(right.length);
 const lines=left.map((t,i)=>'<path d="M 240 '+leftY[i]+' C 325 '+leftY[i]+', 360 225, 405 225"/>').join("")+
  right.map((t,i)=>'<path d="M 495 225 C 575 225, 615 '+rightY[i]+', 660 '+rightY[i]+'"/>').join("");
 const item=(t,x,y)=>'<button class="tdlc-graph-node '+(t.id===id?"is-center ":"")+(t.completed?"done":isBlocked(t.id)?"blocked":"ready")+'" style="left:'+x+'%;top:'+((y/450)*100).toFixed(2)+'%" type="button" data-conn="pick" data-id="'+esc(t.id)+'" title="'+esc(title(t))+'"><span>'+esc(title(t))+'</span><small>'+(t.completed?"Completed":isBlocked(t.id)?"Blocked":"Ready")+'</small></button>';
 return '<section class="tdlc-network"><div class="tdlc-network-head"><span>PREREQUISITES</span><span>SELECTED TASK</span><span>UNLOCKS NEXT</span></div>'+
  '<div class="tdlc-network-board" role="group" aria-label="Task dependency map centered on '+esc(title(selectedTask))+'">'+
  '<svg class="tdlc-network-lines" viewBox="0 0 900 450" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="tdlc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 10 5 0 10Z"/></marker></defs><g>'+lines+'</g></svg>'+
  left.map((t,i)=>item(t,26.5,leftY[i])).join("")+
  item(selectedTask,50,225)+right.map((t,i)=>item(t,73.5,rightY[i])).join("")+
  '</div><p class="tdlc-network-caption">Arrows run from prerequisite → dependent. Click any task to explore its connections. Up to five incoming and outgoing links appear on the map; all links are shown in the detail list below.</p>'+
  '<div class="tdlc-network-metadata">'+
  '<div><strong>Related</strong>'+(related.length?related.map(t=>taskChip(t)).join(""):'<span>No related tasks</span>')+'</div>'+
  '<div><strong>Parent</strong>'+(parentsList.length?parentsList.map(t=>taskChip(t)).join(""):'<span>No parent</span>')+'</div>'+
  '<div><strong>Child tasks</strong>'+(childList.length?childList.map(t=>taskChip(t)).join(""):'<span>No children</span>')+'</div>'+
  '</div></section>';
}
function linkCreator(t){
 const options=X.tasks().filter(x=>x&&x.id!==t.id).sort((a,b)=>title(a).localeCompare(title(b)))
  .map(x=>'<option value="'+esc(x.id)+'">'+esc(title(x))+(x.completed?" ✓":"")+'</option>').join("");
 return '<form id="tdlc-link-form" class="tdlc-link-form">'+
  '<label>Relationship<select name="relationship" required><option value="blocks">This task BLOCKS another task</option>'+
  '<option value="blockedBy">This task is BLOCKED BY another</option><option value="related">Related (two-way)</option>'+
  '<option value="parent">This task is the PARENT of another</option><option value="childOf">This task is a CHILD of another</option></select></label>'+
  '<label>Connect to<select name="target" required>'+options+'</select></label>'+
  '<button type="submit" class="btn primary" '+(!options?"disabled":"")+'>＋ Create connection</button></form>'+
  '<p class="tdlc-form-hint">Dependencies and hierarchy cannot contain cycles. Connections never move deadlines, delete tasks, or complete tasks automatically.</p>';
}
function detail(t){
 const current=connections(t.id),sum=summary(t.id),kid=children(t.id);
 const sorted=current.slice().sort((a,b)=>({blocks:0,parent:1,related:2}[a.type]||0)-({blocks:0,parent:1,related:2}[b.type]||0));
 return '<div class="tdlc-detail-head"><div><span class="tdlx-page-eyebrow">TASK / CONNECTIVITY</span><h3>'+esc(title(t))+'</h3>'+
  '<div class="tdlc-detail-stats">'+nodeStatus(t)+
  '<span>'+sum.total+' connection'+(sum.total===1?"":"s")+'</span>'+
  (sum.children?'<span>'+sum.childrenDone+'/'+sum.children+' children complete</span>':"")+
  (t.dueDate?'<span>Due '+esc(t.dueDate)+'</span>':"")+'</div></div>'+
  '<button type="button" class="btn" data-conn="editTask" data-id="'+esc(t.id)+'">Edit original task ↗</button></div>'+
  graphView(t.id)+
  '<section class="tdlc-detail-card"><div class="tdlc-section-heading"><div><span class="tdlx-page-eyebrow">RELATIONSHIP EDITOR</span><h3>Connect this task</h3></div></div>'+
  linkCreator(t)+'</section>'+
  '<section class="tdlc-detail-card"><div class="tdlc-section-heading"><div><span class="tdlx-page-eyebrow">BIDIRECTIONAL REFERENCES</span><h3>All relationships ('+current.length+')</h3></div></div>'+
  '<div class="tdlc-edge-list">'+(sorted.length?sorted.map(e=>displayConnection(e,t.id)).join(""):'<div class="tdlc-empty">No connections yet. Link another task above to build your workflow.</div>')+'</div></section>';
}
function overview(){
 const tasks=X.tasks(),valid=activeEdges(),blocked=tasks.filter(t=>!t.completed&&isBlocked(t.id)),
  connected=new Set(valid.flatMap(e=>[e.from,e.to])),
  ready=tasks.filter(t=>!t.completed&&!isBlocked(t.id));
 return '<div class="tdlc-kpi-grid">'+
  '<div class="tdlc-kpi"><span>Task relationships</span><strong>'+edges().length+'</strong><small>'+connected.size+' tasks connected</small></div>'+
  '<div class="tdlc-kpi"><span>Ready to start</span><strong>'+ready.length+'</strong><small>No unmet prerequisites</small></div>'+
  '<div class="tdlc-kpi"><span>Blocked tasks</span><strong>'+blocked.length+'</strong><small>Waiting on another task</small></div>'+
  '<div class="tdlc-kpi"><span>Saved references</span><strong>'+edges().filter(e=>!getTask(e.from)||!getTask(e.to)).length+'</strong><small>Missing endpoints retained</small></div>'+
  '</div>';
}
function render(container){
 const tasks=X.tasks(),valid=taskMap();
 if(selected&&!valid.has(selected))selected="";
 if(!selected&&tasks.length)selected=tasks.find(t=>!t.completed)?.id||tasks[0].id;
 container.innerHTML='<div class="tdlc-page">'+overview()+
 '<div class="tdlc-shell"><aside class="tdlc-sidebar"><div class="tdlc-sidebar-head"><span class="tdlx-page-eyebrow">TASK DATABASE</span><h3>Explore connections</h3>'+
 '<label class="tdlc-search-label" for="tdlc-search">Find a task<input id="tdlc-search" type="search" placeholder="Search by title or category…" value="'+esc(search)+'"></label></div>'+
 '<div class="tdlc-sidebar-filters" role="group" aria-label="Filter task connections">'+
 [['all','All'],['blocked','Blocked'],['ready','Ready'],['connected','Linked']].map(([k,label])=>
 '<button type="button" data-conn-filter="'+k+'" aria-pressed="'+(filter===k)+'" class="'+(filter===k?"active":"")+'">'+label+'</button>').join("")+'</div>'+
 '<div class="tdlc-task-directory">'+(tasks.length?tasks.slice().sort((a,b)=>Number(!!a.completed)-Number(!!b.completed)||title(a).localeCompare(title(b))).map(t=>
 '<button type="button" class="tdlc-task-choice '+(selected===t.id?"active":"")+'" data-conn="pick" data-id="'+esc(t.id)+'" data-search="'+esc((title(t)+" "+(t.category||"")).toLowerCase())+'" data-status="'+(t.completed?"done":isBlocked(t.id)?"blocked":"ready")+'" data-connected="'+(connections(t.id).length?"yes":"no")+'">'+
 '<span class="tdlc-task-choice-title">'+esc(title(t))+'</span><span class="tdlc-task-choice-meta">'+esc(t.category||"Personal")+' · '+(t.completed?"Done":isBlocked(t.id)?"Blocked":connections(t.id).length+" links")+'</span></button>').join(""):'<div class="tdlc-empty">No tasks yet. Add tasks in Dashboard to build your network.</div>')+'</div></aside>'+
 '<main class="tdlc-detail">'+(selected&&valid.has(selected)?detail(valid.get(selected)):'<section class="tdlc-empty-state"><h3>Your task network starts here</h3><p>Add some tasks in Dashboard, then connect dependencies, parents, and related work.</p><button class="btn primary" data-conn="newTask">＋ New task</button></section>')+
 (feedback?'<p class="tdlc-feedback" role="status">'+esc(feedback)+'</p>':"")+
 '</main></div></div>';
 const form=$("#tdlc-link-form",container);
 if(form)form.onsubmit=e=>{
  e.preventDefault();const fd=new FormData(form);const type=String(fd.get("relationship")||""),target=String(fd.get("target")||"");
  let from=selected,to=target,kind=type;
  if(type==="blockedBy"){from=target;to=selected;kind="blocks"}
  if(type==="childOf"){from=target;to=selected;kind="parent"}
  const result=addLink(from,to,kind);
  feedback=result.ok?"Connection added. Both tasks now reflect the relationship.":result.error;
  if(result.ok)X.toast("Connected tasks");X.refresh();
 };
 const searchInput=$("#tdlc-search",container);
 function applyFilters(){
  const query=search.trim().toLowerCase();
  container.querySelectorAll(".tdlc-task-choice").forEach(b=>{
   b.hidden=!!query&&!b.dataset.search.includes(query)||
    (filter==="blocked"&&b.dataset.status!=="blocked")||
    (filter==="ready"&&b.dataset.status!=="ready")||
    (filter==="connected"&&b.dataset.connected!=="yes");
  })
 }
 if(searchInput)searchInput.oninput=e=>{search=e.target.value;applyFilters()};
 applyFilters();
 container.onclick=e=>{
  const filterButton=e.target.closest("[data-conn-filter]");
  if(filterButton){filter=filterButton.dataset.connFilter;X.refresh();return}
  const b=e.target.closest("[data-conn]");if(!b)return;
  const action=b.dataset.conn,id=b.dataset.id||"";
  if(action==="pick"){pickTask(id);return}
  if(action==="remove"){if(removeLink(id)){feedback="Connection removed. Both tasks are preserved.";X.refresh()}return}
  if(action==="editTask"){const task=getTask(id);if(!task)return;X.navigate("home");bridge.openTask(task);return}
  if(action==="newTask"){X.navigate("home");const add=$("#add");if(add)add.click()}
 };
}
X.register("connections","Task connections",render);
document.addEventListener("tdlx:tasks-changed",()=>{if(X.getPage&&X.getPage()==="connections")X.refresh()});
window.TDLConnections={add:addLink,remove:removeLink,summary,blockers,isBlocked,children,parents,
 getEdges:()=>X.copy(edges()),openTask:safeView,pickTask};
bridge.render();
})();