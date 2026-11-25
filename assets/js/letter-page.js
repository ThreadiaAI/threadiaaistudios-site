/* Confirm or unsubscribe for the A.T. Letter, by private token in the link. */
(async function () {
  var mode = document.body.dataset.mode, t = new URLSearchParams(location.search).get("t");
  var h = document.getElementById("h"), p = document.getElementById("p"), c = window.TAS_COMMENTS || {};
  var bad = function () { h.textContent = "Link not recognised"; p.textContent = mode === "confirm" ? "That link has expired or was already used. Sign up again on the home page." : "Reply to any A.T. Letter with the word unsubscribe and we will remove you by hand."; };
  if (!t || !/^[0-9a-f-]{36}$/i.test(t) || !c.url || !window.supabase) return bad();
  var sb = supabase.createClient(c.url, c.anonKey);
  var r = await sb.rpc(mode === "confirm" ? "confirm_subscription" : "unsubscribe", { p_token: t });
  if (r.data !== "ok") return bad();
  h.textContent = mode === "confirm" ? "You're in" : "You're unsubscribed";
  p.textContent = mode === "confirm" ? "Welcome to the A.T. Letter. The next one lands in your inbox." : "No more A.T. Letters. Changed your mind? Sign up again anytime on the home page.";
})();
