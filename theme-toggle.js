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
  var FRAG=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_page;
uniform vec3 u_card;
uniform vec3 u_ink;
// CSS 크기와 해상도를 분리: 216 x 96 안의 60px 렌즈, 약 40px 문양.
float roundBox(vec2 p, vec2 b, float r){
  vec2 q=abs(p)-b+r;
  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;
}
float fill(float d){return 1.0-smoothstep(-0.55,0.55,d);}
float moon(vec2 c){
  return step(length(c),3.05)*step(2.75,length(c-vec2(1.35,-0.75)));
}
float sun(vec2 c){
  float disc=step(length(c),1.45);
  float axis=step(abs(c.x),0.1)*step(2.9,abs(c.y))
            +step(abs(c.y),0.1)*step(2.9,abs(c.x));
  float diagonal=step(abs(abs(c.x)-2.0),0.1)*step(abs(abs(c.y)-2.0),0.1);
  return min(1.0,disc+axis+diagonal);
}
void main(){
  vec2 p=(vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y)/u_res-0.5)*vec2(216.0,96.0);
  float phase=clamp(u_t,0.0,1.0);
  float track=roundBox(p,vec2(92.0,34.0),34.0);
  float trackMask=fill(track);
  vec2 q=p-vec2(mix(-58.0,58.0,u_t),0.0);
  float lens=roundBox(q,vec2(30.0),14.0);
  float lensMask=fill(lens);
  float angle=mix(1.570796,4.712389,phase);
  vec2 lightDir=vec2(cos(angle),sin(angle));
  vec3 light=mix(vec3(0.49,0.73,1.0),vec3(1.0,0.71,0.40),phase);
  vec3 glassTint=mix(vec3(0.36,0.54,0.77),vec3(0.83,0.72,0.59),phase);
  vec2 normal=normalize(vec2(
    roundBox(q+vec2(0.3,0.0),vec2(30.0),14.0)-roundBox(q-vec2(0.3,0.0),vec2(30.0),14.0),
    roundBox(q+vec2(0.0,0.3),vec2(30.0),14.0)-roundBox(q-vec2(0.0,0.3),vec2(30.0),14.0)
  )+vec2(0.0001));
  float rim=exp(-abs(lens+1.3)*0.62);
  float bevel=exp(-max(-lens,0.0)*0.16);
  float lit=max(dot(normal,lightDir),0.0);
  float halo=exp(-max(lens,0.0)*0.12)*(0.16+0.32*lit)*(1.0-lensMask);
  vec3 trackColor=mix(u_page,u_card,0.30);
  trackColor=mix(trackColor,u_ink,0.035+0.055*(1.0-smoothstep(-34.0,34.0,p.y)));
  trackColor+=light*exp(-length(q)/53.0)*0.10;
  float trackRim=exp(-abs(track)*1.15);
  trackColor=mix(trackColor,mix(u_ink,u_card,0.5),trackRim*0.34);
  float shadow=exp(-max(roundBox(q-vec2(0.0,3.0),vec2(30.0),14.0),0.0)*0.40)*0.24*(1.0-lensMask);
  trackColor=mix(trackColor,vec3(0.035,0.05,0.08),shadow);
  vec3 lensColor=mix(u_card,glassTint,0.21);
  lensColor+=vec3(0.12)*pow(max(0.0,1.0-length((q+vec2(9.0,13.0))/41.0)),3.0);
  lensColor=mix(lensColor,light,bevel*(0.09+lit*0.23));
  // 기울어진 렌즈 가장자리에서 문양이 살짝 굴절된다.
  vec2 refracted=q+normal*pow(bevel,2.0)*1.5;
  float pixels=0.0;
  for(int i=0;i<49;i++){
    float index=float(i);
    vec2 cell=vec2(mod(index,7.0),floor(index/7.0))-3.0;
    float m=moon(cell), s=sun(cell);
    if(max(m,s)>0.5){
      float a=atan(cell.y+0.001,cell.x+0.001);
      float delay=fract(a/6.283185+0.5)*0.28;
      float progress=clamp((phase-delay)/0.72,0.0,1.0);
      float arc=sin(progress*3.141593);
      float visible=mix(m,s,progress);
      vec2 from=cell;
      vec2 to=cell;
      if(m<0.5)from=cell*0.5+vec2(-0.8,0.8);
      if(s<0.5)to=cell*0.5+vec2(0.8,-0.8);
      vec2 offset=mix(from,to,progress)+vec2(-sin(a),cos(a))*arc*0.65;
      float dotShape=roundBox(refracted-offset*5.5,vec2(2.2),0.45);
      pixels=max(pixels,fill(dotShape)*visible);
    }
  }
  vec3 icon=mix(vec3(0.88,0.95,1.0),vec3(0.12,0.17,0.25),phase);
  lensColor=mix(lensColor,icon,pixels);
  // 얇은 빛 띠와 반대쪽 이중 굴절 테. 문양 위를 덮지 않는다.
  lensColor+=light*rim*(0.13+lit*0.62);
  lensColor+=vec3(0.70,0.85,1.0)*rim*max(-dot(normal,lightDir),0.0)*0.16;
  float topLine=exp(-abs(q.y+28.0)*1.2)*(1.0-smoothstep(13.0,25.0,abs(q.x)));
  lensColor+=vec3(0.25)*topLine;
  // 투명 배경으로 광륜을 합성하고, 트랙과 렌즈는 또렷하게 유지한다.
  vec3 rgb=light;
  float alpha=halo;
  rgb=mix(rgb,trackColor,trackMask);
  alpha=max(alpha,trackMask*0.98);
  rgb=mix(rgb,lensColor,lensMask);
  alpha=max(alpha,lensMask);
  gl_FragColor=vec4(rgb,alpha);
}
`;

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
    // 한 장의 전체 화면 사각형이므로 재혼합하지 않는다. 광륜의 알파를 제곱해 흐리게 만드는 일을 피한다.
    gl.disable(gl.BLEND);
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
      paintTheme(themeOf(target), false);
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
