// Zenithal extension — popup logic.

const input = document.getElementById("url");
const out = document.getElementById("out");
const statusDot = document.getElementById("statusDot");
const statusLabel = document.getElementById("statusLabel");

// Pre-fill with the active tab's URL.
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) input.value = tabs[0].url;
});

document.getElementById("scan").addEventListener("click", run);
input.addEventListener("keydown", (e) => e.key === "Enter" && run());

chrome.runtime.sendMessage({ type: "health" }, (r) => {
  if (r?.ok) {
    statusDot.className = "dot ok";
    statusLabel.textContent = "LIVE";
  } else {
    statusDot.className = "dot bad";
    statusLabel.textContent = "OFFLINE";
  }
});

function run() {
  const url = input.value.trim();
  if (!url) return;
  const btn = document.getElementById("scan");
  btn.disabled = true;
  btn.textContent = "Scanning…";
  out.innerHTML = "";
  chrome.runtime.sendMessage({ type: "scan", url }, (r) => {
    btn.disabled = false;
    btn.textContent = "Scan URL";
    if (!r) { out.innerHTML = errorCard("No response from the extension background worker."); return; }
    if (r.verdict === "ERROR") { out.innerHTML = errorCard(r.reasons?.[0] || "Scan failed."); return; }
    out.innerHTML = resultCard(r);
  });
}

function errorCard(msg) {
  return `<div class="verdict-card"><div class="verdict-head"><span class="badge ERROR">OFFLINE</span></div><ul class="reasons"><li>${escapeHtml(msg)}</li></ul></div>`;
}

function resultCard(r) {
  const reasons = (r.reasons || []).slice(0, 4).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const intel = r.ip_intel;
  const facts = [];
  if (r.resolved_ip) facts.push(`IP ${r.resolved_ip}`);
  if (intel?.country) facts.push(intel.country);
  if (intel?.asn) facts.push(`AS${intel.asn}`);
  if (intel?.reputation) facts.push(`rep · ${intel.reputation}`);
  if (r.domain_age_days != null) facts.push(`${r.domain_age_days}d old`);
  const factsHtml = facts.length ? `<div class="facts">${facts.map((f) => `<span class="fact">${escapeHtml(f)}</span>`).join("")}</div>` : "";

  return `
    <div class="verdict-card">
      <div class="verdict-head">
        <span class="badge ${r.verdict}">${r.verdict}</span>
        ${r.score != null ? `<span class="score">${Math.round(r.score)}<span style="font-size:10px;color:var(--text-faint)">/100</span></span>` : ""}
      </div>
      ${r.threat_type ? `<div class="threat-type">${escapeHtml(r.threat_type)}</div>` : ""}
      ${factsHtml}
      <ul class="reasons">${reasons}</ul>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
