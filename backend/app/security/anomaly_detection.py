"""
Behavioral anomaly detection: sentence-transformers (local, CPU) + IsolationForest.
Cold-start uses cosine distance from global centroid — new users protected from day 0.

Vector: 6 behavioral + 384 semantic (all-MiniLM-L6-v2) = 390-dim
Detection waterfall: IsolationForest → centroid cosine dist → rule-based
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from ipaddress import ip_address
from threading import Lock
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import IsolationForest

from app.core.config import settings
from app.security.rate_limiter import _client

logger = logging.getLogger(__name__)

MODEL_TTL_SECONDS: int = 3600
REFIT_GROWTH_THRESHOLD: float = 0.20
EMBED_DIM: int = 384
TOTAL_DIM: int = 6 + EMBED_DIM  # 390

FEATURE_KEY_TMPL = "anomaly:features:{user_id}"
CENTROID_KEY = "anomaly:global_centroid"
CENTROID_N_KEY = "anomaly:global_centroid_n"

_MODEL_CACHE: dict[str, tuple[IsolationForest, float, int]] = {}
_CACHE_LOCK = Lock()

_embedder = SentenceTransformer("all-MiniLM-L6-v2")


def _log_text(request_meta: dict[str, Any]) -> str:
    path = request_meta.get("path", "/")
    ip = request_meta.get("ip", "0.0.0.0")
    size = request_meta.get("payload_size", 0)
    status = request_meta.get("status_code", 200)
    hour = datetime.now(timezone.utc).hour
    day = datetime.now(timezone.utc).strftime("%A")
    return f"request path={path} ip={ip} payload_size={size} status={status} hour={hour} weekday={day}"


def _embed_sync(text: str) -> np.ndarray:
    vec = _embedder.encode(text, normalize_embeddings=True)
    return vec.astype(np.float32)


async def _embed_text(text: str) -> np.ndarray:
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(None, _embed_sync, text)
    except Exception as e:
        logger.warning("embed_failed: %s", e)
        return np.zeros(EMBED_DIM, dtype=np.float32)


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


async def _full_vector(request_meta: dict[str, Any]) -> np.ndarray:
    behavioral = np.array(featurize(request_meta), dtype=np.float32)
    behavioral_norm = behavioral / (np.abs(behavioral).max() + 1e-9)
    semantic = await _embed_text(_log_text(request_meta))
    return np.concatenate([behavioral_norm, semantic])


async def _load_history(user_id: str) -> np.ndarray | None:
    client = _client()
    raw = await client.lrange(FEATURE_KEY_TMPL.format(user_id=user_id), 0, -1)
    if len(raw) < settings.anomaly_min_samples_ml:
        return None
    rows = []
    for r in raw:
        try:
            rows.append(np.array([float(x) for x in r.split(",")], dtype=np.float32))
        except Exception:
            continue
    return np.array(rows) if rows else None


async def _store_vector(user_id: str, vec: np.ndarray) -> None:
    client = _client()
    key = FEATURE_KEY_TMPL.format(user_id=user_id)
    serialized = ",".join(f"{x:.6f}" for x in vec.tolist())
    pipe = client.pipeline()
    pipe.rpush(key, serialized)
    pipe.ltrim(key, -settings.anomaly_max_features_kept, -1)
    pipe.expire(key, 60 * 60 * 24 * 30)
    await pipe.execute()


async def _update_global_centroid(vec: np.ndarray) -> None:
    client = _client()
    try:
        raw_n = await client.get(CENTROID_N_KEY)
        n = int(raw_n) if raw_n else 0
        raw_c = await client.get(CENTROID_KEY)
        centroid = (
            np.array([float(x) for x in raw_c.split(",")], dtype=np.float32)
            if raw_c and n > 0
            else np.zeros(len(vec), dtype=np.float32)
        )
        n += 1
        centroid = centroid + (vec - centroid) / n
        pipe = client.pipeline()
        pipe.set(CENTROID_KEY, ",".join(f"{x:.6f}" for x in centroid.tolist()))
        pipe.set(CENTROID_N_KEY, str(n))
        await pipe.execute()
    except Exception as e:
        logger.warning("centroid_update_failed: %s", e)


async def _load_global_centroid() -> np.ndarray | None:
    client = _client()
    try:
        raw_n = await client.get(CENTROID_N_KEY)
        n = int(raw_n) if raw_n else 0
        if n < settings.anomaly_min_samples_ml:
            return None
        raw_c = await client.get(CENTROID_KEY)
        if not raw_c:
            return None
        return np.array([float(x) for x in raw_c.split(",")], dtype=np.float32)
    except Exception as e:
        logger.warning("centroid_load_failed: %s", e)
        return None


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.5
    return float(np.clip((1.0 - float(np.dot(a, b) / (norm_a * norm_b))) / 2.0, 0.0, 1.0))


def _get_or_train(user_id: str, history: np.ndarray) -> IsolationForest:
    now = time.time()
    n_hist = len(history)
    with _CACHE_LOCK:
        cached = _MODEL_CACHE.get(user_id)
    if cached is not None:
        model, fitted_at, n_prev = cached
        if (now - fitted_at < MODEL_TTL_SECONDS and
                max(0.0, (n_hist - n_prev) / max(n_prev, 1)) < REFIT_GROWTH_THRESHOLD):
            return model
    model = IsolationForest(n_estimators=100, contamination=0.05, max_samples="auto", random_state=42)
    model.fit(history)
    with _CACHE_LOCK:
        _MODEL_CACHE[user_id] = (model, now, n_hist)
    logger.info("iforest_refitted user=%s n=%d", user_id, n_hist)
    return model


def _iforest_score(model: IsolationForest, vec: np.ndarray) -> float:
    raw = float(model.score_samples(np.array([vec]))[0])
    return float(np.clip(raw, -0.7, 0.0) / -0.7)


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
    """Return (is_anomaly, score in [0, 1])."""
    alert_thr = settings.anomaly_alert_score_threshold

    try:
        vec = await _full_vector(request_meta)
    except Exception as e:
        logger.warning("full_vector_failed: %s", e)
        score = _rule_based_score(request_meta)
        return score >= alert_thr, score

    asyncio.ensure_future(_update_global_centroid(vec))
    await _store_vector(user_id, vec)

    history = await _load_history(user_id)
    if history is not None:
        try:
            score = _iforest_score(_get_or_train(user_id, history), vec)
            return score >= alert_thr, score
        except Exception as e:
            logger.warning("iforest_failed: %s", e)

    centroid = await _load_global_centroid()
    if centroid is not None:
        try:
            score = _cosine_distance(vec, centroid)
            return score >= alert_thr, score
        except Exception as e:
            logger.warning("centroid_score_failed: %s", e)

    score = _rule_based_score(request_meta)
    return score >= alert_thr, score