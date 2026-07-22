// Cosmetic fallback data ONLY — used so the Landing page's live-feed preview
// never looks broken/empty before the backend responds (or if it's briefly
// unreachable). Every interactive panel (URL Scanner, Log Analyzer, Message
// Guard) always calls the real API and shows a real error if it's down —
// nothing about actual detection is ever faked.
const SAMPLE_ROWS = [
  { input: "https://sbi-verify-now.top/login", threat_type: "Phishing", country: "RU", src_ip: "185.220.101.34", score: 95, verdict: "MALICIOUS" },
  { input: "/products?id=1' OR '1'='1", threat_type: "SQLi", country: "NL", src_ip: "45.155.205.99", score: 92, verdict: "MALICIOUS" },
  { input: "https://github.com/anthropics/claude-code", threat_type: "Benign", country: "US", src_ip: "140.82.112.4", score: 4, verdict: "SAFE" },
  { input: "/search?q=<script>alert(1)</script>", threat_type: "XSS", country: "CN", src_ip: "103.94.135.201", score: 87, verdict: "MALICIOUS" },
  { input: "https://netflix-billing-alert.icu", threat_type: "Phishing", country: "NG", src_ip: "196.251.72.14", score: 84, verdict: "MALICIOUS" },
  { input: "https://promo-track.link/r/8842", threat_type: "Suspicious", country: "DE", src_ip: "77.91.124.55", score: 52, verdict: "SUSPICIOUS" },
  { input: "/download?f=../../etc/passwd", threat_type: "Traversal", country: "UA", src_ip: "91.240.118.172", score: 89, verdict: "MALICIOUS" },
  { input: "https://stripe.com/docs/api", threat_type: "Benign", country: "US", src_ip: "54.187.16.2", score: 3, verdict: "SAFE" },
];

const SAMPLE_ATTACKERS = [
  { ip: "185.220.101.34", country: "Germany", asn: "AS205100", risk_score: 96, total_hits: 5, lat: 50.1109, lon: 8.6821 },
  { ip: "45.155.205.99", country: "Seychelles", asn: "AS44477", risk_score: 88, total_hits: 3, lat: -4.6191, lon: 55.4513 },
  { ip: "103.94.135.201", country: "China", asn: "AS4134", risk_score: 74, total_hits: 3, lat: 32.0603, lon: 118.7969 },
  { ip: "196.251.72.14", country: "Nigeria", asn: "AS328543", risk_score: 61, total_hits: 2, lat: 6.5244, lon: 3.3792 },
  { ip: "77.91.124.55", country: "Netherlands", asn: "AS60781", risk_score: 55, total_hits: 2, lat: 52.3676, lon: 4.9041 },
];

let seq = 1;
export function simDetection() {
  const r = SAMPLE_ROWS[Math.floor(Math.random() * SAMPLE_ROWS.length)];
  return { id: `sim-${seq++}`, ...r, channel: "url", created_at: new Date().toISOString(), reasons: ["Simulated preview — connect the backend for live detections."] };
}
export function simStats(n = 0) {
  return {
    total_detections: 12847 + n, malicious: 8102 + Math.floor(n * 0.4), suspicious: 1922 + Math.floor(n * 0.2),
    safe: 2823, unique_attackers: 412, countries: 38, by_channel: { url: 9000, log: 3200, message: 647 },
  };
}
export function simAttackers() {
  return SAMPLE_ATTACKERS;
}
