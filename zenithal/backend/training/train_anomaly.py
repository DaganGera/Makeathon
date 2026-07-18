"""
Zenithal — train the self-learning anomaly baseline (Darktrace angle).

Fits an IsolationForest on request-SHAPE features (length, structure, char
mix — see app/ml/features_behavior.py) using ONLY benign traffic. It never
sees an attack label; it just learns what "normal" looks like, so at
inference time anything it hasn't seen before scores as anomalous — the same
idea as unsupervised network-behavior baselining, just scoped to request shape
instead of full network telemetry.

Reuses the benign side of training/train_payload.py's dataset (real CSIC 2010
normal traffic + diverse synthetic benign augmentation) so the baseline is
broad, not just "looks like the CSIC shop".

Run: python training/train_anomaly.py
"""

import json
import os
import sys
import warnings

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from train_payload import load_data  # noqa: E402
from app import config  # noqa: E402
from app.ml.features_behavior import FEATURE_NAMES, extract_request_features  # noqa: E402

# A few obvious attack payloads, purely for a sanity check at the end —
# NOT used for training (the model never sees attack labels).
_SANITY_ATTACKS = [
    "/product?id=1' OR '1'='1", "/x=<script>alert(1)</script>",
    "/download?file=../../../../etc/passwd",
    "/n?id=1 AND extractvalue(1,concat(0x7e,database()))",
]
_SANITY_BENIGN = [
    "/search?q=laptop+bag", "/api/v1/orders?status=shipped", "/", "/login",
]


def main():
    print("=" * 60, "\nZenithal — Anomaly Baseline Training (self-learning)\n", "=" * 60, sep="")
    X_text, y = load_data()
    benign_text = [x for x, label in zip(X_text, y) if label == 0]
    print(f"[*] Benign-only training samples: {len(benign_text)}")

    X = np.array([[extract_request_features(t).get(n, 0.0) for n in FEATURE_NAMES] for t in benign_text])

    model = IsolationForest(n_estimators=200, contamination=0.03, random_state=42, n_jobs=-1)
    model.fit(X)

    # decision_function(x) = score_samples(x) - offset_, where offset_ is
    # calibrated by `contamination` so ~3% of TRAINING benign already sits
    # below zero. That boundary is exactly what we want to center the
    # anomaly-percent mapping on (see anomaly.py): typical benign traffic
    # sits comfortably above zero -> low anomaly%, only the tail crosses it.
    train_decision = model.decision_function(X)
    scale = 3.0 / max(float(np.std(train_decision)), 1e-6)
    print(f"[*] Training decision range: [{train_decision.min():.4f}, {train_decision.max():.4f}], scale={scale:.3f}")

    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, config.ANOMALY_MODEL_PATH)
    config.ANOMALY_FEATURE_NAMES_PATH.write_text(json.dumps(FEATURE_NAMES))
    config.ANOMALY_META_PATH.write_text(json.dumps({"scale": scale}))
    print(f"[OK] Saved -> {config.ANOMALY_MODEL_PATH}")

    def pct(text):
        vec = np.array([[extract_request_features(text).get(n, 0.0) for n in FEATURE_NAMES]])
        d = float(model.decision_function(vec)[0])
        return round(100.0 / (1.0 + np.exp(scale * d)), 1)

    print("\nSanity (benign should score LOW, attacks should score HIGH):")
    for s in _SANITY_BENIGN:
        print(f"  benign   {pct(s):5.1f}  {s}")
    for s in _SANITY_ATTACKS:
        print(f"  attack   {pct(s):5.1f}  {s}")

    false_pos = sum(1 for t in benign_text if pct(t) >= config.ANOMALY_THRESHOLD)
    print(f"\n[*] Benign flagged above threshold ({config.ANOMALY_THRESHOLD}): "
          f"{false_pos}/{len(benign_text)} ({100*false_pos/len(benign_text):.2f}%)")


if __name__ == "__main__":
    main()
