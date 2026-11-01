/* TDL Visual Planner: fully manual local boards, nodes, arrows, labels and drag/pan/zoom.
   Boards live independently from tasks; editing a node never creates a task. */
(function(){
"use strict";
const X=window.TDLX;if(!X)return;
const key="tdl.boards.v1",esc=X.escape;
const $=(q,r=document)=>r.querySelector(q);
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const width=172,height=82;
let boards=read(),selectedBoard=boards[0]?.id||"",selectedNode="",newNode=false,connectFrom="",zoom=1,panX=12,panY=12,drag=null,ignoreClickUntil=0;
function read(){const b=X.store(key,[]);return Array.isArray(b)?b.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"&&Array.isArray(x.nodes)&&Array.isArray(x.edges)).map(x=>({...x,nodes:x.nodes.filter(n=>n&&typeof n.id==="string"&&typeof n.title==="string"&&Number.isFinite(n.x)&&Number.isFinite(n.y)),edges:x.edges.filter(e=>e&&typeof e.id==="string"&&typeof e.from==="string"&&typeof e.to==="string")})):[]}
function save(next){
 if(next.length>30||next.some(b=>b.nodes.length>120||b.edges.length>300)){alert("Board limit reached (30 boards, 120 nodes and 300 connections per board). Export a full backup first.");return false}
 if(!X.put(key,next))return false;
 boards=next;return true;
}
function board(){return boards.find(b=>b.id===selectedBoard)}
function saveBoard(updated){return save(boards.map(b=>b.id===updated.id?updated:b))}
function promptTitle(message,initial){const v=window.prompt(message,initial||"");return v===null?null:v.trim().slice(0,100)}
function makeBoard(){
 const title=promptTitle("Name your new visual board","New project");if(!title)return;
 const b={id:X.uid(),title,nodes:[],edges:[],createdAt:Date.now(),updatedAt:Date.now()};
 if(save(boards.concat(b))){selectedBoard=b.id;selectedNode="";newNode=false;connectFrom="";zoom=1;panX=12;panY=12;X.refresh()}
}
function renameBoard(){const b=board();if(!b)return;const title=promptTitle("Rename this board",b.title);if(!title)return;if(saveBoard({...b,title,updatedAt:Date.now()}))X.refresh()}
function removeBoard(){const b=board();if(!b)return;if(!confirm('Delete the entire board "'+b.title+'", including all nodes and arrows? Tasks in TDL are not affected. A Full backup is recommended first.'))return;
 if(save(boards.filter(x=>x.id!==b.id))){selectedBoard=boards[0]?.id||"";selectedNode="";connectFrom="";X.refresh()}}
function deleteNode(){
 const b=board(),id=selectedNode;if(!b||!id)return;const node=b.nodes.find(n=>n.id===id);
 if(!confirm('Delete node "'+(node?.title||"")+"\" and its arrows? This does not delete any TDL task."))return;
 if(saveBoard({...b,nodes:b.nodes.filter(n=>n.id!==id),edges:b.edges.filter(e=>e.from!==id&&e.to!==id),updatedAt:Date.now()})){selectedNode="";X.refresh()}
}
function nodeForm(b){
 const current=b.nodes.find(n=>n.id===selectedNode);
 const n=newNode||!current?{title:"",notes:"",taskId:""}:current;
 const options=X.tasks().slice().sort((a,b)=>a.title.localeCompare(b.title)).map(t=>'<option value="'+esc(t.id)+'" '+(n.taskId===t.id?"selected":"")+'>'+esc(t.title)+(t.completed?" ✓":"")+'</option>').join("");
 return '<form id="tdlx-node-form" class="tdlx-form"><label class="full">Node title<input required maxlength="100" name="title" value="'+esc(n.title)+'" placeholder="Research the problem"></label>'+
 '<label class="full">Node details / next steps<textarea name="notes" maxlength="1500">'+esc(n.notes||"")+'</textarea></label>'+
 '<label class="full">Linked TDL task (optional)<select name="taskId"><option value="">Not linked</option>'+options+
 (n.taskId&&!X.tasks().some(t=>t.id===n.taskId)?'<option value="'+esc(n.taskId)+'" selected>Missing task — preserve link</option>':"")+
 '</select><small>Link to an existing task without changing or deleting it. View its dependencies in Connections.</small></label>'+
 '<div class="tdlx-actions"><button class="btn primary" type="submit">'+(current&&!newNode?"Save node":"Add node")+'</button><button class="btn" type="button" data-planner="cancelNode">Cancel</button>'+
 (n.taskId&&X.tasks().some(t=>t.id===n.taskId)?'<button class="btn" type="button" data-planner="viewTask" data-id="'+esc(n.taskId)+'">↗ Open linked task</button>':"")+(current&&!newNode?'<button class="btn" type="button" data-planner="deleteNode">Delete node</button>':'')+'</div></form>';
}
function draw(c){
 const b=board();
 if(!b){c.innerHTML='<div class="tdlx-planner-empty"><span class="tdlx-planner-empty-icon" aria-hidden="true">◇</span><span class="tdlx-page-eyebrow">A FRESH CANVAS</span><h3>Start with a blank canvas.</h3><p>Build a flowchart, map a project, or make a plan that only you control. Add nodes, label connections, and rearrange your ideas visually.</p><button class="btn primary" type="button" data-planner="createBoard">＋ Create first board</button><small>All boards are saved privately in this browser.</small></div>';bind(c);return}
 const nodeMap=new Map(b.nodes.map(n=>[n.id,n]));
 const edges=b.edges.filter(e=>nodeMap.has(e.from)&&nodeMap.has(e.to));
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1400" class="tdlx-board-lines" aria-hidden="true"><defs><marker id="tdlx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#9ebea5"/></marker></defs>'+
 edges.map(e=>{const a=nodeMap.get(e.from),z=nodeMap.get(e.to),x1=a.x+width/2,y1=a.y+height/2,x2=z.x+width/2,y2=z.y+height/2;
  return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#9ebea5" stroke-width="3" marker-end="url(#tdlx-arrow)"/><text x="'+((x1+x2)/2)+'" y="'+((y1+y2)/2-9)+'" text-anchor="middle" fill="#f7e1a0" font-size="18">'+esc(e.label||"")+'</text>';
 }).join("")+'</svg>';
 c.innerHTML='<div class="tdlx-planner-intro"><div><span class="tdlx-page-eyebrow">ACTIVE BOARD</span><h3>'+esc(b.title)+'</h3><p>Arrange your ideas freely. Nothing here automatically creates or deletes TDL tasks.</p></div><div class="tdlx-planner-metrics"><span><b>'+b.nodes.length+'</b> nodes</span><span><b>'+edges.length+'</b> connections</span><span><b>'+boards.length+'</b> boards</span></div></div>'+
 '<div class="tdlx-board-controls"><label class="tdlx-muted">Board <select id="tdlx-board-select">'+boards.map(q=>'<option value="'+esc(q.id)+'" '+(q.id===b.id?"selected":"")+'>'+esc(q.title)+'</option>').join("")+'</select></label><button class="btn" data-planner="createBoard">+ New board</button><button class="btn" data-planner="renameBoard">Rename</button><button class="btn" data-planner="removeBoard">Delete board</button></div>'+
 '<div class="tdlx-board-controls"><button class="btn primary" data-planner="addNode">+ Add node</button><button class="btn" data-planner="connect">'+(connectFrom?"Pick second node…":"→ Connect nodes")+'</button><button class="btn" data-planner="cancelConnect">Cancel connection</button><button class="btn" data-planner="zoomIn">Zoom +</button><button class="btn" data-planner="zoomOut">Zoom −</button><button class="btn" data-planner="resetView">Reset view</button><span class="tdlx-muted">'+Math.round(zoom*100)+'%</span></div>'+
 '<div class="tdlx-board-viewport" id="tdlx-board-viewport" aria-label="Visual project planning canvas"><div class="tdlx-board-world" id="tdlx-board-world" style="transform:translate('+panX+'px,'+panY+'px) scale('+zoom+')">'+svg+
 b.nodes.map(n=>{const linked=n.taskId?X.tasks().find(t=>t.id===n.taskId):null;
  return '<button type="button" class="tdlx-node '+(selectedNode===n.id?"active":"")+' '+(n.taskId?"tdlc-linked-planner-node":"")+'" data-node="'+esc(n.id)+'" style="left:'+clamp(Number(n.x)||0,0,2200)+'px;top:'+clamp(Number(n.y)||0,0,1300)+'px" title="Click to edit; drag to move; arrow keys to nudge" aria-label="'+esc(n.title)+'"><strong>'+esc(n.title)+'</strong><small>'+esc(n.notes||"")+'</small>'+
  (n.taskId?'<small class="tdlc-planner-node-tag '+(!linked?"is-missing":linked.completed?"is-done":"")+'">↗ '+esc(linked?linked.title:"Missing linked task")+'</small>':"")+'</button>'
 }).join("")+'</div></div>'+
 '<p class="tdlx-status" id="tdlx-board-status">'+(connectFrom?"Choose a second node to create an arrow.":"Click a node to edit it. Drag a box to move it. Drag empty space to pan. Press arrow keys on a selected node for precise movement.")+'</p>'+
 ((newNode||selectedNode)?nodeForm(b):"")+
 '<div class="tdlx-card"><strong>Connections ('+edges.length+')</strong><div class="tdlx-edge-list">'+(edges.length?edges.map(e=>'<div class="tdlx-edge"><span>'+esc(nodeMap.get(e.from).title)+' → '+esc(nodeMap.get(e.to).title)+' ('+esc(e.label||"unlabeled")+')</span><span><button class="btn" data-edge-act="rename" data-edge="'+esc(e.id)+'">Label</button> <button class="btn" data-edge-act="delete" data-edge="'+esc(e.id)+'">Remove</button></span></div>').join(""):'<p class="tdlx-muted">No arrows yet. Click Connect nodes, then choose two boxes.</p>')+'</div></div>'+
 '<p class="tdlx-help">Changes are saved locally as you edit. Use More tools → Full backup to preserve this board outside the browser.</p>';
 bind(c);
}
function bind(c){
 const s=$("#tdlx-board-select",c);if(s)s.onchange=e=>{selectedBoard=e.target.value;selectedNode="";newNode=false;connectFrom="";X.refresh()};
 const f=$("#tdlx-node-form",c);
 if(f)f.onsubmit=e=>{e.preventDefault();const fd=new FormData(f),title=String(fd.get("title")||"").trim(),notes=String(fd.get("notes")||"").trim(),taskId=String(fd.get("taskId")||"");
  if(!title){alert("A node needs a title.");return}
  const b=board(),current=b.nodes.find(n=>n.id===selectedNode);
  let next;
  if(current&&!newNode){next={...b,nodes:b.nodes.map(n=>n.id===current.id?{...n,title,notes,taskId}:n),updatedAt:Date.now()}}
  else{const newOne={id:X.uid(),title,notes,taskId,x:120+Math.floor(Math.random()*200),y:130+Math.floor(Math.random()*180)};
   next={...b,nodes:b.nodes.concat(newOne),updatedAt:Date.now()};
   selectedNode=newOne.id;
  }
  if(saveBoard(next)){newNode=false;X.refresh()}else selectedNode=current?.id||"";
 };
 c.onclick=e=>{
  if(Date.now()<ignoreClickUntil)return;
  const edgeButton=e.target.closest("[data-edge-act]");
  if(edgeButton){const b=board(),edge=b.edges.find(x=>x.id===edgeButton.dataset.edge);if(!edge)return;
   if(edgeButton.dataset.edgeAct==="rename"){const label=promptTitle("Label this arrow (e.g. Yes, No, Requires)",edge.label||"");if(label!==null&&saveBoard({...b,edges:b.edges.map(x=>x.id===edge.id?{...x,label}:x)}))X.refresh()}
   else if(edgeButton.dataset.edgeAct==="delete"&&confirm("Remove this arrow? Nodes will remain.")){if(saveBoard({...b,edges:b.edges.filter(x=>x.id!==edge.id)}))X.refresh()}
   return;
  }
  const button=e.target.closest("[data-planner]");
  if(button){
   const action=button.dataset.planner;
   if(action==="createBoard")makeBoard();
   if(action==="viewTask"&&window.TDLConnections)window.TDLConnections.openTask(button.dataset.id);
   if(action==="renameBoard")renameBoard();
   if(action==="removeBoard")removeBoard();
   if(action==="addNode"){selectedNode="";newNode=true;connectFrom="";X.refresh()}
   if(action==="cancelNode"){selectedNode="";newNode=false;X.refresh()}
   if(action==="deleteNode")deleteNode();
   if(action==="connect"){connectFrom="choose";selectedNode="";newNode=false;X.refresh()}
   if(action==="cancelConnect"){connectFrom="";X.refresh()}
   if(action==="zoomIn"){zoom=clamp(zoom+0.15,.4,1.8);X.refresh()}
   if(action==="zoomOut"){zoom=clamp(zoom-0.15,.4,1.8);X.refresh()}
   if(action==="resetView"){zoom=1;panX=12;panY=12;X.refresh()}
   return;
  }
  const nodeButton=e.target.closest("[data-node]");
  if(nodeButton){
   const id=nodeButton.dataset.node,b=board();
   if(connectFrom){
    if(connectFrom==="choose"){connectFrom=id;X.refresh();return}
    if(connectFrom===id){alert("Choose a different node to connect.");return}
    const label=promptTitle("Arrow label (optional): Yes, No, Requires, etc.","");
    if(label===null)return;
    const edge={id:X.uid(),from:connectFrom,to:id,label};
    if(saveBoard({...b,edges:b.edges.concat(edge),updatedAt:Date.now()})){connectFrom="";X.refresh()}
    return;
   }
   newNode=false;selectedNode=id;X.refresh();
  }
 };
 const viewport=$("#tdlx-board-viewport",c);
 if(viewport)viewport.onpointerdown=e=>{
  if(e.button!==undefined&&e.button!==0)return;
  const nodeEl=e.target.closest("[data-node]");
  const b=board();if(!b)return;
  if(nodeEl){const n=b.nodes.find(x=>x.id===nodeEl.dataset.node);if(!n)return;
   drag={type:"node",id:n.id,startX:e.clientX,startY:e.clientY,x:n.x,y:n.y,moved:false,element:nodeEl};
  }else{
   drag={type:"pan",startX:e.clientX,startY:e.clientY,x:panX,y:panY,moved:false};
  }
  if(e.target.setPointerCapture){try{e.target.setPointerCapture(e.pointerId)}catch(_e){}}
 };
 c.onkeydown=e=>{
  const node=e.target.closest("[data-node]");if(!node||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
  const b=board(),id=node.dataset.node,n=b.nodes.find(x=>x.id===id);if(!n)return;
  e.preventDefault();const step=e.shiftKey?20:5;
  const dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0,dy=e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0;
  if(saveBoard({...b,nodes:b.nodes.map(x=>x.id===id?{...x,x:clamp(x.x+dx,0,2200),y:clamp(x.y+dy,0,1300)}:x)})){selectedNode=id;X.refresh();const again=c.querySelector('[data-node="'+id+'"]');if(again)again.focus()}
 };
}
window.addEventListener("pointermove",e=>{
 if(!drag)return;
 const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
 if(Math.abs(dx)>4||Math.abs(dy)>4)drag.moved=true;
 if(drag.type==="pan"){
  panX=drag.x+dx;panY=drag.y+dy;
  const world=document.querySelector("#tdlx-board-world");
  if(world)world.style.transform="translate("+panX+"px,"+panY+"px) scale("+zoom+")";
 }else{
  const x=clamp(Math.round(drag.x+dx/zoom),0,2200),y=clamp(Math.round(drag.y+dy/zoom),0,1300);
  if(drag.element){drag.element.style.left=x+"px";drag.element.style.top=y+"px"}
 }
});
window.addEventListener("pointerup",e=>{
 if(!drag)return;const d=drag;drag=null;
 if(!d.moved)return;
 ignoreClickUntil=Date.now()+180;
 if(d.type==="node"){
  const b=board();if(!b)return;
  const dx=e.clientX-d.startX,dy=e.clientY-d.startY;
  const x=clamp(Math.round(d.x+dx/zoom),0,2200),y=clamp(Math.round(d.y+dy/zoom),0,1300);
  if(saveBoard({...b,nodes:b.nodes.map(n=>n.id===d.id?{...n,x,y}:n),updatedAt:Date.now()}))X.refresh();
 }else X.refresh();
});
window.addEventListener("pointercancel",()=>{drag=null});
X.register("planner","Visual Planner",draw);
})();
