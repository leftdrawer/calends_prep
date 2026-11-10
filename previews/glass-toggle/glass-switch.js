/* Preview-only glass switch. Native SVG particles under a transparent CSS lens.
   No canvas, WebGL, network calls, application storage or production imports. */
(function(global){
  'use strict';
  const SVG='http://www.w3.org/2000/svg';
  // Hand-defined, reviewable 11x11 glyphs. Endpoints never use a procedural blob.
  const SUN=[
    '.....#.....',
    '.#...#...#.',
    '..#.....#..',
    '....###....',
    '...#####...',
    '##.#####.##',
    '...#####...',
    '....###....',
    '..#.....#..',
    '.#...#...#.',
    '.....#.....'
  ];
  const MOON=[
    '....####...',
    '..####.....',
    '.####......',
    '.###.......',
    '###........',
    '###........',
    '###........',
    '.###.......',
    '.####......',
    '..#####....',
    '....####...'
  ];
  const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>t*t*(3-2*t);
  const rgb=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t)));
  function points(rows,pitch){
    const cells=[];
    rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')cells.push({x,y});}));
    const minX=Math.min(...cells.map(p=>p.x)), maxX=Math.max(...cells.map(p=>p.x));
    const minY=Math.min(...cells.map(p=>p.y)), maxY=Math.max(...cells.map(p=>p.y));
    const center={x:(minX+maxX)/2,y:(minY+maxY)/2};
    return cells.map(p=>({x:(p.x-center.x)*pitch,y:(p.y-center.y)*pitch}))
      .sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)||Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
  }
  const day=points(SUN,3.45),night=points(MOON,3.65);
  const count=Math.max(day.length,night.length);
  const pairs=Array.from({length:count},(_,i)=>({
    from:night[Math.floor(i*night.length/count)],
    to:day[Math.floor(i*day.length/count)],
    delay:(i/count)*0.22,
    bend:(i%2===0?1:-1)*(4.5+(i%5)*0.80)
  }));

  function makeSvg(){
    const svg=document.createElementNS(SVG,'svg');
    svg.classList.add('particles');
    svg.setAttribute('viewBox','0 0 244 108');
    svg.setAttribute('aria-hidden','true');
    const fragments=[];
    pairs.forEach(()=>{
      const group=document.createElementNS(SVG,'g');
      const fringe=document.createElementNS(SVG,'rect');
      const counterFringe=document.createElementNS(SVG,'rect');
      const pixel=document.createElementNS(SVG,'rect');
      [fringe,counterFringe,pixel].forEach(el=>{
        el.setAttribute('width','2.35');el.setAttribute('height','2.35');
        el.setAttribute('rx','.22');
        group.appendChild(el);
      });
      fringe.classList.add('fringe');
      counterFringe.classList.add('counter-fringe');
      pixel.classList.add('pixel');
      svg.appendChild(group);
      fragments.push({group,fringe,counterFringe,pixel});
    });
    return{svg,fragments};
  }

  function create(mount,options={}){
    const interactive=options.interactive!==false;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const transparency=matchMedia('(prefers-reduced-transparency: reduce)');
    const button=document.createElement(interactive?'button':'div');
    button.className='glass-switch';
    if(interactive)button.type='button';else button.setAttribute('role','img');
    button.innerHTML='<span class="aura" aria-hidden="true"></span><span class="rail" aria-hidden="true"></span><span class="bloom" aria-hidden="true"></span>';
    const{svg,fragments}=makeSvg();button.appendChild(svg);
    const lens=document.createElement('span');lens.className='lens';lens.setAttribute('aria-hidden','true');
    const reflection=document.createElement('span');reflection.className='edge-reflection';lens.appendChild(reflection);
    const spectral=document.createElement('span');spectral.className='spectral-edge';lens.appendChild(spectral);
    const specular=document.createElement('span');specular.className='specular';lens.appendChild(specular);
    button.appendChild(lens);mount.replaceChildren(button);
    let position=options.initial==='dark'?0:1,target=position,velocity=0,frameId=0,lastTime=0;
    let pointer=null,dragging=false,startX=0,startPhase=position,ignoreClick=false,destroyed=false;
    let committed=position>=.5?'light':'dark';
    const cleanups=[];
    const blurSupported=CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)');
    button.dataset.blurSupported=String(blurSupported);
    button.dataset.reducedTransparency=String(transparency.matches||options.reducedTransparency===true);
    button.dataset.implementation='svg-css';
    button.dataset.effects='prismatic';

    function render(){
      const p=clamp(position);
      const centerX=52+position*140;
      const kinetic=motion.matches?0:Math.sin(Math.PI*p);
      const icon=rgb([218,239,255],[31,49,73],p);
      const lamp=rgb([88,181,255],[247,156,58],p);
      const spectrum=rgb([163,125,255],[255,109,121],p);
      button.style.setProperty('--progress',p.toFixed(5));
      button.style.setProperty('--glass-x',(position*140).toFixed(3)+'px');
      button.style.setProperty('--lamp-angle',(96-180*p).toFixed(3)+'deg');
      button.style.setProperty('--lamp-rgb',lamp.join(' '));
      button.style.setProperty('--spectrum-rgb',spectrum.join(' '));
      button.style.setProperty('--kinetic',kinetic.toFixed(5));
      button.style.setProperty('--lamp-alpha',(.92+.08*kinetic).toFixed(5));
      button.style.setProperty('--fringe-opacity',(.28+.42*kinetic).toFixed(5));
      button.style.setProperty('--spill-y',(78-56*p).toFixed(2)+'%');
      button.style.setProperty('--shine-x',(28+44*Math.cos((96-180*p)*Math.PI/180)).toFixed(1)+'px');
      button.style.setProperty('--shine-y',(24+30*Math.sin((96-180*p)*Math.PI/180)).toFixed(1)+'px');
      button.style.setProperty('--icon-color','rgb('+icon.join(',')+')');
      button.style.setProperty('--glass-stroke','rgba('+rgb([166,202,240],[255,255,255],p).join(',')+','+lerp(.27,.56,p).toFixed(3)+')');
      button.style.setProperty('--track-edge','rgba('+rgb([159,188,228],[49,69,100],p).join(',')+','+lerp(.19,.14,p).toFixed(3)+')');
      button.style.setProperty('--track-shade',p>.5?'rgba(34,51,80,.035)':'rgba(0,0,0,.15)');
      button.style.setProperty('--solid-glass',p>.5?'#ced8e8':'#243752');
      pairs.forEach((pair,i)=>{
        const z=clamp((p-pair.delay)/.78),s=ease(z),arc=Math.sin(Math.PI*z);
        const baseX=lerp(pair.from.x,pair.to.x,s),baseY=lerp(pair.from.y,pair.to.y,s);
        const angle=Math.atan2(baseY,baseX);
        const flight=arc*(1+kinetic*1.8);
        let x=baseX-Math.sin(angle)*flight*pair.bend;
        let y=baseY+Math.cos(angle)*flight*pair.bend;
        // A subtle optical magnification and bevel bend, not a claim of ray tracing.
        const radial=clamp(Math.hypot(x,y)/30);
        const bend=1.035-0.045*radial*radial;
        x*=bend;y*=bend;
        const item=fragments[i];
        item.group.setAttribute('transform','translate('+(centerX+x-1.175).toFixed(3)+' '+(54+y-1.175).toFixed(3)+')');
        const dispersion=.017+.060*kinetic;
        item.fringe.setAttribute('x',(x*dispersion).toFixed(3));
        item.fringe.setAttribute('y',(y*dispersion).toFixed(3));
        item.counterFringe.setAttribute('x',(-x*dispersion*.85).toFixed(3));
        item.counterFringe.setAttribute('y',(-y*dispersion*.85).toFixed(3));
      });
      button.dataset.phase=p.toFixed(5);
      if(options.onProgress)options.onProgress(p);
    }
    function publish(value,notify){
      committed=value;
      button.dataset.mode=value;
      if(interactive){button.setAttribute('aria-pressed',String(value==='dark'));button.setAttribute('aria-label',value==='dark'?'밝은 화면으로 전환':'어두운 화면으로 전환');}
      else button.setAttribute('aria-label',value==='dark'?'어두운 상태의 유리 스위치':'밝은 상태의 유리 스위치');
      if(notify&&options.onChange)options.onChange(value);
    }
    function step(now){
      frameId=0;
      if(destroyed)return;
      const dt=clamp(lastTime?(now-lastTime)/1000:1/60,.001,.034);lastTime=now;
      if(motion.matches||dragging){position=target;velocity=0;}
      else{
        const omega=16,damping=.62;
        velocity+=((target-position)*omega*omega-2*damping*omega*velocity)*dt;
        position+=velocity*dt;
      }
      if(Math.abs(target-position)<.0003&&Math.abs(velocity)<.003){position=target;velocity=0;}
      position=clamp(position,-.018,1.018);render();
      const active=position!==target||velocity!==0;
      button.dataset.animating=String(active);
      if(active)frameId=requestAnimationFrame(step);else lastTime=0;
    }
    function wake(){if(!frameId){lastTime=0;frameId=requestAnimationFrame(step);}}
    function setTheme(value,settings={}){
      if(value!=='dark'&&value!=='light')throw new Error('Unknown theme');
      target=value==='light'?1:0;
      publish(value,settings.notify!==false);
      if(settings.immediate||motion.matches){position=target;velocity=0;render();button.dataset.animating='false';}
      else wake();
    }
    function settle(notify=true){dragging=false;target=position>=.5?1:0;publish(target===1?'light':'dark',notify);wake();}
    function listen(targetEl,event,fn,opts){targetEl.addEventListener(event,fn,opts);cleanups.push(()=>targetEl.removeEventListener(event,fn,opts));}
    if(interactive){
      listen(button,'pointerdown',e=>{
        if(e.button!==0||pointer!==null)return;
        pointer=e.pointerId;startX=e.clientX;startPhase=position;dragging=false;ignoreClick=false;
        button.setPointerCapture(pointer);
      });
      listen(button,'pointermove',e=>{
        if(e.pointerType==='mouse'&&!motion.matches){
          const r=button.getBoundingClientRect();
          const localX=e.clientX-r.left-(16+position*140);
          const localY=e.clientY-r.top-18;
          button.style.setProperty('--shine-x',(16+clamp(localX/72)*28).toFixed(2)+'px');
          button.style.setProperty('--shine-y',(10+clamp(localY/72)*22).toFixed(2)+'px');
          button.style.setProperty('--hover', '1');
        }
        if(e.pointerId!==pointer)return;
        const delta=e.clientX-startX;
        if(!dragging&&Math.abs(delta)<5)return;
        dragging=true;ignoreClick=true;target=clamp(startPhase+delta/140);position=target;velocity=0;
        button.dataset.dragging='true';render();
      });
      listen(button,'pointerleave',()=>{
        button.style.setProperty('--hover','0');
        button.style.setProperty('--shine-x','18px');
        button.style.setProperty('--shine-y','14px');
      });
      listen(button,'pointerup',e=>{
        if(e.pointerId!==pointer)return;
        const wasDragging=dragging;pointer=null;button.dataset.dragging='false';
        if(wasDragging)settle();
      });
      listen(button,'pointercancel',e=>{
        if(e.pointerId!==pointer)return;
        pointer=null;dragging=false;ignoreClick=true;button.dataset.dragging='false';
        setTheme(committed,{notify:false});
      });
      listen(button,'click',e=>{
        if(ignoreClick&&e.detail!==0){ignoreClick=false;return;}
        ignoreClick=false;setTheme(target>=.5?'dark':'light');
      });
      listen(button,'keydown',e=>{
        if(e.key==='ArrowLeft'||e.key==='ArrowDown'||e.key==='Home'){e.preventDefault();setTheme('dark');}
        if(e.key==='ArrowRight'||e.key==='ArrowUp'||e.key==='End'){e.preventDefault();setTheme('light');}
      });
    }
    const reducedChanged=()=>{if(motion.matches){position=target;velocity=0;render();}};
    const transparencyChanged=()=>{button.dataset.reducedTransparency=String(transparency.matches||options.reducedTransparency===true);};
    if(motion.addEventListener){listen(motion,'change',reducedChanged);listen(transparency,'change',transparencyChanged);}
    publish(committed,false);render();button.dataset.animating='false';
    return{
      element:button,
      setTheme,
      getState:()=>({phase:clamp(position),target,mode:committed,dragging,animating:!!frameId,particleCount:count}),
      destroy(){destroyed=true;cancelAnimationFrame(frameId);cleanups.forEach(fn=>fn());button.remove();}
    };
  }
  global.GlassSwitchPreview=Object.freeze({create,glyphs:Object.freeze({sun:SUN,moon:MOON})});
})(window);
