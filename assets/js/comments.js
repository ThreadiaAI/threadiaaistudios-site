/* "Woven" comments for Threadia Ai Studios: on A.T.'s columns and on every news story.
   Each member gets a thread colour from their username; the conversation hangs off a luminous thread;
   typing drives a live waveform; posting sends a pulse down the thread and weaves the words in.
   Backend: Supabase (auth + Postgres + row level security). Settings: comments-config.js.  */
(function () {
  "use strict";
  const cfg = window.TAS_COMMENTS || {};
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = iso => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m"; if (s < 86400) return Math.floor(s / 3600) + "h"; if (s < 604800) return Math.floor(s / 86400) + "d"; return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  // thread colour: a stable hue from the username, kept in the luminous part of the wheel
  const hue = name => { let h = 2166136261; for (const ch of (name || "").toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h) % 360; };
  const tcol = (name, l = 62) => `hsl(${hue(name)} 90% ${l}%)`;
  let sb = null, me = null, myName = null;
  const mounts = new Set();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function client() {
    if (sb) return sb;
    if (!cfg.url || !cfg.anonKey || !window.supabase) return null;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true } });
    sb.auth.onAuthStateChange(() => refreshMe());
    return sb;
  }
  async function refreshMe() {
    const { data } = await sb.auth.getUser(); me = data.user || null; myName = null;
    if (me) { const { data: p } = await sb.from("profiles").select("username").eq("id", me.id).maybeSingle(); myName = p?.username || null; }
    mounts.forEach(m => m.renderForm());
  }

  function mount(el, slug, opt = {}) {
    const base = opt.base || "";
    el.classList.add("weave");
    el.innerHTML = `
      <div class="w-head"><div><p class="kicker">The Weave</p><h3 class="w-title">${esc(opt.title || "Join the conversation")}</h3></div>
        <div class="w-meta"><span class="w-count">…</span><div class="w-dots" aria-hidden="true"></div></div></div>
      <div class="w-form"></div>
      <div class="w-loom"><div class="w-spine" aria-hidden="true"><span class="w-pulse"></span></div><div class="w-list"></div></div>`;
    const formEl = el.querySelector(".w-form"), listEl = el.querySelector(".w-list"), countEl = el.querySelector(".w-count"), dotsEl = el.querySelector(".w-dots"), pulse = el.querySelector(".w-pulse");
    const s = client();
    const m = { renderForm, load };
    if (!s) { formEl.innerHTML = `<p class="w-note">The Weave opens very soon. Come back and claim your thread colour.</p>`; countEl.textContent = ""; return; }
    mounts.add(m);
    let seen = new Set(), justPosted = null;

    function renderForm(msg = "") {
      if (!me) {
        formEl.innerHTML = `
          <div class="w-join">
            <div class="w-swatch" style="--c:${tcol("weaver")}"><span>?</span></div>
            <div class="w-joinbody">
              <div class="w-tabs"><button class="chip on" data-m="up">Claim a username</button><button class="chip" data-m="in">Sign in</button></div>
              <form class="w-auth" data-m="up">
                <label class="w-field w-uname"><span>Username</span><input name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" placeholder="your_name" autocomplete="username"></label>
                <label class="w-field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
                <label class="w-field"><span>Password</span><input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
                <button class="btn btn-primary" type="submit">Weave me in</button>
                <p class="w-fine">Your username gets its own thread colour. Your email stays private.</p>
                <p class="w-msg">${esc(msg)}</p>
              </form>
            </div>
          </div>`;
        const form = formEl.querySelector("form"), sw = formEl.querySelector(".w-swatch"), un = form.querySelector('[name="username"]');
        un.addEventListener("input", () => { const v = un.value.trim(); sw.style.setProperty("--c", tcol(v || "weaver")); sw.querySelector("span").textContent = (v[0] || "?").toUpperCase(); });
        formEl.querySelectorAll(".w-tabs .chip").forEach(b => b.onclick = () => {
          formEl.querySelectorAll(".w-tabs .chip").forEach(x => x.classList.toggle("on", x === b));
          const up = b.dataset.m === "up"; form.dataset.m = b.dataset.m;
          form.querySelector(".w-uname").style.display = up ? "" : "none"; un.required = up;
          form.querySelector("button[type=submit]").textContent = up ? "Weave me in" : "Sign in";
        });
        form.onsubmit = async e => {
          e.preventDefault();
          const f = new FormData(form), out = form.querySelector(".w-msg"); out.textContent = "One moment…";
          const email = f.get("email").trim(), password = f.get("password");
          if (form.dataset.m === "up") {
            const username = f.get("username").trim();
            const { data: taken } = await s.from("profiles").select("id").ilike("username", username).maybeSingle();
            if (taken) { out.textContent = "That username is taken. Try another."; return; }
            const { data, error } = await s.auth.signUp({ email, password, options: { data: { username } } });
            if (error) { out.textContent = error.message; return; }
            if (!data.session) { out.textContent = "Check your email to confirm, then sign in."; return; }
            const { error: pe } = await s.from("profiles").insert({ id: data.user.id, username });
            if (pe) { out.textContent = pe.message.includes("duplicate") ? "That username is taken." : pe.message; return; }
          } else {
            const { error } = await s.auth.signInWithPassword({ email, password });
            if (error) { out.textContent = error.message; return; }
          }
          refreshMe();
        };
        return;
      }
      if (!myName) {
        formEl.innerHTML = `<form class="w-auth"><label class="w-field"><span>Pick a username</span><input name="username" required pattern="[A-Za-z0-9_]{3,20}"></label><button class="btn btn-primary">Save</button><p class="w-msg">${esc(msg)}</p></form>`;
        formEl.querySelector("form").onsubmit = async e => {
          e.preventDefault(); const username = new FormData(e.target).get("username").trim();
          const { error } = await s.from("profiles").insert({ id: me.id, username });
          if (error) { e.target.querySelector(".w-msg").textContent = error.message.includes("duplicate") ? "That username is taken." : error.message; return; }
          refreshMe();
        };
        return;
      }
      formEl.innerHTML = `
        <form class="w-post" style="--c:${tcol(myName)}">
          <div class="w-who"><span class="w-av" style="--c:${tcol(myName)}">${esc(myName[0]).toUpperCase()}</span><b style="color:${tcol(myName, 70)}">@${esc(myName)}</b><button type="button" class="w-out">sign out</button></div>
          <textarea name="body" required maxlength="2000" rows="3" placeholder="Pull a thread… A.T. reads every word."></textarea>
          <canvas class="w-wave" height="36" aria-hidden="true"></canvas>
          <div class="w-row"><span class="w-fine"><span class="w-left">2000</span> left · be kind, spam gets cut</span><button class="btn btn-primary" type="submit">Weave it in</button></div>
          <p class="w-msg">${esc(msg)}</p>
        </form>`;
      formEl.querySelector(".w-out").onclick = async () => { await s.auth.signOut(); refreshMe(); };
      const form = formEl.querySelector("form"), ta = form.querySelector("textarea"), cv = form.querySelector(".w-wave"), left = form.querySelector(".w-left");
      // live waveform: every keystroke adds energy; the line breathes in the member's colour
      const ctx = cv.getContext("2d"); let energy = 0, t = 0, raf;
      const size = () => { cv.width = cv.clientWidth * (window.devicePixelRatio || 1); cv.height = 36 * (window.devicePixelRatio || 1); };
      size(); addEventListener("resize", size);
      ta.addEventListener("input", () => { energy = Math.min(1, energy + 0.35); left.textContent = 2000 - ta.value.length; });
      (function draw() {
        raf = requestAnimationFrame(draw); if (!cv.isConnected) { cancelAnimationFrame(raf); return; }
        t += 0.06; energy *= 0.94; const w = cv.width, h = cv.height, mid = h / 2; ctx.clearRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "transparent"); g.addColorStop(.15, tcol(myName)); g.addColorStop(.85, tcol(myName, 72)); g.addColorStop(1, "transparent");
        ctx.strokeStyle = g; ctx.lineWidth = 2 * (window.devicePixelRatio || 1); ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const k = x / w, env = Math.sin(Math.PI * k);
          const y = mid + env * (2 + energy * mid * 0.85) * Math.sin(k * 26 + t * 3) * Math.cos(k * 7 - t);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.shadowColor = tcol(myName); ctx.shadowBlur = 8 + energy * 18; ctx.stroke();
      })();
      form.onsubmit = async e => {
        e.preventDefault();
        const body = ta.value.trim(); if (!body) return;
        const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
        const { data, error } = await s.from("comments").insert({ slug, user_id: me.id, username: myName, body }).select("id").single();
        btn.disabled = false;
        if (error) { form.querySelector(".w-msg").textContent = error.message; return; }
        justPosted = data?.id; ta.value = ""; left.textContent = 2000; energy = 1;
        fire(myName); form.querySelector(".w-msg").textContent = "Woven in. A.T. usually answers within the hour.";
        load();
      };
    }

    function fire(name) {
      if (reduced) return;
      pulse.style.setProperty("--c", tcol(name));
      pulse.classList.remove("go"); void pulse.offsetWidth; pulse.classList.add("go");
    }

    function weaveText(p, text) {
      if (reduced) { p.textContent = text; return; }
      p.textContent = ""; let i = 0; const step = Math.max(1, Math.ceil(text.length / 70));
      (function tick() { i = Math.min(text.length, i + step); p.textContent = text.slice(0, i); if (i < text.length) requestAnimationFrame(tick); else p.classList.add("done"); })();
    }

    async function load() {
      const { data, error } = await s.from("comments").select("id,username,body,parent_id,is_at,created_at").eq("slug", slug).order("created_at", { ascending: true });
      if (error) { listEl.innerHTML = `<p class="w-note">The Weave is resting. Try again in a minute.</p>`; return; }
      const people = [...new Set(data.filter(c => !c.is_at).map(c => c.username))];
      countEl.textContent = data.length ? `${data.length} thread${data.length === 1 ? "" : "s"} · ${people.length} weaver${people.length === 1 ? "" : "s"}` : "No threads yet. Start one.";
      dotsEl.innerHTML = people.slice(-18).map(u => `<i title="@${esc(u)}" style="--c:${tcol(u)}"></i>`).join("") + (data.some(c => c.is_at) ? `<i class="at" title="A.T."></i>` : "");
      const kids = id => data.filter(c => c.parent_id === id);
      const node = c => {
        const col = c.is_at ? "hsl(40 88% 68%)" : tcol(c.username);
        return `<div class="w-item ${c.is_at ? "is-at" : ""} ${seen.has(c.id) ? "" : "fresh"}" data-id="${c.id}" style="--c:${col}">
          <span class="w-knot" aria-hidden="true"></span>
          <div class="w-card">
            <div class="w-chead">${c.is_at ? `<img src="${base}assets/img/at.jpg" alt="" width="26" height="26"><b>A.T.</b><span class="w-badge">writer</span><svg class="w-sig" viewBox="0 0 60 14" aria-hidden="true"><path d="M0 7 Q5 1 10 7 T20 7 T30 7 T40 7 T50 7 T60 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`
                : `<span class="w-av" style="--c:${col}">${esc((c.username[0] || "?").toUpperCase())}</span><b style="color:${tcol(c.username, 72)}">@${esc(c.username)}</b>`}
              <span class="w-time">${ago(c.created_at)}</span></div>
            <p class="w-body"></p>
          </div></div>`;
      };
      listEl.innerHTML = data.filter(c => !c.parent_id).map(c => `<div class="w-thread">${node(c)}${kids(c.id).length ? `<div class="w-branch">${kids(c.id).map(node).join("")}</div>` : ""}</div>`).join("");
      listEl.querySelectorAll(".w-item").forEach(el => {
        const c = data.find(x => x.id == el.dataset.id), p = el.querySelector(".w-body");
        if (!seen.has(c.id) && (c.id === justPosted || c.is_at)) weaveText(p, c.body); else { p.textContent = c.body; }
        if (c.is_at && !seen.has(c.id) && seen.size) fire("A.T.");
        seen.add(c.id);
      });
      justPosted = null;
    }

    if (me !== null || myName !== null) renderForm(); else refreshMe();
    renderForm(); load();
    const iv = setInterval(() => { if (!el.isConnected) { clearInterval(iv); mounts.delete(m); return; } load(); }, 45000);
  }

  // The A.T. Letter: newsletter signup forms anywhere on the site
  document.querySelectorAll("[data-letter]").forEach(form => {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const out = form.querySelector(".letter-msg"), email = form.querySelector("input[type=email]").value.trim();
      const s = client();
      if (!s) { out.textContent = "The A.T. Letter opens very soon."; return; }
      out.textContent = "Signing you up…";
      const { data, error } = await s.rpc("subscribe", { p_email: email, p_source: form.dataset.letter || "site" });
      if (error || data !== "ok") { out.textContent = data === "invalid" ? "That email doesn't look right." : "Something went wrong. Try again in a minute."; return; }
      form.querySelector("input").value = "";
      out.textContent = "Almost there. Check your inbox and tap the confirm link from A.T.";
      form.classList.add("done");
    });
  });

  window.TASComments = { mount, slugFor: t => "news-" + String(t).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) };
  document.querySelectorAll("[data-weave]").forEach(el => mount(el, el.dataset.weave, { base: el.dataset.base || "", title: el.dataset.title }));
})();
