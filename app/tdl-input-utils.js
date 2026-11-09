/* Pure input rules shared by the UI and deterministic tests. */
(function(root){
 'use strict';
 const MAX_SECONDS=24*60*60;
 function durationParts(minutes,seconds){
  if(!/^\d{1,4}$/.test(String(minutes))||!/^\d{1,2}$/.test(String(seconds)))return null;
  const m=Number(minutes),s=Number(seconds),total=m*60+s;
  return s<=59&&total>=1&&total<=MAX_SECONDS?total*1000:null;
 }
 function parseDuration(raw){
  const match=String(raw).trim().match(/^(\d{1,4})(?::([0-5]\d))?$/);
  return match?durationParts(match[1],match[2]||'0'):null;
 }
 function nextEndTime(value,now){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)))return null;
  const [hours,minutes]=value.split(':').map(Number),date=new Date(now);
  date.setHours(hours,minutes,0,0);
  if(date.getTime()<=now){date.setDate(date.getDate()+1);date.setHours(hours,minutes,0,0);}
  return date.getTime();
 }
 const defaults=['Homework','Personal','Project','Chore','Event'];
 function categoryOptions(tasks,usage){
  const options=new Map();
  function add(name,count,source){
   if(typeof name!=='string')return;name=name.trim();if(!name||name.length>50)return;
   const key=name.toLocaleLowerCase(),old=options.get(key)||{name,count:0,history:0};
   if(source==='task')old.count++;
   else if(source==='history')old.history=Math.max(old.history,Math.max(0,Math.min(1000000,Number(count)||0)));
   options.set(key,old);
  }
  (Array.isArray(tasks)?tasks:[]).forEach(t=>{if(t)add(t.category,1,'task')});
  (Array.isArray(usage)?usage:[]).forEach(item=>{if(item)add(item.name,item.uses,'history')});
  defaults.forEach(name=>add(name,0,'default'));
  return [...options.values()].map(o=>({name:o.name,uses:Math.max(o.count,o.history)})).sort((a,b)=>{
   const rank=name=>{const i=defaults.findIndex(n=>n.toLowerCase()===name.toLowerCase());return i<0?defaults.length:i};
   return b.uses-a.uses||rank(a.name)-rank(b.name)||a.name.localeCompare(b.name);
  });
 }
 root.TDLInputUtils={durationParts,parseDuration,nextEndTime,categoryOptions};
})(typeof window==='object'?window:globalThis);
