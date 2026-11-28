/* Live characters from real footage: the technique that finally made A.T. move in her portal (Aug 18 2026,
   agent_threads static/persona-video.js), carried to the site. Luke supplies a short clip, the background is matted
   out offline (scripts/bake_persona_video.py for people, scripts/bake_white_key_video.py for T.IQ on white), and
   every frame of motion is that footage: nothing here invents movement.

   The matte rides as a SECOND PANE under the colour in an ordinary opaque video (this machine's ffmpeg writes VP9
   "alpha" files with no alpha in them, and Safari has no VP9 alpha anyway), and these few lines put the figure back
   together on a WebGL canvas. The colour is premultiplied by the bake, so nothing haloes.

   Both panes are sampled a few texels inside the seam, or linear filtering blends the last colour row into
   the first matte row and draws a coloured line across the top of the figure (seen on the hat, 2026-11-27).

   Usage: <img data-live="assets/video/name"> (expects name.webm and name.mp4). The <img> is never removed, only
   hidden once a real frame has drawn; no WebGL, no video, a refused autoplay or reduced motion all leave the still,
   and the img gets a "livefail" event so the depth relief (relief.js) can take over instead. */
(function () {
  "use strict";
  var reduced = false;
  try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var VERT = "attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  var FRAG = "precision mediump float;uniform sampler2D t;varying vec2 v;void main(){" +
    "float y=mix(.003,.497,v.y);vec3 c=texture2D(t,vec2(v.x,y)).rgb;float a=texture2D(t,vec2(v.x,y+.5)).r;" +
    "a=smoothstep(.04,.96,a);gl_FragColor=vec4(min(c,vec3(a)),a);}";

  function fail(img) { img.dispatchEvent(new Event("livefail")); }

  function Live(img) {
    var base = img.dataset.live, vid = document.createElement("video");
    vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true; vid.preload = "auto";
    vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.crossOrigin = "anonymous";
    var s1 = document.createElement("source"); s1.src = base + ".webm"; s1.type = "video/webm";
    var s2 = document.createElement("source"); s2.src = base + ".mp4"; s2.type = "video/mp4";
    // Safari plays H.264 more reliably than VP9, so it gets the mp4 first
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) { vid.appendChild(s2); vid.appendChild(s1); } else { vid.appendChild(s1); vid.appendChild(s2); }
    var cv = document.createElement("canvas"); cv.className = "live-cv"; cv.setAttribute("aria-hidden", "true");
    var gl = null; try { gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
    if (!gl) { fail(img); return; }
    function sh(type, src) { var x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fail(img); return; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);

    var on = false, vis = false, raf = 0, dead = false, aspect = 1;
    function size() {
      // same height as the still it replaces, width from the video's own pane, standing on the same floor
      var r = img.getBoundingClientRect(), h = Math.max(2, r.height), w = Math.max(2, h * aspect);
      var dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.style.height = h + "px"; cv.style.width = w + "px";
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); gl.viewport(0, 0, cv.width, cv.height);
    }
    function draw() {
      raf = 0; if (dead || !vis || document.hidden) return;
      if (vid.readyState >= 2) {
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, vid); } catch (e) { die(); return; }
        gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!on) { on = true; img.classList.add("live-hidden"); cv.classList.add("on"); }
      }
      raf = requestAnimationFrame(draw);
    }
    function kick() {
      if (dead) return;
      if (vis && !document.hidden) { var p = vid.play(); if (p && p.catch) p.catch(function () { if (!on) die(); }); if (!raf) raf = requestAnimationFrame(draw); }
      else vid.pause();
    }
    function die() {
      if (dead) return; dead = true; vid.pause(); vid.removeAttribute("src"); while (vid.firstChild) vid.removeChild(vid.firstChild);
      if (cv.parentNode) cv.parentNode.removeChild(cv); img.classList.remove("live-hidden"); fail(img);
    }
    vid.addEventListener("loadedmetadata", function () { aspect = vid.videoWidth / (vid.videoHeight / 2); size(); });
    vid.addEventListener("error", die, true); s2.addEventListener("error", function () { if (!on && vid.networkState === 3) die(); });
    img.parentNode.insertBefore(cv, img.nextSibling);
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; kick(); }, { rootMargin: "150px" }).observe(img.parentNode);
    document.addEventListener("visibilitychange", kick);
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    vid.load();
  }

  function boot() {
    document.querySelectorAll("img[data-live]").forEach(function (img) {
      if (reduced) { fail(img); return; }
      var go = function () { new Live(img); };
      if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true });
    });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
