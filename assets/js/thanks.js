/* Thank you page after Stripe checkout. Shows an order reference now; once the download function is live it
   will verify the session and show the private download link here. */
(function () {
  var sid = new URLSearchParams(location.search).get("session_id") || "";
  var ok = /^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid);
  var ref = document.getElementById("ref");
  if (ok) ref.textContent = "Order reference: " + sid.slice(-10).toUpperCase();
  else ref.textContent = "";
})();
