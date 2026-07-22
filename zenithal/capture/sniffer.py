#!/usr/bin/env python
"""
Zenithal - optional live packet-capture showpiece.

Sniffs plaintext HTTP (port 80) requests and DNS queries on a local network
interface and feeds them into the SAME detection pipeline used everywhere
else in Zenithal (POST /analyze/logtext, /analyze/url) - so anything it sees
lights up the live dashboard exactly like the log-file/simulated demo does.

This is explicitly a SHOWPIECE, not a dependency: every other part of
Zenithal works fully without it. Most modern traffic is HTTPS, and this
intentionally does NOT attempt to parse TLS ClientHello/SNI - that needs a
real TLS-aware parser and adds fragility that isn't worth it for a hackathon
demo. It sees plaintext HTTP requests and DNS lookups only. If the venue
network, driver, or permissions misbehave, skip this module entirely and run
demo/simulate_attack.py instead - the dashboard behaves identically either way.

Requires: Npcap installed (npcap.com, "WinPcap-compatible" checked) and this
process run as Administrator (raw packet capture needs elevated privileges).

Usage:
  python capture/sniffer.py                      # auto-picks default interface
  python capture/sniffer.py --iface "Wi-Fi"
  python capture/sniffer.py --base http://127.0.0.1:8000
"""

import argparse
import re
import time

import requests
from scapy.all import sniff, TCP, Raw
from scapy.layers.dns import DNS, DNSQR

_HTTP_REQUEST_RE = re.compile(rb"^(GET|POST|HEAD|PUT|DELETE)\s+(\S+)\s+HTTP/1\.[01]", re.I)
_HOST_HEADER_RE = re.compile(rb"Host:\s*([^\r\n]+)", re.I)

_seen: set[str] = set()
_SEEN_MAX = 500


def _dedupe(key: str) -> bool:
    """True if this is worth reporting (hasn't been seen recently)."""
    if key in _seen:
        return False
    if len(_seen) >= _SEEN_MAX:
        _seen.clear()
    _seen.add(key)
    return True


def _handle_http(base: str, payload: bytes) -> None:
    m = _HTTP_REQUEST_RE.match(payload)
    if not m:
        return
    method, target = m.group(1).decode(), m.group(2).decode(errors="ignore")
    host_m = _HOST_HEADER_RE.search(payload)
    host = host_m.group(1).decode(errors="ignore").strip() if host_m else ""
    if not host or not _dedupe(f"http:{host}{target}"):
        return
    print(f"[HTTP] {method} {host}{target}")

    line = (f'live - - [{time.strftime("%d/%b/%Y:%H:%M:%S +0000")}] '
             f'"{method} {target} HTTP/1.1" 200 0 "-" "live-capture"')
    try:
        requests.post(f"{base}/api/v1/analyze/logtext", json={"text": line}, timeout=5)
    except Exception:
        pass
    # Also run Engine 1 (phishing/reputation) against the full resolved URL.
    try:
        requests.post(f"{base}/api/v1/analyze/url", json={"url": f"http://{host}{target}"}, timeout=5)
    except Exception:
        pass


def _handle_dns(base: str, pkt) -> None:
    if not pkt.haslayer(DNSQR):
        return
    qname = pkt[DNSQR].qname.decode(errors="ignore").rstrip(".")
    if not qname or not _dedupe(f"dns:{qname}"):
        return
    print(f"[DNS]  {qname}")
    try:
        requests.post(f"{base}/api/v1/analyze/url", json={"url": f"http://{qname}/"}, timeout=5)
    except Exception:
        pass


def make_callback(base: str):
    def callback(pkt) -> None:
        try:
            if pkt.haslayer(DNS):
                _handle_dns(base, pkt)
            elif pkt.haslayer(TCP) and pkt.haslayer(Raw) and (pkt[TCP].sport == 80 or pkt[TCP].dport == 80):
                _handle_http(base, bytes(pkt[Raw].load))
        except Exception:
            pass
    return callback


def main() -> None:
    ap = argparse.ArgumentParser(description="Zenithal live packet-capture showpiece (HTTP + DNS only).")
    ap.add_argument("--iface", default=None, help="network interface name (default: scapy's auto-pick)")
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    args = ap.parse_args()

    print("=" * 70)
    print("ZENITHAL - LIVE PACKET CAPTURE (showpiece module)")
    print("Watching for plaintext HTTP requests + DNS queries.")
    print("Needs: Npcap installed, this process run as Administrator.")
    print("Ctrl+C to stop. If this fails, run demo/simulate_attack.py instead.")
    print("=" * 70)

    try:
        sniff(iface=args.iface, filter="tcp port 80 or udp port 53", prn=make_callback(args.base), store=False)
    except PermissionError:
        print("\nPermission denied - run this terminal as Administrator.")
    except OSError as e:
        print(f"\nCapture failed ({e}). Is Npcap installed? Fallback: "
              "run demo/simulate_attack.py for a guaranteed-working demo.")


if __name__ == "__main__":
    main()
