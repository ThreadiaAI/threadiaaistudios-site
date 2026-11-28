/* Living relief: the technique A.T. first moved with (her portal, Aug 17 2026), carried to the site.
   A borderless still is displaced by a baked per pixel depth map (Depth Anything V2 Small, baked offline by
   agent_threads scripts/bake_persona_depth.py), so the figure has volume, parallax, shading and breathing.
   It is a 2.5D relief: no unseen surfaces, no articulation, and nothing invented.

   The rules that made it read as alive, kept from the original:
     breathing is LOCAL (weighted onto the chest, never a uniform scale), sway is low pass noise that pivots
     about the feet (never a sine), a small fast tremor sits on top, a gate lets the figure settle and pause,
     and the depth drives a faint shading term plus a rim light so it is lit by the scene it stands in.
   Amplitudes are in DISPLAY pixels, converted at runtime, because the same native pixel is invisible on one
   screen and obvious on another.

   Usage: <img data-relief-depth="depth.png" data-relief="at|tiq"> inside a positioned figure. The <img> is
   never removed, only hidden once a real frame has drawn, so no WebGL, a missing depth map, reduced motion or
   a sustained low frame rate all end with exactly the still that was there before. */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var PRESETS = {
    // A.T.: a person standing still, the portal numbers scaled up a touch for a figure drawn ~2x larger.
    at:  { nx: 96, ny: 144, chest: 0.27, chestW: 0.10, parallax: 4.5, swayX: 3.4, swayY: 1.3, swayRotDeg: 0.6,
           tremor: 0.6, breathPx: 3.0, bob: 0, relief: 0.96, rim: [1.0, 0.42, 0.48], rimK: 0.12, mouse: 7 },
    // T.IQ: a small robot mid dance, so a bouncier bob on a beat and a wider rock, still pivoting on his foot.
    tiq: { nx: 110, ny: 110, chest: 0.48, chestW: 0.16, parallax: 5.0, swayX: 4.0, swayY: 1.5, swayRotDeg: 2.6,
           tremor: 0.4, breathPx: 1.6, bob: 5.0, bobHz: 1.55, relief: 1.1, rim: [1.0, 0.78, 0.42], rimK: 0.14, mouse: 9 }
  };
  var SHADE = 0.16;

  function Drift(periods, seed) {
    this.p = periods; this.ph = [];
    for (var i = 0; i < periods.length; i++) this.ph.push(Math.abs(Math.sin(seed * (i + 1) * 12.9898) * 43758.5453) % 1);
  }
  var DRIFT_GAIN = 2.4;   // measured in August: without it the incommensurate sum only swings about +-0.3
  Drift.prototype.at = function (t) {
    var v = 0, w = 0;
    for (var i = 0; i < this.p.length; i++) { var a = 1 / (i + 1); v += a * Math.sin(2 * Math.PI * (t / this.p[i] + this.ph[i])); w += a; }
    return Math.max(-1, Math.min(1, (v / w) * DRIFT_GAIN));
  };

  var VERT = [
    "precision mediump float;",
    "attribute vec2 aPos; attribute vec2 aUV; attribute float aDepth; attribute vec3 aNormal; attribute float aChest;",
    "uniform vec2 uCam; uniform vec2 uShift; uniform float uRot; uniform float uBreath; uniform float uRelief;",
    "varying vec2 vUV; varying vec3 vN;",
    "void main(){",
    "  vUV = aUV; vN = aNormal; vec2 p = aPos;",
    "  p.x += sign(p.x) * uBreath * aChest; p.y += uBreath * 0.45 * aChest;",
    "  float c = cos(uRot), s = sin(uRot); vec2 q = vec2(p.x, p.y + 1.0);",
    "  p = vec2(q.x * c - q.y * s, q.x * s + q.y * c) - vec2(0.0, 1.0);",
    "  p += uCam * (aDepth - 0.5) * uRelief; p += uShift;",
    "  gl_Position = vec4(p, 0.0, 1.0);",
    "}"].join("\n");
  var FRAG = [
    "precision mediump float;",
    "uniform sampler2D uTex; uniform vec3 uRimColor; uniform float uShade; uniform float uRim;",
    "varying vec2 vUV; varying vec3 vN;",
    "void main(){",
    "  vec4 t = texture2D(uTex, vUV); if (t.a < 0.01) discard;",
    "  vec3 n = normalize(vN);",
    "  float lam = max(0.0, dot(n, normalize(vec3(-0.35, 0.55, 0.76))));",
    "  vec3 col = t.rgb * (1.0 + uShade * (lam - 0.5));",
    "  float rim = pow(1.0 - max(0.0, n.z), 3.0);",
    "  col += uRimColor * rim * uRim * t.a;",
    "  gl_FragColor = vec4(col, t.a);",
    "}"].join("\n");

  function load(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.decoding = "async"; im.onload = function () { res(im); }; im.onerror = function () { rej(new Error(src)); }; im.src = src; });
  }
  function sh(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

  function Relief(img) {
    this.img = img; this.P = PRESETS[img.dataset.relief] || PRESETS.at;
    var seed = img.dataset.relief === "tiq" ? 31 : 1;
    this.dx = new Drift([11.3, 6.7, 17.9], 1.7 + seed); this.dy = new Drift([9.1, 14.3, 5.3], 3.1 + seed);
    this.dr = new Drift([13.7, 8.3], 5.9 + seed); this.dpx = new Drift([15.1, 7.9, 23.3], 7.3 + seed);
    this.dpy = new Drift([12.7, 6.1], 11.7 + seed); this.dbr = new Drift([37.0, 19.0], 13.1 + seed);
    this.tx = new Drift([0.11, 0.083, 0.127], 17.3 + seed); this.ty = new Drift([0.097, 0.119], 19.1 + seed);
    this.dg = new Drift([23.0, 31.0], 23.9 + seed);
    this.mx = 0; this.my = 0; this.tmx = 0; this.tmy = 0;
    this.fps = 60; this.frames = 0; this.t0 = 0; this.low = 0; this.vis = false; this.raf = 0; this.ok = false;
  }
  Relief.prototype.start = function () {
    var self = this, cv = document.createElement("canvas");
    cv.className = "relief-cv"; cv.setAttribute("aria-hidden", "true"); this.cv = cv;
    var gl = null; try { gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true }); } catch (e) {}
    if (!gl) return; this.gl = gl;
    Promise.all([load(this.img.currentSrc || this.img.src), load(this.img.dataset.reliefDepth)]).then(function (ims) {
      try {
        self.build(ims[0], ims[1]);
        self.img.parentNode.insertBefore(cv, self.img.nextSibling);
        self.resize(); self.draw(performance.now() / 1000);
        self.img.classList.add("relief-hidden"); self.ok = true;
        new IntersectionObserver(function (es) { self.vis = es[0].isIntersecting; self.kick(); }, { rootMargin: "100px" }).observe(cv);
        document.addEventListener("visibilitychange", function () { self.kick(); });
        var host = self.img.closest("section") || document.body;
        host.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); self.tmx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2))); self.tmy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2))); }, { passive: true });
        var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (self.ok) self.resize(); }, 150); });
      } catch (e) { console.warn("[relief] keeping the still:", e && e.message); self.fail(); }
    }).catch(function (e) { console.warn("[relief] asset missing, keeping the still:", e && e.message); });
  };
  Relief.prototype.fail = function () {
    this.ok = false; if (this.raf) cancelAnimationFrame(this.raf);
    if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    this.img.classList.remove("relief-hidden");
  };
  Relief.prototype.build = function (colorImg, depthImg) {
    var gl = this.gl, P = this.P, NX = P.nx, NY = P.ny;
    var c = document.createElement("canvas"); c.width = depthImg.naturalWidth; c.height = depthImg.naturalHeight;
    var cx = c.getContext("2d"); cx.drawImage(depthImg, 0, 0); var dd = cx.getImageData(0, 0, c.width, c.height).data, dw = c.width, dh = c.height;
    function D(u, v) { var x = Math.min(dw - 1, Math.max(0, Math.round(u * (dw - 1)))), y = Math.min(dh - 1, Math.max(0, Math.round(v * (dh - 1)))); return dd[(y * dw + x) * 4] / 255; }
    var pos = [], uv = [], dep = [], nrm = [], chest = [], idx = [], i, j;
    for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
      var u = i / (NX - 1), v = j / (NY - 1);
      pos.push(u * 2 - 1, 1 - v * 2); uv.push(u, v);
      dep.push(D(u, v)); chest.push(Math.exp(-Math.pow((v - P.chest) / P.chestW, 2)));
      var e = 1.5 / NX, dzdx = (D(Math.min(1, u + e), v) - D(Math.max(0, u - e), v)) * 2.2, dzdy = (D(u, Math.min(1, v + e)) - D(u, Math.max(0, v - e))) * 2.2;
      var len = Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1) || 1; nrm.push(-dzdx / len, dzdy / len, 1 / len);
    }
    // Unlike the portal (a hard matte on black) these cutouts have soft hair and fur edges with depth zero, so
    // the whole grid is kept and the edge pixels simply ride at mid depth instead of being dropped.
    for (j = 0; j < NY - 1; j++) for (i = 0; i < NX - 1; i++) { var a = j * NX + i, b = a + 1, c2 = a + NX, d2 = c2 + 1; idx.push(a, b, c2, b, d2, c2); }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl, gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl, gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr); this.prog = pr;
    function buf(data, n, name) { var bb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); var l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 0, 0); }
    // Edge vertices (depth 0) are lifted to mid depth so parallax does not tear the soft edge off the figure.
    var depAdj = dep.map(function (z) { return z <= 0.004 ? 0.5 : z; });
    buf(pos, 2, "aPos"); buf(uv, 2, "aUV"); buf(depAdj, 1, "aDepth"); buf(nrm, 3, "aNormal"); buf(chest, 1, "aChest");
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); this.n = idx.length;
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, colorImg);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.u = {}; var self = this;
    ["uCam", "uShift", "uRot", "uBreath", "uRelief", "uRimColor", "uShade", "uRim"].forEach(function (k) { self.u[k] = gl.getUniformLocation(pr, k); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
  };
  Relief.prototype.resize = function () {
    var r = this.img.getBoundingClientRect(), w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
    var dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.cv.width, this.cv.height); this.px = 2 / w; this.py = 2 / h;
  };
  Relief.prototype.kick = function () {
    var self = this;
    if (this.raf || !this.ok || !this.vis || document.hidden || reduced) return;
    this.t0 = performance.now(); this.frames = 0;
    var loop = function (now) {
      self.raf = 0; if (!self.ok || !self.vis || document.hidden) return;
      self.frames++;
      if (now - self.t0 > 1000) {
        self.fps = self.frames * 1000 / (now - self.t0); self.frames = 0; self.t0 = now;
        if (self.fps < 24) { if (++self.low >= 4) { console.info("[relief] sustained low fps, keeping the still"); self.fail(); return; } } else self.low = 0;
      }
      try { self.draw(now / 1000); } catch (e) { self.fail(); return; }
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };
  Relief.prototype.draw = function (t) {
    var gl = this.gl, u = this.u, P = this.P;
    var gate = 0.55 + 0.45 * Math.max(0, this.dg.at(t));
    var sx = this.dx.at(t) * P.swayX * this.px * gate + this.tx.at(t) * P.tremor * this.px;
    var sy = this.dy.at(t) * P.swayY * this.py * gate + this.ty.at(t) * P.tremor * this.py;
    var rot = this.dr.at(t) * (P.swayRotDeg * Math.PI / 180) * gate;
    if (P.bob) {   // T.IQ's dance: a bounce on the beat (sharp up, soft landing) and a rock in time with it
      var bp = (t * P.bobHz) % 1, bounce = Math.pow(Math.sin(bp * Math.PI), 1.6);
      sy += bounce * P.bob * this.py; rot += Math.sin(t * P.bobHz * Math.PI) * (P.swayRotDeg * 0.6 * Math.PI / 180);
    }
    var rate = 0.24 * (1 + 0.18 * this.dbr.at(t)), ph = (t * rate) % 1;
    var br = ph < 0.42 ? Math.sin(ph / 0.42 * Math.PI * 0.5) : Math.cos((ph - 0.42) / 0.58 * Math.PI * 0.5);
    var breath = br * P.breathPx * this.px;
    this.mx += (this.tmx - this.mx) * 0.05; this.my += (this.tmy - this.my) * 0.05;
    var cx = (this.dpx.at(t) * P.parallax + this.mx * P.mouse) * this.px, cy = (this.dpy.at(t) * P.parallax * 0.45 - this.my * P.mouse * 0.5) * this.py;
    if (reduced) { sx = sy = rot = breath = cx = cy = 0; }
    gl.useProgram(this.prog);
    gl.uniform2f(u.uCam, cx, cy); gl.uniform2f(u.uShift, sx, sy); gl.uniform1f(u.uRot, rot); gl.uniform1f(u.uBreath, breath);
    gl.uniform1f(u.uRelief, P.relief); gl.uniform1f(u.uShade, SHADE); gl.uniform1f(u.uRim, P.rimK); gl.uniform3f(u.uRimColor, P.rim[0], P.rim[1], P.rim[2]);
    gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
  };

  function boot() {
    if (reduced) return;
    document.querySelectorAll("img[data-relief-depth]").forEach(function (img) {
      var r = new Relief(img), go = function () { r.start(); };
      if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
    });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
