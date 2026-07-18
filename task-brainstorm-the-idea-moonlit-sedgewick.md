# Zenithal v2 — Overnight "Impress the Judges" Upgrade Plan

## Context

Zenithal (SIH25229 — URL-based attacks from IP data) already works: reputation-first URL engine (<1% FPR, 13/13 acceptance), CSIC payload engine (95.4%), live GeoLite2, 3 threat feeds auto-updating, dashboard + PWA + extension + WAF middleware. Backend :8000 and dashboard :5173 run clean.

**Tonight's mission (now ~20:45, hackathon 08:00 tomorrow → ~8 usable build hours):** add scaled-down versions of the three big-industry paradigms — Suricata (signature IDS), Wazuh (SIEM correlation), Darktrace (self-learning AI anomaly) — plus a Groq-powered "AI Analyst", cinematic demo visuals, and an optional live packet-capture showpiece. Npcap is installed; Groq key provided (env var only, never committed).

**Iron rules:**
1. The existing engine is the crown jewel — no module may touch its decision path except to ADD signals.
2. After EVERY module: run the regression gate (below). If it fails, revert the module, move on.
3. Anything demo-risky (live capture, LLM) must have an offline fallback that looks just as good.

Pitch line this buys: *"We unified the concepts of Suricata, Wazuh and Darktrace into one explainable, self-hosted platform — with an AI analyst that writes the incident report for you."*

---

## Priority build order (time-boxed; stop-loss = skip to next)

### P0 — must land (~4h)

**0. `zenithal/docs/IMPLEMENTATION_PLAN.md`** (15 min)
Living checklist version of this plan — module list, status boxes, regression-gate command, fallback per module. First thing created; ticked as modules land. (This is the "implementation plan.md" the user asked for.)

**1. AI Analyst — Groq LLM incident reports** (~1h) — *the biggest wow-per-minute*
- New `backend/app/engines/llm_analyst.py`: calls Groq (`llama-3.3-70b-versatile`, key from `GROQ_API_KEY` env, httpx already installed). Input = full detection record (verdict, score, signals, IP intel, attacker profile). Output = 4–6 sentence SOC-analyst incident report + recommended action.
- New endpoint `POST /api/v1/analyst` (guarded, cached) — called on demand from dashboard so it can't slow scans.
- Dashboard: "🤖 AI Analyst" button on any detection → report renders with a **typewriter animation** (pure CSS/JS). Judges watch AI "write" the incident report live.
- Fallback: if no key/offline → serves `explain.py` reasons in the same panel, still animated. Demo never breaks.

**2. Anomaly Engine — the Darktrace angle** (~1.5h)
- New `backend/app/engines/anomaly.py` + `training/train_anomaly.py`: **IsolationForest** trained ONLY on benign traffic features (CSIC normal + synthetic benign already in repo): path depth/entropy, param count/length, char-class ratios, method, hour-of-day, per-IP request rate.
- Integration: log analysis adds an `anomaly_score` per request + per attacker IP; a request that matches **no signature** but is anomalous gets flagged "Never-seen-before behavior — flagged by self-learning baseline" (SUSPICIOUS only — additive, never overrides SAFE-by-allowlist for URLs).
- Dashboard: "AI Baseline" gauge on the Log Analyzer panel + anomaly badge on attacker cards.
- Pitch: "Signatures catch known attacks; our self-learning baseline catches zero-days — same paradigm as Darktrace."

**3. Demo Cinema — make cybersecurity NOT boring** (~1.5h)
- `demo/simulate_attack.py`: replays a scripted mixed attack (SQLi burst → traversal scan → phishing wave from 6 geo-diverse IPs) into the live API over ~60s with realistic pacing. This IS the demo centerpiece — dashboard lights up on its own.
- Dashboard "LIVE ATTACK" effects (Tailwind/CSS only, no new deps): pulsing red map pins with ripple animation, red alert banner flash on MALICIOUS, animated count-up tickers, radar-sweep overlay on the world map, threat-level dial (green→red).
- Optional toggleable "🔊" alert ping (tiny embedded base64 audio, off by default).

### P1 — strong upgrades (~2.5h)

**4. Maltrail IOC feeds — Suricata/IOC angle** (~45 min)
- `update_feeds.py`: add Maltrail static trails (raw GitHub, no key) → merge malicious domains/IPs into blocklist build; tag `source: maltrail` so the UI can show which feed caught it. Blocklist grows ~30k → 100k+. Regression gate must still pass (allowlist-first ordering already protects legit domains).

**5. WHOIS domain-age enrichment** (~45 min)
- `python-whois` behind existing `ENABLE_ONLINE_ENRICHMENT` flag; result cached to `backend/data/whois_cache.json`.
- New signal for unknown domains: "Domain registered N days ago" (age < 30d = strong phishing signal, additive to ML score). Displayed in URL scanner result. Offline → silently absent.

**6. Behavior/beacon analysis — Wazuh-correlation angle** (~45 min)
- Extend `payload_engine.py` attacker profiles: burst score (requests/sec spikes), scanner fingerprints (sqlmap/nikto/nuclei UAs), sequential-path-scan detection (many 404s across paths), regular-interval "beacon" pattern.
- Attacker card gets a "Behavior" section: "Automated scanner: 47 req in 6s, sqlmap UA, sequential probing."

### P2 — showpiece + polish (~1.5h)

**7. Live Packet Capture module (shown, not depended on)** (~1h)
- `capture/sniffer.py`: Scapy (Npcap installed) sniffing HTTP :80 request lines + DNS queries + TLS SNI hostnames (proves awareness that HTTPS payloads are encrypted — SNI/DNS still visible). Extracted URLs/hosts POST to existing `/analyze/logtext` → flows through the whole pipeline live.
- Demo plan: show it live for 30s (browse to a test URL, watch it appear); if venue network misbehaves → `simulate_attack.py` is the fallback and looks identical on the dashboard.
- Run-as-admin note + `capture/README.md`.

**8. PPT + demo script refresh** (~30 min)
- Update `docs/Zenithal_SIH25229.pptx` + `DEMO_SCRIPT.md`: real numbers (<1% FPR, 95.4% CSIC, 1M allowlist, 100k+ blocklist, 4 feeds), "Suricata+Wazuh+Darktrace concepts unified" comparison slide, business-model slide, architecture v2 diagram.
- Presentation tips written into DEMO_SCRIPT.md (judge psychology, morph transitions, when to run the simulation).

**9. Delivery smoke-test + final gate** (~30 min)
- Verify the 3 delivery surfaces still work: **phone** (PWA install over LAN), **PC** (Chrome extension + dashboard), **company/dev** (WAF middleware demo app + `/analyze/urls` batch + log agent). Update `USAGE.md` with the final morning-of checklist (exact commands to start everything).

---

## Regression gate (run after EVERY module)

```
cd d:\Makeathon\zenithal\backend
..\.venv\Scripts\python training\validate_url_model.py   # must stay 13/13, exit 0
# + curl smoke: /api/v1/health OK; google.com/search → SAFE; known phish → MALICIOUS
# + dashboard loads, WS feed alive
```
Final full pass at the end: all panels, phone PWA, extension, WAF demo, simulation run start-to-finish.

## Files touched (new unless noted)
- `docs/IMPLEMENTATION_PLAN.md`, `backend/app/engines/llm_analyst.py`, `backend/app/engines/anomaly.py`, `backend/training/train_anomaly.py`, `demo/simulate_attack.py`, `capture/sniffer.py`, `capture/README.md`
- Modified: `api/routes.py` (+/analyst), `payload_engine.py` (behavior + anomaly hook), `update_feeds.py` + `build_reputation.py` (Maltrail), `url_engine.py` (WHOIS-age signal only, additive), `config.py` (GROQ_API_KEY etc.), dashboard panels (`LogAnalyzer`, `UrlScanner`, `AttackerMap`, `ThreatFeed` + new `AnalystPanel`), `requirements.txt` (`python-whois`, `scapy`), docs.
- Secrets: `GROQ_API_KEY` set via env / `.env` (gitignored) — never in code or commits.

## Explicitly NOT doing tonight
Full Suricata rule-format parsing, real SIEM agent fleet, PCAP file upload, autoencoder deep-learning anomaly, any change to the reputation-first decision order. Reason: 8-hour budget, and rule #1.
