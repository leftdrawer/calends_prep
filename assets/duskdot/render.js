const VS = `#version 300 es
in vec2 a; out vec2 v; void main(){ v = a; gl_Position = vec4(a * 2.0 - 1.0, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 v; out vec4 o;
uniform sampler2DArray tS, tTB, tKB, tKG, tGlowC, tGlowA;
uniform vec2 uOut;
uniform float uScale;
uniform vec4 uBase;
uniform vec4 uGlowBin;
uniform vec4 uTrack;
uniform float uTrackR;
uniform vec4 uKnob;
uniform float uKnobR;
uniform float uTheta;
uniform vec4 uTB;
uniform vec4 uKB;
uniform vec4 uG;
uniform vec3 uS;
uniform vec2 uOff;
uniform float uEdge;
uniform float uIsolate;
float ss(float e0, float e1, float x){ float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

vec3 rrut(vec2 p, vec2 c, float hw, float hh, float R){
  R = max(1.0, min(R, min(hw, hh)));
  float A = hw - R, B = hh - R; float PER = 4.0 * A + 4.0 * B + 6.283185307 * R;
  vec2 d = p - c; float qx = clamp(d.x, -A, A), qy = clamp(d.y, -B, B); float ex = d.x - qx, ey = d.y - qy;
  float od = length(vec2(ex, ey)); bool inside = od == 0.0;
  float t = inside ? R + min(A - abs(d.x), B - abs(d.y)) : R - od;
  float Qc = 1.570796327 * R;
  float sTR = A, sR = A + Qc, sBR = A + Qc + 2.0 * B, sB = A + 2.0 * Qc + 2.0 * B, sBL = 3.0 * A + 2.0 * Qc + 2.0 * B, sL = 3.0 * A + 3.0 * Qc + 2.0 * B, sTL = 3.0 * A + 3.0 * Qc + 4.0 * B;
  float u = 0.0;
  if (inside) {
    bool horiz = (B - abs(d.y)) <= (A - abs(d.x));
    if (horiz) u = d.y < 0.0 ? (d.x >= 0.0 ? d.x : PER + d.x) : sB + (A - d.x);
    else u = d.x >= 0.0 ? sR + (d.y + B) : sL + (B - d.y);
  } else if (ex == 0.0) { u = ey < 0.0 ? (d.x >= 0.0 ? d.x : PER + d.x) : sB + (A - d.x); }
  else if (ey == 0.0) { u = ex > 0.0 ? sR + (d.y + B) : sL + (B - d.y); }
  else {
    float ang = atan(ey, ex);
    if (ex > 0.0 && ey < 0.0) u = sTR + R * (ang + 1.570796327);
    else if (ex > 0.0) u = sBR + R * ang;
    else if (ey > 0.0) u = sBL + R * (ang - 1.570796327);
    else u = sTL + R * (ang + 3.141592654);
  }
  return vec3(mod(u, PER), t, PER);
}
vec3 arr(sampler2DArray s, vec2 uv, vec4 L){ return mix(texture(s, vec3(uv, L.x)).rgb, texture(s, vec3(uv, L.y)).rgb, L.z); }
vec3 band(sampler2DArray s, vec3 ut, vec4 P, vec4 L){
  float x = (ut.x / (ut.z / P.x) + 0.5) / P.x;
  float y = ((clamp(ut.y, P.y, P.y + P.z * (P.w - 1.0)) - P.y) / P.z + 0.5) / P.w;
  return arr(s, vec2(x, y), L);
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y);
  vec2 X = px / uScale - 0.5 + uOff;
  vec2 E = uS.xy * uS.z;
  vec3 img;
  if (uEdge > 0.0) img = arr(tS, (clamp(X, vec2(uEdge), E - uEdge) + 0.5) / uS.z / uS.xy, uBase) * 255.0;
  else if (any(lessThan(X, vec2(-2.0))) || any(greaterThan(X, E + 2.0))) {
    vec2 Xe = clamp(X, vec2(-2.0), E + 2.0), Xi = clamp(X, vec2(12.0), E - 12.0);
    img = mix(arr(tS, (Xe + 0.5) / uS.z / uS.xy, uBase), arr(tS, (Xi + 0.5) / uS.z / uS.xy, uBase), ss(0.0, 48.0, length(X - Xe))) * 255.0;
  } else img = arr(tS, (X + 0.5) / uS.z / uS.xy, uBase) * 255.0;
  vec3 tr = rrut(X, uTrack.xy, uTrack.z, uTrack.w, uTrackR);
  float tw = ss(-16.0, -12.0, tr.y) * (1.0 - ss(20.0, 24.0, tr.y));
  if (tw > 0.0) img = mix(img, band(tTB, tr, uTB, uBase) * 255.0, tw);
  vec3 kn = rrut(X, uKnob.xy, uKnob.z, uKnob.w, uKnobR);
  float wk = ss(-24.0, -19.0, kn.y);
  if (wk > 0.0) {
    vec3 kb = band(tKB, kn, uKB, uBase) * 255.0;
    vec2 g = ((X - uKnob.xy) / uKnob.zw + 1.0) * 0.5;
    vec3 kg = arr(tKG, g, uBase) * 255.0;
    vec3 knob = mix(kb, kg, ss(18.0, 24.0, kn.y));
    img = mix(img, knob, wk);
  }
  vec3 qc = vec3(0.0);
  float qa = 0.0;
  if (kn.y > uG.y && kn.y < uG.y + uG.z * uG.w) {
    float du = fract(kn.x / kn.z - uTheta + 0.5) - 0.5;
    vec2 gt = vec2(du + 0.5, ((kn.y - uG.y) / uG.z) / uG.w);
    qc = mix(texture(tGlowC, vec3(gt, uGlowBin.x)).rgb, texture(tGlowC, vec3(gt, uGlowBin.y)).rgb, uGlowBin.z);
    qa = mix(texture(tGlowA, vec3(gt, uGlowBin.x)).r, texture(tGlowA, vec3(gt, uGlowBin.y)).r, uGlowBin.z);
    img = img * (1.0 - qa) + qc * 255.0;
  }
  vec3 rgb = clamp(floor(img + 0.5), 0.0, 255.0) / 255.0;
  if (uIsolate < 0.5) o = vec4(rgb, 1.0);
  else {
    vec3 bg = arr(tS, (vec2(8.0, 8.0) + 0.5) / (uS.z * uS.xy), uBase) * 255.0;
    vec3 plate = arr(tS, (clamp(X, vec2(1.0), uS.xy * uS.z - 1.0) + 0.5) / (uS.z * uS.xy), uBase) * 255.0;
    float bgL = dot(bg, vec3(0.299, 0.587, 0.114));
    float plateL = dot(plate, vec3(0.299, 0.587, 0.114));
    float rim = ss(-15.0, -6.0, tr.y) * (1.0 - ss(16.0, 32.0, tr.y));
    vec3 rimCol = band(tTB, tr, uTB, uBase) * 255.0;
    float knobA = ss(-22.0, -8.0, kn.y);
    vec3 kb = band(tKB, kn, uKB, uBase) * 255.0;
    vec2 guv = ((X - uKnob.xy) / max(uKnob.zw, vec2(1.0)) + 1.0) * 0.5;
    vec3 kg = arr(tKG, clamp(guv, vec2(0.0), vec2(1.0)), uBase) * 255.0;
    vec3 knobCol = mix(kb, kg, ss(18.0, 24.0, kn.y));
    float deep = ss(24.0, 42.0, tr.y);
    float lightPage = ss(40.0, 150.0, bgL);
    float wellA = deep * mix(0.16, 0.74, lightPage);
    vec3 wellCol = mix(bg * 0.55, plate, lightPage);
    float outd = max(-tr.y, 0.0);
    float near = 1.0 - ss(2.0, 36.0, outd);
    float shade = clamp((bgL - plateL) / 24.0, 0.0, 1.0) * (1.0 - ss(-2.0, 16.0, tr.y)) * near;
    vec3 premul = vec3(0.0);
    float a = shade * 0.42;
    premul = wellCol * wellA + premul * (1.0 - wellA);
    a = wellA + a * (1.0 - wellA);
    premul = rimCol * rim + premul * (1.0 - rim);
    a = rim + a * (1.0 - rim);
    premul = knobCol * knobA + premul * (1.0 - knobA);
    a = knobA + a * (1.0 - knobA);
    premul = premul * (1.0 - qa) + qc * 255.0;
    a = a * (1.0 - qa) + qa;
    float feather = 1.0 - ss(10.0, 48.0, outd);
    vec2 nd = (X - uTrack.xy) / vec2(uTrack.z + 78.0, uTrack.w + 78.0);
    feather *= 1.0 - ss(0.78, 1.05, length(nd));
    premul *= feather;
    a *= feather;
    o = vec4(premul / 255.0, a);
  }
}`;
const DVS = `#version 300 es
in vec2 a; in vec4 d; in vec4 c;
uniform vec2 uOut; uniform float uSig;
out vec2 vp; out vec4 vd; out vec3 vc;
void main(){
  float r = d.z + 3.0 * uSig + 1.0;
  vec2 p = d.xy + (a * 2.0 - 1.0) * r;
  vp = p; vd = d; vc = c.rgb;
  gl_Position = vec4(p.x / uOut.x * 2.0 - 1.0, 1.0 - p.y / uOut.y * 2.0, 0.0, 1.0);
}`;
const DFS = `#version 300 es
precision highp float;
in vec2 vp; in vec4 vd; in vec3 vc; out vec4 o; uniform float uSig;
float erf_(float x){ float s = sign(x); x = abs(x); float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x); return s * y; }
float cov1(float x, float h, float s){ float k = 0.70710678 / s; return 0.5 * (erf_((x + h) * k) - erf_((x - h) * k)); }
void main(){
  vec2 q = vp - vd.xy;
  float c = cov1(q.x, vd.z, uSig) * cov1(q.y, vd.z, uSig) * vd.w;
  o = vec4(vc * c, c);
}`;
const RFS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D tR0, tR1;
uniform vec2 uOut, uOff, uW, uL;
uniform float uScale, uSign, uEdge, uIsolate, uTrackR;
uniform vec4 uTrack;
float ss(float e0, float e1, float x){ float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y);
  vec2 uv = (px / uScale + uOff) / uL;
  vec2 m = vec2(uEdge) / uL, uc = clamp(uv, m, 1.0 - m);
  float inb = 1.0 - ss(0.0, 48.0, length((uv - uc) * uL));
  vec3 r = ((texture(tR0, uc).rgb * 255.0 - 128.0) * uW.x + (texture(tR1, uc).rgb * 255.0 - 128.0) * uW.y) * inb;
  float mask = 1.0;
  if (uIsolate > 0.5) {
    vec2 X = px / uScale - 0.5 + uOff;
    vec2 d = abs(X - uTrack.xy) - vec2(uTrack.z, uTrack.w) + vec2(uTrackR);
    float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uTrackR;
    mask = 1.0 - ss(-2.0, 8.0, dist);
  }
  o = vec4(max(r * uSign, 0.0) / 255.0 * mask, 0.0);
}`;
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function mk(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function prog(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mk(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
async function loadImage(url) {
  const r = await fetch(url);
  const b = await r.blob();
  return await createImageBitmap(b, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
}
function pixels(img) {
  const c = new OffscreenCanvas(img.width, img.height);
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, img.width, img.height).data;
}
async function createRenderer(canvas, P, base, opt = {}) {
  const edge = opt.edge || 0;
  const isolate = !!opt.isolate;
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: isolate });
  if (!gl) throw new Error("webgl2");
  const L = P.look;
  const NB = L.baseBins[2];
  const texArr = (unit, data, w, h, n, wrapS) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, w, h, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const files = ["base_s", "base_tb", "base_kb", "base_kg", "glow_c", "glow_a"];
  const imgs = await Promise.all(files.map((f) => loadImage(base + f + ".png")));
  const dims = [[L.S[0], L.S[1], NB], [L.TB.n, L.TB.ts[2], NB], [L.KB.n, L.KB.ts[2], NB], [L.KG, L.KG, NB], [L.glowU, L.glowT[2], L.glowBins[2]], [L.glowU, L.glowT[2], L.glowBins[2]]];
  const wraps = [gl.CLAMP_TO_EDGE, gl.REPEAT, gl.REPEAT, gl.CLAMP_TO_EDGE, gl.REPEAT, gl.REPEAT];
  imgs.forEach((im, i) => texArr(i, pixels(im), dims[i][0], dims[i][1], dims[i][2], wraps[i]));
  imgs.forEach((im) => im.close && im.close());
  const tex2 = (unit, im) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, im.width, im.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels(im));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  const rest = await Promise.all(["rest_off", "rest_on"].map((f) => loadImage(base + f + ".png")));
  rest.forEach((im, i) => {
    tex2(6 + i, im);
    im.close && im.close();
  });
  const P0 = prog(gl, VS, FS), PD = prog(gl, DVS, DFS), PR = prog(gl, VS, RFS);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(P0, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const dvao = gl.createVertexArray();
  gl.bindVertexArray(dvao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  const aD = gl.getAttribLocation(PD, "a");
  gl.enableVertexAttribArray(aD);
  gl.vertexAttribPointer(aD, 2, gl.FLOAT, false, 0, 0);
  const inst = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, inst);
  const dl = gl.getAttribLocation(PD, "d"), cl = gl.getAttribLocation(PD, "c");
  gl.enableVertexAttribArray(dl);
  gl.vertexAttribPointer(dl, 4, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(dl, 1);
  gl.enableVertexAttribArray(cl);
  gl.vertexAttribPointer(cl, 4, gl.FLOAT, false, 32, 16);
  gl.vertexAttribDivisor(cl, 1);
  gl.bindVertexArray(null);
  const U = (n) => gl.getUniformLocation(P0, n), UD = (n) => gl.getUniformLocation(PD, n), UR = (n) => gl.getUniformLocation(PR, n);
  gl.useProgram(PR);
  gl.uniform1i(UR("tR0"), 6);
  gl.uniform1i(UR("tR1"), 7);
  gl.uniform2f(UR("uL"), P.logical[0], P.logical[1]);
  gl.useProgram(P0);
  ["tS", "tTB", "tKB", "tKG", "tGlowC", "tGlowA"].forEach((n, i) => gl.uniform1i(U(n), i));
  const T = P.geom.track;
  gl.uniform4f(U("uTrack"), T.cx, T.cy, T.hw, T.hh);
  gl.uniform1f(U("uTrackR"), T.r);
  gl.uniform4f(U("uTB"), L.TB.n, L.TB.ts[0], L.TB.ts[1], L.TB.ts[2]);
  gl.uniform4f(U("uKB"), L.KB.n, L.KB.ts[0], L.KB.ts[1], L.KB.ts[2]);
  gl.uniform4f(U("uG"), L.glowU, L.glowT[0], L.glowT[1], L.glowT[2]);
  gl.uniform3f(U("uS"), L.S[0], L.S[1], L.S[2]);
  const bins = (spec, p) => {
    const [p0, dp, n] = spec;
    const f = (p - p0) / dp;
    const i = Math.max(0, Math.min(n - 2, Math.floor(f)));
    return [i, i + 1, Math.max(0, Math.min(1, f - i))];
  };
  let inst32 = new Float32Array(0);
  function draw(snap, dots, scale, off = [0, 0]) {
    const W = canvas.width, H = canvas.height;
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.useProgram(P0);
    gl.bindVertexArray(vao);
    gl.uniform2f(U("uOut"), W, H);
    gl.uniform1f(U("uScale"), scale);
    gl.uniform2f(U("uOff"), off[0], off[1]);
    gl.uniform1f(U("uEdge"), edge);
    gl.uniform1f(U("uIsolate"), isolate ? 1 : 0);
    if (isolate) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    const b = bins(L.baseBins, snap.p), g = bins(L.glowBins, snap.p);
    gl.uniform4f(U("uBase"), b[0], b[1], b[2], 0);
    gl.uniform4f(U("uGlowBin"), g[0], g[1], g[2], 0);
    gl.uniform4f(U("uKnob"), snap.x, snap.cy, snap.hw, snap.hh);
    gl.uniform1f(U("uKnobR"), snap.r);
    gl.uniform1f(U("uTheta"), snap.theta);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (dots && dots.length) {
      const n = dots.length;
      if (inst32.length < n * 8) inst32 = new Float32Array(n * 8);
      for (let i = 0; i < n; i++) {
        const d = dots[i], k = i * 8;
        inst32[k] = (d[0] - off[0] + 0.5) * scale;
        inst32[k + 1] = (d[1] - off[1] + 0.5) * scale;
        inst32[k + 2] = d[5] * scale / 2;
        inst32[k + 3] = d[6];
        inst32[k + 4] = d[2] / 255;
        inst32[k + 5] = d[3] / 255;
        inst32[k + 6] = d[4] / 255;
        inst32[k + 7] = 0;
      }
      gl.useProgram(PD);
      gl.bindVertexArray(dvao);
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      gl.bufferData(gl.ARRAY_BUFFER, inst32.subarray(0, n * 8), gl.DYNAMIC_DRAW);
      gl.uniform2f(UD("uOut"), W, H);
      gl.uniform1f(UD("uSig"), Math.sqrt(Math.pow(P.dots.sigma * scale, 2) + 1 / 12));
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
      gl.disable(gl.BLEND);
    }
    const RS = P.rest, Gm = P.geom;
    const wEnd = (end) => {
      const dp = Math.max(Math.abs(snap.p - end), Math.abs((snap.q === void 0 ? snap.p : snap.q) - end));
      const ax = (end ? 1 : 0.5) - P.glow.restBias, dt = Math.abs(((snap.theta - ax) % 1 + 1.5) % 1 - 0.5);
      const dh = Math.abs(snap.hw - Gm.knobHW) + Math.abs(snap.hh - Gm.knobHH);
      return (1 - sstep(RS.p0, RS.p1, dp)) * (1 - sstep(RS.t0, RS.t1, dt)) * (1 - sstep(RS.h0, RS.h1, dh));
    };
    const w0 = wEnd(0), w1 = wEnd(1);
    if (w0 > 0 || w1 > 0) {
      gl.useProgram(PR);
      gl.bindVertexArray(vao);
      gl.uniform2f(UR("uOut"), W, H);
      gl.uniform1f(UR("uScale"), scale);
      gl.uniform2f(UR("uOff"), off[0], off[1]);
      gl.uniform1f(UR("uEdge"), edge);
      gl.uniform1f(UR("uIsolate"), isolate ? 1 : 0);
      gl.uniform4f(UR("uTrack"), T.cx, T.cy, T.hw, T.hh);
      gl.uniform1f(UR("uTrackR"), T.r);
      gl.uniform2f(UR("uW"), w0, w1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.uniform1f(UR("uSign"), 1);
      gl.blendEquation(gl.FUNC_ADD);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform1f(UR("uSign"), -1);
      gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }
  return { draw, gl };
}
function iconDots(P, snap, rng01) {
  const D = P.dots, p = snap.q === void 0 ? snap.p : snap.q, out = [];
  const moon = p < 0.5, set = moon ? D.moon : D.sun;
  const e = moon ? Math.min(1, Math.max(0, (p - D.moonStart) / (0.5 - D.moonStart))) : Math.min(1, Math.max(0, (D.sunEnd - p) / (D.sunEnd - 0.5)));
  const spread = D.scatter * Math.pow(e, D.scatterPow), fade = 1 - D.fade * Math.pow(e, D.fadePow);
  const ox = snap.x - D.lag * snap.v, oy = snap.cy;
  for (let i = 0; i < set.length; i++) {
    const d = set[i], r = rng01[(moon ? 0 : 4096) + i];
    const ang = r[0] * 6.283185307, mag = 0.3 + 0.7 * r[1];
    const a = Math.max(0, 1 - (1 - fade) * (0.75 + 0.5 * r[2]));
    out.push([ox + d[0] + Math.cos(ang) * mag * spread, oy + d[1] + Math.sin(ang) * mag * spread, d[2], d[3], d[4], d[5], a]);
  }
  return out;
}
export {
  createRenderer,
  iconDots
};
