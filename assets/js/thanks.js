/* Thank-you page after Stripe checkout: asks the delivery function to verify the payment and share the files
   privately to the buyer's Google account, then shows the link. Falls back to email delivery on anything odd. */
(function () {
  "use strict";
  var FN = "https://fzhwurshslggysqqbsmp.supabase.co/functions/v1/deliver";
  var sid = new URLSearchParams(location.search).get("session_id") || "";
  var $ = function (id) { return document.getElementById(id); };
  var status = $("status"), lede = $("lede"), box = $("deliver"), ref = $("ref");
  var ok = /^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid);
  if (ok) ref.textContent = "Order reference: " + sid.slice(-10).toUpperCase();

  function showEmailForm(msg) {
    box.innerHTML = '<p class="d-sub" style="margin-bottom:12px"></p><form class="letter" id="gform" style="margin-top:0">' +
      '<label class="sr" for="gmail">Google email</label><input id="gmail" type="email" required placeholder="you@gmail.com" autocomplete="email">' +
      '<button class="btn btn-primary" type="submit">Send my files here</button><p class="letter-msg" id="gmsg"></p></form>';
    box.querySelector("p").textContent = msg;
    $("gform").onsubmit = function (e) { e.preventDefault(); call($("gmail").value.trim()); };
  }

  function render(r) {
    if (r.status === "delivered") {
      status.textContent = "Your files are ready";
      lede.textContent = "We shared “" + r.title + "” privately with " + r.shared_to + ". Google also emailed you the link. Sign in with that Google account to open and download.";
      box.innerHTML = '<a class="btn btn-primary" id="dl" target="_blank" rel="noopener">Open my download</a>' +
        '<p class="small mutedish" style="margin-top:14px">Wrong account? <a href="#" class="link" id="other">Send to a different Google email</a></p>';
      $("dl").href = r.link;
      $("other").onclick = function (e) { e.preventDefault(); showEmailForm("Enter the Google email that should receive the files (up to two per order)."); };
      return;
    }
    if (r.status === "share_failed" || r.status === "need_email") { status.textContent = "One more step"; showEmailForm(r.message); return; }
    if (r.status === "unpaid") { status.textContent = "Payment pending"; lede.textContent = "Your payment hasn't cleared yet. Refresh this page in a minute."; box.innerHTML = ""; return; }
    // manual, limit, not_configured, error: confirmed purchase, human delivery within 24 hours
    status.textContent = "Payment received";
    lede.textContent = r.message || "Your purchase is confirmed. Your files arrive by email within 24 hours.";
    box.innerHTML = "";
  }

  function call(email) {
    var m = $("gmsg"); if (m) m.textContent = "Sharing your files…";
    fetch(FN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(email ? { session_id: sid, email: email } : { session_id: sid }) })
      .then(function (r) { return r.json(); }).then(render)
      .catch(function () { render({ status: "error", message: "Your purchase is confirmed. Your files arrive by email within 24 hours." }); });
  }

  if (ok) call(); else render({ status: "error", message: "Your purchase is confirmed. Your files arrive by email within 24 hours." });
})();
