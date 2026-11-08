/* Kinetic presentation only. Task data and application commands stay in TDL. */
(function () {
 'use strict';
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fine=matchMedia('(hover: hover) and (pointer: fine)');
 const motionKey='tdl.motion.v1';
 let enabled=true;
 try { enabled=localStorage.getItem(motionKey)!=='off'; } catch (_) {}
 root.dataset.motion=enabled?'on':'off';
 const cursor=document.createElement('div');cursor.className='kinetic-cursor';cursor.setAttribute('aria-hidden','true');
 const core=document.createElement('div');core.className='kinetic-cursor-core';cursor.appendChild(core);document.body.appendChild(cursor);
 const jump=document.querySelector('.kinetic-jump');
 if(jump)jump.addEventListener('click',()=>{document.querySelector('.layout').scrollIntoView({behavior:canAnimate()?'smooth':'auto',block:'start'});document.querySelector('#search').focus({preventScroll:true});});
 const settings=document.querySelector('#settingsModal .settings-group');
 if(settings){const label=document.createElement('label');label.className='kinetic-motion-toggle';const input=document.createElement('input');input.type='checkbox';input.id='kinetic-motion';input.checked=enabled;label.append(input,document.createTextNode('Interactive motion & cursor bubble'));settings.appendChild(label);input.addEventListener('change',()=>{enabled=input.checked;root.dataset.motion=enabled?'on':'off';try{localStorage.setItem(motionKey,enabled?'on':'off');}catch(_){}hideCursor();requestFrame();});}
 function canAnimate(){return enabled&&!reduced.matches&&!document.hidden;}
 let tx=0,ty=0,x=0,y=0,vx=0,vy=0,visible=false,raf=0,last=0,hoverTarget=null;
 let artPointer=[0,0],artTarget=[0,0],artVisible=true,drawChrome=null,staticDrawn=false;
 function requestFrame(){if(!raf)raf=requestAnimationFrame(frame);}
 function hideCursor(){visible=false;cursor.style.opacity='0';cursor.classList.remove('is-down');}
 function labelFor(el){
  if(el.dataset.cursor)return el.dataset.cursor;
  if(el.id==='add')return 'CREATE ↗';
  if(el.id==='timerStart')return el.textContent==='Pause'?'PAUSE':'FOCUS';
  if(el.matches('.appearance-open,[data-theme-choice]'))return 'REMIX';
  if(el.matches('[data-action="toggle"]'))return 'DONE ✓';
  if(el.matches('[data-action="delete"]'))return 'DELETE';
  if(el.matches('[data-action="edit"]'))return 'EDIT';
  if(el.matches('[data-tdlx-open],[data-tdlx-route]'))return 'OPEN ↗';
  return 'LET’S GO';
 }
 document.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||!fine.matches||!canAnimate())return;
  tx=e.clientX;ty=e.clientY;
  if(!visible){x=tx;y=ty;vx=vy=0;visible=true;cursor.style.opacity='1';}
  const el=e.target instanceof Element?e.target:null;
  const typing=!!(el&&el.closest('input:not([type="checkbox"]),textarea,select,dialog'));
  cursor.classList.toggle('is-typing',typing);
  const target=el&&!typing?el.closest('button:not(:disabled),a,summary,input[type="checkbox"]'):null;
  if(target!==hoverTarget){hoverTarget=target;cursor.classList.toggle('is-hover',!!target);core.textContent=target?labelFor(target):'';}
  artTarget=[(tx/innerWidth-.5)*.8,(ty/innerHeight-.5)*.6];requestFrame();
 },{passive:true});
 document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||!fine.matches||!canAnimate())return;cursor.classList.add('is-down');const ripple=document.createElement('i');ripple.className='kinetic-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=e.clientX+'px';ripple.style.top=e.clientY+'px';document.body.appendChild(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),700);});
 document.addEventListener('pointerup',()=>cursor.classList.remove('is-down'));
 document.documentElement.addEventListener('pointerleave',hideCursor);
 window.addEventListener('blur',hideCursor);
 document.addEventListener('keydown',e=>{if(e.key==='Tab')hideCursor();});
 document.addEventListener('visibilitychange',()=>{hideCursor();if(document.hidden){cancelAnimationFrame(raf);raf=0;}else requestFrame();});
 reduced.addEventListener('change',()=>{hideCursor();staticDrawn=false;requestFrame();});
 fine.addEventListener('change',hideCursor);
 window.addEventListener('storage',e=>{if(e.key===motionKey){enabled=e.newValue!=='off';root.dataset.motion=enabled?'on':'off';const input=document.querySelector('#kinetic-motion');if(input)input.checked=enabled;hideCursor();requestFrame();}});
 const timerCard=document.querySelector('.timer-card'),timerDisplay=document.querySelector('#timerDisplay');
 if(timerCard&&timerDisplay)new MutationObserver(()=>timerCard.classList.toggle('is-running',timerDisplay.disabled)).observe(timerDisplay,{attributes:true,attributeFilter:['disabled']});
 function frame(now){
  raf=0;const dt=Math.min((now-(last||now-16.67))/16.67,2);last=now;
  if(canAnimate()&&visible){
   vx=(vx+(tx-x)*.15*dt)*Math.pow(.66,dt);vy=(vy+(ty-y)*.15*dt)*Math.pow(.66,dt);x+=vx*dt;y+=vy*dt;
   const stretch=Math.min(Math.hypot(vx,vy)*.008,.22),angle=Math.atan2(vy,vx)*180/Math.PI;
   cursor.style.transform=`translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${1+stretch},${1-stretch}) rotate(${-angle}deg)`;
  }
  if(drawChrome&&artVisible&&(canAnimate()||!staticDrawn)){
   artPointer=artPointer.map((v,i)=>v+(artTarget[i]-v)*.05);
   drawChrome(canAnimate()?now*.00035:1.2,artPointer);staticDrawn=true;
  }
  if(canAnimate()&&((drawChrome&&artVisible)||(visible&&(Math.abs(tx-x)+Math.abs(ty-y)+Math.abs(vx)+Math.abs(vy)>.15))))requestFrame();
 }
 const canvas=document.querySelector('#kinetic-chrome');
 if(canvas){
  try{
   const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:false});
   if(gl){
    const vert='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const frag=`precision mediump float;
     uniform vec2 resolution;uniform float time;uniform vec2 pointer;
     mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
     float scene(vec3 p){p.xz=rot(time*.28+pointer.x)*p.xz;p.yz=rot(pointer.y)*p.yz;
      float wave=sin(p.x*5.+time)*sin(p.y*4.-time*.7)*sin(p.z*4.+time*.3);
      return length(p)-.88-wave*.075;}
     vec3 env(vec3 r){
      float a=atan(r.z,r.x),b=asin(r.y);
      float bands=smoothstep(.05,.19,sin(a*2.+b*5.+.5));
      float strip=pow(max(0.,cos(a*1.4-b*3.)),18.);
      vec3 col=mix(vec3(.035,.04,.043),vec3(.83,.85,.82),bands);
      col+=strip*.85;
      col+=vec3(.08,.09,.06)*pow(max(r.y,0.),2.);
      return col;
     }
     void main(){
      vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
      vec3 ro=vec3(0.,0.,3.6),rd=normalize(vec3(uv, -3.));float d=0.;vec3 p;
      for(int i=0;i<48;i++){p=ro+rd*d;float h=scene(p);if(h<.002||d>6.)break;d+=h*.82;}
      if(d>6.){gl_FragColor=vec4(0.);return;}
      vec2 e=vec2(.003,0.);vec3 n=normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));
      vec3 r=reflect(rd,n);vec3 col=env(r);float fres=pow(1.-max(dot(n,-rd),0.),3.);
      col=mix(col,vec3(.9,.93,.9),fres*.5);
      col+=pow(max(dot(n,normalize(vec3(-.6,.9,1.))),0.),60.)*.65;
      gl_FragColor=vec4(pow(col,vec3(.9)),1.);
     }`;
    function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Shader unavailable');}return s;}
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const res=gl.getUniformLocation(program,'resolution'),t=gl.getUniformLocation(program,'time'),ptr=gl.getUniformLocation(program,'pointer');
    drawChrome=(time,p)=>{const w=Math.min(560,Math.round(canvas.clientWidth)),h=Math.min(360,Math.round(canvas.clientHeight));if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}gl.uniform2f(res,w,h);gl.uniform1f(t,time);gl.uniform2f(ptr,p[0],p[1]);gl.drawArrays(gl.TRIANGLES,0,6);canvas.classList.add('is-ready');canvas.parentElement.classList.add('has-webgl');};
    new ResizeObserver(()=>{staticDrawn=false;requestFrame();}).observe(canvas);
    new IntersectionObserver(entries=>{artVisible=entries[0].isIntersecting;if(artVisible)requestFrame();},{threshold:0}).observe(canvas);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();drawChrome=null;canvas.classList.remove('is-ready');canvas.parentElement.classList.remove('has-webgl');});
   }
  }catch(_){/* The CSS chrome sculpture remains available without WebGL. */}
 }
 requestFrame();
})();
