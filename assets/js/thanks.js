/* Thank-you page after Stripe checkout. Stripe's webhook tells our backend the order is paid; this page polls our
   own backend (never Stripe) for the private download links. No Google account needed. Links expire in 24 hours.
   Opened from the buyer's email as thanks.html?t=TOKEN it shows the same downloads. */
(function () {
  "use strict";
  var FN = "https://fzhwurshslggysqqbsmp.supabase.co/functions/v1/download";
  var qs = new URLSearchParams(location.search);
  var sid = qs.get("session_id") || "", tok = qs.get("t") || "";
  var $ = function (id) { return document.getElementById(id); };
  var status = $("status"), lede = $("lede"), box = $("deliver"), ref = $("ref");
  var okSid = /^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid), okTok = /^[a-f0-9]{64}$/.test(tok);
  var MANUAL = "Your purchase is confirmed. Your files arrive by email within 24 hours.";
  if (okSid) ref.textContent = "Order reference: " + sid.slice(-12).toUpperCase();

  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : n > 1024 ? Math.round(n / 1024) + " KB" : ""; }

  function render(r) {
    if (r.status === "ready") {
      status.textContent = "Your files are ready";
      var exp = new Date(r.expires_at);
      lede.textContent = "Thank you for supporting Threadia Ai Studios. Download “" + r.title + "” below. We also emailed you this link. It works until " +
        exp.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) + ".";
      box.innerHTML = "";
      var ul = document.createElement("ul"); ul.className = "dl-list";
      r.files.forEach(function (f) {
        var li = document.createElement("li"), a = document.createElement("a"), s = document.createElement("span");
        a.className = "btn btn-primary"; a.href = f.url; a.textContent = "Download"; a.setAttribute("download", "");
        s.className = "dl-name"; s.textContent = f.name + (f.size ? "  ·  " + size(f.size) : "");
        li.appendChild(s); li.appendChild(a); ul.appendChild(li);
      });
      box.appendChild(ul);
      var p = document.createElement("p"); p.className = "small mutedish"; p.style.marginTop = "14px";
      p.textContent = "Trouble downloading? Email admin@threadiaai.com with your order reference.";
      box.appendChild(p);
      return;
    }
    if (r.status === "expired") { status.textContent = "Link expired"; lede.textContent = r.message; box.innerHTML = ""; return; }
    status.textContent = "Payment received";
    lede.textContent = r.message || MANUAL;
    box.innerHTML = "";
  }

  var tries = 0;
  function poll() {
    var url = FN + (okTok ? "?t=" + tok : "?session_id=" + encodeURIComponent(sid));
    fetch(url).then(function (r) { return r.json(); }).then(function (r) {
      if ((r.status === "pending" || r.status === "retry") && tries++ < 20) {
        status.textContent = "Preparing your files…";
        lede.textContent = "Your payment went through. This takes a few seconds.";
        setTimeout(poll, 2000);
        return;
      }
      render(r.status === "pending" ? { status: "manual" } : r);
    }).catch(function () {
      if (tries++ < 20) setTimeout(poll, 2500); else render({ status: "manual" });
    });
  }

  if (okSid || okTok) poll(); else render({ status: "manual" });
})();
