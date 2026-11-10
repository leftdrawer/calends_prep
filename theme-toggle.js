/* 유리 밝기 손잡이. 페이지 색을 바꾸는 스위치이며, 셰이더는 이 페이지용으로 새로 썼다. */
(function(){
  var KEY='sangbogi:theme';
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var views=[];
  var t=1, target=1, vel=0, held=false, raf=0, applied=null;

  function storedTheme(){
    try{
      var v=localStorage.getItem(KEY);
      return v==='light'||v==='dark'?v:null;
    }catch(err){return null;}
  }
  function systemTheme(){
    return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  function themeOf(value){return value>=0.5?'light':'dark';}

  function readHex(name, fallback){
    var raw=getComputedStyle(document.documentElement).getPropertyValue(name);
    var hex=(raw||'').trim();
    if(!/^#[0-9a-fA-F]{6}$/.test(hex))return fallback;
    return [
      parseInt(hex.slice(1,3),16)/255,
      parseInt(hex.slice(3,5),16)/255,
      parseInt(hex.slice(5,7),16)/255
    ];
  }

  function setThemeColor(theme){
    var tag=document.querySelector('meta[name="theme-color"][data-live]');
    if(!tag){
      tag=document.createElement('meta');
      tag.setAttribute('name','theme-color');
      tag.setAttribute('data-live','');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', theme==='dark'?'#111522':'#DCE3EF');
  }

  function labelFor(theme){
    return theme==='dark'?'밝은 화면으로 전환':'어두운 화면으로 전환';
  }

  function paintTheme(theme, persist){
    if(applied===theme && !persist)return;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme=theme;
    setThemeColor(theme);
    views.forEach(function(view){
      view.button.setAttribute('aria-pressed', theme==='dark'?'true':'false');
      view.button.setAttribute('aria-label', labelFor(theme));
    });
    applied=theme;
    if(persist){
      try{localStorage.setItem(KEY, theme);}catch(err){}
    }
  }

  var VERT='attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  var FRAG=[
    'precision mediump float;',
    'uniform vec2 u_res;',
    'uniform float u_t;',
    'uniform vec3 u_page;',
    'uniform vec3 u_card;',
    'uniform vec3 u_ink;',
    'float sdRound(vec2 p, vec2 b, float r){',
    '  vec2 q=abs(p)-b+r;',
    '  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;',
    '}',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float moonOn(vec2 c){',
    '  float d=length(c);',
    '  float bite=length(c-vec2(0.78,0.08));',
    '  return step(d,1.62)*step(1.05,bite);',
    '}',
    'float sunOn(vec2 c){',
    '  float d=length(c);',
    '  float disc=step(d,0.78);',
    '  float ray=step(1.05,d)*step(d,1.62)*step(abs(sin(atan(c.y,c.x)*4.0)),0.42);',
    '  return max(disc,ray);',
    '}',
    'void main(){',
    '  vec2 frag=vec2(gl_FragCoord.x, u_res.y-gl_FragCoord.y);',
    '  vec2 center=u_res*0.5;',
    '  float trackHalfW=u_res.x*0.32;',
    '  float trackHalfH=min(u_res.y*0.19, trackHalfW*0.30);',
    '  vec2 track=frag-center;',
    '  float trackSdf=sdRound(track, vec2(trackHalfW, trackHalfH), trackHalfH);',
    '  float trackMask=smoothstep(1.2, -0.6, trackSdf);',
    '  float knob=trackHalfH*0.84;',
    '  float travel=max(trackHalfW-knob-1.5, 1.0);',
    '  float slide=clamp(u_t, -0.06, 1.06);',
    '  vec2 knobCenter=center+vec2(mix(-travel, travel, slide), 0.0);',
    '  vec2 rel=frag-knobCenter;',
    '  float glass=sdRound(rel, vec2(knob*0.92, knob*0.92), knob*0.46);',
    '  float glassMask=smoothstep(1.1, -0.4, glass);',
    '  float ang=mix(1.5708, 4.7124, clamp(u_t,0.0,1.0));',
    '  float facing=atan(rel.y, rel.x);',
    '  float delta=abs(atan(sin(facing-ang), cos(facing-ang)));',
    '  float rim=smoothstep(knob*0.55, 0.0, abs(length(rel)-knob*0.78));',
    '  float strip=rim*smoothstep(0.62, 0.0, delta);',
    '  vec3 night=vec3(0.66,0.76,0.93);',
    '  vec3 day=vec3(1.0,0.74,0.48);',
    '  vec3 glow=mix(night, day, clamp(u_t,0.0,1.0));',
    '  vec3 fringe=mix(vec3(0.55,0.70,0.96), vec3(0.93,0.38,0.32), clamp(u_t,0.0,1.0));',
    '  float orbit=mix(1.0, -1.0, clamp(u_t,0.0,1.0));',
    '  float side=smoothstep(-0.15, 0.85, orbit*(rel.y/max(knob,1.0)));',
    '  float spill=exp(-max(length(rel)-knob*0.55, 0.0)/(knob*1.7))*(0.55+side*0.9+strip);',
    '  float wash=trackMask*exp(-abs(frag.x-knobCenter.x)/(trackHalfW*0.72))*0.8;',
    '  vec3 trackCol=mix(u_page, u_card, 0.72);',
    '  trackCol=mix(trackCol, glow, wash*0.45);',
    '  float nse=hash(floor(frag*0.5));',
    '  vec3 frosted=mix(u_page, u_card, 0.55)+glow*(0.08+nse*0.05);',
    '  float scatter=strip*smoothstep(2.0, -knob, glass);',
    '  vec3 glassCol=mix(frosted, glow, 0.18+scatter*0.62);',
    '  vec2 specP=rel/max(knob,1.0)-vec2(-0.34,-0.4);',
    '  float spec=pow(max(0.0, 1.0-length(specP)), 7.0);',
    '  glassCol+=vec3(1.0)*spec*0.55;',
    '  float edge=smoothstep(1.8, 0.0, abs(glass));',
    '  glassCol+=fringe*edge*0.85;',
    '  float pix=0.0;',
    '  float cell=knob*0.36;',
    '  for(int i=0;i<25;i++){',
    '    float fi=float(i);',
    '    vec2 g=vec2(mod(fi,5.0), floor(fi/5.0))-2.0;',
    '    float m=moonOn(g);',
    '    float s=sunOn(g);',
    '    float on=max(m,s);',
    '    if(on>0.5){',
    '      float a=atan(g.y, g.x);',
    '      vec2 from=g;',
    '      vec2 to=g;',
    '      if(m>0.5 && s<0.5){to=vec2(cos(a), sin(a))*0.62;}',
    '      if(s>0.5 && m<0.5){from=vec2(cos(a), sin(a))*1.35+vec2(0.42,0.05);}',
    '      float delay=fract(a/6.28318+0.5)*0.42;',
    '      float lt=clamp((clamp(u_t,0.0,1.0)-delay)/0.58, 0.0, 1.0);',
    '      float spring=lt+sin(lt*3.14159)*0.22*(1.0-lt);',
    '      vec2 dir=to-from;',
    '      float dl=length(dir);',
    '      vec2 nrm=dl>0.001?dir/dl:vec2(0.0,1.0);',
    '      vec2 perp=vec2(-nrm.y, nrm.x);',
    '      vec2 pos=mix(from, to, spring)+perp*sin(spring*3.14159)*0.45;',
    '      vec2 world=knobCenter+pos*cell;',
    '      vec2 d=abs(frag-world);',
    '      float dotm=step(d.x, cell*0.42)*step(d.y, cell*0.42);',
    '      float inside=step(length(world-knobCenter), knob*1.08);',
    '      pix=max(pix, dotm*inside*on);',
    '    }',
    '  }',
    '  vec3 pixCol=mix(vec3(0.93,0.95,0.98), u_ink, clamp(u_t,0.0,1.0));',
    '  glassCol=mix(glassCol, pixCol, pix);',
    '  float shadow=exp(-length(frag-(knobCenter+vec2(0.0, knob*0.35)))/(knob*0.9))*0.28*glassMask;',
    '  vec3 col=vec3(0.0);',
    '  float a=0.0;',
    '  float glowA=clamp(spill*0.9, 0.0, 0.78)*(1.0-glassMask);',
    '  col+=glow*glowA;',
    '  a=max(a, glowA);',
    '  float trackA=trackMask*0.92;',
    '  col=mix(col, trackCol, trackA);',
    '  a=max(a, trackA);',
    '  col=mix(col, vec3(0.02,0.03,0.06), shadow*(1.0-glassMask));',
    '  col=mix(col, glassCol, glassMask);',
    '  a=max(a, glassMask);',
    '  gl_FragColor=vec4(col, a);',
    '}'
  ].join('\n');

  function compile(gl, type, src){
    var shader=gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      var log=gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log||'shader');
    }
    return shader;
  }

  function makeGl(canvas){
    var gl=canvas.getContext('webgl', {alpha:true, premultipliedAlpha:false, antialias:true, preserveDrawingBuffer:true});
    if(!gl)return null;
    var program;
    try{
      var vs=compile(gl, gl.VERTEX_SHADER, VERT);
      var fs=compile(gl, gl.FRAGMENT_SHADER, FRAG);
      program=gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, 'a');
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program, gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'link');
    }catch(err){
      canvas.dataset.shaderError=String(err&&err.message||err);
      return null;
    }
    var buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return {
      gl:gl,
      loc:{
        res:gl.getUniformLocation(program, 'u_res'),
        t:gl.getUniformLocation(program, 'u_t'),
        page:gl.getUniformLocation(program, 'u_page'),
        card:gl.getUniformLocation(program, 'u_card'),
        ink:gl.getUniformLocation(program, 'u_ink')
      }
    };
  }

  function resize(view){
    var canvas=view.canvas;
    var rect=canvas.getBoundingClientRect();
    var dpr=Math.min(2, window.devicePixelRatio||1);
    var w=Math.max(1, Math.round(rect.width*dpr));
    var h=Math.max(1, Math.round(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){
      canvas.width=w;
      canvas.height=h;
    }
  }

  function draw(view){
    if(!view.button.getClientRects().length)return;
    resize(view);
    if(!view.gpu)return;
    var gl=view.gpu.gl;
    var loc=view.gpu.loc;
    gl.viewport(0, 0, view.canvas.width, view.canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.res, view.canvas.width, view.canvas.height);
    gl.uniform1f(loc.t, t);
    var page=readHex('--page', [0.86,0.89,0.94]);
    var card=readHex('--card', [0.96,0.97,0.99]);
    var ink=readHex('--ink', [0.07,0.08,0.13]);
    gl.uniform3fv(loc.page, page);
    gl.uniform3fv(loc.card, card);
    gl.uniform3fv(loc.ink, ink);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(){
    raf=0;
    if(!held){
      var pull=(target-t)*0.16;
      vel=(vel+pull)*0.72;
      t+=reduced? (target-t) : vel;
      if(reduced || Math.abs(target-t)<0.004 && Math.abs(vel)<0.004){
        t=target;
        vel=0;
      }
    }
    var theme=themeOf(t);
    if(!held && Math.abs(t-target)<0.08)paintTheme(themeOf(target), false);
    else if(held)paintTheme(theme, false);
    views.forEach(draw);
    if(held || Math.abs(t-target)>0.004 || Math.abs(vel)>0.004){
      raf=requestAnimationFrame(frame);
    }else{
      paintTheme(themeOf(target), true);
      views.forEach(draw);
    }
  }
  function wake(){
    if(raf)return;
    frame();
  }

  function scrub(button, clientX){
    var rect=button.getBoundingClientRect();
    var x=(clientX-rect.left)/Math.max(rect.width,1);
    t=Math.min(1, Math.max(0, x));
    target=t;
    vel=0;
    held=true;
    wake();
  }

  function release(){
    if(!held)return;
    held=false;
    target=t>=0.5?1:0;
    paintTheme(themeOf(target), true);
    wake();
  }

  function toggle(){
    held=false;
    target=target>=0.5?0:1;
    vel=reduced?0:(target>t?0.08:-0.08);
    paintTheme(themeOf(target), true);
    wake();
  }

  function mount(button){
    var canvas=button.querySelector('canvas');
    if(!canvas)return;
    var gpu=makeGl(canvas);
    button.dataset.shader=gpu?'webgl':'fallback';
    var view={button:button, canvas:canvas, gpu:gpu};
    views.push(view);
    button.addEventListener('pointerdown', function(e){
      if(e.button!=null && e.button!==0)return;
      button.setPointerCapture(e.pointerId);
      button.dataset.drag='0';
      button.dataset.x0=String(e.clientX);
    });
    button.addEventListener('pointermove', function(e){
      if(!button.hasPointerCapture(e.pointerId))return;
      if(Math.abs(e.clientX-Number(button.dataset.x0))<5 && button.dataset.drag!=='1')return;
      button.dataset.drag='1';
      scrub(button, e.clientX);
    });
    button.addEventListener('pointerup', function(){
      if(button.dataset.drag==='1')release();
    });
    button.addEventListener('pointercancel', function(){if(button.dataset.drag==='1')release();});
    button.addEventListener('click', function(){
      if(button.dataset.drag==='1'){button.dataset.drag='0'; return;}
      toggle();
    });
    button.addEventListener('keydown', function(e){
      if(e.key==='ArrowLeft' || e.key==='ArrowDown'){e.preventDefault(); target=0; held=false; paintTheme('dark', true); wake();}
      if(e.key==='ArrowRight' || e.key==='ArrowUp'){e.preventDefault(); target=1; held=false; paintTheme('light', true); wake();}
    });
    if(window.ResizeObserver){
      var ro=new ResizeObserver(function(){draw(view);});
      ro.observe(button);
    }
    draw(view);
  }

  function redraw(){
    views.forEach(function(view){resize(view); draw(view);});
  }

  function boot(){
    var saved=storedTheme();
    var theme=saved||systemTheme();
    t=theme==='light'?1:0;
    target=t;
    document.querySelectorAll('[data-theme-toggle]').forEach(mount);
    if(saved)paintTheme(saved, false);
    else views.forEach(function(view){
      view.button.setAttribute('aria-pressed', theme==='dark'?'true':'false');
      view.button.setAttribute('aria-label', labelFor(theme));
    });
    views.forEach(draw);
    if(window.MutationObserver){
      var mo=new MutationObserver(redraw);
      ['gate','app'].forEach(function(id){
        var el=document.getElementById(id);
        if(el)mo.observe(el, {attributes:true, attributeFilter:['hidden']});
      });
    }
    var mq=window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme=function(){
      if(storedTheme())return;
      target=mq.matches?0:1;
      held=false;
      wake();
    };
    if(mq.addEventListener)mq.addEventListener('change', onScheme);
    else if(mq.addListener)mq.addListener(onScheme);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
