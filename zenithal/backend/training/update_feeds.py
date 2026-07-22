"""
Zenithal — refresh threat feeds and (optionally) retrain.

Downloads the latest public feeds, rebuilds the URL dataset, retrains both
models, and runs the acceptance test. Intended to run on a schedule (cron /
Windows Task Scheduler) so detection stays current with new attacks.

Usage:
  python training/update_feeds.py            # download feeds only
  python training/update_feeds.py --retrain  # download + rebuild + retrain + validate

Feeds (public, no auth):
  URLhaus recent malicious URLs, Majestic Million benign domains.
"""

import json
import os
import subprocess
import sys
import urllib.request

DATA = os.path.join(os.path.dirname(__file__), "data")
HERE = os.path.dirname(__file__)
PYTHON = sys.executable
_MALTRAIL_API = "https://api.github.com/repos/stamparm/maltrail/contents/trails/static/malware"

# Threat feeds (all free, no API key). Optional keys via env raise rate limits.
_PT = os.getenv("PHISHTANK_API_KEY", "")
FEEDS = {
    "urlhaus_recent.csv": "https://urlhaus.abuse.ch/downloads/csv_recent/",
    "openphish.txt": os.getenv("OPENPHISH_FEED_URL", "https://openphish.com/feed.txt"),
    "phishtank.csv": (f"http://data.phishtank.com/data/{_PT}/online-valid.csv"
                      if _PT else "http://data.phishtank.com/data/online-valid.csv"),
    # Majestic is large (~80 MB); refresh weekly rather than daily if bandwidth matters.
    "majestic.csv": "https://downloads.majestic.com/majestic_million.csv",
}
# Phishing feeds refresh every run; Majestic (benign, rarely changes) only if missing.
_ALWAYS = ["urlhaus_recent.csv", "openphish.txt", "phishtank.csv"]


def download(name: str, url: str) -> bool:
    dest = os.path.join(DATA, name)
    try:
        print(f"[*] Downloading {name} ...")
        req = urllib.request.Request(url, headers={"User-Agent": "Zenithal/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
            f.write(r.read())
        print(f"    saved -> {dest} ({os.path.getsize(dest)//1024} KB)")
        return True
    except Exception as e:
        print(f"    FAILED: {e}")
        return False


def download_maltrail(max_files: int = 60) -> bool:
    """Best-effort pull of a slice of Maltrail's (github.com/stamparm/maltrail)
    static malware IOC trails — the same public IOC-list idea Suricata/IDS
    deployments feed from. Merged into the blocklist by build_reputation.py.
    Any failure here (rate limit, network, repo restructure) is non-fatal:
    the blocklist just builds from URLhaus/OpenPhish/PhishTank as before."""
    try:
        req = urllib.request.Request(_MALTRAIL_API, headers={"User-Agent": "Zenithal/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            listing = json.loads(r.read().decode())
        files = [f for f in listing if f.get("type") == "file" and f.get("download_url")][:max_files]
        print(f"[*] Maltrail: {len(files)} trail files found, downloading...")
        indicators: set[str] = set()
        for f in files:
            try:
                req = urllib.request.Request(f["download_url"], headers={"User-Agent": "Zenithal/1.0"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    text = r.read().decode("utf-8", errors="ignore")
                for line in text.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    indicator = line.split(",")[0].strip()
                    if indicator:
                        indicators.add(indicator)
            except Exception:
                continue
        dest = os.path.join(DATA, "maltrail_iocs.txt")
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write("\n".join(sorted(indicators)))
        print(f"    saved -> {dest} ({len(indicators)} indicators)")
        return True
    except Exception as e:
        print(f"    Maltrail FAILED (skipped, non-fatal): {e}")
        return False


def run(script: str) -> None:
    print(f"\n[*] {script}")
    subprocess.run([PYTHON, os.path.join(HERE, script)], check=True)


def main() -> None:
    retrain = "--retrain" in sys.argv
    # Phishing feeds refresh every run; benign top-list only if missing.
    ok = False
    for name in _ALWAYS:
        ok = download(name, FEEDS[name]) or ok
    if not os.path.exists(os.path.join(DATA, "majestic.csv")):
        download("majestic.csv", FEEDS["majestic.csv"])

    download_maltrail()

    # Reputation lists refresh on every run (cheap, and keeps the block/allow
    # lists current with the latest URLhaus/Maltrail hosts).
    run("build_reputation.py")

    if retrain and ok:
        run("build_url_dataset.py")
        run("train_url.py")
        run("train_payload.py")
        run("validate_url_model.py")  # exits non-zero if legit sites regress
        print("\n[OK] Feeds refreshed, reputation + models rebuilt and validated.")
    else:
        print("\n[OK] Feeds + reputation lists refreshed. Re-run with --retrain to rebuild models.")


if __name__ == "__main__":
    main()
