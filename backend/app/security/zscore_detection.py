"""
Z-score anomaly detection over rolling time-series (Redis-backed).
"""
from __future__ import annotations

import time
from statistics import mean, pstdev

from redis.asyncio import Redis

from app.core.config import settings
from app.security.rate_limiter import _client


def zscore(values: list[float], x: float) -> float:
    if len(values) < 5:
        return 0.0
    mu = mean(values)
    sigma = pstdev(values) or 1e-9
    return (x - mu) / sigma


async def record_and_score(key: str, value: float) -> tuple[float, bool]:
    """
    Append value to a rolling window in Redis; return (z, is_anomaly).
    """
    client: Redis = _client()
    pipe = client.pipeline()
    pipe.rpush(key, value)
    pipe.ltrim(key, -settings.zscore_window_samples, -1)
    pipe.lrange(key, 0, -1)
    pipe.expire(key, 3600)
    _, _, raw, _ = await pipe.execute()

    history = [float(v) for v in raw[:-1]]
    z = zscore(history, value)
    return z, abs(z) >= settings.zscore_threshold


async def request_rate_zscore(user_id: str) -> tuple[float, bool]:
    """
    When a new minute bucket starts, score the *previous* minute's request count
    against historical minute totals (z-score + spike flag).
    """
    now_bucket = int(time.time() // 60)
    prev_bucket = now_bucket - 1
    counter_key = f"zscore:reqcount:{user_id}:{now_bucket}"
    prev_key = f"zscore:reqcount:{user_id}:{prev_bucket}"
    series_key = f"zscore:reqseries:{user_id}"

    client: Redis = _client()
    count = await client.incr(counter_key)
    await client.expire(counter_key, 300)

    if count == 1:
        prev_raw = await client.get(prev_key)
        if prev_raw is not None:
            return await record_and_score(series_key, float(prev_raw))
    return 0.0, False
