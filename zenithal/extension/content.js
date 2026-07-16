// Zenithal extension — content script.
// Lightweight offline pre-screen: flags obviously risky links inline so the
// user sees a warning badge before clicking, without a network round-trip per
// link. Deep verdicts come from the backend via the context menu / popup.

(function () {
  const RISKY_TLDS = ["tk", "ml", "ga", "cf", "gq", "xyz", "top", "buzz", "click", "link"];
  const BRANDS = ["paypal", "amazon", "microsoft", "apple", "sbi", "hdfc", "icici", "netflix", "bank"];
  const IP_RE = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/;

  function riskOf(href) {
    let host;
    try { host = new URL(href).hostname.toLowerCase(); } catch { return 0; }
    let r = 0;
    const tld = host.split(".").pop();
    if (RISKY_TLDS.includes(tld)) r += 2;
    if (IP_RE.test(href)) r += 2;
    if (BRANDS.some((b) => host.includes(b)) && !host.endsWith(".com") && !host.endsWith(".in")) r += 2;
    if (host.split(".").length > 3) r += 1;
    return r;
  }

  function badge(a, level) {
    if (a.dataset.zenithal) return;
    a.dataset.zenithal = "1";
    const tag = document.createElement("span");
    tag.textContent = level >= 3 ? " ⛔" : " ⚠️";
    tag.title = "Zenithal: this link looks risky — right-click to scan.";
    tag.style.cssText = "font-size:11px;vertical-align:super;";
    a.appendChild(tag);
    a.style.outline = level >= 3 ? "1px dashed #ef4444" : "1px dashed #f97316";
  }

  function scan() {
    document.querySelectorAll("a[href]").forEach((a) => {
      const r = riskOf(a.href);
      if (r >= 2) badge(a, r);
    });
  }

  scan();
  // Re-scan on DOM changes (SPA / dynamically loaded links).
  new MutationObserver(() => scan()).observe(document.body, { childList: true, subtree: true });
})();
