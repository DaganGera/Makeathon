import React, { useState } from "react";
import { Search } from "lucide-react";
import { analyzeUrl } from "../services/api";
import { font, color, gradients, verdictChip } from "../theme";
import AnalystPanel from "../components/AnalystPanel";

const SAMPLES = [
  { label: "sbi-verify-now.top", v: "http://sbi-verify-now.top/netbanking/login" },
  { label: "192.168.1.1/paypal", v: "http://192.168.1.1/paypal/login.php" },
  { label: "bit.ly shortener", v: "https://bit.ly/3xY9kQz" },
  { label: "github.com", v: "https://github.com" },
];

export default function UrlScanner() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const scan = async (target) => {
    const u = target || url;
    if (!u.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await analyzeUrl(u.trim()));
    } catch {
      setError("Backend unreachable — is the API running on :8000?");
    } finally {
      setLoading(false);
    }
  };

  const r = result;
  const c = r ? verdictChip(r.verdict) : verdictChip("SAFE");
  const intel = r?.ip_intel;

  return (
    <div style={{ animation: "zIn .5s cubic-bezier(.22,1,.36,1) both", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 6px", fontFamily: font.display, fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", gap: 10 }}>
        <Search size={19} color={color.purpleLight} /> URL Scanner
      </h2>
      <p style={{ margin: "0 0 22px", fontSize: 13, color: "rgba(237,235,255,.5)" }}>Engine 1 — reputation-first + 38 lexical/host features + XGBoost, fused with IP-domain correlation &amp; WHOIS.</p>

      <div style={{ display: "flex", gap: 12 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder="Paste a URL to analyze…"
          style={{ flex: 1, padding: "15px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(16,15,28,.7)", color: color.text, fontFamily: font.mono, fontSize: 13, outline: "none" }} />
        <button onClick={() => scan()} disabled={loading}
          style={{ padding: "15px 30px", border: "none", borderRadius: 14, background: gradients.brandButton, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 0 26px rgba(240,86,199,.3)", opacity: loading ? 0.7 : 1 }}>
          {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", animation: "zSpin .7s linear infinite" }} />}
          {loading ? "Scanning…" : "Scan"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {SAMPLES.map((p) => (
          <button key={p.v} onClick={() => { setUrl(p.v); scan(p.v); }}
            style={{ padding: "7px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(237,235,255,.6)", fontFamily: font.mono, fontSize: 10.5, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      {error && <div style={{ marginTop: 20, background: "rgba(255,92,122,.08)", border: "1px solid rgba(255,92,122,.25)", color: color.redLight, borderRadius: 12, padding: 14, fontSize: 13 }}>{error}</div>}

      {r && (
        <div style={{ marginTop: 26, borderRadius: 18, border: `1px solid ${c.bd}`, background: "rgba(16,15,28,.6)", backdropFilter: "blur(18px)", padding: 28, animation: "zIn .5s cubic-bezier(.22,1,.36,1) both", boxShadow: `0 0 60px ${c.bg}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 28, alignItems: "center" }}>
            <div style={{ position: "relative", width: 130, height: 130, borderRadius: "50%", background: `conic-gradient(${c.fg} ${Math.round(r.score * 3.6)}deg, rgba(255,255,255,.06) 0deg)`, display: "grid", placeItems: "center", transition: "background 1s cubic-bezier(.22,1,.36,1)" }}>
              <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#100F1C", display: "grid", placeItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 30, color: c.fg }}>{Math.round(r.score)}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 8.5, letterSpacing: ".1em", color: "rgba(237,235,255,.4)" }}>/100 RISK</div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ padding: "5px 14px", borderRadius: 99, fontFamily: font.mono, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{r.verdict}</span>
                <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.45)" }}>{r.threat_type} · {r.model_used}</span>
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 12.5, color: "rgba(237,235,255,.85)", wordBreak: "break-all", marginBottom: 14 }}>{r.input}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontFamily: font.mono, fontSize: 10 }}>
                <Tag>IP {r.resolved_ip || "—"}</Tag>
                <Tag>{intel?.country || "—"}</Tag>
                <Tag>{intel?.asn ? `AS${intel.asn}` : intel?.org || "—"}</Tag>
                <Tag c={intel?.reputation === "malicious" ? color.redLight : intel?.reputation === "suspicious" ? color.orangeLight : "rgba(237,235,255,.65)"}>rep · {intel?.reputation || "—"}</Tag>
                {r.domain_age_days != null && (
                  <Tag c={r.domain_age_days < 30 ? color.redLight : "rgba(237,235,255,.65)"}>domain age · {r.domain_age_days}d</Tag>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: ".12em", color: "rgba(237,235,255,.4)", marginBottom: 12 }}>EXPLAINABILITY — RANKED REASONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(r.reasons || []).map((reason, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "11px 14px", borderRadius: 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", fontSize: 12, lineHeight: 1.5, color: "rgba(237,235,255,.72)" }}>
                  <span style={{ color: c.fg }}>▸</span>{reason}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <AnalystPanel detection={r} />
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children, c = "rgba(237,235,255,.65)" }) {
  return <span style={{ padding: "5px 11px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", color: c }}>{children}</span>;
}
