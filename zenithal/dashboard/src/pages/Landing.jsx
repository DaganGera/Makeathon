import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import { getHealth, getStats, getDetections, getAttackers } from "../services/api";
import { simDetection, simStats, simAttackers } from "../services/sim";
import { font, color, gradients, verdictChip } from "../theme";

const TYPED_SAMPLES = ["sbi-verify-now.top/login", "paypa1-account.support", "185.220.101.34 access.log", "amaz0n-otp.link/verify"];

export default function Landing() {
  const [mode, setMode] = useState("connecting"); // connecting | live | sim
  const [stats, setStats] = useState(simStats(0));
  const [heroRows, setHeroRows] = useState(Array.from({ length: 6 }, simDetection));
  const [attackers, setAttackers] = useState(simAttackers());
  const [typedUrl, setTypedUrl] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await getHealth();
        if (cancelled) return;
        const [s, det, atk] = await Promise.all([getStats(), getDetections(20), getAttackers(8)]);
        setMode("live");
        setStats(s || simStats(0));
        if (det?.detections?.length) setHeroRows(det.detections.slice(0, 8));
        if (atk?.attackers?.length) setAttackers(atk.attackers.slice(0, 8));
        pollRef.current = setInterval(async () => {
          const s2 = await getStats().catch(() => null);
          if (s2) setStats(s2);
        }, 5000);
      } catch {
        if (!cancelled) setMode("sim");
      }
    })();
    return () => { cancelled = true; clearInterval(pollRef.current); };
  }, []);

  // Simulated-mode ticker keeps drifting so the page never looks static.
  useEffect(() => {
    if (mode !== "sim") return;
    const t = setInterval(() => setHeroRows((rows) => [simDetection(), ...rows].slice(0, 8)), 3600);
    return () => clearInterval(t);
  }, [mode]);

  // Hero search-bar type-loop (pure decoration, always runs).
  useEffect(() => {
    let ui = 0, ci = 0, dir = 1, timer;
    const tick = () => {
      const u = TYPED_SAMPLES[ui];
      ci += dir;
      if (ci >= u.length + 14) { dir = -1; ci = u.length; }
      if (ci < 0) { dir = 1; ci = 0; ui = (ui + 1) % TYPED_SAMPLES.length; }
      setTypedUrl(TYPED_SAMPLES[ui].slice(0, Math.max(0, Math.min(ci, TYPED_SAMPLES[ui].length))));
      timer = setTimeout(tick, dir === 1 ? 70 : 22);
    };
    const startup = setTimeout(tick, 4200);
    return () => { clearTimeout(startup); clearTimeout(timer); };
  }, []);

  const tickerLoop = [...heroRows, ...heroRows, ...heroRows].slice(0, 16);
  const pins = attackers.filter((a) => a.lat != null).map((a) => ({
    ...project(a.lat, a.lon),
    c: a.risk_score >= 80 ? color.red : a.risk_score >= 55 ? color.orange : color.purpleLight,
    label: `${a.country || a.cc || ""} · ${a.risk_score}`,
  }));

  return (
    <div style={{ minHeight: "100vh", background: color.bg, overflowX: "hidden", position: "relative", fontFamily: font.body, color: color.text, WebkitFontSmoothing: "antialiased" }}>
      <Nav />
      <Hero mode={mode} stats={stats} heroRows={heroRows} typedUrl={typedUrl} />
      <Ticker rows={tickerLoop} />
      <StatsBand />
      <Engines />
      <IPIntel pins={pins} attackers={attackers} />
      <Integrations />
      <ApiSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function project(lat, lon) {
  return { x: (((lon + 180) / 360) * 100).toFixed(1) + "%", y: (((90 - lat) / 180) * 88 + 4).toFixed(1) + "%" };
}

function Nav() {
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 48px", background: "rgba(9,9,15,.55)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <a href="#top" style={{ display: "flex", alignItems: "center", gap: 11, color: color.text }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: gradients.brand, display: "grid", placeItems: "center", fontFamily: font.display, fontWeight: 800, fontSize: 15, color: color.bg, boxShadow: "0 0 22px rgba(240,86,199,.45)" }}>Z</span>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em" }}>zenithal</span>
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: 34, fontSize: 13.5 }}>
        <a href="#engines" style={{ color: "rgba(237,235,255,.7)" }}>Engines</a>
        <a href="#intel" style={{ color: "rgba(237,235,255,.7)" }}>IP Intelligence</a>
        <a href="#integrations" style={{ color: "rgba(237,235,255,.7)" }}>Integrations</a>
        <a href="#api" style={{ color: "rgba(237,235,255,.7)" }}>API</a>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link to="/login" style={{ fontSize: 13.5, color: "rgba(237,235,255,.75)", padding: "9px 16px" }}>Sign in</Link>
        <Link to="/dashboard" style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", padding: "10px 20px", borderRadius: 99, background: gradients.brand, boxShadow: "0 0 24px rgba(240,86,199,.35)" }}>Open console</Link>
      </div>
    </nav>
  );
}

function Hero({ mode, stats, heroRows, typedUrl }) {
  const chip = (v) => verdictChip(v);
  return (
    <header id="top" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "120px 24px 90px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -220, left: -180, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(138,124,255,.32), transparent 65%)", filter: "blur(70px)", animation: "zDrift1 26s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: -260, right: -160, width: 820, height: 820, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,86,199,.22), transparent 65%)", filter: "blur(80px)", animation: "zDrift2 32s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "30%", left: "55%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,40,217,.28), transparent 60%)", filter: "blur(60px)", animation: "zDrift1 38s ease-in-out infinite reverse" }} />

      {/* Intro layer */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 90, pointerEvents: "none", animation: "zOut .7s cubic-bezier(.22,1,.36,1) 1.25s forwards", zIndex: 2 }}>
        <div style={{ width: 300, height: 300, background: "radial-gradient(circle at 34% 30%, #C9B8FF 0%, #8A7CFF 32%, #B23BD6 62%, #3B0764 100%)", boxShadow: "0 0 120px rgba(178,59,214,.55), inset -30px -40px 80px rgba(9,9,15,.6)", filter: "blur(1px)", animation: "zBlob 7s ease-in-out infinite, zInScale .9s cubic-bezier(.22,1,.36,1) both" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <FeatureCard delay=".15s" label="E1" title="Phishing URL engine" text="38 lexical & host features + XGBoost, blended with live IP-domain correlation." accent="rgba(138,124,255,.4)" accentBg="rgba(138,124,255,.35)" accentText="#B9AFFF" />
          <FeatureCard delay=".32s" ml={44} label="E2" title="Payload attack engine" text="SQLi · XSS · traversal · command injection · LFI, ranked into attacker-IP profiles." accent="rgba(240,86,199,.4)" accentBg="rgba(240,86,199,.32)" accentText="#F79BDC" />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%" }}>
        <div style={{ animation: "zIn 1s cubic-bezier(.22,1,.36,1) 1.55s both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(138,124,255,.35)", background: "rgba(138,124,255,.08)", fontFamily: font.mono, fontSize: 11.5, color: color.purpleLight, letterSpacing: ".06em", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.cyan, boxShadow: "0 0 10px " + color.cyan, animation: "zPulse 2.2s ease-in-out infinite" }} />
            LIVE THREAT DETECTION · SIH25229
          </div>
          <h1 style={{ margin: 0, fontFamily: font.display, fontWeight: 800, fontSize: "clamp(44px,6.4vw,84px)", lineHeight: 1.04, letterSpacing: "-.02em", background: gradients.heading, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            One brain for<br />URL-based attacks.
          </h1>
        </div>
        <p style={{ maxWidth: 620, margin: "26px 0 0", fontSize: 17, fontWeight: 300, lineHeight: 1.65, color: "rgba(237,235,255,.62)", animation: "zIn 1s cubic-bezier(.22,1,.36,1) 1.8s both" }}>
          Zenithal detects phishing links and server-side injection attacks, fuses geolocation, ASN and reputation from raw IP data, adds a self-learning anomaly baseline and an AI analyst — then scores, explains and maps every threat in a live SOC console.
        </p>

        <div style={{ animation: "zFloat 6s ease-in-out 4s infinite", marginTop: 58, width: "min(960px,94vw)" }}>
          <div style={{ animation: "zDash 1.1s cubic-bezier(.22,1,.36,1) 2.35s both", borderRadius: 20, border: "1px solid rgba(255,255,255,.1)", background: "rgba(16,15,28,.72)", backdropFilter: "blur(24px)", boxShadow: "0 40px 120px rgba(0,0,0,.6), 0 0 90px rgba(138,124,255,.14)", overflow: "hidden", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, background: gradients.brand, display: "grid", placeItems: "center", fontFamily: font.display, fontWeight: 800, fontSize: 10, color: color.bg }}>Z</span>
                <span style={{ fontFamily: font.mono, fontSize: 11, color: "rgba(237,235,255,.55)", letterSpacing: ".08em" }}>ZENITHAL CONSOLE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", fontFamily: font.mono, fontSize: 11.5, color: "rgba(237,235,255,.8)", minWidth: 280 }}>
                <span style={{ color: color.purple }}>&gt;</span><span>{typedUrl}</span><span style={{ width: 7, height: 14, background: color.pink, animation: "zCaret 1s steps(1) infinite", display: "inline-block" }} />
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: font.mono, fontSize: 10.5, color: mode === "live" ? color.cyan : color.orange }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: mode === "live" ? color.cyan : color.orange, animation: "zPulse 2s infinite" }} />
                {mode === "live" ? "WS LIVE" : mode === "sim" ? "PREVIEW" : "CONNECTING"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", minHeight: 330 }}>
              <div style={{ borderRight: "1px solid rgba(255,255,255,.07)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                {["Threat Feed", "URL Scanner", "Log Analyzer", "Attacker Map", "Message Guard"].map((l, i) => (
                  <div key={l} style={i === 0
                    ? { padding: "9px 12px", borderRadius: 10, background: "rgba(138,124,255,.14)", border: "1px solid rgba(138,124,255,.3)", fontSize: 12, fontWeight: 500, color: "#C9C2FF" }
                    : { padding: "9px 12px", borderRadius: 10, fontSize: 12, color: "rgba(237,235,255,.5)" }}>{l}</div>
                ))}
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                  <MiniStat label="DETECTIONS" value={(stats.total_detections ?? 0).toLocaleString()} />
                  <MiniStat label="MALICIOUS" value={(stats.malicious ?? 0).toLocaleString()} tint="rgba(255,92,122,.06)" border="rgba(255,92,122,.22)" color={color.red} labelColor="rgba(255,92,122,.7)" />
                  <MiniStat label="SUSPICIOUS" value={(stats.suspicious ?? 0).toLocaleString()} tint="rgba(255,180,84,.05)" border="rgba(255,180,84,.2)" color={color.orange} labelColor="rgba(255,180,84,.7)" />
                  <MiniStat label="ATTACKER IPS" value={stats.unique_attackers ?? 0} tint="rgba(138,124,255,.07)" border="rgba(138,124,255,.24)" color={color.purpleLight} labelColor="rgba(185,175,255,.7)" pulse />
                </div>
                <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", overflow: "hidden", flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.9fr .8fr .7fr .5fr", padding: "10px 16px", fontFamily: font.mono, fontSize: 9.5, letterSpacing: ".1em", color: "rgba(237,235,255,.4)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                    <span>INPUT</span><span>THREAT</span><span>SOURCE</span><span style={{ textAlign: "right" }}>SCORE</span>
                  </div>
                  <div style={{ height: 168, overflow: "hidden" }}>
                    <div style={{ animation: "zScan 9s cubic-bezier(.22,1,.36,1) 4.5s infinite" }}>
                      {heroRows.map((r, i) => {
                        const c = chip(r.verdict);
                        return (
                          <div key={r.id ?? i} style={{ display: "grid", gridTemplateColumns: "1.9fr .8fr .7fr .5fr", alignItems: "center", padding: "0 16px", height: 56, borderBottom: "1px solid rgba(255,255,255,.045)", fontSize: 11.5 }}>
                            <span style={{ fontFamily: font.mono, color: "rgba(237,235,255,.78)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{r.input}</span>
                            <span><span style={{ padding: "3px 9px", borderRadius: 99, fontFamily: font.mono, fontSize: 9.5, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{r.threat_type}</span></span>
                            <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.5)" }}>{r.country || r.cc || "—"} · {r.src_ip || r.resolved_ip || "—"}</span>
                            <span style={{ textAlign: "right", fontFamily: font.mono, fontWeight: 600, color: c.fg }}>{Math.round(r.score)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Link to="/dashboard" style={{ marginTop: 44, display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 34px", borderRadius: 99, background: gradients.brandButton, color: "#fff", fontSize: 15, fontWeight: 600, boxShadow: "0 0 36px rgba(240,86,199,.4), 0 12px 40px rgba(0,0,0,.4)", animation: "zIn .9s cubic-bezier(.22,1,.36,1) 3.3s both" }}>
          Launch the live console <span style={{ fontFamily: font.mono }}>→</span>
        </Link>
      </div>
    </header>
  );
}

function FeatureCard({ delay, ml = 0, label, title, text, accentBg, accentText, accent }) {
  return (
    <div style={{ width: 320, marginLeft: ml, padding: "22px 24px", borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.1)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,.5)", animation: `zInScale .9s cubic-bezier(.22,1,.36,1) ${delay} both` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${accentBg}, transparent)`, border: `1px solid ${accent}`, display: "grid", placeItems: "center", fontFamily: font.mono, fontSize: 12, fontWeight: 600, color: accentText }}>{label}</span>
        <span style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "rgba(237,235,255,.6)" }}>{text}</p>
    </div>
  );
}

function MiniStat({ label, value, tint = "rgba(255,255,255,.04)", border = "rgba(255,255,255,.08)", color: c = color.text, labelColor = "rgba(237,235,255,.45)", pulse }) {
  return (
    <div style={{ padding: "13px 15px", borderRadius: 14, background: tint, border: `1px solid ${border}`, animation: pulse ? "zPulse 3.4s ease-in-out 4s infinite" : "none" }}>
      <div style={{ fontFamily: font.mono, fontSize: 9.5, color: labelColor, letterSpacing: ".08em" }}>{label}</div>
      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 21, marginTop: 4, color: c }}>{value}</div>
    </div>
  );
}

function Ticker({ rows }) {
  const items = rows.map((r) => ({
    verdict: r.verdict === "MALICIOUS" ? "MALICIOUS" : r.verdict === "SUSPICIOUS" ? "SUSPICIOUS" : "SAFE",
    input: (r.input || "").replace(/^https?:\/\//, "").slice(0, 30),
    meta: `${r.country || r.cc || "—"} · ${(r.threat_type || "").toLowerCase()} · ${Math.round(r.score)}`,
    dot: r.verdict === "MALICIOUS" ? color.red : r.verdict === "SUSPICIOUS" ? color.orange : color.cyan,
  }));
  const loop = [...items, ...items];
  return (
    <section style={{ borderTop: "1px solid rgba(255,255,255,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.015)", padding: "15px 0", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(90deg, ${color.bg}, transparent)`, zIndex: 2 }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(-90deg, ${color.bg}, transparent)`, zIndex: 2 }} />
      <div style={{ display: "flex", gap: 14, width: "max-content", animation: "zTicker 42s linear infinite" }}>
        {loop.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 99, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", fontFamily: font.mono, fontSize: 11.5, whiteSpace: "nowrap" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, boxShadow: `0 0 8px ${t.dot}` }} />
            <span style={{ color: t.dot, fontWeight: 600 }}>{t.verdict}</span>
            <span style={{ color: "rgba(237,235,255,.65)" }}>{t.input}</span>
            <span style={{ color: "rgba(237,235,255,.35)" }}>{t.meta}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBand() {
  // Real, measured numbers only — see docs/PS_MAPPING.md for how each was verified.
  const items = [
    ["<1%", "FALSE-POSITIVE RATE (6K SITES)"],
    ["95.4%", "PAYLOAD MODEL ACCURACY (CSIC 2010)"],
    ["5", "ATTACK CLASSES DETECTED"],
    ["38", "FEATURES PER URL"],
  ];
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1100, margin: "0 auto", padding: "76px 24px 20px", gap: 20 }}>
      {items.map(([val, label]) => (
        <Reveal key={label} style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 44, background: gradients.stat, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{val}</div>
          <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".1em", color: "rgba(237,235,255,.45)", marginTop: 6 }}>{label}</div>
        </Reveal>
      ))}
    </section>
  );
}

function Engines() {
  return (
    <section id="engines" style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 24px" }}>
      <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ fontFamily: font.mono, fontSize: 11.5, letterSpacing: ".18em", color: color.purple, marginBottom: 16 }}>THREE ENGINES · ONE VERDICT</div>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 800, fontSize: "clamp(30px,4vw,46px)", letterSpacing: "-.015em" }}>
          Phishing links, server-side attacks, <span style={{ color: color.pink }}>and zero-days.</span>
        </h2>
        <p style={{ maxWidth: 620, margin: "18px auto 0", fontSize: 15, fontWeight: 300, lineHeight: 1.65, color: "rgba(237,235,255,.55)" }}>
          Most tools stop at phishing. Zenithal reads the whole URL surface — the links your users click, the requests hitting your servers, and the traffic patterns no signature has ever seen.
        </p>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <EngineCard tag="ENGINE 1 · URL" tagColor="#B9AFFF" border="rgba(138,124,255,.22)" glow="rgba(138,124,255,.25)" title="Phishing URL detection"
          text="38 lexical and host features feed an XGBoost classifier, blended with an IP-risk score from IP-domain correlation and WHOIS domain-age. Allowlist-first architecture keeps common sites reliably SAFE.">
          <TermLine label="POST /api/v1/analyze/url" />
          <div><span style={{ color: "rgba(237,235,255,.55)" }}>sbi-verify-now.top</span> → <span style={{ color: color.red, fontWeight: 600 }}>MALICIOUS 95/100</span></div>
          <BarLine pct={95} />
          <div style={{ color: "rgba(237,235,255,.4)", fontSize: 10.5, marginTop: 8 }}>brand impersonation · high-risk TLD · domain age &lt; 30d</div>
        </EngineCard>
        <EngineCard tag="ENGINE 2 · PAYLOAD" tagColor="#F79BDC" border="rgba(240,86,199,.2)" glow="rgba(240,86,199,.2)" title="URL attacks from your logs"
          text="Parses Apache/Nginx access logs, decodes obfuscated payloads, and detects five attack classes via a signature layer plus a char n-gram TF-IDF model — aggregated into ranked attacker-IP profiles.">
          <TermLine label="POST /api/v1/analyze/logfile" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 4 }}>
            <Pill c="#FF8CA3" bg="rgba(255,92,122,.12)" bd="rgba(255,92,122,.3)">SQLi</Pill>
            <Pill c="#FFC985" bg="rgba(255,180,84,.1)" bd="rgba(255,180,84,.3)">XSS</Pill>
            <Pill c="#B9AFFF" bg="rgba(138,124,255,.12)" bd="rgba(138,124,255,.3)">Traversal</Pill>
            <Pill c="#F79BDC" bg="rgba(240,86,199,.1)" bd="rgba(240,86,199,.3)">CMDi</Pill>
            <Pill c="#5EEAD4" bg="rgba(94,234,212,.08)" bd="rgba(94,234,212,.25)">LFI</Pill>
          </div>
          <div style={{ color: "rgba(237,235,255,.4)", fontSize: 10.5, marginTop: 10 }}>scanner-tool fingerprinting · sequential-scan correlation, even with zero payloads</div>
        </EngineCard>
      </div>
      <div style={{ marginTop: 24 }}>
        <EngineCard tag="ENGINE 3 · SELF-LEARNING BASELINE" tagColor="#5EEAD4" border="rgba(94,234,212,.22)" glow="rgba(94,234,212,.16)" title="Catches what has no signature yet" wide
          text="An IsolationForest trained only on normal traffic — the same 'learn normal, flag deviation' idea behind Darktrace. It flagged a live GraphQL introspection recon query with zero false positives across 37,200 held-out normal requests, because nothing needs a rule written for it in advance.">
          <TermLine label="app/engines/anomaly.py · training/train_anomaly.py" />
          <div><span style={{ color: "rgba(237,235,255,.55)" }}>/graphql?query=&#123;__schema...&#125;&introspect=1</span> → <span style={{ color: "#5EEAD4", fontWeight: 600 }}>ANOMALOUS 87/100</span></div>
          <div style={{ color: "rgba(237,235,255,.4)", fontSize: 10.5, marginTop: 8 }}>0 signature matches · flagged purely on request shape · ~0.4% false-positive rate</div>
        </EngineCard>
      </div>
    </section>
  );
}

function EngineCard({ tag, tagColor, border, glow, title, text, children, wide }) {
  return (
    <div style={{ position: "relative", borderRadius: 22, border: `1px solid ${border}`, background: `linear-gradient(160deg, ${glow.replace(/[\d.]+\)$/, "0.09)")}, rgba(255,255,255,.02) 55%)`, padding: 34, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -70, right: -70, width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${glow}, transparent 70%)`, filter: "blur(30px)" }} />
      <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".14em", color: tagColor, marginBottom: 14 }}>{tag}</div>
      <h3 style={{ margin: "0 0 12px", fontFamily: font.display, fontWeight: 700, fontSize: 24 }}>{title}</h3>
      <p style={{ margin: "0 0 24px", fontSize: 13.5, lineHeight: 1.65, color: "rgba(237,235,255,.6)", maxWidth: wide ? 640 : undefined }}>{text}</p>
      <div style={{ borderRadius: 14, background: "rgba(9,9,15,.7)", border: "1px solid rgba(255,255,255,.08)", padding: 18, fontFamily: font.mono, fontSize: 11.5, lineHeight: 2 }}>
        {children}
      </div>
    </div>
  );
}
function TermLine({ label }) { return <div style={{ color: "rgba(237,235,255,.45)" }}>{label}</div>; }
function BarLine({ pct }) { return <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}><span style={{ height: 5, borderRadius: 99, background: `linear-gradient(90deg, ${color.orange}, ${color.red})`, width: `${pct}%`, animation: "zBar 1.4s cubic-bezier(.22,1,.36,1) both" }} /></div>; }
function Pill({ c, bg, bd, children }) { return <span style={{ padding: "3px 10px", borderRadius: 99, background: bg, border: `1px solid ${bd}`, color: c, fontSize: 10 }}>{children}</span>; }

function IPIntel({ pins, attackers }) {
  const top = attackers[0];
  return (
    <section id="intel" style={{ position: "relative", padding: "90px 24px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "20%", left: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(109,40,217,.2), transparent 65%)", filter: "blur(70px)", animation: "zDrift2 36s ease-in-out infinite" }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 56, alignItems: "center", position: "relative" }}>
        <Reveal>
          <div style={{ fontFamily: font.mono, fontSize: 11.5, letterSpacing: ".18em", color: color.purple, marginBottom: 16 }}>FROM IP DATA</div>
          <h2 style={{ margin: "0 0 18px", fontFamily: font.display, fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", letterSpacing: "-.015em" }}>Every verdict carries its IP story.</h2>
          <p style={{ margin: "0 0 26px", fontSize: 15, fontWeight: 300, lineHeight: 1.7, color: "rgba(237,235,255,.58)" }}>GeoIP, ASN and hosting org, reputation feeds (URLhaus/OpenPhish/PhishTank/Maltrail), and brand-geo mismatch — fused into the score, not bolted on. Attacker IPs are ranked by volume, technique diversity, velocity, infrastructure risk and behavioral pattern.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FactRow c={color.purpleLight} k="GEO · ASN" v="MaxMind GeoLite2, with a bundled offline reference" />
            <FactRow c={color.pinkLight} k="REP" v="~36,000 malicious hosts across 4 live threat feeds" />
            <FactRow c={color.cyan} k="CORR" v="IP-domain correlation flags brand-geo mismatch" />
          </div>
        </Reveal>
        <Reveal style={{ position: "relative", borderRadius: 22, border: "1px solid rgba(255,255,255,.09)", background: "rgba(16,15,28,.6)", backdropFilter: "blur(18px)", padding: 26, boxShadow: "0 30px 90px rgba(0,0,0,.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: ".12em", color: "rgba(237,235,255,.5)" }}>ATTACKER ORIGINS · LIVE</span>
            <span style={{ fontFamily: font.mono, fontSize: 10.5, color: color.cyan }}>{new Set(attackers.map((a) => a.country)).size || 1} COUNTRIES</span>
          </div>
          <div style={{ position: "relative", height: 300, borderRadius: 14, backgroundImage: "radial-gradient(rgba(185,175,255,.16) 1px, transparent 1.4px)", backgroundSize: "17px 17px", border: "1px solid rgba(255,255,255,.05)", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, transparent 45%, #100F1C 100%)" }} />
            {pins.map((p, i) => (
              <div key={i} style={{ position: "absolute", left: p.x, top: p.y }}>
                <span style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: p.c, left: -6, top: -6, animation: `zPing 2.6s cubic-bezier(.22,1,.36,1) ${(i * 0.4).toFixed(1)}s infinite` }} />
                <span style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: p.c, boxShadow: `0 0 12px ${p.c}`, left: -4, top: -4 }} />
                <span style={{ position: "absolute", left: 10, top: -7, fontFamily: font.mono, fontSize: 9.5, color: "rgba(237,235,255,.6)", whiteSpace: "nowrap" }}>{p.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 16 }}>
            <MiniFact label="TOP ATTACKER" value={top?.ip || "—"} c="#FF8CA3" />
            <MiniFact label="ASN" value={top?.asn || "—"} />
            <MiniFact label="RISK" value={top ? `${top.risk_score} / 100` : "—"} c={color.orange} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function FactRow({ c, k, v }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)" }}>
      <span style={{ fontFamily: font.mono, fontSize: 11, color: c, minWidth: 74 }}>{k}</span>
      <span style={{ fontSize: 13, color: "rgba(237,235,255,.65)" }}>{v}</span>
    </div>
  );
}
function MiniFact({ label, value, c = "rgba(237,235,255,.75)" }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: ".1em", color: "rgba(237,235,255,.4)" }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 12, marginTop: 5, color: c }}>{value}</div>
    </div>
  );
}

function Integrations() {
  const cards = [
    { tag: "WAF", tagC: "#B9AFFF", hoverBd: "rgba(138,124,255,.4)", hoverBg: "rgba(138,124,255,.06)", title: "Drop-in middleware", text: "Blocks SQLi, XSS and traversal inline for any FastAPI or Starlette app." },
    { tag: "AGENT", tagC: "#F79BDC", hoverBd: "rgba(240,86,199,.4)", hoverBg: "rgba(240,86,199,.05)", title: "Live log agent", text: "Watches your access log and streams attacks to the console — no uploads." },
    { tag: "MV3", tagC: "#5EEAD4", hoverBd: "rgba(94,234,212,.35)", hoverBg: "rgba(94,234,212,.04)", title: "Chrome extension", text: "Scans links as you browse; malicious pages blocked before they open." },
    { tag: "PWA", tagC: "#FFC985", hoverBd: "rgba(255,180,84,.35)", hoverBg: "rgba(255,180,84,.04)", title: "Installable console", text: "The SOC dashboard installs to any phone — add to home screen and go." },
    { tag: "AI", tagC: "#5EEAD4", hoverBd: "rgba(94,234,212,.35)", hoverBg: "rgba(94,234,212,.04)", title: "AI Analyst", text: "One click writes a SOC incident report via LLM — falls back to the rule-based explainer offline." },
  ];
  return (
    <section id="integrations" style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 24px" }}>
      <Reveal style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: font.mono, fontSize: 11.5, letterSpacing: ".18em", color: color.purple, marginBottom: 16 }}>REAL-TIME PROTECTION</div>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", letterSpacing: "-.015em" }}>Detection that plugs into everything.</h2>
      </Reveal>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 18 }}>
        {cards.map((c) => (
          <Reveal key={c.tag} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: "26px 20px" }}>
            <div style={{ fontFamily: font.mono, fontSize: 10.5, color: c.tagC, letterSpacing: ".1em", marginBottom: 14 }}>{c.tag}</div>
            <h3 style={{ margin: "0 0 10px", fontFamily: font.display, fontWeight: 700, fontSize: 15.5 }}>{c.title}</h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "rgba(237,235,255,.55)" }}>{c.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ApiSection() {
  return (
    <section id="api" style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 56, alignItems: "start" }}>
        <Reveal>
          <div style={{ fontFamily: font.mono, fontSize: 11.5, letterSpacing: ".18em", color: color.purple, marginBottom: 16 }}>FOR DEVELOPERS</div>
          <h2 style={{ margin: "0 0 18px", fontFamily: font.display, fontWeight: 800, fontSize: "clamp(28px,3.6vw,42px)", letterSpacing: "-.015em" }}>One REST surface.<br />One live socket.</h2>
          <p style={{ margin: "0 0 28px", fontSize: 15, fontWeight: 300, lineHeight: 1.7, color: "rgba(237,235,255,.58)" }}>Everything the console does, your code can do — API-key auth, rate limiting, result caching and batch scanning included.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: font.mono, fontSize: 12 }}>
            <EndpointRow m="POST" mc={color.cyan} p="/analyze/url" d="Engine 1 + IP intel" />
            <EndpointRow m="POST" mc={color.cyan} p="/analyze/urls" d="Batch, up to 1000/call" />
            <EndpointRow m="POST" mc={color.cyan} p="/analyze/logfile" d="Engine 2 + attackers" />
            <EndpointRow m="POST" mc={color.cyan} p="/analyst" d="AI incident report" />
            <EndpointRow m="GET" mc={color.purpleLight} p="/ip/{ip}" d="Standalone lookup" />
            <EndpointRow m="WS" mc={color.pinkLight} p="/ws/feed" d="Live detections" />
          </div>
        </Reveal>
        <Reveal style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.09)", background: "rgba(13,12,22,.85)", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,92,122,.6)" }} /><span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,180,84,.6)" }} /><span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(94,234,212,.5)" }} />
            <span style={{ marginLeft: 10, fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.4)" }}>zenithal — scan.sh</span>
          </div>
          <pre style={{ margin: 0, padding: "22px 24px", fontFamily: font.mono, fontSize: 12, lineHeight: 1.85, overflowX: "auto", color: "rgba(237,235,255,.75)" }}>
{`$ curl -X POST http://127.0.0.1:8000/api/v1/analyze/url \\
    -H "X-API-Key: $ZENITHAL_KEY" \\
    -d '{"url": "https://sbi-verify-now.top/login"}'

{
  "verdict":  "MALICIOUS",
  "score":    95,
  "threat_type": "Brand Impersonation",
  "ip_intel": { "country": "Unknown", "asn": 0 },
  "reasons":  ["Contains a trusted brand keyword in a non-official domain",
              "Registered on a high-abuse TLD", ...]
}`}
          </pre>
        </Reveal>
      </div>
    </section>
  );
}
function EndpointRow({ m, mc, p, d }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 15px", borderRadius: 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
      <span style={{ color: mc, fontWeight: 600, minWidth: 38 }}>{m}</span>
      <span style={{ color: "rgba(237,235,255,.8)" }}>{p}</span>
      <span style={{ marginLeft: "auto", color: "rgba(237,235,255,.35)", fontSize: 10.5 }}>{d}</span>
    </div>
  );
}

function FinalCta() {
  return (
    <section style={{ position: "relative", padding: "110px 24px 130px", textAlign: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "50%", bottom: -320, transform: "translateX(-50%)", width: 900, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(240,86,199,.18), rgba(138,124,255,.1) 45%, transparent 70%)", filter: "blur(50px)", animation: "zPulse 6s ease-in-out infinite" }} />
      <Reveal style={{ position: "relative" }}>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 800, fontSize: "clamp(32px,4.6vw,56px)", letterSpacing: "-.02em", background: gradients.heading, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          See every threat.<br />Explain every verdict.
        </h2>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 38 }}>
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 32px", borderRadius: 99, background: gradients.brandButton, color: "#fff", fontSize: 15, fontWeight: 600, boxShadow: "0 0 36px rgba(240,86,199,.4)" }}>Open the console →</Link>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", padding: "15px 32px", borderRadius: 99, border: "1px solid rgba(255,255,255,.16)", color: color.text, fontSize: 15, fontWeight: 500, background: "rgba(255,255,255,.03)" }}>Sign in</Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "30px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(237,235,255,.4)", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontFamily: font.mono, letterSpacing: ".08em" }}>ZENITHAL · SIH25229 · THE ZENITHAL</span>
      <span>FastAPI · XGBoost · IsolationForest · React · Identification of URL-based attacks from IP data</span>
    </footer>
  );
}
