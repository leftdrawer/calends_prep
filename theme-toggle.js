/* 원본 Duskdot 스위치를 그대로 표시하고, 상태만 상차림 화면과 연결합니다. */
(function(){
  var KEY='sangbogi:theme';
  var root=document.documentElement;
  var media=window.matchMedia('(prefers-color-scheme: dark)');
  var frames=Array.prototype.slice.call(document.querySelectorAll('[data-theme-frame]'));
  var states=new Map();
  var targets=new Map();

  function storedTheme(){
    try{
      var value=localStorage.getItem(KEY);
      return value==='light'||value==='dark'?value:null;
    }catch(err){return null;}
  }
  function systemTheme(){return media.matches?'dark':'light';}
  var current=storedTheme()||systemTheme();

  function setThemeColor(theme){
    var tag=document.querySelector('meta[name="theme-color"][data-live]');
    if(!tag){
      tag=document.createElement('meta');
      tag.setAttribute('name','theme-color');
      tag.setAttribute('data-live','');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content',theme==='dark'?'#18181B':'#DCD8D4');
  }

  function readFrameTheme(frame){
    try{
      var child=frame.contentWindow;
      if(!child||child.location.origin!==location.origin||!child.APP)return null;
      return child.APP.getState().on?'light':'dark';
    }catch(err){return null;}
  }

  function alignFrame(frame,theme){
    if(!frame.isConnected)return;
    var observed=readFrameTheme(frame);
    if(observed===null)return;
    if(observed===theme){
      targets.delete(frame);
      states.set(frame,theme);
      return;
    }
    if(targets.get(frame)===theme)return;
    try{
      var child=frame.contentWindow;
      var control=frame.contentDocument.getElementById('sw');
      if(!child||!control)return;
      targets.set(frame,theme);
      control.dispatchEvent(new child.KeyboardEvent('keydown',{
        key:'Enter',
        bubbles:true,
        cancelable:true
      }));
    }catch(err){targets.delete(frame);}
  }

  function applyTheme(theme,persist){
    current=theme;
    root.setAttribute('data-theme',theme);
    root.style.colorScheme=theme;
    setThemeColor(theme);
    window.dispatchEvent(new CustomEvent('sangbogi:themechange',{detail:theme}));
    if(persist){
      try{localStorage.setItem(KEY,theme);}catch(err){}
    }
    frames.forEach(function(frame){alignFrame(frame,theme);});
  }

  function initializeFrame(frame){
    var observed=readFrameTheme(frame);
    if(observed===null)return;
    states.set(frame,observed);
    alignFrame(frame,current);
  }

  frames.forEach(function(frame){
    frame.addEventListener('load',function(){initializeFrame(frame);});
    if(frame.contentDocument&&frame.contentDocument.readyState==='complete')initializeFrame(frame);
  });

  applyTheme(current,false);

  function pollFrames(){
    for(var i=0;i<frames.length;i++){
      var frame=frames[i];
      var observed=readFrameTheme(frame);
      if(observed===null)continue;
      if(targets.has(frame)){
        var expected=targets.get(frame);
        if(observed===expected){
          targets.delete(frame);
          states.set(frame,observed);
        }
        continue;
      }
      var previous=states.get(frame);
      if(previous===undefined){
        states.set(frame,observed);
        if(observed!==current)alignFrame(frame,current);
        continue;
      }
      if(observed!==previous){
        states.set(frame,observed);
        applyTheme(observed,true);
        break;
      }
    }
    window.setTimeout(pollFrames,50);
  }
  pollFrames();

  var onSystemThemeChange=function(){
    if(storedTheme())return;
    applyTheme(systemTheme(),false);
  };
  if(media.addEventListener)media.addEventListener('change',onSystemThemeChange);
  else if(media.addListener)media.addListener(onSystemThemeChange);
})();
