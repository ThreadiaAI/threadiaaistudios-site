/* Threadia Ai Studios: the feel of the site. Original sounds synthesised live (no files, no services) in A minor
   pentatonic, so moving across the page plays like a quiet instrument, plus small haptic taps on phones that allow it.
   Rules: silent until the visitor's first tap or click (browser policy), never over a song preview or video,
   quiet by design, a speaker toggle that remembers the choice, and hover sounds off for reduced motion. */
(function () {
  "use strict";
  var KEY = "tas_sound";
  var on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, verb = null, unlocked = false;
  // A minor pentatonic, two octaves: A3 C4 D4 E4 G4 A4 C5 D5 E5 G5 A5
  var SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];

  function busy() {
    if (document.documentElement.classList.contains("vm-open")) return true;
    var a = document.querySelectorAll("audio, video");
    for (var i = 0; i < a.length; i++) if (!a[i].paused && !a[i].muted && !a[i].hasAttribute("data-bgm")) return true;
    return false;
  }
  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.16;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    // tiny synthetic room so tones feel warm, not clicky
    verb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 0.9), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = buf;
    var wet = ctx.createGain(); wet.gain.value = 0.22; verb.connect(wet); wet.connect(master);
  }
  function unlock() {
    if (unlocked) return; unlocked = true; init();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }
  function ready() { return on && ctx && unlocked && ctx.state === "running"; }

  function tone(freq, opts) {
    opts = opts || {};
    var t = ctx.currentTime + (opts.delay || 0), dur = opts.dur || 0.35, vol = opts.vol || 0.5;
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = opts.type || "triangle"; o.frequency.setValueAtTime(freq, t);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    f.type = "lowpass"; f.frequency.value = opts.cut || 2600; f.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (opts.atk || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); if (opts.wet !== false) g.connect(verb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, from, to, vol) {
    var t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); g.connect(verb); s.start(t); s.stop(t + dur + 0.05);
  }

  var SFX = {
    tick: function (i) { tone(SCALE[6 + (i % 5)] * 2, { type: "sine", dur: 0.07, vol: 0.12, cut: 6000, wet: false }); },
    pluck: function (i) { tone(SCALE[i % SCALE.length], { dur: 0.42, vol: 0.22, cut: 1800 }); },
    select: function (i) { var n = 3 + (i % 5); tone(SCALE[n], { dur: 0.25, vol: 0.28 }); tone(SCALE[n + 2] || 880, { dur: 0.35, vol: 0.24, delay: 0.07 }); },
    play: function () { tone(SCALE[5], { type: "sine", dur: 0.9, vol: 0.35 }); tone(SCALE[8], { type: "sine", dur: 0.9, vol: 0.18, delay: 0.04 }); tone(SCALE[10], { type: "sine", dur: 0.7, vol: 0.08, delay: 0.08 }); },
    watch: function () { noise(0.45, 300, 2600, 0.22); tone(SCALE[0], { type: "sine", dur: 0.6, vol: 0.25, delay: 0.12 }); },
    buy: function () { tone(SCALE[8], { dur: 0.18, vol: 0.3, cut: 5000 }); tone(SCALE[10], { dur: 0.6, vol: 0.32, cut: 5000, delay: 0.09 }); tone(SCALE[10] * 2, { type: "sine", dur: 0.5, vol: 0.06, delay: 0.12 }); },
    close: function () { tone(SCALE[5], { type: "sine", dur: 0.22, vol: 0.18, glide: SCALE[2] }); },
    open: function () { tone(SCALE[2], { type: "sine", dur: 0.3, vol: 0.18, glide: SCALE[5] }); }
  };
  /* Christmas bells (seasonal, while xmas.js marks the page): every hover and press rings a bell instead, each
     kind of action its own bell, pitched up and down a C major pentatonic so moving across the page rings out a
     carol. Bell partials sit at the classic inharmonic ratios, which is what makes a sine sound like metal. */
  var BELL_SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  function bell(f, opts) {
    opts = opts || {};
    var parts = opts.parts || [[1, 1, 1], [2.76, .45, .55], [5.4, .25, .32], [8.93, .12, .2], [.5, .3, 1.6]];
    for (var k = 0; k < parts.length; k++) {
      tone(f * parts[k][0], { type: "sine", dur: (opts.dur || 1.1) * parts[k][2], vol: (opts.vol || .2) * parts[k][1], cut: 12000, atk: .002, delay: opts.delay || 0, wet: opts.wet });
    }
  }
  function jingle(n, vol) {   // sleigh bells: a shake of tiny bright bells with a little noise
    for (var j = 0; j < (n || 6); j++) {
      var d = j * (0.035 + Math.random() * 0.02);
      tone(3200 + Math.random() * 2400, { type: "sine", dur: .16, vol: (vol || .05) * (1 - j / 10), cut: 14000, atk: .001, delay: d, wet: false });
      tone(4600 + Math.random() * 3000, { type: "triangle", dur: .09, vol: (vol || .05) * .6, cut: 14000, atk: .001, delay: d + .01, wet: false });
    }
  }
  var XMAS = {
    tick: function (i) { bell(BELL_SCALE[5 + (i % 5)], { dur: .55, vol: .07, parts: [[1, 1, 1], [2.76, .35, .5], [5.4, .18, .3]], wet: false }); },
    pluck: function (i) { bell(BELL_SCALE[i % BELL_SCALE.length] / 2, { dur: 1.2, vol: .12 }); },
    select: function (i) { var n = i % 6; bell(BELL_SCALE[n], { dur: .9, vol: .14 }); bell(BELL_SCALE[n + 2], { dur: 1.1, vol: .12, delay: .09 }); },
    play: function () { bell(261.63, { dur: 2.4, vol: .22 }); bell(392, { dur: 2, vol: .1, delay: .03 }); jingle(4, .03); },
    watch: function () { jingle(9, .06); bell(BELL_SCALE[0], { dur: 1.6, vol: .14, delay: .1 }); },
    buy: function () { bell(BELL_SCALE[0], { dur: 1.4, vol: .14 }); bell(BELL_SCALE[2], { dur: 1.4, vol: .13, delay: .08 }); bell(BELL_SCALE[4], { dur: 1.8, vol: .14, delay: .16 }); bell(BELL_SCALE[5], { dur: 2.2, vol: .12, delay: .26 }); jingle(6, .04); },
    close: function () { bell(BELL_SCALE[4], { dur: .6, vol: .1 }); bell(BELL_SCALE[1], { dur: .9, vol: .1, delay: .08 }); },
    open: function () { bell(BELL_SCALE[1], { dur: .6, vol: .1 }); bell(BELL_SCALE[4], { dur: .9, vol: .1, delay: .08 }); }
  };
  var last = 0;
  function sfx(name, i, force) {
    if (!ready() || (!force && busy())) return;
    var now = performance.now(); if (now - last < 45) return; last = now;
    try { (document.documentElement.classList.contains("xmas-on") ? XMAS : SFX)[name](i || 0); } catch (e) {}
  }
  function buzz(p) { if (on && !reduce && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }

  // what each element sounds like
  var HOVER = [
    [".chip, .links a, .mini, .btn, .lic-link, .info, .discuss, .cart-btn, .song-link, .news-src, .sotd-poster, .botd-play, .bgm", "tick"],
    [".song, .album, .col-card, .news-card, .bp, .tier", "pluck"]
  ];
  var CLICK = [
    ["[data-buy], [data-blease], .buy, [href*='buy.stripe.com']", "buy", [12, 40, 22]],
    ["[data-watch]", "watch", 14],
    [".play-fab, .pbtn, [data-play], .bp", "play", 16],
    [".drawer-x, .vm-x", "close", 8],
    [".chip", "select", 8],
    [".lic-link, .info, .discuss, .album, .col-card", "open", 8],
    ["a, button", "tick", 6]
  ];
  function indexOf(el) { var p = el.parentElement; return p ? Array.prototype.indexOf.call(p.children, el) : 0; }
  function match(el, list) {
    for (var i = 0; i < list.length; i++) { var hit = el.closest(list[i][0]); if (hit) return [hit, list[i]]; }
    return null;
  }

  var lastHover = null;
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse" || reduce) return;
    var m = match(e.target, HOVER); if (!m || m[0] === lastHover) return;
    lastHover = m[0]; sfx(m[1][1], indexOf(m[0]));
  }, { passive: true });
  document.addEventListener("pointerout", function (e) { if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null; }, { passive: true });

  document.addEventListener("pointerdown", function (e) {
    unlock();
    if (e.target.closest(".snd-toggle")) return;
    var m = match(e.target, CLICK); if (!m) return;
    var name = m[1][1];
    sfx(name, indexOf(m[0]), name === "play" || name === "watch" || name === "buy" || name === "close");
    buzz(m[1][2]);
  }, { passive: true, capture: true });
  document.addEventListener("keydown", unlock, { once: true });

  // the speaker toggle
  var b = document.createElement("button");
  b.className = "snd-toggle"; b.type = "button";
  function paint() {
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", on ? "Site sounds on. Turn off" : "Site sounds off. Turn on");
    b.title = on ? "Sounds on" : "Sounds off";
    b.innerHTML = on
      ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zm-2.5-8v2a7 7 0 0 1 0 12v2a9 9 0 0 0 0-16z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>';
  }
  b.addEventListener("click", function () {
    on = !on; try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
    paint(); unlock(); if (on) setTimeout(function () { sfx("select", 2, true); }, 30);
  });
  paint();
  function mount() {
    document.body.appendChild(b);
    var pl = document.getElementById("player");
    var lift = function () { b.classList.toggle("lift", !!pl && !pl.hidden); };
    if (pl && window.MutationObserver) new MutationObserver(lift).observe(pl, { attributes: true, attributeFilter: ["hidden"] });
    lift();
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
