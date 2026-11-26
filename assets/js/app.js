/* Threadia Ai Studios: catalogue, store, player and motion. Vanilla JS, no build step. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("reduced");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "$" + Number(n).toFixed(2);
  const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';

  let CAT, NEWS, STORE;
  const art = it => it.art || it.thumb || it.cover || "";

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2400); }

  /* ---------------- player ---------------- */
  const audio = new Audio(); audio.preload = "none"; audio.crossOrigin = "anonymous";
  const P = { queue: [], i: -1, ctx: null, an: null, data: null };
  function ensureAnalyser() {
    if (P.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; P.ctx = new AC();
      const src = P.ctx.createMediaElementSource(audio); P.an = P.ctx.createAnalyser(); P.an.fftSize = 64;
      src.connect(P.an); P.an.connect(P.ctx.destination); P.data = new Uint8Array(P.an.frequencyBinCount);
    } catch { P.ctx = null; }
  }
  function playQueue(list, start = 0) {
    P.queue = list.filter(x => x.preview); if (!P.queue.length) { toast("Preview coming soon"); return; }
    P.i = Math.max(0, Math.min(start, P.queue.length - 1)); load();
  }
  function load() {
    const it = P.queue[P.i]; if (!it) return;
    ensureAnalyser(); if (P.ctx && P.ctx.state === "suspended") P.ctx.resume();
    audio.src = it.preview; audio.play().catch(() => {});
    const pl = $("#player"); pl.hidden = false;
    $("#pTitle").textContent = it.title;
    $("#pSub").textContent = (it.sub || "Agent Threads") + " · 1 min preview";
    $("#pArt").style.backgroundImage = `url("${art(it)}")`;
    const w = $("#pWatch"); if (it.yt) { w.hidden = false; w.href = "https://www.youtube.com/watch?v=" + it.yt; w.dataset.watch = it.yt; w.dataset.title = it.title; } else w.hidden = true;
    $("#pBuy").onclick = () => addToCart(it.buy || it);
    markPlaying();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: "Agent Threads", album: "Threadia Ai Studios", artwork: art(it) ? [{ src: art(it), sizes: "512x512" }] : [] });
      navigator.mediaSession.setActionHandler("nexttrack", next); navigator.mediaSession.setActionHandler("previoustrack", prev);
    }
  }
  const cur = () => P.queue[P.i];
  function toggle() { if (!cur()) { playQueue(allSongsQueue()); return; } audio.paused ? audio.play() : audio.pause(); }
  function next() { if (P.i < P.queue.length - 1) { P.i++; load(); } else { audio.pause(); } }
  function prev() { if (audio.currentTime > 3) audio.currentTime = 0; else if (P.i > 0) { P.i--; load(); } }
  function setIcon() {
    const playing = !audio.paused;
    $("#pIcon").innerHTML = playing ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>' : '<path d="M7 5v14l12-7z" fill="currentColor"/>';
    $("#pPlay").setAttribute("aria-label", playing ? "Pause" : "Play"); markPlaying();
  }
  function markPlaying() {
    const id = cur()?.id, on = id && !audio.paused;
    $$("[data-pid]").forEach(el => {
      const me = el.dataset.pid === id && on; el.classList.toggle("playing", me);
      const b = el.querySelector(".pbtn,.bp"); if (b) b.innerHTML = me ? ICON_PAUSE : ICON_PLAY;
    });
  }
  audio.addEventListener("play", setIcon); audio.addEventListener("pause", setIcon); audio.addEventListener("ended", next);
  audio.addEventListener("timeupdate", () => {
    const d = audio.duration || 60, t = audio.currentTime;
    $("#pFill").style.width = (t / d * 100) + "%"; $("#pSeek").value = Math.round(t / d * 1000); $("#pTime").textContent = fmt(t) + " / " + fmt(d);
  });
  $("#pSeek").addEventListener("input", e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
  $("#pPlay").onclick = toggle; $("#pNext").onclick = next; $("#pPrev").onclick = prev;
  // On-site video: every [data-watch] link plays in a lightbox (youtube-nocookie) instead of leaving for YouTube.
  const VM = document.createElement("div");
  VM.className = "vmodal"; VM.hidden = true; VM.setAttribute("role", "dialog"); VM.setAttribute("aria-modal", "true"); VM.setAttribute("aria-label", "Video");
  VM.innerHTML = '<div class="vm-box"><div class="vm-head"><span class="vm-title"></span><button class="vm-x" aria-label="Close video">×</button></div><div class="vm-frame"></div></div>';
  document.body.appendChild(VM);
  let vmBack = null;
  function openVideo(id, title) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return false;
    if (!audio.paused) audio.pause();
    vmBack = document.activeElement;
    VM.querySelector(".vm-title").textContent = title || "";
    const f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1&playsinline=1";
    f.title = title || "Video"; f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.referrerPolicy = "strict-origin-when-cross-origin";
    VM.querySelector(".vm-frame").replaceChildren(f);
    VM.hidden = false; document.documentElement.classList.add("vm-open");
    VM.querySelector(".vm-x").focus();
    return true;
  }
  function closeVideo() {
    if (VM.hidden) return;
    VM.querySelector(".vm-frame").replaceChildren(); VM.hidden = true; document.documentElement.classList.remove("vm-open");
    if (vmBack && vmBack.focus) vmBack.focus();
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-watch]");
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && openVideo(a.dataset.watch, a.dataset.title)) e.preventDefault();
  });
  VM.addEventListener("click", e => { if (e.target === VM || e.target.closest(".vm-x")) closeVideo(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeVideo(); });
  document.addEventListener("keydown", e => { if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && cur()) { e.preventDefault(); toggle(); } if (e.key === "Escape") closeDrawer(); });
  // visualiser + hero swell
  const vz = $("#pViz"), vctx = vz.getContext("2d");
  (function viz() {
    requestAnimationFrame(viz);
    let level = 0;
    vctx.clearRect(0, 0, vz.width, vz.height);
    if (P.an && !audio.paused) {
      P.an.getByteFrequencyData(P.data);
      const n = 20, bw = vz.width / n;
      const g = vctx.createLinearGradient(0, 0, vz.width, 0); g.addColorStop(0, "#2f6bff"); g.addColorStop(.5, "#18c8c4"); g.addColorStop(1, "#6be38a"); vctx.fillStyle = g;
      for (let i = 0; i < n; i++) { const v = P.data[i + 1] / 255; level += v; const h = Math.max(2, v * vz.height); vctx.fillRect(i * bw + 1, vz.height - h, bw - 2, h); }
      level /= n;
    }
    window.__level = level;
  })();

  /* ---------------- cart ---------------- */
  let cart = store.get("tas_cart", []);
  function priceOf(it) {
    if (it.kind === "album") return it.price;
    if (it.kind === "beat") return STORE.prices.beat_lease;
    return STORE.prices.single;
  }
  function addToCart(it) {
    const item = { id: it.id, title: it.title, kind: it.kind || (it.id?.startsWith("b-") ? "beat" : "single"), art: art(it) };
    item.price = it.price != null ? it.price : priceOf(item);
    // Stripe Payment Link for this product type; the item id rides along as client_reference_id
    let key = item.kind === "album" ? ((CAT.albums.find(a => a.id === item.id) || {}).kind === "instrumental" ? "instrumental" : "album")
      : item.kind === "beat" ? "beat-" + ((item.id.match(/-(mp3|wav|stems)$/) || [])[1] || "mp3") : "single";
    const link = STORE.links[item.id] || STORE.links[key];
    if (link) {
      const u = new URL(link); u.searchParams.set("client_reference_id", String(item.id).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200));
      toast("Opening secure checkout…");
      window.open(u.toString(), "_blank", "noopener");
      return;
    }
    if (cart.some(c => c.id === item.id)) { toast("Already in your cart"); openCart(); return; }
    cart.push(item); store.set("tas_cart", cart); renderCartCount(); toast("Added: " + item.title);
    gsap?.fromTo("#cartBtn", { scale: 1.25 }, { scale: 1, duration: .6, ease: "elastic.out(1,.4)" });
  }
  function renderCartCount() { $("#cartCount").textContent = cart.length; }
  function openCart() {
    const total = cart.reduce((s, c) => s + c.price, 0);
    openDrawer(`<p class="kicker">Your cart</p><h2 class="d-title">Cart</h2>
      ${cart.length ? cart.map((c, i) => `<div class="cart-item"><div class="ci" style="background-image:url('${esc(c.art)}')"></div><div><b>${esc(c.title)}</b><br><small>${c.kind === "album" ? "Album · delivered by email" : c.kind === "beat" ? "Beat lease · tagged free, untagged on purchase" : "Single · delivered by email"}</small></div><div style="text-align:right">${money(c.price)}<br><button data-rm="${i}">Remove</button></div></div>`).join("")
        : `<p class="d-sub" style="margin:24px 0">Your cart is empty. Find something you love in the catalogue.</p>`}
      ${cart.length ? `<div class="cart-total"><span>Total</span><b>${money(total)}</b></div><button class="btn btn-primary" id="checkout" style="width:100%;justify-content:center">Checkout</button>` : ""}
      <p class="note">Every purchase supports independent music from Threadia Ai Studios. Questions about licensing or exclusive beat rights? <a class="link" href="mailto:admin@threadiaai.com?subject=Threadia%20Ai%20Studios%20licensing">Email the studio</a>.</p>`);
    $$("[data-rm]").forEach(b => b.onclick = () => { cart.splice(+b.dataset.rm, 1); store.set("tas_cart", cart); renderCartCount(); openCart(); });
    const co = $("#checkout"); if (co) co.onclick = () => {
      if (STORE.checkout) { const u = new URL(STORE.checkout); u.searchParams.set("items", cart.map(c => c.id).join(",")); location.href = u; return; }
      $(".note").innerHTML = "<b>Checkout opens very soon.</b> Your cart is saved on this device. Until then, every song streams free on YouTube, and you can reserve an album or license a beat by email: <a class='link' href='mailto:admin@threadiaai.com?subject=Order%3A%20" + encodeURIComponent(cart.map(c => c.title).join(", ")) + "'>send this order</a>.";
    };
  }
  $("#cartBtn").onclick = openCart;

  /* ---------------- drawer ---------------- */
  function openDrawer(html) {
    $("#drawerBody").innerHTML = html; const d = $("#drawer"), s = $("#scrim");
    s.hidden = false; requestAnimationFrame(() => { s.classList.add("on"); d.classList.add("on"); }); d.setAttribute("aria-hidden", "false");
    lenis?.stop(); setTimeout(() => $("#drawerX").focus(), 50);
  }
  function closeDrawer() {
    const d = $("#drawer"), s = $("#scrim"); if (!d.classList.contains("on")) return;
    d.classList.remove("on"); s.classList.remove("on"); d.setAttribute("aria-hidden", "true"); setTimeout(() => s.hidden = true, 400); lenis?.start();
  }
  $("#drawerX").onclick = closeDrawer; $("#scrim").onclick = closeDrawer;

  /* ---------------- albums ---------------- */
  const albumQueue = a => a.tracks.map(t => ({ id: a.id + "-" + t.n, title: t.title, preview: t.preview, yt: t.yt, sub: a.title, art: a.cover, cover: a.cover, buy: { ...a, kind: "album", art: a.cover } }));
  function openAlbum(a) {
    openDrawer(`<p class="kicker">${esc(a.kind === "studio" ? "Vocal album" : "Instrumental series")} · ${esc(a.genre)}</p>
      <h2 class="d-title">${esc(a.title)}</h2><p class="d-sub">Agent Threads · ${a.track_count} tracks · ${esc(a.status)}</p>
      <div class="d-cover" style="background-image:url('${esc(a.cover)}')"></div>
      <p class="d-sub">${esc(a.about)}</p>
      <div class="d-buy"><div><small class="mutedish">Delivered privately within 24 hours</small><div class="pr">${money(a.price)}</div></div><button class="btn btn-primary" id="dBuy">Buy album</button></div>
      <button class="btn btn-ghost" id="dPlay" style="margin-bottom:12px">${ICON_PLAY} Play all previews</button>
      <ol class="tracklist">${a.tracks.map((t, i) => `<li data-i="${i}" data-pid="${esc(a.id + "-" + t.n)}"><span class="n">${String(t.n).padStart(2, "0")}</span><span class="t">${esc(t.title)}</span><span class="d">${(CAT.songs.find(x => x.id === t.id) || {}).page ? `<a class="link" href="${esc(CAT.songs.find(x => x.id === t.id).page)}" onclick="event.stopPropagation()">Lyrics</a>` : (t.preview ? "1:00" : "")}</span></li>`).join("")}</ol>`);
    const q = albumQueue(a);
    $("#dBuy").onclick = () => addToCart({ ...a, kind: "album", art: a.cover });
    $("#dPlay").onclick = () => playQueue(q, 0);
    $$("#drawerBody .tracklist li").forEach(li => li.onclick = () => playQueue(q, +li.dataset.i));
    markPlaying();
  }
  function renderAlbums(kind = "all") {
    const list = CAT.albums.filter(a => kind === "all" || a.kind === kind);
    $("#albumGrid").innerHTML = list.map(a => `<article class="album reveal-card" data-id="${esc(a.id)}" tabindex="0" aria-label="${esc(a.title)}">
      <div class="cov" style="background-image:url('${esc(a.cover)}')"><span class="tag">${a.kind === "studio" ? esc(a.status) : "Instrumental"}</span>
      <button class="play-fab" aria-label="Play ${esc(a.title)}">${ICON_PLAY}</button></div>
      <div class="meta"><h3>${esc(a.title)}</h3><div class="sub"><span>${esc(a.genre)} · ${a.track_count} tracks</span><span class="price">${money(a.price)}</span></div></div></article>`).join("");
    $$("#albumGrid .album").forEach(el => {
      const a = CAT.albums.find(x => x.id === el.dataset.id);
      el.onclick = e => { if (e.target.closest(".play-fab")) { e.stopPropagation(); playQueue(albumQueue(a)); } else openAlbum(a); };
      el.onkeydown = e => { if (e.key === "Enter") openAlbum(a); };
    });
    animateIn("#albumGrid .album");
  }
  $$("#albumTabs .chip").forEach(b => b.onclick = () => { $$("#albumTabs .chip").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); renderAlbums(b.dataset.k); });

  /* ---------------- spotlight ---------------- */
  function renderSpotlight() {
    const a = CAT.albums.find(x => x.id === "heart-on-pause") || CAT.albums[0];
    $("#spotArt").style.backgroundImage = `url("${a.wide || a.cover}")`;
    $("#spotTitle").textContent = a.title; $("#spotAbout").textContent = a.about;
    const q = albumQueue(a);
    $("#spotTracks").innerHTML = a.tracks.map((t, i) => `<li data-i="${i}" data-pid="${esc(a.id + "-" + t.n)}"><span class="n">${String(t.n).padStart(2, "0")}</span><span class="t">${esc(t.title)}</span><span class="d">1:00</span></li>`).join("");
    $$("#spotTracks li").forEach(li => li.onclick = () => playQueue(q, +li.dataset.i));
    $("#spotPlay").onclick = () => playQueue(q, 0);
    $("#spotBuy").textContent = "Buy album · " + money(a.price);
    $("#spotBuy").onclick = () => addToCart({ ...a, kind: "album", art: a.cover });
  }

  /* ---------------- catalogue ---------------- */
  const S = { fam: "All", q: "", sort: "new", shown: 24 };
  const songQ = s => ({ ...s, sub: s.genre, kind: "single" });
  function filtered() {
    const q = S.q.trim().toLowerCase();
    let list = CAT.songs.filter(s => (S.fam === "All" || s.family === S.fam) && (!q || (s.title + " " + s.genre + " " + s.family + (s.feat ? " t.iq teek" : "")).toLowerCase().includes(q)));
    const by = { new: (a, b) => b.date.localeCompare(a.date), old: (a, b) => a.date.localeCompare(b.date), pop: (a, b) => b.views - a.views, az: (a, b) => a.title.localeCompare(b.title) }[S.sort];
    return list.sort(by);
  }
  function renderSongs() {
    const list = filtered(), vis = list.slice(0, S.shown);
    $("#songGrid").innerHTML = vis.length ? vis.map(s => `<article class="song" data-pid="${esc(s.id)}">
      <div class="th" style="background-image:url('${esc(art(s))}')" data-play="${esc(s.id)}" role="button" tabindex="0" aria-label="Play preview of ${esc(s.title)}">
        <span class="pbtn">${ICON_PLAY}</span><span class="yr">${new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div>
      <div class="body"><h3>${s.page ? `<a class="song-link" href="${esc(s.page)}">${esc(s.title)}</a>` : esc(s.title)}</h3><p class="g">${esc(s.genre)}${s.feat ? " · feat. T.IQ" : ""}</p>
      <div class="acts"><a class="mini" href="https://www.youtube.com/watch?v=${esc(s.yt)}" data-watch="${esc(s.yt)}" data-title="${esc(s.title)}" target="_blank" rel="noopener">Watch</a><button class="mini buy" data-buy="${esc(s.id)}" title="${s.format === "WAV" ? "Lossless WAV" : "High quality MP3"}">${money(STORE.prices.single)} · ${s.format || "MP3"}</button></div></div></article>`).join("")
      : `<p class="empty">No songs match that search yet.</p>`;
    $("#moreBtn").style.display = list.length > S.shown ? "" : "none";
    $("#moreBtn").textContent = `Show more (${list.length - S.shown} left)`;
    $$("#songGrid [data-play]").forEach(el => {
      const go = () => { const id = el.dataset.play; if (cur()?.id === id) { toggle(); return; } const l = filtered().map(songQ); playQueue(l, l.findIndex(x => x.id === id)); };
      el.onclick = go; el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    });
    $$("#songGrid [data-buy]").forEach(b => b.onclick = () => addToCart(songQ(CAT.songs.find(s => s.id === b.dataset.buy))));
    markPlaying(); animateIn("#songGrid .song");
  }
  function renderFamilies() {
    const fams = ["All", ...[...new Set(CAT.songs.map(s => s.family))].sort((a, b) => CAT.songs.filter(s => s.family === b).length - CAT.songs.filter(s => s.family === a).length)];
    $("#famChips").innerHTML = fams.map(f => `<button class="chip ${f === S.fam ? "on" : ""}" data-f="${esc(f)}">${esc(f)}${f !== "All" ? ` <span class="mutedish">${CAT.songs.filter(s => s.family === f).length}</span>` : ""}</button>`).join("");
    $$("#famChips .chip").forEach(b => b.onclick = () => { S.fam = b.dataset.f; S.shown = 24; renderFamilies(); renderSongs(); });
  }
  let qT; $("#q").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value; S.shown = 24; renderSongs(); }, 120); });
  $("#sort").onchange = e => { S.sort = e.target.value; renderSongs(); };
  $("#moreBtn").onclick = () => { S.shown += 24; renderSongs(); };
  const allSongsQueue = () => [...CAT.songs].sort((a, b) => b.views - a.views).map(songQ);

  /* ---------------- beats ---------------- */
  let beatsAll = false;
  const beatQ = b => ({ ...b, sub: `${b.style} type beat · ${b.bpm} BPM`, kind: "beat" });
  function renderBeats() {
    const list = [...CAT.beats].sort((a, b) => b.date.localeCompare(a.date)), vis = beatsAll ? list : list.slice(0, 10);
    $("#beatRows").innerHTML = vis.map(b => `<div class="beat-row" role="row" data-pid="${esc(b.id)}">
      <button class="bp" data-bplay="${esc(b.id)}" aria-label="Play ${esc(b.title)}">${ICON_PLAY}</button>
      <span class="bt"><i class="bth" style="background-image:url('${esc(art(b))}')"></i>${esc(b.title)}</span><span class="bs hide-sm">${esc(b.style)}</span><span class="mono">${b.bpm}</span><span class="mono hide-sm">${esc(b.key)}</span>
      <span class="bacts"><a class="mini hide-sm" href="https://www.youtube.com/watch?v=${esc(b.yt)}" data-watch="${esc(b.yt)}" data-title="${esc(b.title)}" target="_blank" rel="noopener">Free</a><button class="mini buy" data-blease="${esc(b.id)}">License · from ${money(STORE.prices.beat_lease)}</button></span></div>`).join("");
    $("#beatMore").style.display = list.length > 10 ? "" : "none"; $("#beatMore").textContent = beatsAll ? "Show fewer" : `Show all ${list.length} beats`;
    $$("[data-bplay]").forEach(el => el.onclick = () => { const id = el.dataset.bplay; if (cur()?.id === id) { toggle(); return; } const l = list.map(beatQ); playQueue(l, l.findIndex(x => x.id === id)); });
    $$("[data-blease]").forEach(el => el.onclick = () => openBeat(CAT.beats.find(b => b.id === el.dataset.blease)));
    markPlaying();
  }
  $("#beatMore").onclick = () => { beatsAll = !beatsAll; renderBeats(); };
  let LIC = null;
  async function openLicense(focus, fromBeat) {
    if (!LIC) { try { LIC = await (await fetch("data/license.json")).json(); } catch { toast("License terms could not load"); return; } }
    const tiers = STORE.beat_tiers || [];
    const order = focus ? [tiers.find(t => t.key === focus), ...tiers.filter(t => t.key !== focus)].filter(Boolean) : tiers;
    openDrawer(`${fromBeat ? `<button class="mini" id="licBack">← Back to ${esc(fromBeat.title)}</button>` : ""}
      <p class="kicker" style="margin-top:18px">Licensing</p><h2 class="d-title">${esc(LIC.title)}</h2>
      <p class="d-sub" style="margin-top:14px">${esc(LIC.intro)}</p>
      <h3 class="lic-h">License tiers</h3>
      ${order.map(t => `<div class="lic-tier ${t.key === focus ? "on" : ""}"><b>${esc(t.name)}${t.price != null ? ` · ${money(t.price)}` : " · On request"}</b>
        <ul>${(LIC.tiers[t.key] || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
      <h3 class="lic-h">Terms that apply to every license</h3>
      <ol class="lic-terms">${LIC.general.map(([h, x]) => `<li><b>${esc(h)}.</b> ${esc(x)}</li>`).join("")}</ol>
      <p class="note">${esc(LIC.footer)} <a class="link" href="terms/#beats">Read the full Terms of Sale and Licensing</a>.</p>`);
    const bk = $("#licBack"); if (bk) bk.onclick = () => openBeat(fromBeat);
  }
  $("#licenseInfo").onclick = () => openLicense(null);
  function openBeat(b) {
    const tiers = STORE.beat_tiers || [{ key: "mp3", name: "Lease", price: STORE.prices.beat_lease, terms: "" }];
    openDrawer(`<p class="kicker">${esc(b.style)} type beat · ${b.bpm} BPM ${esc(b.key)}</p>
      <h2 class="d-title">${esc(b.title)}</h2><p class="d-sub">Produced by Grey Beard</p>
      <div class="d-cover" style="aspect-ratio:16/9;background-image:url('${esc(art(b))}')"></div>
      <button class="btn btn-ghost" id="bPlay" style="margin-bottom:8px">${ICON_PLAY} Play preview</button>
      <div class="tiers">${tiers.map(t => `<div class="tier">
        <div><b>${esc(t.name)} <button class="info" data-info="${esc(t.key)}" aria-label="License terms for ${esc(t.name)}">i</button></b><p>${esc(t.terms)}</p></div>
        ${t.price == null ? `<a class="btn btn-ghost" href="mailto:admin@threadiaai.com?subject=${encodeURIComponent("Exclusive rights: " + b.title)}">Ask</a>`
          : `<button class="btn btn-primary" data-tier="${esc(t.key)}">${money(t.price)}</button>`}</div>`).join("")}</div>
      <p class="note">Secure checkout by Stripe. Download your files and your license instantly, no account needed. The tagged version is free for non profit use with credit: <a class="link" href="https://www.youtube.com/watch?v=${esc(b.yt)}" data-watch="${esc(b.yt)}" data-title="${esc(b.title)}" target="_blank" rel="noopener">watch it here</a>.</p>`);
    $("#bPlay").onclick = () => playQueue([beatQ(b)], 0);
    $$("#drawerBody [data-info]").forEach(el => el.onclick = () => openLicense(el.dataset.info, b));
    $$("#drawerBody [data-tier]").forEach(el => el.onclick = () => {
      const t = tiers.find(x => x.key === el.dataset.tier);
      addToCart({ id: b.id + "-" + t.key, title: `${b.title} (${t.name})`, kind: "beat", art: art(b), price: t.price });
    });
  }

  /* ---------------- news ---------------- */
  function renderNews() {
    const d = s => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    $("#newsUpdated").textContent = "Updated " + d(NEWS.updated) + ".";
    $("#newsGrid").innerHTML = NEWS.items.map(n => `<article class="news-card"><div class="news-top"><b>${esc(n.tag)}</b><span>${d(n.date)}</span></div>
      <h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><p class="news-take">${esc(n.take)}</p>
      <div class="news-acts"><a class="news-src" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Read at ${esc(n.source)} →</a>
      <button class="discuss" data-discuss="${esc(n.title)}"><i></i>Discuss</button></div></article>`).join("");
    $$("#newsGrid [data-discuss]").forEach(b => b.onclick = () => {
      const n = NEWS.items.find(x => x.title === b.dataset.discuss);
      openDrawer(`<p class="kicker">${esc(n.tag)} · Discuss</p><h2 class="d-title" style="font-size:34px">${esc(n.title)}</h2>
        <p class="d-sub" style="margin-top:12px">${esc(n.summary)}</p><p class="news-take" style="margin-top:14px">${esc(n.take)}</p>
        <a class="link small" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Read at ${esc(n.source)}</a><div id="newsWeave"></div>`);
      if (window.TASComments) TASComments.mount($("#newsWeave"), TASComments.slugFor(n.title), { base: "", title: "What do you think?" });
    });
    animateIn("#newsGrid .news-card");
  }

  /* ---------------- Pulling Threads column ---------------- */
  function renderColumn(cols) {
    const items = (cols && cols.items) || [];
    const d = s => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    $("#colGrid").innerHTML = items.length ? items.map((a, i) => `<a class="col-card ${i === 0 ? "lead" : ""}" href="${esc(a.url)}">
      <div class="col-top"><b>Issue ${String(a.issue).padStart(2, "0")}</b><span>${d(a.date)} · ${a.mins} min read</span></div>
      <h3>${esc(a.title)}</h3><p>${esc(a.dek)}</p>
      <div class="col-by"><img src="assets/img/at.jpg" alt="" width="32" height="32"><span>By A.T.</span><span class="col-go">Read the column →</span></div></a>`).join("")
      : `<p class="empty">The first column drops soon.</p>`;
    animateIn("#colGrid .col-card");
  }

  /* ---------------- motion ---------------- */
  let lenis = null;
  function animateIn(sel) {
    if (reduced || !window.gsap) return;
    gsap.fromTo(sel, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: "power3.out", stagger: .04, scrollTrigger: { trigger: $(sel)?.parentElement, start: "top 85%", once: true } });
  }
  function splitChars(el) {
    const txt = el.textContent; el.textContent = "";
    [...txt].forEach(ch => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch === " " ? " " : ch; el.appendChild(s); });
  }
  function motion() {
    if (!window.gsap || reduced) { $$(".reveal").forEach(e => { e.style.opacity = 1; e.style.transform = "none"; }); countUp(true); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: .1, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => { const t = $(a.getAttribute("href")); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80 }); $("#menuBtn").setAttribute("aria-expanded", "false"); $(".links").classList.remove("open"); } }));
    }
    $$(".hero-title .split:not(.grad)").forEach(splitChars);
    const tl = gsap.timeline({ delay: .15 });
    tl.from(".hero-title .ch", { yPercent: 115, rotate: 6, duration: 1.1, ease: "expo.out", stagger: .028 })
      .from(".hero-title .grad", { yPercent: 110, duration: 1.2, ease: "expo.out" }, "-=.75")
      .to(".hero .reveal", { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: .08 }, "-=.8")
      .add(() => countUp(), "-=.6");
    $$(".section .display").forEach(h => gsap.from(h, { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } }));
    $$(".section .lede, .section .kicker").forEach(h => gsap.from(h, { y: 24, opacity: 0, duration: .9, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 90%", once: true } }));
    gsap.to("#threads", { yPercent: 18, opacity: .35, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.from(".spot-art", { scale: .86, rotate: -4, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: "#spotlight", start: "top 75%", once: true } });
    gsap.from(".studio-visual", { scale: .8, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: "#studio", start: "top 75%", once: true } });
    gsap.from(".founder, .duo .card, .pillars li", { y: 40, opacity: 0, duration: 1, ease: "power3.out", stagger: .1, scrollTrigger: { trigger: "#founders", start: "top 80%", once: true } });
    // nav hide on scroll down
    let last = 0; ScrollTrigger.create({ onUpdate: s => { const y = s.scroll(); $("#nav").classList.toggle("hide", y > 400 && y > last); last = y; } });
    // active link
    $$(".links a").forEach(a => { const sec = $(a.getAttribute("href")); if (sec) ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: s => a.classList.toggle("active", s.isActive) }); });
  }
  function countUp(instant) {
    const genres = new Set(CAT.songs.map(s => s.genre.toLowerCase().replace(/ (remix|version|ballad)$/, ""))).size;
    const vals = { songs: CAT.songs.length, albums: CAT.albums.length, beats: CAT.beats.length, genres };
    $$("[data-count]").forEach(el => {
      const v = vals[el.dataset.count];
      if (instant || !window.gsap) { el.textContent = v; return; }
      const o = { n: 0 }; gsap.to(o, { n: v, duration: 1.6, ease: "power2.out", onUpdate: () => el.textContent = Math.round(o.n) });
    });
  }
  // tilt + cursor
  function tilt() {
    if (matchMedia("(hover:none)").matches || reduced) return;
    $$(".tilt").forEach(el => {
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 10}deg)`; el.style.setProperty("--mx", x * 100 + "%"); el.style.setProperty("--my", y * 100 + "%"); });
      el.addEventListener("pointerleave", () => el.style.transform = "");
    });
    const cu = $(".cursor"); let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; cu.classList.add("on"); const h = e.target.closest(".album,.song .th,.spot-art"); cu.classList.toggle("big", !!h); }, { passive: true });
    (function loop() { cx += (tx - cx) * .18; cy += (ty - cy) * .18; cu.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
    // magnetic buttons
    $$(".btn").forEach(b => { b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .15}px,${(e.clientY - r.top - r.height / 2) * .25}px)`; }); b.addEventListener("pointerleave", () => b.style.transform = ""); });
  }
  // mobile menu
  $("#menuBtn").onclick = () => { const o = $(".links").classList.toggle("open"); $("#menuBtn").setAttribute("aria-expanded", o); };

  /* ---------------- boot ---------------- */
  Promise.all([fetch("data/catalog.json").then(r => r.json()), fetch("data/news.json").then(r => r.json()), fetch("data/store.json").then(r => r.json())])
    .then(([c, n, s]) => {
      CAT = c; NEWS = n; STORE = s;
      const fams = [...new Set(CAT.songs.map(x => x.genre.replace(/ (Remix|Version)$/i, "")))].slice(0, 40);
      const g = ["Neo Soul", "Hip Hop", "Dancehall", "Bachata", "Kompa", "Amapiano", "Roots Reggae", "Jamaican Mento", "Boom Bap", "Afrobeats", "Bolero", "Gospel Soul", "Jazz Rap", "Salsa", "Drill", "Techno", "Smooth Jazz", "Ambient"];
      const words = [...new Set([...g, ...fams])].slice(0, 26);
      $("#genreTrack").innerHTML = [...words, ...words].map(w => `<span>${esc(w)}</span>`).join("");
      if (STORE.links && Object.keys(STORE.links).length) $("#cartBtn").style.display = "none";
      renderSpotlight(); renderAlbums(); renderFamilies(); renderSongs(); renderBeats(); renderNews(); renderCartCount();
      fetch("data/articles.json").then(r => r.json()).then(renderColumn).catch(() => renderColumn(null));
      $("#playAll").onclick = () => playQueue(allSongsQueue(), 0);
      motion(); tilt();
    })
    .catch(err => { console.error(err); $$(".reveal").forEach(e => { e.style.opacity = 1; e.style.transform = "none"; }); });
})();
