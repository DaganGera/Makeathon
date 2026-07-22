#!/usr/bin/env python
"""
Zenithal - live attack simulation for the SIH25229 demo.

Replays a scripted, mixed attack into the ALREADY-RUNNING API over ~60-90s so
the dashboard lights up on its own during a live demo, instead of the
presenter pasting things by hand. Prints a narration line before each wave -
read it aloud, it's a built-in teleprompter.

Idempotent and network-free of anything except the local API: safe to rerun
if a step is missed, and it never touches anything outside this machine.

Usage:
  python demo/simulate_attack.py                  # normal pace (~75s)
  python demo/simulate_attack.py --speed 0.3       # rehearsal, fast
  python demo/simulate_attack.py --base http://127.0.0.1:8000
"""

import argparse
import time
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
LOG_FILE = HERE / "sample_access.log"

PHISH_URLS = [
    "http://sbi-verify-now.top/netbanking/login",
    "http://paypal-verify.tk/login",
    "http://amaz0n-billing.ml/account/update",
    "http://appleid-verify.gq/signin",
    "http://icici-kyc-update.buzz/confirm",
]

# Reconnaissance / sequential-path-scan behavior demo: one IP probing many
# distinct admin/config paths, mostly 404 - the Wazuh/Suricata-style
# correlation signal in payload_engine.py's _build_behavior().
_SCAN_PATHS = ["wp-admin", "phpmyadmin", ".git/config", "admin.php", "config.bak",
               "backup.zip", ".env", "server-status", "debug.php", "test.php"]
SCAN_IP = "185.220.102.8"

# Self-learning-baseline demo: GraphQL introspection recon has NO signature
# (GraphQL didn't exist when the CSIC-2010/regex rules were written) but is
# flagged by the IsolationForest baseline as statistically unlike any normal
# traffic in the training set - verified via training/train_anomaly.py.
_ANOMALY_TARGETS = [
    "/graphql?query={__schema{types{name,fields{name,args{name,type{name}}}}}}"
    "&depth=99&batch=true&introspect=1&raw=1",
    "/api/v2/graphql/batch?ops=[{query:__schema},{query:__type},{query:users},"
    "{query:sessions}]&introspect=true",
]
ANOMALY_IP = "45.155.205.233"  # curated: Seychelles / bulletproof hosting


def timestamp() -> str:
    return time.strftime("%d/%b/%Y:%H:%M:%S +0000")


def narrate(msg: str, pause: float, wait) -> None:
    print(f"\n>>> {msg}")
    wait(pause)


def post_log_batch(base: str, lines: list[str]) -> dict:
    """POST a batch of log lines in ONE call so per-IP hits aggregate
    correctly within analyze_log() — one line at a time would make every
    attacker look like a single one-off hit instead of a real burst."""
    try:
        r = requests.post(f"{base}/api/v1/analyze/logtext", json={"text": "\n".join(lines)}, timeout=20)
        return r.json()
    except Exception as e:
        print(f"    (warning: {e})")
        return {}


def post_url(base: str, url: str) -> None:
    try:
        r = requests.post(f"{base}/api/v1/analyze/url", json={"url": url}, timeout=15)
        d = r.json()
        print(f"    {d.get('verdict', '?'):10} score={d.get('score', '?'):>5}  {url}")
    except Exception as e:
        print(f"    (warning: {e})")


def post_message(base: str, text: str, sender: str) -> None:
    try:
        r = requests.post(f"{base}/api/v1/analyze/message", json={"text": text, "sender": sender}, timeout=15)
        d = r.json()
        print(f"    overall: {d.get('overall_verdict', '?')} ({d.get('urls_found', 0)} url(s) found)")
    except Exception as e:
        print(f"    (warning: {e})")


def main() -> None:
    ap = argparse.ArgumentParser(description="Replay a scripted mixed attack into the live Zenithal API.")
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--speed", type=float, default=1.0, help="delay multiplier; <1 = faster (use for rehearsal)")
    args = ap.parse_args()
    base = args.base.rstrip("/")

    def wait(seconds: float) -> None:
        time.sleep(max(0.0, seconds * args.speed))

    print("=" * 72)
    print("ZENITHAL - LIVE ATTACK SIMULATION (SIH25229 demo)")
    print("Open the dashboard now: Threat Feed + Attacker Map panels.")
    print("=" * 72)
    wait(3)

    if not LOG_FILE.exists():
        print(f"Missing {LOG_FILE} - aborting.")
        return
    lines = LOG_FILE.read_text().splitlines()

    narrate("Wave 1 - SQL injection burst from automated tooling (sqlmap)", 2, wait)
    batch = [line for line in lines if "45.135.232.17" in line]
    r = post_log_batch(base, batch)
    print(f"    {r.get('malicious_requests', '?')} malicious requests from "
          f"{r.get('unique_attackers', '?')} attacker(s)")
    wait(2)

    narrate("Wave 2 - XSS, path traversal, command injection, LFI (mixed toolkit, 5 attacker IPs)", 2, wait)
    batch = [line for line in lines if any(
        ip in line for ip in
        ("141.98.11.29", "222.186.30.112", "5.188.206.130", "193.239.85.20", "196.196.53.10"))]
    r = post_log_batch(base, batch)
    print(f"    {r.get('malicious_requests', '?')} malicious requests from "
          f"{r.get('unique_attackers', '?')} attacker(s)")
    wait(2)

    narrate("Wave 3 - reconnaissance: scanner probing 10 common admin/config paths "
            "(no single request is malicious - the AGGREGATE pattern is the tell)", 2.5, wait)
    batch = [f'{SCAN_IP} - - [{timestamp()}] "GET /{p} HTTP/1.1" 404 180 "-" "nikto/2.5.0"' for p in _SCAN_PATHS]
    r = post_log_batch(base, batch)
    print(f"    {r.get('unique_attackers', '?')} attacker(s) correlated purely from request pattern")
    wait(2)

    narrate("Wave 4 - SELF-LEARNING BASELINE: a technique with NO existing signature "
            "(GraphQL introspection recon) - still flagged as anomalous behavior", 2.5, wait)
    batch = [f'{ANOMALY_IP} - - [{timestamp()}] "GET {t} HTTP/1.1" 200 512 "-" "Mozilla/5.0"' for t in _ANOMALY_TARGETS]
    r = post_log_batch(base, batch)
    print(f"    {r.get('anomaly_count', '?')} anomalous request(s) flagged (0 signature matches)")

    narrate("Wave 5 - phishing URL wave (brand impersonation + IP intelligence)", 2, wait)
    for u in PHISH_URLS:
        post_url(base, u)
        wait(0.8)

    narrate("Wave 6 - WhatsApp/SMS: a 'bank alert' message with an embedded phishing link", 2, wait)
    post_message(
        base,
        "URGENT: Your SBI account will be suspended. Verify immediately: "
        "http://sbi-verify-now.top/netbanking/login",
        sender="+91-98xxxxxxxx",
    )

    wait(1)
    try:
        stats = requests.get(f"{base}/api/v1/dashboard/stats", timeout=10).json()
        print("\n" + "=" * 72)
        print("SIMULATION COMPLETE -", stats)
        print("=" * 72)
    except Exception:
        print("\nSimulation complete.")


if __name__ == "__main__":
    main()
