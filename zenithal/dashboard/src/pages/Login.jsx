import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifyAccess, setStoredKey } from "../services/api";
import { font, color, gradients } from "../theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shakeN, setShakeN] = useState(0);
  const navigate = useNavigate();

  const fail = (msg) => { setError(msg); setShakeN((n) => n + 1); setBusy(false); };

  const submit = async () => {
    if (!email || !/@/.test(email)) return fail("ERR · enter a valid email");
    setBusy(true);
    setError("");
    try {
      const res = await verifyAccess(pass);
      if (!res.ok) return fail("ERR · invalid API key for this backend");
      navigate("/dashboard");
    } catch {
      // Backend unreachable — still let the analyst in; the dashboard shows
      // its own connection status instead of gatekeeping here.
      navigate("/dashboard");
    }
  };

  const continueAsGuest = () => { setStoredKey(""); navigate("/dashboard"); };

  return (
    <div style={{ minHeight: "100vh", background: color.bg, display: "grid", gridTemplateColumns: "1fr 1fr", position: "relative", overflow: "hidden", fontFamily: font.body, color: color.text }}>
      <div style={{ position: "absolute", top: -200, left: -160, width: 680, height: 680, borderRadius: "50%", background: "radial-gradient(circle, rgba(138,124,255,.28), transparent 65%)", filter: "blur(70px)", animation: "zDrift1 28s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: -240, right: -140, width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,86,199,.2), transparent 65%)", filter: "blur(80px)", animation: "zDrift2 34s ease-in-out infinite" }} />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px", borderRight: "1px solid rgba(255,255,255,.06)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 11, color: color.text, width: "max-content" }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: gradients.brand, display: "grid", placeItems: "center", fontFamily: font.display, fontWeight: 800, fontSize: 15, color: color.bg, boxShadow: "0 0 22px rgba(240,86,199,.45)" }}>Z</span>
          <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18 }}>zenithal</span>
        </Link>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 34 }}>
          <div style={{ width: 210, height: 210, background: "radial-gradient(circle at 34% 30%, #C9B8FF 0%, #8A7CFF 32%, #B23BD6 62%, #3B0764 100%)", boxShadow: "0 0 100px rgba(178,59,214,.5), inset -24px -32px 60px rgba(9,9,15,.6)", filter: "blur(1px)", animation: "zBlob 7s ease-in-out infinite" }} />
          <div>
            <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 800, fontSize: "clamp(30px,3vw,42px)", lineHeight: 1.1, letterSpacing: "-.02em", background: gradients.heading, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Your SOC console<br />is waiting.</h1>
            <p style={{ margin: "16px 0 0", maxWidth: 380, fontSize: 14, fontWeight: 300, lineHeight: 1.65, color: "rgba(237,235,255,.55)" }}>Live threat feed, URL scanner, log analyzer, attacker map, self-learning anomaly baseline and an AI analyst — every verdict scored and explained.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".08em", color: "rgba(237,235,255,.35)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: color.cyan, animation: "zPulse 2.2s infinite" }} />API RUNS OPEN BY DEFAULT</span>
          <span>SIH25229 · THE ZENITHAL</span>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "min(420px,100%)" }}>
          <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.1)", background: "rgba(16,15,28,.7)", backdropFilter: "blur(24px)", boxShadow: "0 40px 100px rgba(0,0,0,.55), 0 0 70px rgba(138,124,255,.1)", padding: "40px 38px", animation: error ? `zShake .45s cubic-bezier(.22,1,.36,1) ${shakeN}` : "none" }}>
            <h2 style={{ margin: "0 0 8px", fontFamily: font.display, fontWeight: 700, fontSize: 24 }}>Sign in</h2>
            <p style={{ margin: "0 0 30px", fontSize: 13, fontWeight: 300, color: "rgba(237,235,255,.5)" }}>Analyst access to the Zenithal console.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(237,235,255,.5)" }}>EMAIL</span>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="analyst@zenithal.io"
                  style={{ padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: color.text, fontSize: 14, outline: "none", fontFamily: font.body }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(237,235,255,.5)" }}>API KEY (OPTIONAL IF AUTH IS OPEN)</span>
                <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="X-API-Key"
                  style={{ padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: color.text, fontSize: 14, outline: "none", fontFamily: font.mono }} />
              </label>
              {error && <div style={{ fontSize: 12, color: color.redLight, fontFamily: font.mono }}>{error}</div>}
              <button onClick={submit} disabled={busy}
                style={{ marginTop: 6, padding: 14, border: "none", borderRadius: 99, background: gradients.brandButton, color: "#fff", fontFamily: font.body, fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 0 30px rgba(240,86,199,.35)", opacity: busy ? 0.7 : 1 }}>
                {busy && <span style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff", animation: "zSpin .7s linear infinite" }} />}
                {busy ? "Authorizing…" : "Enter the console"}
              </button>
            </div>
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span style={{ color: "rgba(237,235,255,.4)" }}>No key? Runs open by default.</span>
              <a href="#" onClick={(e) => { e.preventDefault(); continueAsGuest(); }} style={{ fontWeight: 500 }}>Continue as guest →</a>
            </div>
          </div>
          <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 12, color: "rgba(237,235,255,.35)" }}>← <Link to="/">Back to zenithal</Link></p>
        </div>
      </div>
    </div>
  );
}
