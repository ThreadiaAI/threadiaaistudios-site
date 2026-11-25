/* Woven light: a WebGL field of luminous threads in the Threadia ribbon colours.
   Follows the pointer, and swells with the music when the player is running (window.__level 0..1). */
(function () {
  const c = document.getElementById("threads");
  if (!c) return;
  const gl = c.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: true });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!gl) { c.style.background = "radial-gradient(80% 60% at 70% 30%, rgba(47,107,255,.35), transparent 60%), radial-gradient(60% 50% at 20% 80%, rgba(24,200,196,.25), transparent 60%)"; return; }

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const fs = `precision highp float;
  uniform vec2 r; uniform float t; uniform vec2 m; uniform float lv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5453); }
  vec3 ribbon(float x){ // blue -> teal -> green -> warm gold edge
    vec3 a = vec3(.184,.420,1.), b = vec3(.094,.784,.769), c = vec3(.420,.890,.541), d = vec3(.949,.769,.427);
    return x < .5 ? mix(a,b,x*2.) : (x < .85 ? mix(b,c,(x-.5)/.35) : mix(c,d,(x-.85)/.15));
  }
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*r) / r.y;
    vec2 mo = (m - .5*r) / r.y;
    float time = t * .18;
    vec3 col = vec3(0.);
    float amp = .16 + lv * .22;
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float k = fi / 18.;
      float off = (k - .5) * 1.25;
      float bend = exp(-pow(uv.x - mo.x, 2.) * 3.) * (mo.y - off) * .35;
      float y = off + bend
              + sin(uv.x * (1.6 + k * 1.3) + time * (1.2 + k) + fi * 1.7) * amp * (.6 + .4 * sin(time * .7 + fi))
              + sin(uv.x * 3.7 - time * 1.6 + fi) * .035;
      float d = abs(uv.y - y);
      float w = .0018 + .0035 * (.5 + .5 * sin(fi * 2.3 + time));
      float glow = w / (d + .0009) ;
      glow = pow(glow, 1.25) * (.55 + lv * .9);
      float fade = smoothstep(1.25, .1, abs(uv.x + sin(fi) * .2));
      col += ribbon(fract(k + uv.x * .18 + time * .05)) * glow * fade * .11;
    }
    col += vec3(.02,.03,.06) * (1. - length(uv) * .6);
    col *= .9 + .1 * hash(gl_FragCoord.xy + t);
    col = 1. - exp(-col * 1.35);
    gl_FragColor = vec4(col, 1.);
  }`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uM = gl.getUniformLocation(pr, "m"), uL = gl.getUniformLocation(pr, "lv");
  let W = 0, H = 0, mx = 0, my = 0, tx = 0, ty = 0, lv = 0, visible = true;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  function size() { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; gl.viewport(0, 0, c.width, c.height); tx = mx = c.width * .62; ty = my = c.height * .5; }
  size(); addEventListener("resize", size);
  addEventListener("pointermove", e => { const rc = c.getBoundingClientRect(); tx = (e.clientX - rc.left) * dpr; ty = (rc.height - (e.clientY - rc.top)) * dpr; }, { passive: true });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(c);
  const t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    lv += ((window.__level || 0) - lv) * .12;
    gl.uniform2f(uR, c.width, c.height); gl.uniform1f(uT, reduced ? 12 : (now - t0) / 1000); gl.uniform2f(uM, mx, my); gl.uniform1f(uL, lv);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);
})();
