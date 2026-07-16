"""
Zenithal — Engine 1: Phishing / Malicious URL detection.

Combines the XGBoost lexical classifier (with a heuristic fallback when no
model is trained yet) with IP intelligence + IP-domain correlation, then
hands the fused signals to the explainability layer.
"""

import json
from urllib.parse import urlparse

import joblib
import numpy as np
import tldextract

from app import config
from app.engines import ip_intel, reputation
from app.engines.explain import explain_url
from app.ml.features_url import FEATURE_NAMES, extract_url_features

# Concrete brand names an attacker impersonates (excludes generic words like
# 'login'/'secure'/'account' so a plain dev server isn't mistaken for a fake
# brand page). Used only for the loopback/private-IP safety check.
_REAL_BRANDS = [
    "paypal", "amazon", "apple", "microsoft", "google", "facebook", "netflix",
    "instagram", "whatsapp", "linkedin", "twitter", "dropbox", "hdfc", "sbi",
    "icici", "axisbank", "citibank", "chase", "paytm", "irctc", "incometax",
    "flipkart", "dhl", "fedex", "amazonpay", "phonepe", "kotak",
]


class URLEngine:
    def __init__(self) -> None:
        self._model = None
        self._feature_names = FEATURE_NAMES
        self.loaded = False

    def load(self) -> None:
        if config.URL_MODEL_PATH.exists():
            try:
                self._model = joblib.load(config.URL_MODEL_PATH)
                if config.URL_FEATURE_NAMES_PATH.exists():
                    self._feature_names = json.loads(
                        config.URL_FEATURE_NAMES_PATH.read_text()
                    )
                self.loaded = True
            except Exception:
                self._model = None
                self.loaded = False

    # -- ML / heuristic scoring -------------------------------------------
    def _ml_score(self, features: dict[str, float]) -> float:
        vec = np.array([[features.get(n, 0.0) for n in self._feature_names]])
        proba = self._model.predict_proba(vec)[0][1]
        return round(float(proba) * 100, 2)

    def _heuristic_score(self, features: dict[str, float]) -> float:
        score = 0.0
        score += features.get("tld_risk_score", 0) * 20
        if features.get("has_brand_keyword", 0) > 0:
            score += 15
        if features.get("is_https", 0) == 0:
            score += 10
        score += min(features.get("suspicious_word_count", 0) * 5, 20)
        if features.get("has_ip_address", 0) > 0:
            score += 20
        if features.get("entropy", 0) > 4.0:
            score += 10
        if features.get("url_length", 0) > 100:
            score += 5
        if features.get("is_shortened_url", 0) > 0:
            score += 15
        if features.get("has_login_keyword", 0) > 0:
            score += 10
        if features.get("has_verify_keyword", 0) > 0:
            score += 10
        return min(score, 100.0)

    # -- Public API -------------------------------------------------------
    def analyze(self, url: str, with_ip_intel: bool = True) -> dict:
        features = extract_url_features(url)
        domain = _registered_domain(url)
        hostname = _hostname(url)

        # === Decision order: reputation first, ML only for unknown domains ===
        # (1) Allowlist — well-established reputable domain wins. A URL on such a
        #     domain is legitimate regardless of how unusual its path/query is
        #     (search links, session tokens, tracking params...). Checked BEFORE
        #     the blocklist because threat feeds list redirect-abuse URLs on
        #     legit hosts (e.g. google.com/url?q=...) that must not over-block
        #     the reputable domain. This is what makes the engine reliable.
        if reputation.is_allowlisted(domain):
            corr = self._correlate(domain, with_ip_intel)
            reasons = [f"'{domain}' is a well-established, reputable domain (global top-1M). "
                       "A legitimate site's path or query does not make it malicious."] + corr["signals"]
            return self._result(url, features, 2.0, 0.0, corr, "reputation-allowlist",
                                 reasons, "No threat detected")

        # (2) Blocklist — exact malicious host on a live threat feed (only for
        #     non-reputable domains).
        if reputation.is_blocklisted(hostname):
            corr = self._correlate(domain, with_ip_intel)
            reasons = ["Host is on an active malicious-URL threat feed (URLhaus) - known to distribute malware/phishing."] + corr["signals"]
            return self._result(url, features, 100.0, 100.0, corr, "blocklist",
                                 reasons, "Known Malicious Host")

        # (3) Unknown domain — lexical ML + IP intelligence.
        if self._model is not None:
            lexical_score = self._ml_score(features)
            model_used = "xgboost"
        else:
            lexical_score = self._heuristic_score(features)
            model_used = "heuristic"

        corr = self._correlate(domain, with_ip_intel)
        fused = min(100.0, lexical_score * 0.8 + corr["ip_risk"])

        # Loopback / private hosts are local/dev resources, not phishing —
        # unless they serve a fake brand page (192.168.1.1/paypal/login).
        if _is_local_host(url):
            if not any(b in url.lower() for b in _REAL_BRANDS):
                fused = min(fused, 10.0)
                corr = {**corr, "signals": ["Loopback/private address - local or internal resource, not a public phishing site."]}

        reasons, threat_type = explain_url(url, features, corr, lexical_score)
        verdict = config.score_to_verdict(fused)
        if verdict == "SAFE":
            threat_type = "No threat detected"
        return self._result(url, features, fused, lexical_score, corr, model_used,
                            reasons, threat_type)

    def _correlate(self, domain: str | None, with_ip_intel: bool) -> dict:
        corr = {"resolved_ip": None, "intel": None, "signals": [], "ip_risk": 0.0}
        if with_ip_intel and domain:
            try:
                corr = ip_intel.correlate_domain(domain)
            except Exception:
                pass
        return corr

    def _result(self, url, features, fused, lexical_score, corr, model_used,
                reasons, threat_type) -> dict:
        return {
            "channel": "url",
            "input": url,
            "score": round(fused, 1),
            "lexical_score": round(lexical_score, 1),
            "ip_risk": round(corr["ip_risk"], 1),
            "verdict": config.score_to_verdict(fused),
            "threat_type": threat_type,
            "model_used": model_used,
            "resolved_ip": corr["resolved_ip"],
            "ip_intel": corr["intel"],
            "reasons": reasons,
            "top_features": _top_features(features),
        }


def _is_local_host(url: str) -> bool:
    """True if the URL host is localhost or a private/loopback IP."""
    import ipaddress
    try:
        if "://" not in url:
            url = "http://" + url
        host = urlparse(url).hostname or ""
        if host in ("localhost", "localhost.localdomain"):
            return True
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except Exception:
        return False


def _registered_domain(url: str) -> str | None:
    try:
        if "://" not in url:
            url = "http://" + url
        ext = tldextract.extract(url)
        return ext.registered_domain or urlparse(url).netloc or None
    except Exception:
        return None


def _hostname(url: str) -> str | None:
    """Full host (including subdomain), for exact blocklist matching."""
    try:
        if "://" not in url:
            url = "http://" + url
        return (urlparse(url).hostname or "").lower() or None
    except Exception:
        return None


def _top_features(features: dict[str, float]) -> dict[str, float]:
    """A few human-interesting features for the UI."""
    keys = [
        "url_length", "num_subdomains", "tld_risk_score", "has_ip_address",
        "has_brand_keyword", "is_https", "is_shortened_url", "suspicious_word_count",
        "entropy",
    ]
    return {k: round(features.get(k, 0.0), 3) for k in keys}


# Module-level singleton, loaded at app startup.
engine = URLEngine()
