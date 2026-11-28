/* Holiday background music: the N.S.M Christmas instrumental plays as visitors arrive, with a small pause button
   that stays with them (fixed, bottom left beside the sound toggle) as they move around the site.
   Browsers refuse sound before a visitor's first tap, click or key, so it tries straight away and otherwise starts
   on that first gesture. A pause is remembered for the visit (and "off" is remembered for good), the place in the
   track carries across pages, and it steps aside for a song preview or a video, then waits to be asked back. */
(function () {
  "use strict";
  var SRC = (document.querySelector('meta[name="bgm"]') || {}).content || "/assets/audio/nsm-christmas-instrumental.mp3";
  var TITLE = "N.S.M Christmas (Instrumental)";
  var VOL = 0.32, K_OFF = "tas_bgm_off", K_T = "tas_bgm_t", K_P = "tas_bgm_paused";
  var store = { get: function (s, k) { try { return s.getItem(k); } catch (e) { return null; } }, set: function (s, k, v) { try { s.setItem(k, v); } catch (e) {} } };
  if (!document.documentElement.classList.contains("xmas-on") && !/[?&]xmas=1/.test(location.search)) {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    if (!((m === 11 && day >= 20) || m === 12 || (m === 1 && day <= 6))) return;
  }
  var a = new Audio(); a.src = SRC; a.loop = true; a.preload = "auto"; a.volume = 0; a.setAttribute("data-bgm", "");
  var t0 = parseFloat(store.get(sessionStorage, K_T) || "0"); if (t0 > 0) a.addEventListener("loadedmetadata", function () { if (t0 < a.duration) a.currentTime = t0; }, { once: true });
  var wantOff = store.get(localStorage, K_OFF) === "1" || store.get(sessionStorage, K_P) === "1";
  var fadeT = 0;
  function fade(to, ms, done) {
    clearInterval(fadeT); var from = a.volume, steps = Math.max(1, Math.round(ms / 40)), n = 0;
    fadeT = setInterval(function () { n++; a.volume = Math.max(0, Math.min(1, from + (to - from) * n / steps)); if (n >= steps) { clearInterval(fadeT); if (done) done(); } }, 40);
  }
  function play() { var p = a.play(); if (p && p.then) p.then(function () { fade(VOL, 1800); paint(); }).catch(function () { paint(); }); else { fade(VOL, 1800); paint(); } }
  function pause(remember) { fade(0, 450, function () { a.pause(); paint(); }); if (remember) store.set(sessionStorage, K_P, "1"); }

  var b = document.createElement("button");
  b.type = "button"; b.className = "bgm";
  function paint() {
    var on = !a.paused;
    b.classList.toggle("on", on);
    b.setAttribute("aria-label", (on ? "Pause music: " : "Play music: ") + TITLE);
    b.title = (on ? "Pause " : "Play ") + TITLE;
    b.innerHTML = (on ? '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>'
                      : '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>')
      + '<span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="bgm-txt">' + (on ? "Pause music" : "Play music") + "</span>";
  }
  b.addEventListener("click", function () {
    if (a.paused) { store.set(sessionStorage, K_P, "0"); try { localStorage.removeItem(K_OFF); } catch (e) {} play(); }
    else pause(true);
  });
  a.addEventListener("play", paint); a.addEventListener("pause", paint);
  setInterval(function () { if (!a.paused) store.set(sessionStorage, K_T, String(a.currentTime)); }, 1000);
  addEventListener("pagehide", function () { store.set(sessionStorage, K_T, String(a.currentTime)); });

  // step aside for previews and videos
  // The site's preview player is an Audio() that never joins the DOM, so its play events cannot be heard from the
  // document; wrapping play() catches every other media element on the page, attached or not.
  var nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (this !== a && !a.paused) pause(false); return nativePlay.apply(this, arguments); };
  new MutationObserver(function () { if (document.documentElement.classList.contains("vm-open") && !a.paused) pause(false); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("click", function (e) { if (e.target.closest(".sotd-poster") && !a.paused) pause(false); }, true);

  function gesture(e) {
    if (e && e.target && e.target.closest && e.target.closest(".bgm")) { off(); return; }
    off(); if (!wantOff && a.paused) play();
  }
  function off() { ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { removeEventListener(ev, gesture, true); }); }
  function mount() {
    document.body.appendChild(b); paint();
    var pl = document.getElementById("player");
    var lift = function () { b.classList.toggle("lift", !!pl && !pl.hidden); };
    if (pl) new MutationObserver(lift).observe(pl, { attributes: true, attributeFilter: ["hidden"] });
    lift();
    if (!wantOff) {
      var p = a.play();
      if (p && p.then) p.then(function () { fade(VOL, 2200); paint(); off(); }).catch(function () {
        ["pointerdown", "keydown", "touchstart"].forEach(function (ev) { addEventListener(ev, gesture, { capture: true, passive: true }); });
      });
    }
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
