import React, { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { getDetections } from "../services/api";
import { font, color, verdictChip } from "../theme";
import AnalystPanel from "../components/AnalystPanel";

const CHANNEL_LABEL = { url: "URL", log: "Server Log", message: "WhatsApp/SMS" };

export default function ThreatFeed() {
  const { detections: live } = useWebSocket();
  const [seed, setSeed] = useState([]);
  const [selId, setSelId] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const lastTopId = useRef(null);

  useEffect(() => {
    getDetections(100).then((d) => setSeed(d.detections || [])).catch(() => {});
  }, []);

  const seen = new Set();
  const all = [...live, ...seed].filter((d) => {
    const key = d.id ?? `${d.input}-${d.created_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  useEffect(() => {
    const top = all[0];
    if (!top) return;
    const topKey = top.id ?? `${top.input}-${top.created_at}`;
    if (topKey !== lastTopId.current) {
      lastTopId.current = topKey;
      if (top.verdict !== "SAFE") {
        setFlashId(topKey);
        const t = setTimeout(() => setFlashId(null), 1800);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all[0]?.id, all[0]?.created_at]);

  const sel = all.find((d) => (d.id ?? `${d.input}-${d.created_at}`) === selId) || all[0] || null;
  const selChip = sel ? verdictChip(sel.verdict) : verdictChip("SAFE");

  return (
    <div style={{ animation: "zIn .5s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", gap: 10 }}>
          <Activity size={19} color={color.purpleLight} /> Threat Feed
        </h2>
        <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.4)" }}>{all.length} events</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", backdropFilter: "blur(16px)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr .9fr .9fr .5fr", padding: "12px 18px", fontFamily: font.mono, fontSize: 9.5, letterSpacing: ".1em", color: "rgba(237,235,255,.4)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <span>INPUT</span><span>THREAT</span><span>SOURCE</span><span style={{ textAlign: "right" }}>SCORE</span>
          </div>
          <div style={{ maxHeight: "68vh", overflowY: "auto" }} className="custom-scrollbar">
            {all.length === 0 && (
              <div style={{ padding: "40px 10px", textAlign: "center", color: "rgba(237,235,255,.35)", fontSize: 12.5 }}>
                No detections yet. Scan a URL or upload a log to populate the feed.
              </div>
            )}
            {all.map((d, i) => {
              const key = d.id ?? `${d.input}-${d.created_at}`;
              const c = verdictChip(d.verdict);
              const isFlashing = key === flashId;
              return (
                <div key={key} onClick={() => setSelId(key)}
                  style={{
                    display: "grid", gridTemplateColumns: "2fr .9fr .9fr .5fr", alignItems: "center", padding: "13px 18px",
                    borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer",
                    background: isFlashing ? (d.verdict === "MALICIOUS" ? "rgba(255,92,122,.15)" : "rgba(255,180,84,.1)") : selId === key ? "rgba(138,124,255,.09)" : "transparent",
                    transition: "background .7s", animation: "zRow .5s cubic-bezier(.22,1,.36,1) both",
                  }}>
                  <span style={{ fontFamily: font.mono, fontSize: 11.5, color: "rgba(237,235,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 14 }}>{d.input}</span>
                  <span><span style={{ padding: "3px 10px", borderRadius: 99, fontFamily: font.mono, fontSize: 9.5, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{d.threat_type || d.verdict}</span></span>
                  <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.5)" }}>{d.country || "—"} · {d.src_ip || d.resolved_ip || "—"}</span>
                  <span style={{ textAlign: "right", fontFamily: font.mono, fontWeight: 600, fontSize: 12, color: c.fg }}>{Math.round(d.score)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", backdropFilter: "blur(16px)", padding: 22, position: "sticky", top: 0 }}>
          {sel ? (
            <div style={{ animation: "zIn .45s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ padding: "4px 12px", borderRadius: 99, fontFamily: font.mono, fontSize: 10, fontWeight: 600, background: selChip.bg, color: selChip.fg, border: `1px solid ${selChip.bd}` }}>{sel.verdict}</span>
                <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 26, color: selChip.fg }}>{Math.round(sel.score)}</span>
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 11.5, color: "rgba(237,235,255,.85)", wordBreak: "break-all", padding: "12px 14px", borderRadius: 11, background: "rgba(9,9,15,.7)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 16 }}>{sel.input}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16, fontFamily: font.mono, fontSize: 10.5 }}>
                <MetaTile k="SOURCE IP" v={sel.src_ip || sel.resolved_ip || "—"} />
                <MetaTile k="GEO" v={sel.country || "—"} />
              </div>
              <div style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: ".12em", color: "rgba(237,235,255,.4)", marginBottom: 10 }}>WHY THIS VERDICT</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                {(sel.reasons || []).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, fontSize: 11.5, lineHeight: 1.5, color: "rgba(237,235,255,.7)" }}><span style={{ color: selChip.fg }}>▸</span>{r}</div>
                ))}
              </div>
              <AnalystPanel detection={sel} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "rgba(237,235,255,.35)", fontSize: 12.5 }}>Select an event to see its explanation and IP intel.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaTile({ k, v }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
      <div style={{ fontSize: 8.5, letterSpacing: ".1em", color: "rgba(237,235,255,.38)" }}>{k}</div>
      <div style={{ marginTop: 4, color: "rgba(237,235,255,.8)" }}>{v}</div>
    </div>
  );
}
