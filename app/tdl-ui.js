/* Consistent keyboard handling for existing custom modals and global search. */
(function(){
 'use strict';
 const actions={backdrop:'#close',settingsModal:'#settingsClose',quickModal:'#quickCancel','tdlx-overlay':'#tdlx-close',overdueCheckin:'#overdueLater',notificationModal:'#notificationNo'};
 const visible=el=>!!(el&&!el.hidden&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 function topModal(){return [...document.querySelectorAll('.backdrop,.focus-modal,.tdlx-overlay')].filter(visible).sort((a,b)=>(Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1);}
 function nativeOpen(){return !!document.querySelector('dialog[open]');}
 function syncModalLayer(){document.body.classList.toggle('tdl-modal-open',nativeOpen()||!!topModal());}
 const observer=new MutationObserver(syncModalLayer);
 for(const el of document.querySelectorAll('.backdrop,.focus-modal,.tdlx-overlay,dialog'))observer.observe(el,{attributes:true,attributeFilter:['class','hidden','open']});
 syncModalLayer();
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented)return;
  const modal=topModal();
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
   e.preventDefault();if(nativeOpen()||modal)return;
   if(window.TDLX)window.TDLX.navigate('home');const search=document.querySelector('#search');if(search)search.focus();return;
  }
  if(nativeOpen()||!modal)return;
  if(e.key==='Escape'){
   if(e.target.closest('[role="combobox"][aria-expanded="true"]'))return;
   const selector=actions[modal.id];const close=selector?document.querySelector(selector):null;
   if(close){e.preventDefault();e.stopImmediatePropagation();close.click();}return;
  }
  if(e.key==='Tab'){
   const fields=[...modal.querySelectorAll('button,input,select,textarea,a[href],summary,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&visible(el));
   if(!fields.length)return;
   const first=fields[0],last=fields.at(-1),current=document.activeElement;
   if(!modal.contains(current)||(!e.shiftKey&&current===last)||(e.shiftKey&&current===first)){
    e.preventDefault();(e.shiftKey?last:first).focus();
   }
  }
 },true);
})();
