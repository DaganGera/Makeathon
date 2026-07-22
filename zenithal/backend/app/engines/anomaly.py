"""
Zenithal — self-learning behavioral anomaly baseline (the Darktrace angle).

Signatures and the payload classifier catch attacks that *look like* known
attacks. This engine catches requests that don't look like anything in the
benign baseline it was trained on — the same "learn normal, flag deviation"
paradigm behind unsupervised network anomaly detection, scaled down to a
single IsolationForest over request-shape features.

Purely additive: it never overrides a signature/ML verdict, never touches
Engine 1 (URL) decisions, and degrades to "disabled" (score always 0) if no
model has been trained yet — analyze_log() still works, just without the
extra signal.
"""

import json

import joblib
import numpy as np

from app import config
from app.ml.features_behavior import FEATURE_NAMES, extract_request_features


class AnomalyEngine:
    def __init__(self) -> None:
        self._model = None
        self._feature_names = FEATURE_NAMES
        self._scale = 1.0
        self.loaded = False

    def load(self) -> None:
        if not config.ANOMALY_MODEL_PATH.exists():
            return
        try:
            self._model = joblib.load(config.ANOMALY_MODEL_PATH)
            if config.ANOMALY_FEATURE_NAMES_PATH.exists():
                self._feature_names = json.loads(config.ANOMALY_FEATURE_NAMES_PATH.read_text())
            if config.ANOMALY_META_PATH.exists():
                meta = json.loads(config.ANOMALY_META_PATH.read_text())
                self._scale = meta.get("scale", 1.0)
            self.loaded = True
        except Exception:
            self._model = None
            self.loaded = False

    def score(self, request_target: str) -> float:
        """0-100 anomaly score. ~0 = looks like normal traffic, 100 = never
        seen anything like this in the benign baseline. Returns 0.0 if no
        model is trained (feature disabled, not an error).

        Uses IsolationForest.decision_function, which is already calibrated by
        training-time contamination so ~0 sits right at the "edge of normal" —
        then a sigmoid centered on that boundary turns it into a percentage
        (see training/train_anomaly.py for how `scale` was fit)."""
        if self._model is None:
            return 0.0
        # Short, param-less requests (home page, /login, /about, ...) sit in
        # an extreme corner of the feature space (very short length, zero
        # params) that IsolationForest isolates easily regardless of how
        # common they really are — a known artifact on low-dimensional data.
        # Real attack payloads almost always carry a query string or enough
        # length to encode a payload, and those are already caught by the
        # signature layer, so skipping trivial requests here costs us
        # nothing but removes the single biggest source of false positives.
        if "?" not in request_target and len(request_target) < 30:
            return 0.0
        try:
            features = extract_request_features(request_target)
            vec = np.array([[features.get(n, 0.0) for n in self._feature_names]])
            d = float(self._model.decision_function(vec)[0])
            pct = 100.0 / (1.0 + np.exp(self._scale * d))
            return round(min(max(pct, 0.0), 100.0), 1)
        except Exception:
            return 0.0


engine = AnomalyEngine()
