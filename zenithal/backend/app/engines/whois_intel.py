"""
Zenithal — WHOIS domain-age enrichment (optional online enrichment).

Newly-registered domains are one of the strongest phishing signals in
practice — attackers overwhelmingly stand up a fresh domain rather than reuse
an aged one. This is a pure signal add-on used only for domains that are
neither allowlisted nor blocklisted (see url_engine.py): it adds a small,
capped amount of risk and a plain-language reason, never a verdict by itself.

Disabled by default (ENABLE_ONLINE_ENRICHMENT=false) so the demo never
depends on a live WHOIS network call. When enabled, lookups are time-boxed
and disk-cached so a slow/unreachable WHOIS server can't stall a scan or hit
the network twice for the same domain.
"""

import json
import time
from concurrent.futures import ThreadPoolExecutor

from app import config

try:
    import whois as _whois  # python-whois
    _HAS_WHOIS = True
except Exception:
    _HAS_WHOIS = False

_executor = ThreadPoolExecutor(max_workers=4)
_CACHE_TTL = 7 * 24 * 3600  # a week — domain age barely changes meaningfully


def _load_cache() -> dict:
    try:
        return json.loads(config.WHOIS_CACHE_PATH.read_text())
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    try:
        config.WHOIS_CACHE_PATH.write_text(json.dumps(cache))
    except Exception:
        pass


_cache = _load_cache()


def _lookup_creation_date(domain: str):
    created = _whois.whois(domain).creation_date
    return created[0] if isinstance(created, list) else created


def domain_age_days(domain: str, timeout: float = 3.0) -> int | None:
    """Best-effort domain age in days. Returns None if disabled, unavailable,
    or the lookup times out — callers must treat None as 'unknown', never as
    'new' (i.e. it must never itself increase risk)."""
    if not config.ENABLE_ONLINE_ENRICHMENT or not _HAS_WHOIS or not domain:
        return None

    now = time.time()
    hit = _cache.get(domain)
    if hit and (now - hit["ts"]) < _CACHE_TTL:
        return hit["age_days"]

    try:
        future = _executor.submit(_lookup_creation_date, domain)
        created = future.result(timeout=timeout)
        age_days = int((now - created.timestamp()) / 86400) if created else None
    except Exception:
        return None  # unavailable this time — don't cache a transient failure

    _cache[domain] = {"ts": now, "age_days": age_days}
    _save_cache(_cache)
    return age_days
