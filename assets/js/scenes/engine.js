/* Threadia Scapes: a tiny seasonal scene engine. One fullscreen fragment shader per scene, no libraries.
   Each scene registers itself on window.ThreadiaScapes.scenes[name] = { frag, uniforms? }.
   Any <canvas data-scape="christmas"> on the page gets that scene. The same scene files are meant to run later as
   desktop wallpapers (a Lively style web wallpaper or our own app), so keep them plain and self contained.

   Performance rules: pixel ratio capped (1 on phones), render scale 0.75, 30 fps on phones, paused off screen and in
   hidden tabs, a single still frame under prefers-reduced-motion, and the CSS background shows if WebGL is missing. */
(() => {
  "use strict";
  const S = window.ThreadiaScapes = window.ThreadiaScapes || { scenes: {} };
  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = matchMedia("(hover:none),(pointer:coarse)").matches || innerWidth < 760;

  function mount(cv) {
    const scene = S.scenes[cv.dataset.scape]; if (!scene) return;
    const gl = cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) { cv.classList.add("scape-off"); return; }
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, "precision highp float;uniform vec2 R;uniform float T;uniform vec2 M;uniform float SC;\n" + scene.frag);
    if (!vs || !fs) { cv.classList.add("scape-off"); return; }
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, "R"), uT = gl.getUniformLocation(pr, "T"), uM = gl.getUniformLocation(pr, "M"), uS = gl.getUniformLocation(pr, "SC");
    const scale = (phone ? 1 : Math.min(devicePixelRatio || 1, 1.5)) * 0.75;
    let w = 0, h = 0, vis = false, raf = 0, last = 0, mx = .5, my = .5, tx = .5, ty = .5, scr = 0;
    const t0 = performance.now() - Math.random() * 20000;
    function size() {
      const r = cv.getBoundingClientRect(); const nw = Math.max(2, Math.round(r.width * scale)), nh = Math.max(2, Math.round(r.height * scale));
      if (nw !== w || nh !== h) { w = cv.width = nw; h = cv.height = nh; gl.viewport(0, 0, w, h); }
    }
    function draw(now) {
      mx += (tx - mx) * .04; my += (ty - my) * .04;
      gl.uniform2f(uR, w, h); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform2f(uM, mx, my); gl.uniform1f(uS, scr);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      raf = 0; if (!vis || document.hidden) return;
      if (!phone || now - last > 32) { last = now; size(); draw(now); }
      raf = requestAnimationFrame(loop);
    }
    const kick = () => { if (!raf && vis && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (reduced && vis) { size(); draw(performance.now()); } kick(); }, { rootMargin: "120px" }).observe(cv);
    document.addEventListener("visibilitychange", kick);
    addEventListener("resize", () => { if (reduced) { size(); draw(performance.now()); } }, { passive: true });
    const host = cv.parentElement;
    host.addEventListener("pointermove", e => { const r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height; }, { passive: true });
    addEventListener("scroll", () => { const r = host.getBoundingClientRect(); scr = Math.max(-1, Math.min(1, -r.top / Math.max(1, r.height))); }, { passive: true });
    size(); draw(performance.now());
  }
  const boot = () => document.querySelectorAll("canvas[data-scape]").forEach(mount);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
