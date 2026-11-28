/* Christmas dressing: soft snowfall over the hero and a string of twinkle lights on the nav.
   Seasonal: shows from Nov 20 through Jan 6 (or anytime with ?xmas=1), and stays still under reduced motion. */
(() => {
  "use strict";
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  const season = (m === 11 && day >= 20) || m === 12 || (m === 1 && day <= 6) || /[?&]xmas=1/.test(location.search);
  if (!season) { document.documentElement.classList.add("no-xmas"); return; }
  document.documentElement.classList.add("xmas-on");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // twinkle lights on the nav
  const g = document.querySelector(".garland");
  if (g) {
    const cols = ["#ff4d6d", "#f2c46d", "#6be38a", "#2f6bff", "#ffffff"];
    let html = "";
    for (let i = 0; i < 34; i++) html += `<i style="--c:${cols[i % cols.length]};--d:${(i * 0.37) % 2.4}s;left:${(i + .5) / 34 * 100}%"></i>`;
    g.innerHTML = html;
  }

  // hero snowfall (2D canvas, about 140 flakes, paused off screen)
  const cv = document.getElementById("heroSnow"); if (!cv) return;
  const ctx = cv.getContext("2d"); const phone = matchMedia("(hover:none),(pointer:coarse)").matches;
  const dpr = Math.min(devicePixelRatio || 1, phone ? 1 : 1.5);
  let W = 0, H = 0, flakes = [], vis = true, raf = 0, wind = 0, tw = 0;
  function size() {
    const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((phone ? 70 : 150) * Math.min(1.4, W / 1400 + .4));
    flakes = Array.from({ length: n }, () => mk(true));
  }
  function mk(any) {
    const z = Math.random(); // depth: 0 far, 1 near
    return { x: Math.random() * W, y: any ? Math.random() * H : -10, z, r: .6 + z * 2.6, s: .25 + z * 1.1, p: Math.random() * 6.28, a: .25 + z * .6 };
  }
  function frame() {
    raf = 0; if (!vis || document.hidden) return;
    ctx.clearRect(0, 0, W, H); wind += (tw - wind) * .02;
    for (const f of flakes) {
      f.p += .01 + f.z * .01; f.y += f.s; f.x += Math.sin(f.p) * .35 * (f.z + .3) + wind * (f.z + .2);
      if (f.y > H + 10) Object.assign(f, mk(false)); if (f.x > W + 10) f.x = -10; if (f.x < -10) f.x = W + 10;
      ctx.globalAlpha = f.a * Math.min(1, (H - f.y) / (H * .25) + .15);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 2); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && vis && !document.hidden && !reduced) raf = requestAnimationFrame(frame); };
  size();
  if (reduced) { flakes.forEach(f => { ctx.globalAlpha = f.a * .7; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); }); return; }
  new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }).observe(cv);
  document.addEventListener("visibilitychange", kick);
  addEventListener("resize", () => { size(); }, { passive: true });
  addEventListener("pointermove", e => { tw = (e.clientX / innerWidth - .5) * 1.2; }, { passive: true });
  kick();
})();
