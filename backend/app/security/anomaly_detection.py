"""
Behavioral anomaly detection: IsolationForest with rule-based fallback.
Models are cached per user (TTL + growth threshold) — not refit every request.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from ipaddress import ip_address
from threading import Lock
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from app.core.config import settings
from app.security.rate_limiter import _client

logger = logging.getLogger(__name__)

FEATURE_KEY_TMPL = "anomaly:features:{user_id}"

_MODEL_CACHE: dict[str, tuple[IsolationForest, float, int]] = {}
_CACHE_LOCK = Lock()


def _ip_to_int(ip: str) -> int:
    try:
        return int(ip_address(ip))
    except Exception:
        return 0


def _endpoint_hash(path: str) -> int:
    return abs(hash(path)) % 10_000


def featurize(request_meta: dict[str, Any]) -> list[float]:
    now = datetime.now(timezone.utc)
    return [
        float(now.hour),
        float(now.weekday()),
        float(_ip_to_int(request_meta.get("ip", "0.0.0.0")) % 100_000),
        float(_endpoint_hash(request_meta.get("path", ""))),
        float(request_meta.get("payload_size", 0)),
        float(request_meta.get("status_code", 200)),
    ]


async def _load_history(user_id: str) -> np.ndarray | None:
    client = _client()
    raw = await client.lrange(FEATURE_KEY_TMPL.format(user_id=user_id), 0, -1)
    if len(raw) < settings.anomaly_min_samples_ml:
        return None
    rows: list[list[float]] = []
    for r in raw:
        try:
            rows.append([float(x) for x in r.split(",")])
        except Exception:
            continue
    return np.array(rows) if rows else None


async def _store_features(user_id: str, vec: list[float]) -> None:
    client = _client()
    key = FEATURE_KEY_TMPL.format(user_id=user_id)
    serialized = ",".join(f"{x:.4f}" for x in vec)
    pipe = client.pipeline()
    pipe.rpush(key, serialized)
    pipe.ltrim(key, -settings.anomaly_max_features_kept, -1)
    pipe.expire(key, 60 * 60 * 24 * 30)
    await pipe.execute()


def _get_or_train(user_id: str, history: np.ndarray) -> IsolationForest:
    now = time.time()
    n_hist = len(history)
    with _CACHE_LOCK:
        cached = _MODEL_CACHE.get(user_id)

    if cached is not None:
        model, fitted_at, n_prev = cached
        age = now - fitted_at
        growth = max(0.0, (n_hist - n_prev) / max(n_prev, 1))
        if age < MODEL_TTL_SECONDS and growth < REFIT_GROWTH_THRESHOLD:
            return model

    model = IsolationForest(n_estimators=80, contamination=0.05, random_state=42)
    model.fit(history)
    with _CACHE_LOCK:
        _MODEL_CACHE[user_id] = (model, now, n_hist)
    return model


def _rule_based_score(request_meta: dict[str, Any]) -> float:
    score = 0.0
    hour = datetime.now(timezone.utc).hour
    if hour < 5 or hour > 23:
        score += 0.25
    if request_meta.get("payload_size", 0) > 100_000:
        score += 0.3
    if request_meta.get("status_code", 200) in (401, 403):
        score += 0.3
    return min(score, 1.0)


async def detect_anomaly(user_id: str, request_meta: dict[str, Any]) -> tuple[bool, float]:
    """
    Return (is_anomaly, score in [0, 1]).
    """
    vec = featurize(request_meta)
    history = await _load_history(user_id)
    await _store_features(user_id, vec)

    alert_thr = settings.anomaly_alert_score_threshold
    if history is None:
        score = _rule_based_score(request_meta)
        return score >= alert_thr, score

    try:
        model = _get_or_train(user_id, history)
        raw_score = model.score_samples(np.array([vec]))[0]
        score = float(np.clip(0.5 - raw_score, 0.0, 1.0))
        return score >= alert_thr, score
    except Exception as e:
        logger.warning("anomaly_model_failed: %s", e)
        score = _rule_based_score(request_meta)
        return score >= alert_thr, score
