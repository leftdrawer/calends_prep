/* 밝기 스위치. duskdot(https://duskdot.vercel.app/)의 시뮬레이터와 이미지 표를 그대로 그린다.
   출처: assets/duskdot/credits.html */
import { EventQueue, FixedStepClock, mulberry32 } from "./assets/duskdot/core.js";
import { createSim } from "./assets/duskdot/sim.js";
import { createRenderer, iconDots } from "./assets/duskdot/render.js";

const KEY = "sangbogi:theme";
const PAD = 56;
const CSS_W = 178;
const CSS_H = 112;
const STEP = 1 / 240;
const DATA = new URL("./assets/duskdot/data/", import.meta.url).href;

function storedTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch (err) {
    return null;
  }
}
function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function labelFor(theme) {
  return theme === "dark" ? "밝은 화면으로 전환" : "어두운 화면으로 전환";
}
function setThemeColor(theme) {
  let tag = document.querySelector('meta[name="theme-color"][data-live]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "theme-color");
    tag.setAttribute("data-live", "");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", theme === "dark" ? "#111522" : "#DCE3EF");
}

const buttons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
let choice = storedTheme();
let mode = "fallback";
let sim = null;
let pendingUser = false;

function updateAria(theme) {
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    button.setAttribute("aria-label", labelFor(theme));
  });
}
function paintTheme(theme, persist) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  setThemeColor(theme);
  updateAria(theme);
  if (persist) {
    choice = theme;
    try { localStorage.setItem(KEY, theme); } catch (err) {}
  }
}
function shownTheme() {
  if (choice) return choice;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return systemTheme();
}

buttons.forEach((button) => {
  button.style.width = CSS_W + "px";
  button.style.height = CSS_H + "px";
  const canvas = button.querySelector("canvas");
  if (canvas) {
    canvas.style.width = CSS_W + "px";
    canvas.style.height = CSS_H + "px";
  }
  button.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      userSet("dark");
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      userSet("light");
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleFromKey();
    }
  });
  button.addEventListener("click", () => {
    if (mode === "webgl2") return;
    paintTheme(shownTheme() === "dark" ? "light" : "dark", true);
  });
});
updateAria(choice || systemTheme());
if (choice) paintTheme(choice, false);

function userSet(theme) {
  if (mode !== "webgl2" || !sim) {
    paintTheme(theme, true);
    return;
  }
  sim.setOn(theme === "light");
  pendingUser = true;
  wake();
}
function toggleFromKey() {
  const next = shownTheme() === "dark" ? "light" : "dark";
  if (mode !== "webgl2" || !sim) {
    paintTheme(next, true);
    return;
  }
  sim.setOn(next === "light");
  paintTheme(next, true);
  wake();
}

const queue = new EventQueue([]);
let tApp = 0;
function now() { return tApp; }

function hits(x, y) {
  const track = P.geom.track;
  const s = sim.snapshot();
  const inTrack = Math.abs(x - track.cx) <= track.hw && Math.abs(y - track.cy) <= track.hh;
  const inKnob = Math.abs(x - s.x) <= s.hw && Math.abs(y - s.cy) <= s.hh;
  return inTrack || inKnob;
}
function bootPointers(originX, originY, cropW, cropH) {
  const toLogical = (clientX, clientY, button) => {
    const r = button.getBoundingClientRect();
    const u = (clientX - r.left) / Math.max(r.width, 1);
    const v = (clientY - r.top) / Math.max(r.height, 1);
    return [originX + u * cropW, originY + v * cropH];
  };
  buttons.forEach((button) => {
    let active = null;
    let x0 = 0;
    let y0 = 0;
    let held = false;
    let dragged = false;
    button.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      if (active !== null) return;
      active = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      dragged = false;
      try { button.setPointerCapture(e.pointerId); } catch (err) {}
      const [x, y] = toLogical(e.clientX, e.clientY, button);
      held = hits(x, y);
      if (held) queue.push({ t: now(), type: "down", x, y, buttons: 1, pointerType: e.pointerType || "mouse" });
      wake();
    });
    button.addEventListener("pointermove", (e) => {
      if (e.pointerId !== active) return;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 4) dragged = true;
      if (!held) return;
      const [x, y] = toLogical(e.clientX, e.clientY, button);
      queue.push({ t: now(), type: "move", x, y, buttons: e.buttons, pointerType: e.pointerType || "mouse" });
      wake();
    });
    const finish = (kind) => (e) => {
      if (e.pointerId !== active) return;
      active = null;
      const moved = dragged || Math.hypot(e.clientX - x0, e.clientY - y0) > 4;
      const [x, y] = toLogical(moved ? e.clientX : x0, moved ? e.clientY : y0, button);
      if (held) queue.push({ t: now(), type: kind, x, y, buttons: 0, pointerType: e.pointerType || "mouse" });
      if (kind === "up" && !moved && !held) sim.setOn(!sim.snapshot().on);
      if ((kind === "up" && (!moved || held)) || (kind === "cancel" && held)) pendingUser = true;
      held = false;
      commitGesture();
      wake();
    };
    button.addEventListener("pointerup", finish("up"));
    button.addEventListener("pointercancel", finish("cancel"));
  });
}

let raf = 0;
let last = null;
let calm = 0;
const clock = new FixedStepClock(STEP);
let renderer = null;
let buffer = null;
let views = [];
let RNG = null;
let P = null;
let origin = [0, 0];
let cropW = 1;

function draw() {
  if (!renderer) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.max(1, Math.round(CSS_W * dpr));
  const H = Math.max(1, Math.round(CSS_H * dpr));
  if (buffer.width !== W || buffer.height !== H) {
    buffer.width = W;
    buffer.height = H;
  }
  const snap = sim.snapshot();
  renderer.draw(snap, iconDots(P, snap, RNG), W / cropW, origin);
  views.forEach((view) => {
    if (!view.button.getClientRects().length) return;
    if (view.canvas.width !== W || view.canvas.height !== H) {
      view.canvas.width = W;
      view.canvas.height = H;
    }
    view.ctx.setTransform(1, 0, 0, 1, 0, 0);
    view.ctx.clearRect(0, 0, W, H);
    view.ctx.drawImage(buffer, 0, 0);
  });
}

function commitGesture() {
  if (!sim) return;
  sim.step(STEP, queue.takeUntil(now() + 1));
  const snap = sim.snapshot();
  if (snap.dragging) paintTheme(snap.p >= 0.5 ? "light" : "dark", false);
  else if (pendingUser && !snap.pressed) {
    paintTheme(snap.on ? "light" : "dark", true);
    pendingUser = false;
  }
  draw();
}
function frame(ts) {
  raf = 0;
  const dt = last === null ? 0.05 : Math.min(0.25, (ts - last) / 1e3);
  last = ts;
  tApp += dt;
  clock.advance(dt, (step, t) => sim.step(step, queue.takeUntil(t)));
  const snap = sim.snapshot();
  const queued = queue.i < queue.ev.length;
  if (snap.dragging) paintTheme(snap.p >= 0.5 ? "light" : "dark", false);
  else if (pendingUser && !queued && !snap.pressed) {
    paintTheme(snap.on ? "light" : "dark", true);
    pendingUser = false;
  } else if (!choice && !snap.dragging) updateAria(systemTheme());
  draw();
  const hot = snap.dragging || snap.pressed || Math.abs(snap.v) > 0.5 || Math.abs(snap.p - snap.on) > 0.002;
  calm = hot ? 0 : calm + dt;
  if (hot || calm < 0.7) raf = requestAnimationFrame(frame);
}
function wake() {
  if (raf) return;
  calm = 0;
  raf = requestAnimationFrame(frame);
}

async function main() {
  if (!buttons.length) return;
  P = await (await fetch(DATA + "params.json")).json();
  const track = P.geom.track;
  origin = [track.cx - track.hw - PAD, track.cy - track.hh - PAD];
  cropW = track.hw * 2 + PAD * 2;
  const cropH = track.hh * 2 + PAD * 2;
  const initial = choice || systemTheme();
  sim = createSim(P, initial === "light" ? 1 : 0);
  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyReduce = () => sim.setReduce(reduceMq.matches);
  applyReduce();
  if (reduceMq.addEventListener) reduceMq.addEventListener("change", applyReduce);
  else if (reduceMq.addListener) reduceMq.addListener(applyReduce);
  const rnd = mulberry32(P.dots.seed);
  RNG = Array.from({ length: 8192 }, () => [rnd(), rnd(), rnd()]);
  buffer = document.createElement("canvas");
  renderer = await createRenderer(buffer, P, DATA, { isolate: true, edge: 0 });
  views = buttons.map((button) => {
    const canvas = button.querySelector("canvas");
    button.dataset.shader = "webgl2";
    return { button, canvas, ctx: canvas.getContext("2d", { alpha: true }) };
  });
  mode = "webgl2";
  bootPointers(origin[0], origin[1], cropW, cropH);
  draw();
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    if (storedTheme()) return;
    choice = null;
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    const live = document.querySelector('meta[name="theme-color"][data-live]');
    if (live) live.remove();
    const theme = systemTheme();
    sim.setOn(theme === "light");
    updateAria(theme);
    wake();
  };
  if (scheme.addEventListener) scheme.addEventListener("change", onScheme);
  else if (scheme.addListener) scheme.addListener(onScheme);
  const redraw = () => { draw(); };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(redraw);
    buttons.forEach((button) => ro.observe(button));
  }
  window.addEventListener("resize", redraw);
  if (window.MutationObserver) {
    const mo = new MutationObserver(redraw);
    ["gate", "app"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) mo.observe(el, { attributes: true, attributeFilter: ["hidden"] });
    });
  }
}

main().catch((err) => {
  mode = "fallback";
  buttons.forEach((button) => {
    button.dataset.shader = "fallback";
    button.dataset.shaderError = String(err && err.message || err);
  });
  updateAria(choice || systemTheme());
});
