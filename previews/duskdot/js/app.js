import { FixedStepClock, LogInput, LiveInput, EventQueue, mulberry32 } from "./core.js";
import { createSim } from "./sim.js";
import { createRenderer, iconDots } from "./render.js";
const qs = new URLSearchParams(location.search);
const MODE = qs.get("mode") || "live";
const DATA = "data/";
const STEP = 1 / 240;
const P = await (await fetch(DATA + "params.json")).json();
const LW = P.logical[0], LH = P.logical[1];
const canvas = document.getElementById("view");
const overlay = document.getElementById("over");
const frameExact = MODE === "capture" && !qs.has("portrait");
const R = await createRenderer(canvas, P, DATA, { edge: frameExact ? 0 : 16 });
const rnd = mulberry32(P.dots.seed);
const RNG = Array.from({ length: 8192 }, () => [rnd(), rnd(), rnd()]);
const pointerImg = MODE === "live" ? null : await createImageBitmap(await (await fetch(DATA + "pointer.png")).blob());
let view = { scale: 1, off: [0, 0], dpr: 1 };
function layout() {
  const cssW = window.innerWidth, cssH = window.innerHeight;
  const dpr = MODE === "capture" ? window.devicePixelRatio || 1 : Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  for (const c of [canvas, overlay]) {
    c.width = W;
    c.height = H;
    c.style.width = cssW + "px";
    c.style.height = cssH + "px";
  }
  const s = frameExact ? Math.min(W / LW, H / LH) : Math.min(W / LW, H / LH, dpr);
  view = { scale: s, off: [(LW - W / s) / 2, (LH - H / s) / 2], dpr };
  placeA11y();
}
const toLogical = (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return [(cx - r.left) * view.dpr / view.scale - 0.5 + view.off[0], (cy - r.top) * view.dpr / view.scale - 0.5 + view.off[1]];
};
let sim = createSim(P), clock = new FixedStepClock(STEP), queue = new EventQueue([]), log = { events: [] };
function reset(q) {
  sim = createSim(P);
  clock = new FixedStepClock(STEP);
  queue = q;
}
const stepFn = (dt, t) => sim.step(dt, queue.takeUntil(t));
function frame(snapOverride) {
  const snap = snapOverride || sim.snapshot();
  R.draw(snap, iconDots(P, snap, RNG), view.scale, view.off);
  return snap;
}
const og = overlay.getContext("2d", { willReadFrequently: true });
function pointerAt(T) {
  const ev = (log.events || []).filter((e) => e.type === "move" || e.type === "down" || e.type === "up");
  if (!ev.length) return null;
  let i = 0;
  while (i + 1 < ev.length && ev[i + 1].t <= T) i++;
  const a = ev[i], b = ev[Math.min(i + 1, ev.length - 1)];
  if (T <= a.t || b === a) return [a.x, a.y];
  const w = Math.min(1, (T - a.t) / Math.max(1e-6, b.t - a.t));
  return [a.x + (b.x - a.x) * w, a.y + (b.y - a.y) * w];
}
function drawPointer(T) {
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, overlay.width, overlay.height);
  const p = pointerAt(T), q = pointerAt(T - 1 / P.fps);
  if (!p || !pointerImg) return;
  const sh = P.cursor.shutter, vx = (p[0] - q[0]) * sh, vy = (p[1] - q[1]) * sh;
  const ss = P.cursor.sprite.ss, Rr = P.cursor.sprite.R, s = view.scale;
  const n = Math.max(1, Math.min(96, Math.ceil(Math.hypot(vx, vy) * s * 4)));
  og.globalCompositeOperation = "lighter";
  const tmp = new OffscreenCanvas(overlay.width, overlay.height), tg = tmp.getContext("2d", { willReadFrequently: true });
  tg.globalCompositeOperation = "lighter";
  tg.globalAlpha = 1 / n;
  tg.imageSmoothingQuality = "high";
  for (let k = 0; k < n; k++) {
    const f = n > 1 ? (k + 0.5) / n : 0, x = p[0] - vx * f, y = p[1] - vy * f;
    const dx = (x - view.off[0] + 0.5) * s - Rr * s, dy = (y - view.off[1] + 0.5) * s - Rr * s;
    tg.drawImage(pointerImg, dx, dy, pointerImg.width / ss * s, pointerImg.height / ss * s);
  }
  og.globalCompositeOperation = "source-over";
  og.drawImage(tmp, 0, 0);
}
const sw = document.getElementById("sw");
function placeA11y() {
  const T = P.geom.track, s = view.scale / view.dpr;
  sw.style.left = (T.cx - T.hw - view.off[0]) * s + "px";
  sw.style.top = (T.cy - T.hh - view.off[1]) * s + "px";
  sw.style.width = 2 * T.hw * s + "px";
  sw.style.height = 2 * T.hh * s + "px";
}
function syncAria() {
  const on = sim.snapshot().on;
  sw.setAttribute("aria-checked", on ? "true" : "false");
  document.documentElement.dataset.theme = on ? "light" : "dark";
}
let auto = false, autoNext = 0, autoK = 0, perfReq = null;
function trace(a) {
  const evs = (a.log.events || a.log).slice().sort((x, y) => x.t - y.t);
  const gaps = evs.filter((e) => e.type === "gap"), q = new EventQueue(evs.filter((e) => e.type !== "gap"));
  const sm = createSim(P), ck = new FixedStepClock(STEP), fn = (dt, t2) => sm.step(dt, q.takeUntil(t2));
  const out = [], pick = () => {
    const s = sm.snapshot();
    return { x: s.x, v: s.v, hw: s.hw, hh: s.hh, theta: s.theta, q: s.q, p: s.p, fam: s.fam, on: s.on, dragging: s.dragging ? 1 : 0, pressed: s.pressed ? 1 : 0 };
  };
  if (!a.hz) {
    for (let t2 = 0; t2 <= a.T + 1e-9; t2 += a.sample) {
      ck.runTo(t2, fn);
      out.push(Object.assign({ t: t2 }, pick()));
    }
    return out;
  }
  let t = 0, gi = 0, next = 0;
  while (t <= a.T + 1e-9) {
    while (gi < gaps.length && gaps[gi].t <= t) {
      ck.advance(gaps[gi].dt, fn);
      gi++;
    }
    if (t + 1e-9 >= next) {
      out.push(Object.assign({ t: next }, pick()));
      next += a.sample;
    }
    ck.advance(1 / a.hz, fn);
    t += 1 / a.hz;
  }
  return out;
}
window.APP = {
  trace,
  handle: () => {
    const s = sim.snapshot();
    return { x: s.x, y: s.cy };
  },
  layout: () => {
    layout();
    return "ok";
  },
  live: (o) => {
    auto = !!(o && o.auto);
    return true;
  },
  perf: (o) => new Promise((res) => {
    perfReq = { until: null, sec: o.sec, dts: [], res };
  }),
  ready: async () => true,
  loadLog: (l) => {
    log = l;
  },
  getState: () => sim.snapshot(),
  setState: () => {
  },

  renderAt: async (f) => {
    const T = f / P.fps;
    reset(new LogInput(log));
    clock.runTo(T, stepFn);
    frame();
    drawPointer(T);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
};
layout();
if (MODE === "capture") {
} else {
  window.addEventListener("resize", () => {
    layout();
  });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", () => layout());
  let last = null, tApp = 0;
  {
    canvas.style.cursor = `url(${DATA}pointer.svg) 4 3, default`;
    reset(new LiveInput(canvas, toLogical, () => tApp));
    const key = (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      const s = sim.snapshot();
      queue.push({ t: tApp, type: "down", x: s.x, y: s.cy, buttons: 1, pointerType: "keyboard" });
      queue.push({ t: tApp + STEP, type: "up", x: s.x, y: s.cy, buttons: 0, pointerType: "keyboard" });
    };
    sw.addEventListener("keydown", key);
  }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loop = (ts) => {
    const dt = last === null ? 0 : Math.min(0.25, (ts - last) / 1e3);
    last = ts;
    tApp += dt;
    if (auto && tApp >= autoNext) {
      const st = sim.snapshot();
      const k = autoK++ % 3;
      if (k < 2) {
        queue.push({ t: tApp, type: "down", x: st.x, y: st.cy });
        queue.push({ t: tApp + 0.08, type: "up", x: st.x, y: st.cy });
      } else {
        const x0 = st.x, x1 = st.on ? 382 : 572;
        for (let i = 0; i <= 20; i++) queue.push({ t: tApp + i * 0.025, type: i === 0 ? "down" : "move", x: x0 + (x1 - x0) * i / 20, y: st.cy });
        queue.push({ t: tApp + 0.53, type: "up", x: x1, y: st.cy });
      }
      autoNext = tApp + 0.9;
    }
    if (perfReq) {
      if (perfReq.until === null) perfReq.until = tApp + perfReq.sec;
      else perfReq.dts.push(dt * 1e3);
      if (tApp >= perfReq.until) {
        const d = perfReq.dts.slice().sort((a, b) => a - b);
        const r = { p95: d[Math.floor(d.length * 0.95)] || 0, p50: d[Math.floor(d.length * 0.5)] || 0, n: d.length, frames: d.length };
        perfReq.res(r);
        perfReq = null;
      }
    }
    clock.advance(reduce ? dt : dt, stepFn);
    frame();
    syncAria();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
