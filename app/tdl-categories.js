/* Editable category combobox. Task records remain the source of task categories. */
(function(){
 'use strict';
 const field=document.querySelector('#category'),list=document.querySelector('#categoryOptions'),toggle=document.querySelector('#categoryToggle'),form=document.querySelector('#form'),U=window.TDLInputUtils;
 if(!field||!list||!toggle||!U)return;
 const container=field.parentElement,key='tdl.categoryUsage.v1';
 let usage=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))usage=saved.filter(x=>x&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=50&&Number.isFinite(x.uses)&&x.uses>0).slice(0,100);}catch(_){}
 let visible=[],active=-1;
 function close(){list.hidden=true;field.setAttribute('aria-expanded','false');field.removeAttribute('aria-activedescendant');active=-1;}
 function highlight(index){
  active=index;[...list.children].forEach((option,i)=>option.setAttribute('aria-selected',String(i===active)));
  if(active>=0){field.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}else field.removeAttribute('aria-activedescendant');
 }
 function show(filter=''){
  const tasks=window.TDLAppBridge?window.TDLAppBridge.getTasks():[];
  visible=U.categoryOptions(tasks,usage).filter(x=>x.name.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())).slice(0,50);
  list.replaceChildren();active=-1;
  visible.forEach((item,index)=>{
   const option=document.createElement('li');option.id='category-option-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
   const name=document.createElement('span');name.textContent=item.name;option.appendChild(name);
   if(item.uses>0){const hint=document.createElement('small');hint.textContent='Used '+item.uses+'×';option.appendChild(hint);}
   option.addEventListener('pointerdown',e=>e.preventDefault());option.addEventListener('click',()=>choose(index));list.appendChild(option);
  });
  if(!visible.length){const empty=document.createElement('li');empty.className='category-no-match';empty.textContent='New category — save the task to remember it.';empty.setAttribute('role','presentation');list.appendChild(empty);}
  list.hidden=false;field.setAttribute('aria-expanded','true');field.removeAttribute('aria-activedescendant');
 }
 function choose(index){if(!visible[index])return;field.value=visible[index].name;close();field.focus();close();}
 field.addEventListener('focus',()=>show());field.addEventListener('input',()=>show(field.value));
 toggle.addEventListener('click',()=>{const opening=list.hidden;field.focus();if(opening)show();else close();});
 field.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if(list.hidden)show();if(!visible.length)return;
   const next=active<0?(e.key==='ArrowDown'?0:visible.length-1):(active+(e.key==='ArrowDown'?1:-1)+visible.length)%visible.length;highlight(next);
  }else if(e.key==='Enter'&&!list.hidden&&active>=0){e.preventDefault();choose(active);}
  else if(e.key==='Escape'&&!list.hidden){e.preventDefault();e.stopPropagation();close();}
  else if(e.key==='Tab')close();
 });
 document.addEventListener('pointerdown',e=>{if(!container.contains(e.target))close();});
 container.addEventListener('focusout',()=>{setTimeout(()=>{if(!container.contains(document.activeElement))close();},0);});
 form.addEventListener('reset',close);
 window.TDLCategories={record(name){
  name=String(name||'').trim();if(!name||name.length>50)return;
  const existing=usage.find(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase());
  const tasks=window.TDLAppBridge?window.TDLAppBridge.getTasks():[];
  const savedCount=tasks.filter(t=>String(t.category||'').trim().toLocaleLowerCase()===name.toLocaleLowerCase()).length;
  if(existing)existing.uses=Math.min(1000000,Math.max(existing.uses+1,savedCount));else usage.push({name,uses:Math.max(1,savedCount)});
  usage.sort((a,b)=>b.uses-a.uses);usage=usage.slice(0,100);
  try{localStorage.setItem(key,JSON.stringify(usage));}catch(_){}
  close();
 }};
})();
