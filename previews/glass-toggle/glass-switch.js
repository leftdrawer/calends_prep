/* Preview-only WebGL glass toggle.
   Same public structure as the reference: one fragment shader, rounded-square
   glass, chromatic bevel, orbiting light, pixel moon/sun swarm.
   This is not a copy of that shader file. */
(function(global){
  'use strict';
  const VERT='attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  const FRAG=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_page;
uniform vec3 u_ink;
float box(vec2 p, vec2 b, float r){
  vec2 q=abs(p)-b+r;
  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;
}
float moon(vec2 c){
  float d=length(c);
  float bite=length(c-vec2(1.15,-0.35));
  return step(d,2.35)*step(1.85,bite);
}
float sun(vec2 c){
  float d=length(c);
  float disc=step(d,1.15);
  float ray=step(1.7,d)*step(d,2.45)*step(abs(sin(atan(c.y,c.x)*4.0)),0.42);
  return max(disc,ray);
}
void main(){
  vec2 frag=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);
  vec2 p=(frag/u_res-0.5)*vec2(300.0,132.0);
  float phase=clamp(u_t,-0.04,1.04);
  float shown=clamp(phase,0.0,1.0);
  float track=box(p,vec2(118.0,32.0),32.0);
  float slide=mix(-82.0,82.0,phase);
  vec2 q=p-vec2(slide,0.0);
  float lens=box(q,vec2(30.0),12.0);
  float ang=mix(1.5708,4.7124,shown);
  vec2 lit=vec2(cos(ang),sin(ang));
  vec3 glow=mix(vec3(0.45,0.74,1.0),vec3(1.0,0.58,0.22),shown);
  vec3 cool=vec3(0.62,0.78,1.0);
  vec4 acc=vec4(0.0);
  float spill=exp(-max(length(q)-18.0,0.0)/26.0);
  float toward=smoothstep(-0.15,0.85,dot(normalize(q+0.001),lit));
  float spillA=spill*(0.22+0.62*toward)*(1.0-smoothstep(-1.0,8.0,lens));
  acc+=vec4(glow*spillA,spillA);
  float trackA=smoothstep(1.4,-0.6,track)*0.62;
  vec3 trackCol=mix(u_page,vec3(1.0),0.04);
  trackCol+=glow*exp(-abs(p.x-slide)/64.0)*0.55;
  trackCol=mix(trackCol,glow,exp(-abs(track)*1.4)*0.35);
  vec4 trackPx=vec4(trackCol*trackA,trackA);
  acc=trackPx+acc*(1.0-trackPx.a);
  float glassIn=smoothstep(1.0,-0.2,lens);
  float frostA=glassIn*0.22;
  vec3 frost=mix(u_page,glow,0.16);
  float facing=atan(q.y,q.x);
  float delta=abs(atan(sin(facing-ang),cos(facing-ang)));
  float strip=exp(-abs(length(q)-27.0)*0.42)*smoothstep(0.85,0.05,delta);
  float rimR=exp(-abs(lens-1.6)*0.85);
  float rimG=exp(-abs(lens)*0.95);
  float rimB=exp(-abs(lens+1.6)*0.85);
  vec3 fringe=vec3(rimR,rimG*0.85,rimB)*mix(cool,glow,0.65);
  float rimA=max(rimR,max(rimG,rimB))*smoothstep(4.0,0.2,abs(lens));
  vec3 glassCol=frost+glow*strip*1.15+fringe;
  float spec=pow(max(0.0,1.0-length((q+vec2(10.0,14.0))/34.0)),6.0);
  glassCol+=vec3(1.0)*spec*0.55;
  float gA=max(frostA,max(strip*0.92,rimA*0.8));
  vec4 glassPx=vec4(glassCol*gA,gA);
  acc=glassPx+acc*(1.0-glassPx.a);
  float pix=0.0;
  for(int i=0;i<49;i++){
    float fi=float(i);
    vec2 cell=vec2(mod(fi,7.0),floor(fi/7.0))-3.0;
    float m=moon(cell);
    float s=sun(cell);
    if(max(m,s)>0.5){
      float a=atan(cell.y+0.001,cell.x+0.001);
      float delay=fract(a/6.28318+0.5)*0.34;
      float lt=clamp((shown-delay)/0.66,0.0,1.0);
      float spring=lt+sin(lt*3.14159)*0.22*(1.0-lt);
      float arc=sin(spring*3.14159);
      vec2 from=cell;
      vec2 to=cell;
      if(m>0.5 && s<0.5) to=vec2(cos(a),sin(a))*1.05;
      if(s>0.5 && m<0.5) from=vec2(cos(a),sin(a))*2.05+vec2(0.7,-0.2);
      vec2 pos=mix(from,to,spring)+vec2(-sin(a),cos(a))*arc*0.85;
      vec2 world=q-pos*4.6;
      float dotm=step(abs(world.x),1.55)*step(abs(world.y),1.55);
      float on=max(m*(1.0-spring),s*spring);
      if(m>0.5 && s>0.5) on=1.0;
      pix=max(pix,dotm*on);
    }
  }
  if(pix>0.4 && lens<2.0){
    vec3 ink=mix(vec3(0.90,0.95,1.0),u_ink,shown);
    acc=vec4(ink,1.0);
  }
  gl_FragColor=acc;
}
`;

  function compile(gl,type,src){
    const shader=gl.createShader(type);
    gl.shaderSource(shader,src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      const log=gl.getShaderInfoLog(shader)||'shader';
      gl.deleteShader(shader);
      throw new Error(log);
    }
    return shader;
  }

  function create(mount,options={}){
    const interactive=options.interactive!==false;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const button=document.createElement(interactive?'button':'div');
    button.className='glass-switch';
    if(interactive) button.type='button';
    else button.setAttribute('role','img');
    const canvas=document.createElement('canvas');
    canvas.width=600; canvas.height=264; canvas.setAttribute('aria-hidden','true');
    button.appendChild(canvas);
    mount.replaceChildren(button);
    button.dataset.implementation='webgl-glass';
    let gpu=null;
    try{
      const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
      if(!gl) throw new Error('no webgl');
      const program=gl.createProgram();
      const vs=compile(gl,gl.VERTEX_SHADER,VERT);
      const fs=compile(gl,gl.FRAGMENT_SHADER,FRAG);
      gl.attachShader(program,vs); gl.attachShader(program,fs);
      gl.bindAttribLocation(program,0,'a');
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program)||'link');
      const buf=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      gl.useProgram(program);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
      gl.disable(gl.BLEND);
      gpu={gl,res:gl.getUniformLocation(program,'u_res'),t:gl.getUniformLocation(program,'u_t'),page:gl.getUniformLocation(program,'u_page'),ink:gl.getUniformLocation(program,'u_ink')};
    }catch(err){
      button.dataset.shader='fallback';
      canvas.dataset.shaderError=String(err&&err.message||err);
    }
    if(gpu) button.dataset.shader='webgl';

    let position=options.initial==='dark'?0:1, target=position, velocity=0, frameId=0, lastTime=0;
    let pointer=null, dragging=false, startX=0, startPhase=position, ignoreClick=false, destroyed=false;
    let committed=position>=0.5?'light':'dark';
    const cleanups=[];

    function pageColor(){
      const raw=getComputedStyle(document.documentElement).getPropertyValue('--page').trim();
      const hex=/^#([0-9a-fA-F]{6})$/.exec(raw);
      if(!hex) return [0.86,0.89,0.94];
      return [1,3,5].map(i=>parseInt(hex[1].slice(i,i+2),16)/255);
    }
    function draw(){
      if(!gpu||!button.getClientRects().length) return;
      const rect=canvas.getBoundingClientRect();
      const dpr=Math.min(2,window.devicePixelRatio||1);
      const w=Math.max(1,Math.round(rect.width*dpr));
      const h=Math.max(1,Math.round(rect.height*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w; canvas.height=h;}
      const gl=gpu.gl;
      gl.viewport(0,0,w,h);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(gpu.res,w,h);
      gl.uniform1f(gpu.t,position);
      const page=pageColor();
      gl.uniform3f(gpu.page,page[0],page[1],page[2]);
      gl.uniform3f(gpu.ink,0.12,0.16,0.24);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    function publish(value,notify){
      committed=value;
      button.dataset.mode=value;
      button.setAttribute('aria-pressed',String(value==='dark'));
      const label=value==='dark'
        ?(interactive?'밝은 화면으로 전환':'어두운 상태의 유리 스위치')
        :(interactive?'어두운 화면으로 전환':'밝은 상태의 유리 스위치');
      button.setAttribute('aria-label',label);
      if(notify&&options.onChange) options.onChange(value);
    }
    function render(){
      button.dataset.phase=String(Math.max(0,Math.min(1,position)));
      button.style.setProperty('--progress',button.dataset.phase);
      draw();
      if(options.onProgress) options.onProgress(Math.max(0,Math.min(1,position)));
    }
    function step(now){
      frameId=0;
      if(destroyed) return;
      const dt=Math.max(0.001,Math.min(0.034,lastTime?(now-lastTime)/1000:1/60));
      lastTime=now;
      if(motion.matches||dragging){position=target; velocity=0;}
      else{
        const omega=18, damping=0.72;
        velocity+=((target-position)*omega*omega-2*damping*omega*velocity)*dt;
        position+=velocity*dt;
      }
      if(Math.abs(target-position)<0.0004&&Math.abs(velocity)<0.004){position=target; velocity=0;}
      position=Math.max(-0.03,Math.min(1.03,position));
      render();
      const active=position!==target||velocity!==0;
      button.dataset.animating=String(active);
      if(active) frameId=requestAnimationFrame(step);
      else lastTime=0;
    }
    function wake(){if(!frameId){lastTime=0; frameId=requestAnimationFrame(step);}}
    function setTheme(value,settings={}){
      if(value!=='dark'&&value!=='light') throw new Error('Unknown theme');
      target=value==='light'?1:0;
      publish(value,settings.notify!==false);
      if(settings.immediate||motion.matches){position=target; velocity=0; render(); button.dataset.animating='false';}
      else wake();
    }
    function listen(el,event,fn,opts){el.addEventListener(event,fn,opts); cleanups.push(()=>el.removeEventListener(event,fn,opts));}
    if(interactive){
      listen(button,'pointerdown',e=>{
        if(e.button!==0||pointer!==null) return;
        pointer=e.pointerId; startX=e.clientX; startPhase=position; dragging=false; ignoreClick=false;
        button.setPointerCapture(pointer);
      });
      listen(button,'pointermove',e=>{
        if(e.pointerId!==pointer) return;
        const delta=e.clientX-startX;
        if(!dragging&&Math.abs(delta)<5) return;
        dragging=true; ignoreClick=true;
        target=Math.max(0,Math.min(1,startPhase+delta/150));
        position=target; velocity=0; button.dataset.dragging='true'; render();
      });
      listen(button,'pointerup',e=>{
        if(e.pointerId!==pointer) return;
        const was=dragging; pointer=null; button.dataset.dragging='false';
        if(was){dragging=false; target=position>=0.5?1:0; publish(target===1?'light':'dark',true); wake();}
      });
      listen(button,'pointercancel',e=>{
        if(e.pointerId!==pointer) return;
        pointer=null; dragging=false; ignoreClick=true; button.dataset.dragging='false';
        setTheme(committed,{notify:false});
      });
      listen(button,'click',e=>{
        if(ignoreClick&&e.detail!==0){ignoreClick=false; return;}
        ignoreClick=false; setTheme(target>=0.5?'dark':'light');
      });
      listen(button,'keydown',e=>{
        if(e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='Home'){e.preventDefault(); setTheme('dark');}
        if(e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='End'){e.preventDefault(); setTheme('light');}
      });
    }
    if(window.ResizeObserver){
      const ro=new ResizeObserver(()=>draw());
      ro.observe(button);
      cleanups.push(()=>ro.disconnect());
    }
    publish(committed,false);
    render();
    button.dataset.animating='false';
    return {
      element:button,
      setTheme,
      getState:()=>({phase:Math.max(0,Math.min(1,position)),target,mode:committed,dragging,animating:!!frameId,particleCount:49}),
      destroy(){destroyed=true; cancelAnimationFrame(frameId); cleanups.forEach(fn=>fn()); button.remove();}
    };
  }
  global.GlassSwitchPreview=Object.freeze({create});
})(window);
