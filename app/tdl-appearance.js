/* Apply before first paint; appearance owns only its own preference key. */
(function () {
 "use strict";
 var key = "tdl.appearance.v1";
 var themes = [
  {id:"paper",name:"Paper",note:"Warm & minimal",bg:"#f6f5f1",rail:"#edeee7",surface:"#ffffff",accent:"#436a50",text:"#292d2a"},
  {id:"graphite",name:"Graphite",note:"Quiet after hours",bg:"#161819",rail:"#1c1f20",surface:"#2a2e2e",accent:"#b7d7a5",text:"#eeeee9"},
  {id:"forest",name:"Forest",note:"A fresh perspective",bg:"#eef2ed",rail:"#dfe9dc",surface:"#fbfdf9",accent:"#2c6b52",text:"#203b31"},
  {id:"dusk",name:"Dusk",note:"A softer dark mode",bg:"#211e2a",rail:"#282231",surface:"#373141",accent:"#cbb4ee",text:"#f2eaf6"}
 ];
 function valid(id) { return themes.some(function(t) { return t.id === id; }); }
 var selected = "paper";
 try { var saved = localStorage.getItem(key); if (valid(saved)) selected = saved; } catch (_) {}
 function apply(id) {
  selected = valid(id) ? id : "paper";
  document.documentElement.dataset.theme = selected;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themes.find(function(t) { return t.id === selected; }).bg;
 }
 apply(selected);
 window.addEventListener("storage",function(e) { if(e.key === key) { apply(e.newValue); sync(); } });
 var dialog;
 function sync() {
  if (!dialog) return;
  dialog.querySelectorAll("[data-theme-choice]").forEach(function(b) { b.setAttribute("aria-pressed",String(b.dataset.themeChoice === selected)); });
 }
 document.addEventListener("DOMContentLoaded",function() {
  dialog = document.createElement("dialog");
  dialog.className = "appearance-dialog";
  dialog.setAttribute("aria-labelledby","appearance-title");
  dialog.innerHTML = '<div class="appearance-head"><div><div class="eyebrow">YOUR SPACE, YOUR PACE</div><h2 id="appearance-title">Make yourself at home.</h2><p>A different atmosphere. The same place for everything.</p></div><form method="dialog"><button class="btn" aria-label="Close appearance">✕</button></form></div><div class="theme-grid" role="group" aria-label="Workspace theme"></div><p class="appearance-footer" role="status">Your theme saves automatically on this device.</p>';
  var grid = dialog.querySelector(".theme-grid");
  themes.forEach(function(t) {
   var b = document.createElement("button");
   b.type = "button"; b.className = "theme-choice"; b.dataset.themeChoice = t.id;
   b.setAttribute("aria-label",t.name + " — " + t.note);
   b.style.cssText = "--preview-bg:"+t.bg+";--preview-rail:"+t.rail+";--preview-surface:"+t.surface+";--preview-accent:"+t.accent+";--preview-text:"+t.text;
   b.innerHTML = '<span class="theme-preview" aria-hidden="true"><span class="theme-preview-rail"><i></i><i></i><i></i><i></i></span><span class="theme-preview-main"><span class="theme-preview-title" style="display:block"></span><span class="theme-preview-stats"><i></i><i></i><i></i></span><span class="theme-preview-task" style="display:block"></span><span class="theme-preview-task" style="display:block"></span></span></span><span class="theme-choice-label"><span>'+t.name+'<small> · '+t.note+'</small></span><span class="theme-check" aria-hidden="true">✓</span></span>';
   b.addEventListener("click",function() {
    apply(t.id); sync();
    var status = dialog.querySelector(".appearance-footer");
    try { localStorage.setItem(key,t.id); status.textContent = t.name + " selected. Saved on this device."; }
    catch (_) { status.textContent = t.name + " selected for this visit. Browser storage is unavailable."; }
   });
   grid.appendChild(b);
  });
  document.body.appendChild(dialog); sync();
  document.querySelectorAll(".appearance-open").forEach(function(b) { b.addEventListener("click",function() { dialog.showModal(); dialog.querySelector('[data-theme-choice="'+selected+'"]').focus(); }); });
  dialog.addEventListener("click",function(e) { if(e.target === dialog) { var r=dialog.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close(); } });
 });
})();
