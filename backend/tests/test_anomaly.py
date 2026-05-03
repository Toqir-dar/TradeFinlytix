"""
Test for anomaly_detection.py (sentence-transformers edition).
Mocks: Redis, settings only. Embedding is real (local model, no API).
Run: python test_anomaly.py
"""
from __future__ import annotations

import asyncio
import sys
import types
import numpy as np
from unittest.mock import MagicMock

# --- stub app.* imports ---

def _make_settings():
    s = MagicMock()
    s.anomaly_min_samples_ml = 5
    s.anomaly_max_features_kept = 500
    s.anomaly_alert_score_threshold = 0.5
    return s

for mod in ["app", "app.core", "app.core.config", "app.security", "app.security.rate_limiter"]:
    sys.modules.setdefault(mod, types.ModuleType(mod))

sys.modules["app.core.config"].settings = _make_settings()

# --- in-memory Redis mock ---

class FakeRedis:
    def __init__(self):
        self._lists: dict[str, list[str]] = {}
        self._kv: dict[str, str] = {}

    async def lrange(self, key, start, end):
        data = self._lists.get(key, [])
        return data[start: None if end == -1 else end + 1]

    async def get(self, key):
        return self._kv.get(key)

    async def set(self, key, value):
        self._kv[key] = value

    def pipeline(self):
        return FakePipeline(self)


class FakePipeline:
    def __init__(self, redis: FakeRedis):
        self._redis = redis
        self._ops: list = []

    def rpush(self, key, value):
        self._ops.append(("rpush", key, value)); return self

    def ltrim(self, key, start, end):
        self._ops.append(("ltrim", key, start, end)); return self

    def expire(self, key, ttl):
        return self

    def set(self, key, value):
        self._ops.append(("set", key, value)); return self

    async def execute(self):
        for op in self._ops:
            if op[0] == "rpush":
                self._redis._lists.setdefault(op[1], []).append(op[2])
            elif op[0] == "ltrim":
                lst = self._redis._lists.get(op[1], [])
                start = op[2] if op[2] >= 0 else max(0, len(lst) + op[2])
                end = op[3] if op[3] >= 0 else len(lst) + op[3] + 1
                self._redis._lists[op[1]] = lst[start:end]
            elif op[0] == "set":
                self._redis._kv[op[1]] = op[2]
        return [None] * len(self._ops)


_fake_redis = FakeRedis()
sys.modules["app.security.rate_limiter"]._client = lambda: _fake_redis

# --- import module under test ---
from app.security import anomaly_detection as ad

# --- helpers ---

def _normal_meta() -> dict:
    return {"ip": "192.168.1.10", "path": "/api/predict", "payload_size": 512, "status_code": 200}

def _suspicious_meta() -> dict:
    return {"ip": "10.0.0.99", "path": "/api/admin", "payload_size": 200_000, "status_code": 401}

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

def check(name: str, condition: bool, detail: str = ""):
    tag = PASS if condition else FAIL
    suffix = f"  ({detail})" if detail else ""
    print(f"  [{tag}] {name}{suffix}")
    return condition

# --- tests ---

async def test_cold_start_no_centroid():
    print("\n[TEST] Cold start — no history, no centroid")
    _fake_redis._lists.clear()
    _fake_redis._kv.clear()

    is_anom, score = await ad.detect_anomaly("user_new", _normal_meta())
    check("score in [0,1]", 0.0 <= score <= 1.0, f"score={score:.4f}")
    check("normal not flagged", not is_anom)

    is_anom2, score2 = await ad.detect_anomaly("user_new", _suspicious_meta())
    check("suspicious flagged by rules", is_anom2 or score2 > 0.3, f"score={score2:.4f}")


async def test_cold_start_with_centroid():
    print("\n[TEST] Cold start — centroid available from other users")
    _fake_redis._lists.clear()
    _fake_redis._kv.clear()

    for i in range(10):
        await ad.detect_anomaly(f"other_user_{i}", _normal_meta())

    pending = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)

    centroid = await ad._load_global_centroid()
    check("centroid built", centroid is not None, f"n={_fake_redis._kv.get(ad.CENTROID_N_KEY)}")

    is_anom, score = await ad.detect_anomaly("brand_new_user", _normal_meta())
    check("score in [0,1]", 0.0 <= score <= 1.0, f"score={score:.4f}")
    check("normal not flagged", not is_anom, f"score={score:.4f}")


async def test_embed_dim():
    print("\n[TEST] Embedding dimension")
    vec = await ad._embed_text("login failed path=/api/token status=401")
    check("embed dim = 384", vec.shape[0] == ad.EMBED_DIM, f"got {vec.shape[0]}")
    check("normalised (unit norm)", abs(float(np.linalg.norm(vec)) - 1.0) < 0.01,
          f"norm={np.linalg.norm(vec):.4f}")


async def test_full_vector_dim():
    print("\n[TEST] Full vector dimension (390)")
    vec = await ad._full_vector(_normal_meta())
    check("total dim = 390", vec.shape[0] == ad.TOTAL_DIM, f"got {vec.shape[0]}")


async def test_iforest_after_warmup():
    print("\n[TEST] IsolationForest after warmup")
    _fake_redis._lists.clear()
    _fake_redis._kv.clear()
    ad._MODEL_CACHE.clear()

    user = "user_warmed"
    min_s = sys.modules["app.core.config"].settings.anomaly_min_samples_ml

    for _ in range(min_s + 2):
        await ad.detect_anomaly(user, _normal_meta())

    history = await ad._load_history(user)
    check("history loaded", history is not None, f"n={len(history) if history is not None else 0}")

    _, score_n = await ad.detect_anomaly(user, _normal_meta())
    _, score_s = await ad.detect_anomaly(user, _suspicious_meta())
    check("normal score in [0,1]", 0.0 <= score_n <= 1.0, f"{score_n:.4f}")
    check("suspicious score in [0,1]", 0.0 <= score_s <= 1.0, f"{score_s:.4f}")
    check("suspicious >= normal", score_s >= score_n, f"sus={score_s:.4f} norm={score_n:.4f}")


async def test_score_mapping():
    print("\n[TEST] Score mapping bounds")
    class FakeModel:
        def __init__(self, raw): self._raw = raw
        def score_samples(self, X): return np.array([self._raw])

    for raw in [-1.0, -0.7, -0.5, -0.35, -0.1, 0.0, 0.1]:
        score = ad._iforest_score(FakeModel(raw), np.zeros(390))
        check(f"raw={raw:+.2f} → {score:.4f} in [0,1]", 0.0 <= score <= 1.0)


async def test_cosine_distance():
    print("\n[TEST] Cosine distance edge cases")
    a = np.ones(390, dtype=np.float32)
    check("identical → 0.0", ad._cosine_distance(a, a) < 0.001)
    check("opposite → 1.0", ad._cosine_distance(a, -a) > 0.999)
    check("zero → 0.5", ad._cosine_distance(np.zeros(390), a) == 0.5)


async def test_model_cache():
    print("\n[TEST] Model cache")
    ad._MODEL_CACHE.clear()
    history = np.random.randn(20, 390).astype(np.float32)
    m1 = ad._get_or_train("u", history)
    m2 = ad._get_or_train("u", history)
    check("same model within TTL", m1 is m2)
    ad._MODEL_CACHE["u"] = (m1, 0.0, 20)
    m3 = ad._get_or_train("u", np.random.randn(30, 390).astype(np.float32))
    check("refit after TTL expiry", m3 is not m1)


async def test_welford_centroid():
    print("\n[TEST] Welford centroid convergence")
    _fake_redis._kv.clear()
    target = np.ones(390, dtype=np.float32) * 0.5
    for _ in range(20):
        await ad._update_global_centroid(target)
    centroid = await ad._load_global_centroid()
    if centroid is not None:
        diff = float(np.abs(centroid - target).max())
        check("centroid ≈ mean", diff < 0.01, f"max_diff={diff:.6f}")
    else:
        check("centroid loaded", False, "returned None")


async def main():
    print("=" * 55)
    print("  anomaly_detection.py — sentence-transformers")
    print("=" * 55)
    await test_embed_dim()
    await test_full_vector_dim()
    await test_cold_start_no_centroid()
    await test_cold_start_with_centroid()
    await test_iforest_after_warmup()
    await test_score_mapping()
    await test_cosine_distance()
    await test_model_cache()
    await test_welford_centroid()
    print("\n" + "=" * 55)
    print("  Done.")
    print("=" * 55)

if __name__ == "__main__":
    asyncio.run(main())
