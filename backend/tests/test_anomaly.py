"""
Updated Test for anomaly_detection.py
- Faster (mock embeddings)
- Stable async handling
- Deterministic results
- Correctly patches _client via ad module namespace (not rate_limiter stub)
"""
from __future__ import annotations

import asyncio
import sys
import types
import numpy as np
from unittest.mock import MagicMock

# ── stub app.* imports BEFORE any app import ──────────────────────────────────

def _make_settings():
    s = MagicMock()
    s.anomaly_min_samples_ml = 5
    s.anomaly_max_features_kept = 500
    s.anomaly_alert_score_threshold = 0.5
    return s

for mod in ["app", "app.core", "app.core.config", "app.security", "app.security.rate_limiter"]:
    sys.modules.setdefault(mod, types.ModuleType(mod))

sys.modules["app.core.config"].settings = _make_settings()

# ── FakeRedis ─────────────────────────────────────────────────────────────────

class FakeRedis:
    def __init__(self):
        self._lists: dict = {}
        self._kv: dict = {}

    async def lrange(self, key, start, end):
        data = self._lists.get(key, [])
        return data[start: None if end == -1 else end + 1]

    async def get(self, key):
        return self._kv.get(key)

    async def set(self, key, value):
        self._kv[key] = value

    def pipeline(self):
        return FakePipeline(self)

    def clear(self):
        self._lists.clear()
        self._kv.clear()


class FakePipeline:
    def __init__(self, redis: FakeRedis):
        self._redis = redis
        self._ops: list = []

    def rpush(self, key, value):
        self._ops.append(("rpush", key, value))
        return self

    def ltrim(self, key, start, end):
        self._ops.append(("ltrim", key, start, end))
        return self

    def expire(self, key, ttl):
        return self

    def set(self, key, value):
        self._ops.append(("set", key, value))
        return self

    async def execute(self):
        for op in self._ops:
            if op[0] == "rpush":
                self._redis._lists.setdefault(op[1], []).append(op[2])
            elif op[0] == "ltrim":
                lst = self._redis._lists.get(op[1], [])
                start = op[2] if op[2] >= 0 else max(0, len(lst) + op[2])
                end   = op[3] if op[3] >= 0 else len(lst) + op[3] + 1
                self._redis._lists[op[1]] = lst[start:end]
            elif op[0] == "set":
                self._redis._kv[op[1]] = op[2]
        return [None] * len(self._ops)


_fake_redis = FakeRedis()

# stub rate_limiter so the name exists at module level
sys.modules["app.security.rate_limiter"]._client = lambda: _fake_redis

# ── import module under test ──────────────────────────────────────────────────
import app.security.anomaly_detection as ad

# ── THE FIX: patch _client in ad's own namespace after import ─────────────────
# `from app.security.rate_limiter import _client` copies the reference at
# import time, so patching the stub module afterward has zero effect.
# Overwriting ad._client directly is the only reliable fix.
ad._client = lambda: _fake_redis

# ── fast deterministic embeddings ─────────────────────────────────────────────
def fake_embed(text: str) -> np.ndarray:
    rng = np.random.default_rng(abs(hash(text)) % (2 ** 32))
    vec = rng.normal(size=ad.EMBED_DIM).astype(np.float32)
    vec /= (np.linalg.norm(vec) + 1e-9)
    return vec

ad._embed_sync = fake_embed

# ── helpers ───────────────────────────────────────────────────────────────────

async def _flush():
    """Let ensure_future tasks finish."""
    await asyncio.sleep(0.05)

def _normal_meta():
    return {
        "ip": "192.168.1.10",
        "path": "/api/predict",
        "payload_size": 512,
        "status_code": 200,
    }

def _suspicious_meta():
    return {
        "ip": "10.0.0.99",
        "path": "/api/admin",
        "payload_size": 200_000,
        "status_code": 401,
    }

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

def check(name: str, condition: bool, detail: str = "") -> bool:
    tag = PASS if condition else FAIL
    print(f"[{tag}] {name} {detail}")
    return condition

# ── original 3 tests (fixed) ──────────────────────────────────────────────────

async def test_cold_start_no_centroid():
    _fake_redis.clear()
    ad._MODEL_CACHE.clear()

    is_anom, score = await ad.detect_anomaly("u1", _normal_meta())
    await _flush()
    check("normal not flagged", not is_anom, f"(score={score:.3f})")

    is_anom2, score2 = await ad.detect_anomaly("u1", _suspicious_meta())
    await _flush()
    check(
        "suspicious detected",
        is_anom2 or score2 > 0.3,
        f"(score={score2:.3f})",
    )


async def test_centroid():
    _fake_redis.clear()
    ad._MODEL_CACHE.clear()

    for _ in range(10):
        await ad.detect_anomaly("user", _normal_meta())
        await _flush()  # flush per iteration so centroid updates accumulate

    centroid = await ad._load_global_centroid()
    check("centroid exists", centroid is not None)


async def test_iforest():
    _fake_redis.clear()
    ad._MODEL_CACHE.clear()

    for _ in range(10):
        await ad.detect_anomaly("user", _normal_meta())
        await _flush()

    _, s1 = await ad.detect_anomaly("user", _normal_meta())
    await _flush()
    _, s2 = await ad.detect_anomaly("user", _suspicious_meta())
    await _flush()

    check("suspicious higher", s2 >= s1, f"(normal={s1:.3f}, suspicious={s2:.3f})")

# ── additional tests ──────────────────────────────────────────────────────────

async def test_centroid_dim():
    """Centroid must have exactly TOTAL_DIM dimensions."""
    _fake_redis.clear()
    ad._MODEL_CACHE.clear()

    for _ in range(10):
        await ad.detect_anomaly("user_dim", _normal_meta())
        await _flush()

    centroid = await ad._load_global_centroid()
    check(
        "centroid dim correct",
        centroid is not None and centroid.shape == (ad.TOTAL_DIM,),
        f"(shape={centroid.shape if centroid is not None else 'None'})",
    )


async def test_store_and_reload_history():
    """Vectors persisted by _store_vector must round-trip via _load_history."""
    _fake_redis.clear()

    vec = np.ones(ad.TOTAL_DIM, dtype=np.float32) * 0.5
    for _ in range(5):  # >= anomaly_min_samples_ml
        await ad._store_vector("user_hist", vec)

    history = await ad._load_history("user_hist")
    check("history loaded", history is not None)
    if history is not None:
        check(
            "history row dim correct",
            history.shape[1] == ad.TOTAL_DIM,
            f"(shape={history.shape})",
        )


async def test_rule_based_payload():
    """Large payload alone should push rule-based score above 0.3."""
    score = ad._rule_based_score({"payload_size": 200_000, "status_code": 200})
    check("large payload raises score", score >= 0.3, f"(score={score:.3f})")


async def test_rule_based_401():
    """401 status alone should contribute to rule-based score."""
    score = ad._rule_based_score({"payload_size": 100, "status_code": 401})
    check("401 raises score", score >= 0.3, f"(score={score:.3f})")


async def test_cosine_distance_identical():
    """Cosine distance of a vector with itself should be ~0."""
    vec = fake_embed("test")
    full = np.concatenate([np.zeros(6, dtype=np.float32), vec])
    dist = ad._cosine_distance(full, full)
    check("cosine dist identical vectors ~0", dist < 0.01, f"(dist={dist:.4f})")


async def test_cosine_distance_opposite():
    """Cosine distance of opposite vectors should be ~1."""
    vec = fake_embed("test")
    full = np.concatenate([np.zeros(6, dtype=np.float32), vec])
    dist = ad._cosine_distance(full, -full)
    check("cosine dist opposite vectors ~1", dist > 0.9, f"(dist={dist:.4f})")


async def test_featurize_shape():
    """featurize() must return exactly 6 floats."""
    feats = ad.featurize(_normal_meta())
    check("featurize returns 6 features", len(feats) == 6, f"(len={len(feats)})")


async def test_model_cache_reuse():
    """Calling detect_anomaly twice with same user should reuse cached model."""
    _fake_redis.clear()
    ad._MODEL_CACHE.clear()

    for _ in range(10):
        await ad.detect_anomaly("user_cache", _normal_meta())
        await _flush()

    await ad.detect_anomaly("user_cache", _normal_meta())
    await _flush()
    first_entry = ad._MODEL_CACHE.get("user_cache")

    await ad.detect_anomaly("user_cache", _normal_meta())
    await _flush()
    second_entry = ad._MODEL_CACHE.get("user_cache")

    check(
        "model cache reused (same fitted_at)",
        first_entry is not None
        and second_entry is not None
        and first_entry[1] == second_entry[1],  # fitted_at timestamp identical
    )


# ── runner ────────────────────────────────────────────────────────────────────

async def main():
    print("\n── anomaly_detection tests ──\n")

    print("--- original tests ---")
    await test_cold_start_no_centroid()
    await test_centroid()
    await test_iforest()

    print("\n--- additional tests ---")
    await test_centroid_dim()
    await test_store_and_reload_history()
    await test_rule_based_payload()
    await test_rule_based_401()
    await test_cosine_distance_identical()
    await test_cosine_distance_opposite()
    await test_featurize_shape()
    await test_model_cache_reuse()

    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())