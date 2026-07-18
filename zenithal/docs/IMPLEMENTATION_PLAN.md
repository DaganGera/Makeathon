# Zenithal v2 — Implementation Plan / Checklist

Living checklist for the overnight upgrade (Suricata + Wazuh + Darktrace concepts,
AI Analyst, demo cinema). Iron rules: (1) never touch the reputation-first
decision order in `url_engine.py` except to add signals, (2) run the regression
gate after every module, (3) every demo-risky feature has an offline fallback.

## Regression gate (run after every module)

```powershell
cd d:\Makeathon\zenithal\backend
..\.venv\Scripts\python.exe training\validate_url_model.py     # must stay 13/13, exit 0
```
Plus a manual smoke check: `/api/v1/health` returns 200, dashboard loads, WS feed connects.

## Status

- [x] 0. This file
- [x] 1. AI Analyst — Groq LLM incident reports (`backend/app/engines/llm_analyst.py`, `POST /api/v1/analyst`)
      Fallback: no `GROQ_API_KEY` / network down → falls back to the existing
      explain.py reasons, same panel, same animation. Never breaks the demo.
- [x] 2. Anomaly Engine — Darktrace angle (`backend/app/engines/anomaly.py`, `training/train_anomaly.py`)
      IsolationForest trained only on benign traffic shape. Additive signal only
      (SUSPICIOUS at most) — never overrides allowlist-SAFE or lowers a verdict.
- [x] 3. Demo Cinema (`demo/simulate_attack.py` + dashboard CSS effects)
      Fallback: if venue wifi/API hiccups mid-run, the script is idempotent —
      just rerun it; every step posts to the same stable local API.
- [x] 4. Maltrail IOC feeds merged into blocklist build
      Fallback: feed download fails → build_reputation.py just skips it (already
      resilient to missing files), blocklist still builds from URLhaus/OpenPhish/PhishTank.
- [x] 5. WHOIS domain-age enrichment (opt-in via `ENABLE_ONLINE_ENRICHMENT`)
      Fallback: disabled or lookup fails → signal silently omitted, no error surfaced to user.
- [x] 6. Behavior/beacon analysis on attacker profiles (`payload_engine.py`)
      Pure function of already-parsed log rows — no new dependency, no fallback needed.
- [x] 7. Live Packet Capture module (`capture/sniffer.py`, optional, shown not depended on)
      Fallback: Npcap/admin/driver issue at venue → skip live capture, run
      `demo/simulate_attack.py` instead. Dashboard looks identical either way.
- [x] 8. PPT + demo script refresh (`docs/DEMO_SCRIPT.md`, `docs/Zenithal_SIH25229.pptx`)
- [x] 9. Delivery smoke-test (phone PWA / PC+extension / company WAF+batch) + `docs/USAGE.md` update

## New/modified files (reference)

| File | Purpose |
|---|---|
| `backend/app/engines/llm_analyst.py` | Groq incident-report generator, with explain.py fallback |
| `backend/app/engines/anomaly.py` | IsolationForest scorer (self-learning baseline) |
| `backend/training/train_anomaly.py` | Trains the anomaly model on benign-only traffic shape |
| `demo/simulate_attack.py` | Scripted mixed-attack replay for the live demo |
| `capture/sniffer.py`, `capture/README.md` | Optional live packet-capture showpiece |
| `backend/app/api/routes.py` | +`POST /analyst` endpoint |
| `backend/app/engines/payload_engine.py` | +behavior/beacon fields, +anomaly hook |
| `backend/training/update_feeds.py`, `build_reputation.py` | +Maltrail feed merge |
| `backend/app/engines/url_engine.py` | +WHOIS domain-age signal (additive only) |
| `backend/app/config.py` | +`GROQ_API_KEY`, `GROQ_MODEL`, `MALTRAIL_*`, `WHOIS_*` env vars |
| `dashboard/src/panels/*` | AI Analyst button/typewriter, anomaly gauge/badge, live-attack visual effects |
| `backend/requirements.txt` | +`scikit-learn` (already present), +`python-whois`, +`scapy` |

## Explicitly not doing tonight

Full Suricata rule-format parsing, a real multi-agent SIEM fleet, PCAP file
upload, deep-learning autoencoder anomaly detection, any change to the
reputation-first decision order. Reason: time budget, and the iron rule that
the existing reliable engine must not regress.
