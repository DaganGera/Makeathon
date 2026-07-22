import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { analyzeMessage } from "../services/api";
import { VerdictBadge } from "../components/Shared";
import { font, color } from "../theme";

const PRESETS = [
  "URGENT: Your SBI account is blocked. Verify now at http://sbi-verify-now.top/netbanking/login",
  "Your parcel is held. Pay ₹25 customs: http://irctc-refund-user.buzz/claim",
  "Hey, here's the doc we discussed: https://github.com/anthropics/claude-code",
];

export default function WhatsAppSim() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (body) => {
    const b = body || text;
    if (!b.trim()) return;
    setText("");
    setMessages((m) => [...m, { from: "them", body: b, ts: new Date() }]);
    setLoading(true);
    try {
      const res = await analyzeMessage(b, "+91-99999-88888");
      setMessages((m) => [...m, { from: "guard", res, ts: new Date() }]);
    } catch {
      setMessages((m) => [...m, { from: "guard", error: true, ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "zIn .5s cubic-bezier(.22,1,.36,1) both", maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 6px", fontFamily: font.display, fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", gap: 10 }}>
        <MessageSquare size={19} color={color.purpleLight} /> Message Guard
      </h2>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(237,235,255,.5)" }}>Paste a WhatsApp/SMS message — links are extracted and scanned before you ever open them.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => send(p)}
            style={{ fontSize: 11, padding: "7px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "rgba(237,235,255,.6)", cursor: "pointer", fontFamily: font.body }}>
            {p.slice(0, 42)}…
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "#0b141a", overflow: "hidden", display: "flex", flexDirection: "column", height: 460, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
        <div style={{ background: "#1f2c34", padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00a884", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>B</div>
          <div>
            <p style={{ margin: 0, color: "#fff", fontSize: 13.5, fontWeight: 500 }}>Bank Alerts</p>
            <p style={{ margin: 0, color: "rgba(255,255,255,.45)", fontSize: 11 }}>protected by Zenithal</p>
          </div>
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) =>
            m.from === "them" ? (
              <div key={i} style={{ maxWidth: "80%", background: "#202c33", color: "#e9edef", borderRadius: 10, borderTopLeftRadius: 0, padding: "8px 12px", fontSize: 13, wordBreak: "break-word" }}>{m.body}</div>
            ) : (
              <div key={i} style={{ maxWidth: "90%", marginLeft: "auto" }}>
                {m.error ? (
                  <div style={{ background: "rgba(255,92,122,.1)", color: color.redLight, borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>Scan failed — API offline.</div>
                ) : (
                  <ScanBubble res={m.res} />
                )}
              </div>
            )
          )}
          {loading && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>Zenithal scanning links…</div>}
        </div>

        <div style={{ padding: 12, background: "#1f2c34", display: "flex", gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message with a link…"
            style={{ flex: 1, background: "#2a3942", color: "#fff", fontSize: 13, borderRadius: 99, padding: "9px 16px", border: "none", outline: "none" }} />
          <button onClick={() => send()} style={{ width: 38, height: 38, borderRadius: "50%", background: "#00a884", border: "none", display: "grid", placeItems: "center", color: "#fff", cursor: "pointer" }}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanBubble({ res }) {
  const v = res.overall_verdict;
  const border = v === "MALICIOUS" ? "rgba(255,92,122,.4)" : v === "SUSPICIOUS" ? "rgba(255,180,84,.4)" : "rgba(94,234,212,.35)";
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${border}`, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{res.urls_found} link(s) scanned</span>
        <VerdictBadge verdict={v} />
      </div>
      {res.results.map((r, i) => (
        <div key={i} style={{ fontSize: 11 }}>
          <div style={{ color: "rgba(255,255,255,.75)", wordBreak: "break-all" }}>{r.input}</div>
          {r.reasons?.[0] && <div style={{ color: "rgba(255,255,255,.4)", marginTop: 2 }}>▸ {r.reasons[0]}</div>}
          {v === "MALICIOUS" && <div style={{ color: color.redLight, fontWeight: 600, marginTop: 4 }}>Blocked before opening.</div>}
        </div>
      ))}
    </div>
  );
}
