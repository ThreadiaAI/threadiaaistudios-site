/* Article page: reading progress bar and copy link. */
(function () {
  var p = document.getElementById("readProgress");
  addEventListener("scroll", function () { var h = document.documentElement; p.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%"; }, { passive: true });
  var c = document.getElementById("copyLink");
  if (c) c.onclick = function () { navigator.clipboard && navigator.clipboard.writeText(location.href.split("#")[0]).then(function () { c.textContent = "Copied"; }); };
})();
