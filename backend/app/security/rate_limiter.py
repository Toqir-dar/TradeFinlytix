"""
Redis-backed sliding-window rate limiter for FastAPI dependencies.
"""
from __future__ import annotations

import time
from typing import Final

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis

from app.core.config import settings

_KEY_PREFIX: Final[str] = "rate_limit"
_redis_client: Redis | None = None


def _client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def rate_limit(request: Request) -> None:
    """
    Sliding window limiter using sorted sets.
    Intended as FastAPI dependency: Depends(rate_limit)
    """
    client = _client()
    now_ms = int(time.time() * 1000)
    window_ms = settings.rate_limit_window_seconds * 1000
    cutoff_ms = now_ms - window_ms
    ip = request.client.host if request.client else "unknown"
    key = f"{_KEY_PREFIX}:{ip}"
    member = f"{now_ms}:{id(request)}"

    pipe = client.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff_ms)
    pipe.zadd(key, {member: now_ms})
    pipe.zcard(key)
    pipe.expire(key, settings.rate_limit_window_seconds + 1)
    _, _, count, _ = await pipe.execute()

    if count > settings.rate_limit_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please retry shortly.",
        )


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None

