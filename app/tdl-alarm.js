/* Shared timer alarm. Original synthesized chime; no audio download required. */
(function () {
 'use strict';
 const key='tdl.alarm.v1';
 let prefs={sound:true,volume:.75};
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'){prefs.sound=saved.sound!==false;if(Number.isFinite(saved.volume))prefs.volume=Math.max(.1,Math.min(1,saved.volume));}}catch(_){}
 let context=null,gain=null,buffer=null,source=null,sourceAt=0,plan=null,ringing=false,version=0,tag='',pageNotification=null,oldTitle='';
 const dialog=document.createElement('dialog');dialog.className='tdl-alarm-dialog';dialog.id='tdl-alarm-dialog';
 dialog.setAttribute('aria-labelledby','tdl-alarm-title');dialog.setAttribute('aria-describedby','tdl-alarm-detail');
 dialog.innerHTML='<div class="tdl-alarm-bell" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4M3 4 1 7m20-3 2 3"/></svg></div><p class="eyebrow">FOCUS TIMER</p><h2 id="tdl-alarm-title">Time’s up.</h2><p id="tdl-alarm-detail"></p><div class="tdl-alarm-zero" aria-hidden="true">00:00</div><p id="tdl-alarm-audio-status" role="status"></p><button type="button" class="btn primary" id="tdl-alarm-stop">Stop alarm</button>';
 document.body.appendChild(dialog);
 const detail=dialog.querySelector('#tdl-alarm-detail'),audioStatus=dialog.querySelector('#tdl-alarm-audio-status'),stopButton=dialog.querySelector('#tdl-alarm-stop');
 const soundInput=document.querySelector('#alarmSoundEnabled'),volumeInput=document.querySelector('#alarmVolume'),volumeValue=document.querySelector('#alarmVolumeValue'),preview=document.querySelector('#alarmPreview'),hint=document.querySelector('#alarmHint');
 function hintText(message){if(hint)hint.textContent=message;}
 function audioMessage(){if(!prefs.sound)return 'Sound is off. You can turn it on in Settings.';return context&&context.state==='running'?'Alarm sounding. Check your device volume if you cannot hear it.':'Sound is unavailable or blocked. The visual alert remains active.';}
 function makeBuffer(){
  const rate=context.sampleRate,b=context.createBuffer(1,Math.round(rate*2.4),rate),out=b.getChannelData(0);
  // Two rising three-note phrases, with smooth envelopes and space between repeats.
  const notes=[[0,659.25],[.22,830.61],[.44,987.77],[.9,659.25],[1.12,830.61],[1.34,987.77]];
  for(const [start,hz] of notes){const length=.19;for(let i=0;i<rate*length;i++){const t=i/rate,index=Math.round(start*rate)+i;if(index>=out.length)break;const envelope=Math.min(1,t/.012)*Math.pow(1-t/length,1.6);out[index]+=.32*envelope*(Math.sin(2*Math.PI*hz*t)+.22*Math.sin(4*Math.PI*hz*t));}}
  return b;
 }
 function ensureAudio(){
  try{
   if(!context||context.state==='closed'){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');
    context=new Audio();gain=context.createGain();gain.gain.value=prefs.volume;gain.connect(context.destination);buffer=makeBuffer();
    context.addEventListener('statechange',()=>{if(ringing)audioStatus.textContent=audioMessage();});
   }
   // Invoked synchronously by timer Start/Resume or Preview to unlock audio.
   return context.state==='running'?Promise.resolve():context.resume();
  }catch(_){return Promise.reject(Error('Alarm sound unavailable'));}
 }
 function cancelSource(){if(source){try{source.stop();}catch(_){}try{source.disconnect();}catch(_){}source=null;}}
 function scheduleAudio(token){
  if(!prefs.sound)return;
  ensureAudio().then(()=>{
   if(token!==version||!plan||!prefs.sound)return;
   cancelSource();gain.gain.value=prefs.volume;
   source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);
   sourceAt=context.currentTime+Math.max(0,(plan.deadline-Date.now())/1000);source.start(sourceAt);
   hintText('Alarm sound ready. Keep TDL open and your device volume up.');
   if(ringing)audioStatus.textContent=audioMessage();
  }).catch(()=>{if(token!==version)return;hintText('Sound is unavailable or blocked. Timer completion will still show an alert.');if(ringing)audioStatus.textContent=audioMessage();});
 }
 function closeSystemNotification(notificationTag){
  if(!notificationTag||!navigator.serviceWorker||!navigator.serviceWorker.getRegistration)return;
  navigator.serviceWorker.getRegistration('./').then(reg=>reg&&reg.getNotifications?reg.getNotifications({tag:notificationTag}):[]).then(list=>(list||[]).forEach(n=>n.close())).catch(()=>{});
 }
 function notify(token){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const notificationTag='tdl-alarm-'+Date.now()+'-'+token;tag=notificationTag;
  const options={body:plan.title+' — open TDL to stop the alarm.',tag:notificationTag,icon:'./icon.svg',requireInteraction:true};
  function fallback(){if(token!==version||!ringing)return;try{pageNotification=new Notification('Time’s up — TDL',options);pageNotification.onclick=()=>{window.focus();pageNotification&&pageNotification.close();};}catch(_){}}
  if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration){
   navigator.serviceWorker.getRegistration('./').then(reg=>{
    if(token!==version||!ringing)return;
    if(!reg||!reg.showNotification){fallback();return;}
    return reg.showNotification('Time’s up — TDL',options).then(()=>{if(token!==version||!ringing)closeSystemNotification(notificationTag);}).catch(fallback);
   }).catch(fallback);
  }else fallback();
 }
 function stop(){
  ++version;cancelSource();plan=null;ringing=false;
  if(preview){preview.disabled=false;preview.textContent="Preview alarm";}
  if(dialog.open)dialog.close();
  if(oldTitle){document.title=oldTitle;oldTitle='';}
  if(pageNotification){try{pageNotification.close();}catch(_){}pageNotification=null;}
  closeSystemNotification(tag);tag='';
  if(navigator.vibrate)try{navigator.vibrate(0);}catch(_){}
 }
 function arm(owner,ms,title){
  stop();plan={owner,deadline:Date.now()+Math.max(0,ms),title:title||'Focus timer'};
  if(preview&&owner!=='preview'){preview.disabled=true;preview.textContent='Pause timer to preview';}
  if(prefs.sound)scheduleAudio(version);else hintText('Alarm sound is off. A visual alert will appear when the timer finishes.');
 }
 function disarm(owner){if(plan&&plan.owner===owner)stop();}
 function finish(owner,title,isPreview=false){
  if(ringing&&plan&&plan.owner===owner)return;
  if(!plan||plan.owner!==owner){stop();plan={owner,deadline:Date.now(),title:title||'Focus timer'};}
  plan.deadline=Date.now();plan.title=title||plan.title;ringing=true;
  // If the audio clock was suspended, re-schedule at zero rather than waiting
  // for the old future audio time after the wall-clock timer has expired.
  if(prefs.sound&&(!source||!context||context.state!=='running'||context.currentTime<sourceAt)){cancelSource();scheduleAudio(version);}
  dialog.querySelector('#tdl-alarm-title').textContent=isPreview?'Alarm preview':'Time’s up.';
  detail.textContent=isPreview?'This is the sound your timer will play.':plan.title+' is complete.';
  stopButton.textContent=isPreview?'Stop preview':'Stop alarm';audioStatus.textContent=audioMessage();
  if(!dialog.open)dialog.showModal();stopButton.focus();
  if(!oldTitle)oldTitle=document.title;document.title=isPreview?'Alarm preview — TDL':'⏰ Time’s up — TDL';
  if(!isPreview){notify(version);if(navigator.vibrate)try{navigator.vibrate([300,150,300]);}catch(_){}}
 }
 stopButton.addEventListener('click',stop);
 dialog.addEventListener('cancel',e=>{e.preventDefault();stop();});
 function syncPrefs(){if(soundInput)soundInput.checked=prefs.sound;if(volumeInput)volumeInput.value=String(Math.round(prefs.volume*100));if(volumeValue)volumeValue.textContent=Math.round(prefs.volume*100)+'%';}
 function persist(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch(_){}syncPrefs();}
 if(soundInput)soundInput.addEventListener('change',()=>{prefs.sound=soundInput.checked;persist();cancelSource();if(prefs.sound&&plan)scheduleAudio(version);if(ringing)audioStatus.textContent=audioMessage();hintText(prefs.sound?'Alarm sound on. Keep TDL open and your device volume up.':'Alarm sound off. Timer completion will still show an alert.');});
 if(volumeInput)volumeInput.addEventListener('input',()=>{prefs.volume=Math.max(.1,Math.min(1,Number(volumeInput.value)/100));if(gain)gain.gain.value=prefs.volume;persist();});
 if(preview)preview.addEventListener('click',()=>{arm('preview',0,'Alarm preview');finish('preview','Alarm preview',true);});
 window.addEventListener('pagehide',stop);
 syncPrefs();hintText(prefs.sound?'Alarm sound on. Keep TDL open and your device volume up.':'Alarm sound off. A visual alert will appear when the timer finishes.');
 window.TDLAlarm={arm,disarm,finish,stop};
})();
