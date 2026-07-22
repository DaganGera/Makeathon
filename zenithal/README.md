# Zenithal — Identification of URL-Based Attacks from IP Data

**Smart India Hackathon · SIH25229 · Theme: Cybersecurity · Team: The Zenithal**

> One detection brain that identifies **URL-based attacks** — phishing links
> *and* server-side injection/exploit attacks — and fuses **IP data**
> (geolocation, ASN, reputation, IP↔domain correlation) to score, explain, and
> map every threat in a live SOC dashboard.

---

## Why this matches the problem statement

The title *"Identification of URL Based Attacks from IP Data"* has two parts.
Most solutions only do phishing links. Zenithal does both, and puts **IP data**
at the centre:

| PS phrase | What Zenithal delivers |
|---|---|
| **URL Based Attacks** | Engine 1 detects phishing/malicious URLs. Engine 2 detects **SQL injection, XSS, path traversal, command injection, LFI/RFI** carried in request URLs. |
| **from IP Data** | Every verdict is enriched with GeoIP, ASN/hosting org, reputation, reverse DNS, and **IP↔domain correlation** (brand-geo mismatch). Server attacks are aggregated into ranked **attacker-IP** profiles and plotted on a world map. |

See [`docs/PS_MAPPING.md`](docs/PS_MAPPING.md) for the full feature-by-feature mapping.

---

## Architecture

```
                         ┌──────────────── React SOC Dashboard ───────────────┐
                         │ Feed · URL Scanner · Log Analyzer · Map · WA Guard  │
                         └───────────────▲───────────────────▲────────────────┘
                                   REST  │            WebSocket (live feed)
                         ┌───────────────┴───────────────────┴────────────────┐
                         │                 FastAPI  /api/v1                    │
                         ├──────────────────────────────────────────────────────┤
   URL / message ──────► │ Engine 1: URL   → XGBoost(38 feats) + IP correlation │
   access log / PCAP ──► │ Engine 2: Payload → signatures + char-TFIDF model    │
                         │ IP Intelligence  → GeoIP + ASN + reputation + rDNS   │
                         │ Explainability   → plain-language reasons            │
                         │ SQLite           → detections + attacker_ips         │
                         └──────────────────────────────────────────────────────┘
```

- **Engine 1 (Phishing URL):** 38 lexical/host features → XGBoost, blended with an
  IP-risk contribution from IP↔domain correlation. Heuristic fallback if no model.
- **Engine 2 (URL attacks from logs):** parses Apache/Nginx access logs, decodes
  obfuscated payloads, detects 5 attack classes via a high-precision **signature
  layer** + a **char n-gram TF-IDF classifier**, then aggregates by source IP into
  ranked **attacker profiles** (volume, technique diversity, velocity, infra risk).
- **IP Intelligence:** MaxMind GeoLite2 when installed, else a bundled **offline
  reference** so the demo works with zero setup and never has an empty map.
- **Explainability:** every verdict ships ranked, human-readable reasons.

---

## Quick start (Windows, no Docker)

```powershell
# 1. Backend
cd backend
pip install -r requirements-lock.txt
python training/train_url.py         # trains XGBoost (synthetic data if no CSVs)
python training/train_payload.py     # trains payload classifier
python training/train_anomaly.py     # trains the anomaly side-channel
python -m uvicorn app.main:app --port 8000

# 2. Dashboard (new terminal)
cd dashboard
npm ci
npm run dev                          # http://127.0.0.1:5173
```

Or one command: `powershell -ExecutionPolicy Bypass -File run.ps1`

### Docker (full stack)

```bash
docker compose up --build
# Dashboard http://localhost:8080   ·   API http://localhost:8000
```

---

## 3-minute demo flow

1. **Threat Feed** — open the dashboard; live stats bar across the top.
2. **URL Scanner** — click the `sbi-verify-now.top` sample → **MALICIOUS 95/100**
   with brand-impersonation + high-risk-TLD + no-HTTPS reasons.
3. **WhatsApp Guard** — click the "URGENT: Your SBI account…" preset → link
   auto-scanned and **blocked before opening**.
4. **Log Analyzer** — upload [`demo/sample_access.log`](demo/sample_access.log)
   → 18 attacks across SQLi/XSS/traversal/cmd-injection/LFI, **Top Attacker IPs**
   ranked with country + ASN.
5. **Attacker Map** — pins drop worldwide, each geolocated from real IP data.

---

## Using real datasets (optional, stronger accuracy)

Drop any of these into `backend/training/data/` and re-run the training scripts:

- **Phishing URLs:** `phishing_urls.csv` + `benign_urls.csv` (PhishTank / OpenPhish
  / URLhaus for phishing; Tranco top-list for benign), or a single labelled
  `urls.csv` (`url,label`).
- **URL attacks:** `csic2010.csv` (`payload,label`) — the HTTP CSIC 2010 benchmark.

For live geolocation, drop MaxMind `GeoLite2-City.mmdb` and `GeoLite2-ASN.mmdb`
into `backend/data/` (free signup). Without them, the offline reference is used.

---

## Key endpoints (`/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/analyze/url` | Scan a single URL (Engine 1 + IP intel) |
| POST | `/analyze/message` | Extract & scan URLs from a WhatsApp/SMS message |
| POST | `/analyze/logfile` | Upload an access log (Engine 2 + attacker IPs) |
| GET | `/ip/{ip}` | Standalone IP intelligence lookup |
| GET | `/dashboard/stats` · `/detections` · `/attackers` | Dashboard data |
| WS | `/ws/feed` | Live detection stream |

Interactive docs at `http://127.0.0.1:8000/docs`.

---

## Documentation

- [`docs/USAGE.md`](docs/USAGE.md) — how to use & demo on **PC, mobile, and as a developer**.
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md) — auth, rate-limiting, Postgres, Redis, alerts, scaling.
- [`docs/PS_MAPPING.md`](docs/PS_MAPPING.md) — problem-statement mapping + measured accuracy.
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — timed 3-minute pitch.

## Integrations (real-time, automatic protection)

- [`integrations/waf_middleware.py`](integrations/waf_middleware.py) — drop-in WAF that
  blocks SQLi/XSS/traversal inline for any FastAPI/Starlette app (see
  [`example_protected_app.py`](integrations/example_protected_app.py)).
- [`integrations/log_agent.py`](integrations/log_agent.py) — watches a live access log and
  streams attacks to the dashboard automatically (no manual upload).
- Chrome MV3 extension in [`extension/`](extension/) — scans links as you browse.
- Dashboard is an installable **PWA** (Add to Home Screen on a phone).

## Portable setup checklist

If you move this folder to another PC, you only need:

1. Python 3.11+ and Node.js 18+ installed.
2. `backend/.env` and `dashboard/.env` left empty unless you want optional cloud services.
3. `powershell -ExecutionPolicy Bypass -File run.ps1` from the `zenithal/` folder.

The launcher uses the lockfiles, trains missing models automatically, and falls back to local SQLite and built-in demo data whenever external services are absent.

## Tech stack

**Backend:** FastAPI · XGBoost · scikit-learn · SQLAlchemy (async SQLite) ·
tldextract · geoip2 (optional).
**Frontend:** React 18 · Vite · TailwindCSS · Recharts · React-Leaflet.
**Extension:** Chrome Manifest V3.
