import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import { Map as MapIcon } from "lucide-react";
import { useWebSocket } from "../context/WebSocketContext";
import { getDetections } from "../services/api";
import { StatTile } from "../components/Shared";
import { font, color } from "../theme";

const COLOR = { MALICIOUS: color.red, SUSPICIOUS: color.orange, SAFE: color.cyan };

export default function AttackerMap() {
  const { detections: live } = useWebSocket();
  const [seed, setSeed] = useState([]);

  useEffect(() => {
    getDetections(150).then((d) => setSeed(d.detections || [])).catch(() => {});
  }, []);

  const seen = new Set();
  const points = [...live, ...seed]
    .filter((d) => (d.lat || d.lon) && !(d.lat === 0 && d.lon === 0))
    .filter((d) => {
      const key = d.id ?? `${d.src_ip}-${d.created_at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const countries = new Set(points.map((p) => p.country).filter(Boolean));
  const malicious = points.filter((p) => p.verdict === "MALICIOUS").length;

  return (
    <div style={{ animation: "zIn .5s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontFamily: font.display, fontWeight: 700, fontSize: 21, display: "flex", alignItems: "center", gap: 10 }}>
          <MapIcon size={19} color={color.purpleLight} /> Attacker Map
        </h2>
        <span style={{ fontFamily: font.mono, fontSize: 10.5, color: "rgba(237,235,255,.4)" }}>geolocated from real IP data · GeoLite2</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        <StatTile label="PLOTTED EVENTS" value={points.length} accent={color.purpleLight} />
        <StatTile label="COUNTRIES" value={countries.size} accent={color.pinkLight} />
        <StatTile label="MALICIOUS" value={malicious} accent={color.red} />
      </div>

      <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", background: "rgba(16,15,28,.55)", overflow: "hidden", height: 480 }}>
        <MapContainer center={[25, 20]} zoom={2} style={{ height: "100%", width: "100%" }} zoomControl={false} worldCopyJump>
          <TileLayer attribution="&copy; CARTO" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <ZoomControl position="bottomright" />
          {points.map((p, i) => {
            const c = COLOR[p.verdict] || color.cyan;
            return (
              <React.Fragment key={p.id ?? i}>
                {p.verdict === "MALICIOUS" && (
                  <CircleMarker center={[p.lat, p.lon]} radius={9}
                    pathOptions={{ color: c, fillColor: c, fillOpacity: 0.35, weight: 1, className: "pulse-ring" }}
                    interactive={false} />
                )}
                <CircleMarker center={[p.lat, p.lon]} radius={p.verdict === "MALICIOUS" ? 9 : 6}
                  pathOptions={{ color: c, fillColor: c, fillOpacity: 0.55, weight: 2 }}>
                  <Popup>
                    <div style={{ fontSize: 13 }}>
                      <strong>{p.src_ip || p.input}</strong><br />
                      {p.country}<br />
                      {p.verdict} · {Math.round(p.score)}<br />
                      {p.threat_type}
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {points.length === 0 && (
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(237,235,255,.4)", marginTop: 14 }}>
          No geolocated events yet. Run <code style={{ color: color.cyan }}>demo/simulate_attack.py</code> or upload a log to light up the map.
        </p>
      )}
    </div>
  );
}
