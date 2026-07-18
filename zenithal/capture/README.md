# Live Packet Capture (optional showpiece)

Sniffs plaintext HTTP requests and DNS lookups off the local network and
feeds them into the same `/analyze/logtext` and `/analyze/url` pipeline as
everything else in Zenithal, so anything it sees appears live on the
dashboard — the same "packet capture -> detection" idea behind Suricata/Zeek,
scoped down to what's realistic to demo in one night.

**This is a showpiece, not a dependency.** Every other Zenithal feature works
fully without it. Use it for ~30 seconds during the demo to show "this also
works on live traffic, not just uploaded logs" — if it doesn't cooperate on
the venue's network/hardware, skip it and run `demo/simulate_attack.py`
instead. The dashboard looks identical either way.

## Scope (intentional)

Only plaintext **HTTP (port 80)** requests and **DNS** queries are parsed.
Most web traffic today is HTTPS, so this deliberately does **not** attempt to
parse TLS ClientHello/SNI — that needs a real TLS-aware parser and would add
fragility with little payoff for a hackathon demo. It's an honest scope cut,
not a hidden gap — say so if asked.

## Setup

1. Install [Npcap](https://npcap.com/) — check **"Install Npcap in WinPcap
   API-compatible Mode"** during setup.
2. Make sure the backend (`app.main:app`) is running.
3. Run this script **as Administrator** (raw packet capture needs elevated
   privileges on Windows):
   ```
   python capture/sniffer.py
   ```
   Optional: `--iface "Wi-Fi"` to pick a specific adapter, `--base` to point
   at a non-default API URL.

## What you'll see

- Console prints `[HTTP] ...` / `[DNS] ...` lines as traffic is seen.
- The dashboard's Threat Feed / Attacker Map light up the same way they do
  for `demo/simulate_attack.py` or a log upload.
- Browsing to an HTTP (not HTTPS) test page, or any DNS lookup your machine
  makes, is enough to demonstrate it live.

## If it doesn't work at the venue

Permission errors, missing Npcap, or a locked-down venue network are all
common. There is no shame in this — just say "we also support live packet
capture; here's the same detection running from an uploaded log instead" and
run `demo/simulate_attack.py`. Nothing about the pitch depends on this
working live.
