import { springStep, lowpassStep } from "./core.js";
const FPS = 30;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function createSim(P) {
  const G = P.geom, M = P.motion;
  const X0 = G.knobLeft, X1 = G.knobRight, MID = (X0 + X1) / 2;
  const s = {
    t: 0,
    x: X0,
    v: 0,
    target: X0,
    on: 0,
    fam: 0,
    pressed: false,
    dragging: false,
    grab: 0,
    downX: 0,
    px: 0,
    py: 0,
    inside: false,
    st: 0,
    sv: 0,
    pr: 0,
    theta: 0.5 - P.glow.restBias,
    hover: false,
    q: 0,
    zone: true
  };
  if (P.start === 1) {
    s.x = X1;
    s.target = X1;
    s.on = 1;
    s.fam = 1;
    s.theta = 1 - P.glow.restBias;
    s.q = 1;
  }
  const prog = () => (s.x - X0) / (X1 - X0);
  function hit(x, y) {
    const T = G.track, kx = s.x, ky = G.knobY, hw = G.knobHW, hh = G.knobHH;
    const inTrack = Math.abs(x - T.cx) <= T.hw && Math.abs(y - T.cy) <= T.hh;
    const inKnob = Math.abs(x - kx) <= hw && Math.abs(y - ky) <= hh;
    return inTrack || inKnob;
  }
  function rubber(x) {
    const R = M.rubberR, c = M.rubberC;
    if (x > X1) return X1 + R * Math.tanh(c * (x - X1) / R);
    if (x < X0) return X0 - R * Math.tanh(c * (X0 - x) / R);
    return x;
  }
  function onEvent(e) {
    s.px = e.x;
    s.py = e.y;
    if (e.type === "down") {
      if (!hit(e.x, e.y)) return;
      s.pressed = true;
      s.dragging = false;
      s.downX = e.x;
      s.grab = e.x - s.x;
    } else if (e.type === "move") {
      s.hover = hit(e.x, e.y);
      if (s.pressed && !s.dragging && Math.abs(e.x - s.downX) > M.dragStart) s.dragging = true;
    } else if (e.type === "up" || e.type === "cancel") {
      if (!s.pressed) return;
      if (s.dragging) {
        const vt = M.releaseV;
        s.target = s.v > vt ? X1 : s.v < -vt ? X0 : s.x > MID ? X1 : X0;
      } else if (e.type === "up") {
        s.target = s.target === X1 ? X0 : X1;
      }
      s.on = s.target === X1 ? 1 : 0;
      s.pressed = false;
      s.dragging = false;
    }
  }
  function step(dt, evs) {
    for (const e of evs) onEvent(e);
    let wn = M.wn, z = M.zeta, tg = s.target;
    if (s.dragging) {
      tg = rubber(s.px - s.grab);
      wn = M.dragWn;
      z = M.dragZeta;
    }
    [s.x, s.v] = springStep(s.x, s.v, tg, wn, z, dt);
    const D = P.deform;
    const over = Math.max(0, s.x - X1, X0 - s.x);
    [s.st, s.sv] = springStep(s.st, s.sv, Math.min(D.k * Math.abs(s.v), D.lim) - D.squash * over, D.wn, D.zeta, dt);
    s.pr = lowpassStep(s.pr, s.pressed ? 1 : 0, D.pressTau, dt);
    const p = prog(), Gl = P.glow, eps = Gl.endEps, dl = Gl.restBias;
    const inz = p <= eps || p >= 1 - eps;
    if (s.zone && !inz) s.fam = (s.theta % 1 + 1) % 1 > 0.5 ? 1 : 0;
    s.zone = inz;
    let th;
    if (p >= 1 - eps) th = s.fam === 0 ? -dl : 1 - dl;
    else if (p <= eps) th = 0.5 - dl;
    else {
      const h = interp(Gl.hKnots, clamp(p, 0, 1));
      th = s.fam === 0 ? 0.5 - 0.5 * h : 1 - 0.5 * (1 - h);
    }
    th += Math.round(s.theta - th);
    s.theta = lowpassStep(s.theta, th, Gl.tau, dt);
    s.q = lowpassStep(s.q, p, P.dots.iconTau, dt);
    s.t += dt;
  }
  function interp(knots, x) {
    const n = knots.length - 1, f = x * n, i = Math.min(n - 1, Math.max(0, Math.floor(f))), w = f - i;
    return knots[i] * (1 - w) + knots[i + 1] * w;
  }
  function snapshot() {
    const D = P.deform, p = prog();
    return {
      t: s.t,
      p,
      q: s.q,
      x: s.x,
      v: s.v,
      on: s.on,
      fam: s.fam,
      theta: s.theta,
      pressed: s.pressed,
      dragging: s.dragging,
      hw: G.knobHW * (1 + s.st) * (1 - D.pressX * s.pr),
      hh: G.knobHH * (1 - D.kap * s.st) * (1 - D.pressY * s.pr),
      cy: G.knobY,
      r: G.knobR,
      px: s.px,
      py: s.py,
      hover: s.hover
    };
  }
  return { step, snapshot };
}
export {
  FPS,
  createSim
};
