// Zenithal extension — background service worker.
// Adds a right-click "Scan link with Zenithal" action and notifies the verdict.
//
// Points at the hosted Zenithal backend. If you redeploy (deploy_demo_tunnel.ps1
// gives a new URL every run since Cloudflare quick tunnels are ephemeral),
// update API_BASE below and reload the extension — chrome://extensions → the
// reload icon on this card.
const API_BASE = "https://civil-grown-burke-thru.trycloudflare.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "zenithal-scan-link",
    title: "Scan link with Zenithal",
    contexts: ["link"],
  });
  chrome.contextMenus.create({
    id: "zenithal-scan-page",
    title: "Scan this page's URL with Zenithal",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === "zenithal-scan-link" ? info.linkUrl : (info.pageUrl || tab?.url);
  if (!url) return;
  const result = await scan(url);
  notify(url, result);
});

async function scan(url) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/analyze/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return { verdict: "ERROR", reasons: [`Backend returned ${res.status}`] };
    return await res.json();
  } catch {
    return { verdict: "ERROR", reasons: ["Zenithal backend unreachable"] };
  }
}

async function health() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/health`, { method: "GET" });
    return res.ok ? { ok: true, data: await res.json() } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function notify(url, r) {
  const emoji = r.verdict === "MALICIOUS" ? "⛔" : r.verdict === "SUSPICIOUS" ? "⚠️" : r.verdict === "SAFE" ? "✅" : "❓";
  chrome.notifications.create({
    type: "basic",
    iconUrl: iconDataUrl(r.verdict),
    title: `${emoji} ${r.verdict} ${r.score != null ? "(" + r.score + "/100)" : ""}`,
    message: (r.reasons && r.reasons[0]) || url,
  });
}

// Minimal coloured square icon so notifications render without image assets.
function iconDataUrl(verdict) {
  const color = verdict === "MALICIOUS" ? "%23ff5c7a" : verdict === "SUSPICIOUS" ? "%23ffb454" : "%2352e0c4";
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='12' fill='${color}'/></svg>`;
}

// Popup <-> background messaging.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "scan") {
    scan(msg.url).then(sendResponse);
    return true; // async
  }
  if (msg.type === "health") {
    health().then(sendResponse);
    return true;
  }
});
