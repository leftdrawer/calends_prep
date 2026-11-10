/* Isolated preview shell. Never reads or writes sangbogi:* or calls the app API. */
(function(){
  'use strict';
  const KEY='calends:glass-preview:theme';
  const root=document.documentElement;
  const scheme=matchMedia('(prefers-color-scheme: dark)');
  let explicit=false,saved=null;
  try{saved=localStorage.getItem(KEY);explicit=saved==='light'||saved==='dark';}catch(e){}
  const initial=explicit?saved:(scheme.matches?'dark':'light');
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const css=a=>'rgb('+a.join(',')+')';
  const luminance=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function colors(t){
    const page=mix([17,21,34],[220,227,239],t);
    const dark=[17,21,34],light=[220,227,239];
    const ink=contrast(page,dark)>contrast(page,light)?dark:light;
    const proposed=ink===dark?[64,81,109]:[174,189,214];
    const muted=contrast(page,proposed)>=4.5?proposed:ink;
    root.style.setProperty('--page',css(page));
    root.style.setProperty('--ink',css(ink));
    root.style.setProperty('--muted',css(muted));
    root.style.setProperty('--line',css(mix([83,102,132],[152,169,196],t)));
    root.style.setProperty('--focus',css(ink===dark?[60,76,110]:[174,189,214]));
    root.style.setProperty('--brand-invert',ink===dark?'0':'1');
  }
  function changed(value){
    explicit=true;
    try{localStorage.setItem(KEY,value);}catch(e){}
    root.dataset.theme=value;
    root.style.colorScheme=value;
    document.querySelector('#mode-label').textContent=value==='light'?'밝은 화면':'어두운 화면';
    document.querySelector('meta[name=theme-color]').content=value==='light'?'#DCE3EF':'#111522';
  }
  const main=GlassSwitchPreview.create(document.querySelector('#main-switch'),{initial,onProgress:colors,onChange:changed});
  GlassSwitchPreview.create(document.querySelector('#light-sample'),{initial:'light',interactive:false});
  GlassSwitchPreview.create(document.querySelector('#dark-sample'),{initial:'dark',interactive:false});
  root.dataset.theme=initial;root.style.colorScheme=initial;
  document.querySelector('#mode-label').textContent=initial==='light'?'밝은 화면':'어두운 화면';
  document.querySelector('#choose-dark').addEventListener('click',()=>main.setTheme('dark'));
  document.querySelector('#choose-light').addEventListener('click',()=>main.setTheme('light'));
  document.querySelectorAll('[data-background]').forEach(button=>button.addEventListener('click',()=>{
    const background=button.dataset.background;
    document.querySelectorAll('[data-sample]').forEach(el=>el.dataset.bg=background);
    document.querySelectorAll('[data-background]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  }));
  if(scheme.addEventListener)scheme.addEventListener('change',()=>{
    if(explicit)return;
    const value=scheme.matches?'dark':'light';
    main.setTheme(value,{notify:false});root.dataset.theme=value;root.style.colorScheme=value;
    document.querySelector('#mode-label').textContent=value==='light'?'밝은 화면':'어두운 화면';
  });
  // Read-only QA handle for state/geometry checks, never a screen-capture interface.
  Object.defineProperty(window,'glassPreview',{value:Object.freeze({main,storageKey:KEY}),writable:false});
})();
