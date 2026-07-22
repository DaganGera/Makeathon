import React, { useState } from "react";
import { Upload, FileText, ShieldAlert, Brain } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { analyzeLogFile, analyzeLogText } from "../services/api";
import { StatTile, ReasonList } from "../components/Shared";
import AnalystPanel from "../components/AnalystPanel";
import { font, color, gradients, verdictChip } from "../theme";

const TYPE_COLORS = {
  SQLi: color.red, XSS: color.orange, Traversal: "#eab308",
  CmdInjection: color.pink, LFI_RFI: color.cyan,
};

export default function LogAnalyzer() {
  const [logText, setLogText] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const run = async (text) => {
    const t = text ?? logText;
    if (!t.trim()) return;
    setLoading(true); setError(null); setReport(null); setSelected(null);
    try {
      setReport(await analyzeLogText(t));
    } catch {
      setError("Analysis failed — is the API running on :8000?");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file) => {
    if (!file) return;
    setLoading(true); setError(null); setReport(null); setSelected(null);
    try {
      setReport(await analyzeLogFile(file));
    } catch {
      setError("Analysis failed — is the API running on :8000?");
    } finally {
      setLoading(false);
    }
  };

  const chartData = report ? Object.entries(report.attack_breakdown).map(([type, count]) => ({ type, count })) : [];

  return (
    <div style={{ animation: "zIn .5s cubic-bezier(.22,1,.36,1) both", maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 6px", fontFamily: font.display, fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", gap: 10 }}>
        <FileText size={19} color={color.purpleLight} /> Log Analyzer
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(237,235,255,.5)" }}>Engine 2 — signatures + ML + self-learning anomaly baseline + behavior correlation, aggregated into ranked attacker-IP profiles.</p>

      <textarea value={logText} onChange={(e) => setLogText(e.target.value)} rows={6} spellCheck={false}
        placeholder='203.0.113.7 - - [17/Jul/2026:09:14:02] "GET /products?id=1%27%20OR%20%271%27=%271 HTTP/1.1" 200'
        style={{ width: "100%", boxSizing: "border-box", padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(16,15,28,.7)", color: "rgba(237,235,255,.8)", fontFamily: font.mono, fontSize: 11.5, lineHeight: 1.7, outline: "none", resize: "vertical" }} />

      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => run()} disabled={loading}
          style={{ padding: "13px 28px", border: "none", borderRadius: 99, background: gradients.brandButton, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 0 26px rgba(240,86,199,.3)", opacity: loading ? 0.7 : 1 }}>
          {loading && <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", animation: "zSpin .7s linear infinite" }} />}
          Analyze log
        </button>
        <label style={{ padding: "13px 22px", borderRadius: 99, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)", color: "rgba(237,235,255,.7)", fontSize: 13, cursor: "pointer" }}>
          Upload file
          <input type="file" className="hidden" accept=".log,.txt,text/plain" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.35)" }}>POST /api/v1/analyze/logtext</span>
      </div>

      {error && <div style={{ marginTop: 20, background: "rgba(255,92,122,.08)", border: "1px solid rgba(255,92,122,.25)", color: color.redLight, borderRadius: 12, padding: 14, fontSize: 13 }}>{error}</div>}

      {report && (
        <div style={{ marginTop: 26, animation: "zIn .5s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 18 }}>
            <StatTile label="REQUESTS" value={report.total_requests} accent={color.text} />
            <StatTile label="ATTACKS FOUND" value={report.malicious_requests} accent={color.red} />
            <StatTile label="ATTACKERS" value={report.unique_attackers} accent={color.orange} />
            <StatTile label="TECHNIQUES" value={Object.keys(report.attack_breakdown).length} accent={color.purpleLight} />
            <StatTile label="AI BASELINE" value={report.anomaly_count ?? 0} sub={report.anomaly_engine === "active" ? "self-learning" : "untrained"} accent={color.cyan} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", padding: 20 }}>
              <h4 style={{ margin: "0 0 14px", fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: "rgba(237,235,255,.5)" }}>ATTACK-TYPE BREAKDOWN</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <XAxis dataKey="type" stroke="rgba(237,235,255,.4)" fontSize={10} />
                  <YAxis stroke="rgba(237,235,255,.4)" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#100F1C", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((d) => <Cell key={d.type} fill={TYPE_COLORS[d.type] || color.purpleLight} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", padding: 20 }}>
              <h4 style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: "rgba(237,235,255,.5)" }}>
                <ShieldAlert size={13} color={color.red} /> TOP ATTACKER IPS
              </h4>
              <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }} className="custom-scrollbar">
                {report.attackers.map((a) => (
                  <button key={a.ip} onClick={() => setSelected(a)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: selected?.ip === a.ip ? "1px solid rgba(138,124,255,.4)" : "1px solid transparent", background: selected?.ip === a.ip ? "rgba(138,124,255,.1)" : "rgba(255,255,255,.03)", cursor: "pointer", fontFamily: font.body }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: font.mono, fontSize: 12, color: "rgba(237,235,255,.9)" }}>{a.ip}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: a.risk_score >= 70 ? color.redLight : color.orangeLight }}>{a.risk_score}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "rgba(237,235,255,.45)", marginTop: 2 }}>
                      <span>{a.intel?.country} · {a.intel?.hosting_type}
                        {a.behavior?.scanner_tool && <span style={{ color: color.orangeLight }}> · tooled</span>}
                        {a.total_hits === 0 && a.anomalous_requests > 0 && <span style={{ color: color.cyan, display: "inline-flex", alignItems: "center", gap: 2 }}> · <Brain size={10} /> AI</span>}
                      </span>
                      <span>{a.total_hits} hits</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selected && (
            <div style={{ marginTop: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontFamily: font.mono, fontSize: 14, color: color.text }}>{selected.ip}</h4>
                {(() => { const c = verdictChip(selected.risk_score >= 70 ? "MALICIOUS" : "SUSPICIOUS"); return (
                  <span style={{ padding: "4px 12px", borderRadius: 99, fontFamily: font.mono, fontSize: 10, fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{selected.risk_score >= 70 ? "MALICIOUS" : "SUSPICIOUS"}</span>
                ); })()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14, fontSize: 12 }}>
                <Meta k="Country" v={selected.intel?.country} />
                <Meta k="ASN / Org" v={selected.intel?.asn ? `AS${selected.intel.asn}` : selected.intel?.org} />
                <Meta k="Hosting" v={selected.intel?.hosting_type} />
                <Meta k="Reputation" v={selected.intel?.reputation} />
                {selected.behavior?.scanner_tool && <Meta k="Scanner tool" v={selected.behavior.scanner_tool} />}
                {selected.behavior?.distinct_paths_probed > 0 && <Meta k="Paths probed" v={`${selected.behavior.distinct_paths_probed} (${selected.behavior.not_found_count} 404s)`} />}
                {selected.anomalous_requests > 0 && <Meta k="AI baseline score" v={`${selected.anomaly_score}/100`} />}
              </div>
              <ReasonList reasons={selected.reasons} />
              <div style={{ marginTop: 16 }}>
                <AnalystPanel detection={{ ...selected, channel: "log", input: selected.ip, verdict: selected.risk_score >= 70 ? "MALICIOUS" : "SUSPICIOUS", score: selected.risk_score }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", overflow: "hidden" }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: "rgba(237,235,255,.5)" }}>
              MALICIOUS REQUESTS ({report.detections.length})
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }} className="custom-scrollbar">
              {report.detections.map((d, i) => (
                <div key={i} style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.45)" }}>{d.src_ip}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6, color: TYPE_COLORS[d.attack_type], background: (TYPE_COLORS[d.attack_type] || color.purpleLight) + "1a" }}>{d.label}</span>
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: "rgba(237,235,255,.75)", marginTop: 4, wordBreak: "break-all" }}>{d.method} {d.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ k, v }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "8px 10px" }}>
      <p style={{ margin: 0, fontSize: 10, color: "rgba(237,235,255,.4)" }}>{k}</p>
      <p style={{ margin: "2px 0 0", color: "rgba(237,235,255,.85)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v || "—"}</p>
    </div>
  );
}
