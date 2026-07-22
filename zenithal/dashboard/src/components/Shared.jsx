import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { font, color, verdictChip } from "../theme";

const ICON = { MALICIOUS: ShieldAlert, SUSPICIOUS: AlertTriangle, SAFE: ShieldCheck };

export function VerdictBadge({ verdict }) {
  const c = verdictChip(verdict);
  const Icon = ICON[verdict] || ShieldCheck;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, fontFamily: font.mono, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      <Icon size={13} />{verdict}
    </span>
  );
}

export function ScoreBar({ score }) {
  const c = score >= 70 ? color.red : score >= 40 ? color.orange : color.cyan;
  return (
    <div style={{ width: "100%", height: 6, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 99, width: `${score}%`, background: c, transition: "width .5s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

export function StatTile({ label, value, sub, accent = color.purpleLight }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "13px 15px" }}>
      <p style={{ margin: 0, fontFamily: font.mono, fontSize: 9, letterSpacing: ".1em", color: "rgba(237,235,255,.45)" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontFamily: font.display, fontWeight: 700, fontSize: 22, color: accent }}><AnimatedNumber value={value} /></p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(237,235,255,.4)" }}>{sub}</p>}
    </div>
  );
}

export function ReasonList({ reasons, color: c = color.purpleLight }) {
  if (!reasons?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {reasons.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 9, fontSize: 12, lineHeight: 1.55, color: "rgba(237,235,255,.72)" }}>
          <span style={{ color: c, marginTop: 1 }}>▸</span>
          <span dangerouslySetInnerHTML={{ __html: escapeButCode(r) }} />
        </div>
      ))}
    </div>
  );
}

function escapeButCode(s) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(s).replace(/`([^`]+)`/g, `<code style="padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.08);color:${color.cyan};font-family:${font.mono};font-size:11px">$1</code>`);
}

// Eases from the previous value to the new one whenever it changes — turns
// "the dashboard updated" into something you can visibly watch happen.
export function AnimatedNumber({ value, duration = 600 }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}
