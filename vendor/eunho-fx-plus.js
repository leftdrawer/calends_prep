/*! eunho-fx-plus 1.1 — 은호당 페이지 공용 효과 추가분 (vanilla, React 없음)
 * glide   : 선택 표시가 앞 칸에서 새 칸으로 미끄러진다   ← EasyUI Animated Tabs · Morphin UI Tabs
 * roll    : 바뀐 숫자만 아래에서 굴러 올라온다            ← EasyUI Animated Number Morph · Morphin UI Button(내용 변화)
 * settle  : 창이 0.94→1.02→1 로 살짝 넘쳤다가 자리 잡는다 ← EasyUI SettleModal
 * scramble: 글자가 섞였다가 앞에서부터 풀려 제자리       ← EasyUI Text Scramble Decoder · Morphin UI Skeleton reveal
 * 원작: EasyUI MIT © 2026 Suraj Maurya (github.com/Surajmaurya1/easyui),
 *       Morphin UI MIT © 2026 Ivan Oliinyk (github.com/sikkeep/morphinui).
 * 여기 코드는 동작·수치를 참고해 새로 쓴 것. 움직임 줄이기(prefers-reduced-motion)면 아무것도 움직이지 않는다. */
(function(){
  var W = window, D = document;
  var FX = W.EunhoFX || (W.EunhoFX = {});
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var reduced = function(){ return mq.matches; };
  var EASE = 'cubic-bezier(.16,1,.3,1)';          // EasyUI easeOut
  var SPRING = 'cubic-bezier(.34,1.32,.52,1)';    // springMorph 근사(살짝 넘침)
  var canAnim = !!(D.documentElement && D.documentElement.animate);
  function alpha(c){ if(!c || c === 'transparent') return 0; var m = c.match(/rgba?\(([^)]+)\)/); if(!m) return 1; var p = m[1].split(/[ ,\/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; }

  /* ── glide ─────────────────────────────────────────────────────────── */
  // host: 그대로 남아 있는 상위 요소. opt.group 을 주면 host 안에서 다시 그려지는 탭 묶음도 따라간다.
  function glide(host, opt){
    opt = opt || {};
    if(!host || host.__fxGlide || !canAnim) return;
    host.__fxGlide = 1;
    var itemSel = opt.item || 'button';
    var isOn = opt.isOn || function(b){ return b.getAttribute('aria-checked') === 'true' || b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.classList.contains('active') || b.classList.contains('on'); };
    var current = function(){ var a = host.querySelectorAll(itemSel); for(var i = 0; i < a.length; i++) if(isOn(a[i])) return a[i]; return null; };
    var vis = function(b){ return b && b.isConnected && b.offsetParent; };
    var prevEl = current(), prevV = null, busy = null;
    var snap = function(){ prevEl = current(); prevV = vis(prevEl) ? prevEl.getBoundingClientRect() : null; };
    host.addEventListener('pointerdown', snap, true);
    host.addEventListener('keydown', snap, true);
    var run = function(){
      var next = current();
      if(next === prevEl) return;
      var fromV = prevV || (vis(prevEl) ? prevEl.getBoundingClientRect() : null);
      prevEl = next; prevV = null;
      if(!next || !fromV || reduced() || !vis(next)) return;
      var group = opt.group ? next.closest(opt.group) : host;
      if(!group || !host.contains(group)) return;
      var g = group.getBoundingClientRect(), r = next.getBoundingClientRect();
      var ox = group.scrollLeft - g.left - group.clientLeft, oy = group.scrollTop - g.top - group.clientTop;
      var from = { x: fromV.left + ox, y: fromV.top + oy, w: fromV.width, h: fromV.height }, to = { x: r.left + ox, y: r.top + oy, w: r.width, h: r.height };
      var cs = getComputedStyle(next);
      if(alpha(cs.backgroundColor) < .2 || Math.abs(from.x - to.x) + Math.abs(from.y - to.y) < 2) return;
      var items = Array.prototype.slice.call(group.querySelectorAll(itemSel));
      // 다른 칸이 불투명 바탕이면 미끄러지는 표시가 가려지므로 하지 않는다
      for(var i = 0; i < items.length; i++) if(items[i] !== next && alpha(getComputedStyle(items[i]).backgroundColor) > .5) return;
      if(busy) busy();
      if(getComputedStyle(group).position === 'static') group.style.position = 'relative';
      var ghost = D.createElement('span'); ghost.className = 'fx-glide'; ghost.setAttribute('aria-hidden', 'true');
      ghost.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:0;box-sizing:border-box;margin:0;' +
        'background:' + cs.backgroundColor + ';border-radius:' + cs.borderRadius + ';box-shadow:' + cs.boxShadow + ';';
      group.insertBefore(ghost, group.firstChild);
      var saved = items.map(function(b){ return [b, b.style.position, b.style.zIndex]; });
      saved.forEach(function(s){ if(getComputedStyle(s[0]).position === 'static') s[0].style.position = 'relative'; s[0].style.zIndex = '1'; });
      var nb = next.style.background, ns = next.style.boxShadow;
      next.style.background = 'transparent'; next.style.boxShadow = 'none';
      var a = ghost.animate([
        { transform: 'translate(' + from.x + 'px,' + from.y + 'px)', width: from.w + 'px', height: from.h + 'px' },
        { transform: 'translate(' + to.x + 'px,' + to.y + 'px)', width: to.w + 'px', height: to.h + 'px' }
      ], { duration: opt.ms || 420, easing: SPRING, fill: 'both' });
      var finish = function(){ if(!ghost.isConnected) return; busy = null; next.style.background = nb; next.style.boxShadow = ns;
        saved.forEach(function(s){ s[0].style.position = s[1]; s[0].style.zIndex = s[2]; }); ghost.remove(); };
      busy = function(){ a.cancel(); finish(); };
      a.onfinish = finish; a.oncancel = finish;
    };
    new MutationObserver(function(){ requestAnimationFrame(run); }).observe(host, { subtree: true, childList: !!opt.group, attributes: true, attributeFilter: ['aria-checked', 'aria-selected', 'aria-pressed', 'class'] });
  }

  /* ── roll ──────────────────────────────────────────────────────────── */
  function roll(el, opt){
    opt = opt || {};
    if(!el || el.__fxRoll) return;
    el.__fxRoll = 1;
    var last = el.textContent, mine = false, t = 0;
    new MutationObserver(function(){
      if(mine) return;
      var now = el.textContent;
      if(now === last) return;
      var old = last; last = now;
      if(!old || !now || reduced() || !canAnim || el.children.length) return;
      var oa = Array.from(old), na = Array.from(now), off = na.length - oa.length, changed = [];
      // 오른쪽 끝을 맞춰 비교(자릿수가 늘어도 끝자리부터 맞춤)
      for(var i = 0; i < na.length; i++){ var o = oa[i - off]; if(/\d/.test(na[i]) && o !== na[i]) changed.push(i); }
      if(!changed.length || changed.length > 12) return;
      mine = true;
      var frag = D.createDocumentFragment(), buf = '';
      na.forEach(function(ch, i){
        if(changed.indexOf(i) < 0){ buf += ch; return; }
        if(buf){ frag.appendChild(D.createTextNode(buf)); buf = ''; }
        var s = D.createElement('span'); s.className = 'fx-roll-ch'; s.textContent = ch; s.style.display = 'inline-block'; frag.appendChild(s);
      });
      if(buf) frag.appendChild(D.createTextNode(buf));
      el.replaceChildren(frag);
      var up = (parseFloat(now.replace(/[^\d.]/g, '')) || 0) >= (parseFloat(old.replace(/[^\d.]/g, '')) || 0);
      el.querySelectorAll('.fx-roll-ch').forEach(function(s, k){
        s.animate([{ transform: 'translateY(' + (up ? '' : '-') + '70%)', opacity: 0, filter: 'blur(2px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }],
          { duration: opt.ms || 460, delay: k * 28, easing: SPRING, fill: 'backwards' });
      });
      mine = false;
      clearTimeout(t);
      t = setTimeout(function(){ if(el.textContent === now && el.querySelector('.fx-roll-ch')){ mine = true; el.textContent = now; mine = false; } }, (opt.ms || 460) + changed.length * 28 + 80);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  /* ── settle ────────────────────────────────────────────────────────── */
  function settle(el, opt){
    if(!el || reduced() || !canAnim) return;
    opt = opt || {};
    var y = opt.from === 'bottom' ? 28 : 8;
    el.animate([
      { opacity: 0, scale: '.94', translate: '0 ' + y + 'px' },
      { opacity: 1, scale: '1.02', translate: '0 0', offset: .62 },
      { opacity: 1, scale: '1', translate: '0 0' }
    ], { duration: opt.ms || 420, easing: EASE });
    if(opt.backdrop) opt.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  }
  // 열릴 때마다 settle: <dialog open>, [hidden] 해제, 또는 자식 추가
  function settleOn(target, opt){
    opt = opt || {};
    if(!target || target.__fxSettle) return;
    target.__fxSettle = 1;
    var panel = function(){ return opt.panel ? (typeof opt.panel === 'string' ? target.querySelector(opt.panel) : opt.panel) : target; };
    var bd = function(){ return opt.backdrop ? target.querySelector(opt.backdrop) : null; };
    var shown = function(){ return target.tagName === 'DIALOG' ? target.open : (opt.children ? !!target.querySelector(opt.children) : !target.hidden); };
    var was = shown();
    new MutationObserver(function(){ var s = shown(); if(s && !was){ var p = panel(); if(p) settle(p, { from: opt.from, backdrop: bd() }); } was = s; })
      .observe(target, opt.children ? { childList: true } : { attributes: true, attributeFilter: ['open', 'hidden'] });
  }

  /* ── scramble ──────────────────────────────────────────────────────── */
  function scramble(el, opt){
    opt = opt || {};
    if(!el || reduced() || el.children.length) return;
    var text = el.textContent, glyphs = Array.from(opt.glyphs || '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥');
    var chars = Array.from(text), ms = opt.ms || 800, t0 = performance.now(), written = text;
    var due = chars.map(function(c, i){ return c.trim() === '' ? 0 : .15 + (i / Math.max(chars.length - 1, 1)) * .7 + Math.random() * .08; });
    cancelAnimationFrame(el.__fxScr);
    var tick = function(now){
      if(el.textContent !== written){ return; }          // 앱이 글자를 바꿨으면 손 떼기
      var p = Math.min((now - t0) / ms, 1);
      var next = chars.map(function(c, i){ if(c.trim() === '' || p >= due[i]) return c; return glyphs[(Math.floor((now + i * 19) / 36) + i * 7) % glyphs.length]; }).join('');
      written = p < 1 ? next : text; el.textContent = written;
      if(p < 1) el.__fxScr = requestAnimationFrame(tick);
    };
    el.__fxScr = requestAnimationFrame(tick);
  }

  FX.glide = glide; FX.roll = roll; FX.settle = settle; FX.settleOn = settleOn; FX.scramble = scramble;
  FX.plusVersion = '1.1.0';
})();
