import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Search, FileText, Map as MapIcon, MessageSquare } from "lucide-react";
import { WebSocketProvider, useWebSocket } from "../context/WebSocketContext";
import { getStats, getHealth, setStoredKey } from "../services/api";
import { AnimatedNumber } from "../components/Shared";
import ThreatFeed from "../panels/ThreatFeed";
import UrlScanner from "../panels/UrlScanner";
import LogAnalyzer from "../panels/LogAnalyzer";
import AttackerMap from "../panels/AttackerMap";
import WhatsAppSim from "../panels/WhatsAppSim";
import { font, color, gradients } from "../theme";

const NAV = [
  { id: "feed", label: "Threat Feed", icon: Activity, C: ThreatFeed },
  { id: "url", label: "URL Scanner", icon: Search, C: UrlScanner },
  { id: "logs", label: "Log Analyzer", icon: FileText, C: LogAnalyzer },
  { id: "map", label: "Attacker Map", icon: MapIcon, C: AttackerMap },
  { id: "chat", label: "Message Guard", icon: MessageSquare, C: WhatsAppSim },
];

export default function Dashboard() {
  return (
    <WebSocketProvider>
      <Shell />
    </WebSocketProvider>
  );
}

function Shell() {
  const [active, setActive] = useState("feed");
  const { connectionStatus, detections } = useWebSocket();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => getStats().then(setStats).catch(() => {});
    load();
    getHealth().then(setHealth).catch(() => {});
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { getStats().then(setStats).catch(() => {}); }, [detections.length]);

  const Active = NAV.find((n) => n.id === active)?.C || ThreatFeed;

  const signOut = () => { setStoredKey(""); navigate("/login"); };

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateColumns: "232px 1fr", background: color.bg, overflow: "hidden", position: "relative", fontFamily: font.body, color: color.text }}>
      <div style={{ position: "absolute", top: -260, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(138,124,255,.14), transparent 65%)", filter: "blur(70px)", animation: "zDrift1 34s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -300, left: 200, width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,86,199,.09), transparent 65%)", filter: "blur(80px)", animation: "zDrift1 42s ease-in-out infinite reverse", pointerEvents: "none" }} />

      <aside style={{ display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,.07)", background: "rgba(13,12,22,.7)", backdropFilter: "blur(20px)", position: "relative", zIndex: 5 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 11, color: color.text, padding: "22px 20px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: gradients.brand, display: "grid", placeItems: "center", fontFamily: font.display, fontWeight: 800, fontSize: 14, color: color.bg, boxShadow: "0 0 18px rgba(240,86,199,.4)" }}>Z</span>
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16.5 }}>zenithal</span>
        </a>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: font.mono, fontSize: 10, letterSpacing: ".1em", color: connectionStatus === "connected" ? color.cyan : color.red }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: connectionStatus === "connected" ? color.cyan : color.red, boxShadow: `0 0 8px ${connectionStatus === "connected" ? color.cyan : color.red}`, animation: "zPulse 2s infinite" }} />
            {connectionStatus === "connected" ? "LIVE" : "RECONNECTING"}
          </div>
          {health && (
            <p style={{ fontFamily: font.mono, fontSize: 9.5, color: "rgba(237,235,255,.35)", marginTop: 8, lineHeight: 1.8 }}>
              url · {health.url_model}<br />payload · {health.payload_model}<br />anomaly · {health.anomaly_model}<br />geo · {health.geo_backend}<br />analyst · {health.analyst}
            </p>
          )}
        </div>
        <nav style={{ flex: 1, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => setActive(id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", border: `1px solid ${on ? "rgba(138,124,255,.35)" : "transparent"}`, borderRadius: 11, background: on ? "rgba(138,124,255,.13)" : "transparent", color: on ? "#C9C2FF" : "rgba(237,235,255,.55)", fontSize: 13, fontWeight: on ? 600 : 400, cursor: "pointer", textAlign: "left", fontFamily: font.body }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "rgba(255,255,255,.06)", color: on ? color.purpleLight : "rgba(237,235,255,.4)" }}><Icon size={12} /></span>
                {label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: ".08em", color: "rgba(237,235,255,.35)" }}>SIH25229</span>
          <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }} style={{ fontSize: 11.5, color: "rgba(237,235,255,.5)" }}>Sign out</a>
        </div>
      </aside>

      <main style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 2 }}>
        <StatsBar stats={stats} />
        <div style={{ flex: 1, overflowY: "auto" }} className="custom-scrollbar">
          <div style={{ padding: "20px 26px" }}><Active /></div>
        </div>
      </main>
    </div>
  );
}

function StatsBar({ stats }) {
  const { detections: live } = useWebSocket();
  if (!stats) return null;
  const items = [
    { label: "DETECTIONS", value: stats.total_detections, c: color.text },
    { label: "MALICIOUS", value: stats.malicious, c: color.red },
    { label: "SUSPICIOUS", value: stats.suspicious, c: color.orange },
    { label: "ATTACKER IPS", value: stats.unique_attackers, c: color.purpleLight },
    { label: "COUNTRIES", value: stats.countries, c: color.pinkLight },
  ];
  const recent = live.slice(0, 20);
  const badFrac = recent.length ? recent.filter((d) => d.verdict !== "SAFE").length / recent.length : 0;
  const level = badFrac >= 0.5 ? "CRITICAL" : badFrac >= 0.25 ? "ELEVATED" : badFrac > 0 ? "GUARDED" : "LOW";
  const levelColor = { CRITICAL: color.red, ELEVATED: color.orange, GUARDED: "#eab308", LOW: color.cyan }[level];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 1, background: "rgba(255,255,255,.05)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
      {items.map((it) => (
        <div key={it.label} style={{ background: "rgba(9,9,15,.92)", padding: "14px 20px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".12em", color: "rgba(237,235,255,.4)" }}>{it.label}</div>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 22, marginTop: 3, color: it.c }}><AnimatedNumber value={it.value ?? 0} /></div>
        </div>
      ))}
      <div style={{ background: "rgba(9,9,15,.92)", padding: "14px 20px" }}>
        <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".12em", color: "rgba(237,235,255,.4)" }}>THREAT LEVEL</div>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginTop: 3, color: levelColor, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: levelColor, boxShadow: `0 0 8px ${levelColor}`, animation: "zPulse 2s infinite" }} />
          {level}
        </div>
      </div>
    </div>
  );
}
