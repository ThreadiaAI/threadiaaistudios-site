/* Song page: preview player, video facade (loads YouTube only on click), Stripe buy buttons. */
(function () {
  "use strict";
  var b = document.body, id = b.dataset.song;
  var btn = document.getElementById("songPlay"), fill = document.getElementById("songFill"), audio = null;
  if (btn) btn.onclick = function () {
    if (!btn.dataset.src) return;
    if (!audio) { audio = new Audio(btn.dataset.src); audio.ontimeupdate = function () { fill.style.width = (audio.currentTime / (audio.duration || 60) * 100) + "%"; };
      audio.onended = function () { btn.querySelector("span").textContent = "Play 1 min preview"; }; }
    if (audio.paused) { audio.play(); btn.querySelector("span").textContent = "Pause preview"; } else { audio.pause(); btn.querySelector("span").textContent = "Play 1 min preview"; }
  };
  function buy(link, ref) { var u = new URL(link); u.searchParams.set("client_reference_id", ref.replace(/[^A-Za-z0-9_-]/g, "_")); window.open(u.toString(), "_blank", "noopener"); }
  var sb = document.getElementById("songBuy"); if (sb) sb.onclick = function () { buy(b.dataset.buy, id); };
  var ab = document.getElementById("albumBuy"); if (ab) ab.onclick = function () { buy(b.dataset.albumBuy, b.dataset.album); };
  var v = document.getElementById("video");
  function load() { var f = document.createElement("iframe"); f.src = "https://www.youtube-nocookie.com/embed/" + v.dataset.yt + "?autoplay=1&rel=0";
    f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.title = "Music video"; v.innerHTML = ""; v.appendChild(f); v.classList.add("on"); }
  if (v) { v.onclick = load; v.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } }; }
})();
