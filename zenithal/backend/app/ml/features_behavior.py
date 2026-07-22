"""
Zenithal — request-shape features for the self-learning anomaly baseline.

Unlike `features_payload.py` (which looks for *known* attack signatures), this
module describes the *shape* of a request — length, structure, character mix —
with no notion of what an attack looks like. An IsolationForest trained only
on benign traffic (see training/train_anomaly.py) uses these features to flag
requests that don't resemble anything it has seen before, the same "learn
normal, flag deviation" idea behind Darktrace-style anomaly detection.
"""

import math
import re
from collections import Counter

from app.ml.features_payload import normalize

FEATURE_NAMES = [
    "length", "path_depth", "num_params", "avg_param_value_len",
    "digit_ratio", "alpha_ratio", "special_ratio", "upper_ratio",
    "entropy", "has_encoded", "num_dots", "max_token_length",
]

_COMMON_CHARS = set("/?&=._-%")


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = Counter(s)
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def extract_request_features(target: str) -> dict[str, float]:
    decoded = normalize(target or "")
    length = len(decoded)
    if length == 0:
        return {name: 0.0 for name in FEATURE_NAMES}

    path = decoded.split("?", 1)[0]
    query = decoded.split("?", 1)[1] if "?" in decoded else ""
    path_depth = path.count("/")

    params = [p for p in query.split("&") if p] if query else []
    num_params = len(params)
    values = [p.split("=", 1)[1] for p in params if "=" in p]
    avg_param_value_len = (sum(len(v) for v in values) / len(values)) if values else 0.0

    digits = sum(c.isdigit() for c in decoded)
    alpha = sum(c.isalpha() for c in decoded)
    special = sum(1 for c in decoded if not c.isalnum() and c not in _COMMON_CHARS)
    upper = sum(c.isupper() for c in decoded)

    tokens = re.split(r"[^A-Za-z0-9]+", decoded)
    max_token_length = max((len(t) for t in tokens), default=0)

    return {
        "length": float(length),
        "path_depth": float(path_depth),
        "num_params": float(num_params),
        "avg_param_value_len": float(avg_param_value_len),
        "digit_ratio": digits / length,
        "alpha_ratio": alpha / length,
        "special_ratio": special / length,
        "upper_ratio": upper / length,
        "entropy": _entropy(decoded),
        "has_encoded": 1.0 if "%" in target else 0.0,
        "num_dots": float(decoded.count(".")),
        "max_token_length": float(max_token_length),
    }
