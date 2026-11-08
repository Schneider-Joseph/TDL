/* One navigation tree: fixed beside desktop content, in a left drawer on phones. */
(function () {
 'use strict';
 const nav=document.querySelector('.tdlx-header');
 const header=document.querySelector('.wrap>header');
 const actions=header&&header.querySelector('.header-actions');
 if(!nav||!actions)return;
 const narrow=matchMedia('(max-width:900px)');
 const drawer=document.createElement('dialog');
 drawer.id='tdl-sidebar-drawer';drawer.className='tdl-sidebar-drawer';
 drawer.setAttribute('aria-labelledby','tdl-sidebar-title');
 drawer.innerHTML='<div class="tdl-sidebar-drawer-head"><h2 id="tdl-sidebar-title">Workspace</h2><button class="btn" type="button" aria-label="Close navigation">✕</button></div>';
 document.body.appendChild(drawer);
 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='btn tdl-sidebar-toggle';toggle.hidden=true;
 toggle.setAttribute('aria-label','Open workspace navigation');toggle.setAttribute('aria-haspopup','dialog');
 toggle.setAttribute('aria-controls',drawer.id);toggle.setAttribute('aria-expanded','false');
 toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg> Menu';
 actions.prepend(toggle);
 function close(){if(drawer.open)drawer.close();toggle.setAttribute('aria-expanded','false');}
 toggle.addEventListener('click',()=>{drawer.showModal();toggle.setAttribute('aria-expanded','true');const selected=nav.querySelector('[aria-current="page"]')||nav.querySelector('button');if(selected)selected.focus();});
 drawer.querySelector('button').addEventListener('click',close);
 drawer.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
 drawer.addEventListener('click',e=>{if(e.target!==drawer)return;const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 // Close before existing commands run, so their page headings/dialogs can take focus.
 nav.addEventListener('click',e=>{if(narrow.matches&&e.target.closest('button:not(:disabled)'))close();},true);
 function layout(){
  const wasOpen=drawer.open;
  if(narrow.matches){drawer.appendChild(nav);toggle.hidden=false;}
  else{close();header.insertAdjacentElement('afterend',nav);toggle.hidden=true;if(wasOpen){const selected=nav.querySelector('[aria-current="page"]');if(selected)selected.focus();}}
 }
 narrow.addEventListener('change',layout);layout();
})();
