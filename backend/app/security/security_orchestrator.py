"""
Risk engine + dynamic security: score requests and apply layers by risk level.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from enum import IntEnum
from typing import Any

from fastapi import HTTPException, Request, status
from redis.asyncio import Redis

from app.core.config import settings
from app.core.database import get_db
from app.repositories.audit_repo import record_event
from app.repositories.risk_history_repo import persist_risk_from_request_best_effort
from app.security.anomaly_detection import detect_anomaly
from app.security.rate_limiter import _client
from app.security.zscore_detection import request_rate_zscore
from app.utils.helpers import get_client_ip

logger = logging.getLogger(__name__)


class RiskLevel(IntEnum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class RiskAssessment:
    score: float
    level: RiskLevel
    factors: dict[str, float]


def _risk_level_floor_thresholds() -> list[tuple[RiskLevel, int]]:
    s = settings
    return [
        (RiskLevel.LOW, 0),
        (RiskLevel.MEDIUM, s.risk_score_medium_threshold),
        (RiskLevel.HIGH, s.risk_score_high_threshold),
        (RiskLevel.CRITICAL, s.risk_score_critical_threshold),
    ]


def _risk_level_rate_limits(level: RiskLevel) -> tuple[int, int]:
    s = settings
    window = s.rate_limit_window_seconds
    if level == RiskLevel.LOW:
        return s.rate_limit_requests, window
    if level == RiskLevel.MEDIUM:
        return max(s.rate_limit_requests // 2, 20), window
    if level == RiskLevel.HIGH:
        return 10, window
    return 0, window


def _bucket_score(score: float) -> RiskLevel:
    level = RiskLevel.LOW
    for lvl, threshold in _risk_level_floor_thresholds():
        if score >= threshold:
            level = lvl
    return level


async def compute_risk(
    request: Request, user: dict[str, Any] | None
) -> RiskAssessment:
    factors: dict[str, float] = {}
    ip = get_client_ip(request)
    user_id = (
        str(user["_id"])
        if user
        else f"anon:{ip}"
    )

    failed = (user or {}).get("failed_login_attempts", 0)
    factors["failed_logins"] = min(failed * 5.0, 25.0)

    path = request.url.path
    sensitive = any(s in path for s in ("/admin", "/audit", "/predict", "/auth"))
    factors["sensitive_path"] = 10.0 if sensitive else 0.0
    factors["anon_sensitive"] = 15.0 if (sensitive and user is None) else 0.0

    try:
        z, is_zspike = await request_rate_zscore(user_id)
        factors["zscore_rate"] = 15.0 if is_zspike else min(abs(z) * 3, 10.0)
    except Exception as e:
        logger.warning("zscore_rate_failed: %s", e)
        factors["zscore_rate"] = 0.0

    if user is not None:
        meta = {
            "ip": ip,
            "path": path,
            "payload_size": int(request.headers.get("content-length", 0) or 0),
            "status_code": 200,
        }
        try:
            _is_anom, anom_score = await detect_anomaly(user_id, meta)
            factors["anomaly_score"] = anom_score * 20.0
        except Exception as e:
            logger.warning("detect_anomaly_failed: %s", e)
            factors["anomaly_score"] = 0.0
    else:
        factors["anomaly_score"] = 0.0

    score = float(min(sum(factors.values()), 100.0))
    return RiskAssessment(score=score, level=_bucket_score(score), factors=factors)


async def _enforce_rate_limit(client: Redis, key: str, level: RiskLevel) -> None:
    limit, window = _risk_level_rate_limits(level)
    if limit <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request blocked by adaptive security policy.",
        )
    now_ms = int(time.time() * 1000)
    cutoff = now_ms - window * 1000
    pipe = client.pipeline()
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zadd(key, {f"{now_ms}:{id(key)}": now_ms})
    pipe.zcard(key)
    pipe.expire(key, window + 1)
    _, _, count, _ = await pipe.execute()
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit ({limit}/{window}s) exceeded "
                f"at risk level {level.name}."
            ),
        )


async def apply_security_layers(
    request: Request, assessment: RiskAssessment, user: dict | None
) -> None:
    client = _client()
    actor = str(user["_id"]) if user else get_client_ip(request)
    rl_key = f"adaptive_rl:{assessment.level.name}:{actor}"

    log_extra = {
        "risk_score": assessment.score,
        "risk_level": assessment.level.name,
        "factors": assessment.factors,
        "path": request.url.path,
        "actor": actor,
    }

    if assessment.level == RiskLevel.CRITICAL:
        logger.error(
            "security_block_critical",
            extra={
                "event": "risk_block",
                **log_extra,
            },
        )
        try:
            db = await get_db()
            await record_event(
                db,
                "critical_block",
                user_id=str(user["_id"]) if user else None,
                ip=get_client_ip(request),
                path=request.url.path,
                payload={
                    "score": assessment.score,
                    "factors": assessment.factors,
                },
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request blocked: critical risk detected.",
        )

    if assessment.level >= RiskLevel.MEDIUM:
        await _enforce_rate_limit(client, rl_key, assessment.level)
        logger.info("security_layer_medium", extra=log_extra)

    if assessment.level >= RiskLevel.HIGH:
        request.state.high_risk = True
        logger.warning("security_layer_high", extra=log_extra)


async def adaptive_security(request: Request) -> RiskAssessment:
    """
    FastAPI dependency: compute risk and apply dynamic layers.
    """
    user = getattr(request.state, "user", None)
    assessment = await compute_risk(request, user)
    request.state.risk = assessment
    await apply_security_layers(request, assessment, user)
    ip = get_client_ip(request)
    subj = str(user["_id"]) if user else f"anon:{ip}"
    await persist_risk_from_request_best_effort(
        request_path=request.url.path,
        subject=subj,
        score=assessment.score,
        level_name=assessment.level.name,
        factors=dict(assessment.factors),
        client_ip=ip,
    )
    return assessment
