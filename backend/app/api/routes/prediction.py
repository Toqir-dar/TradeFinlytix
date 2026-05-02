"""
Prediction route: adaptive risk → rule engine placeholder (until saved models wired).

Requires `Authorization: Bearer` (any active account; deactivated users receive 403).

If historical snapshot aggregation fails (e.g. DB read error), aggregates fall back
to zero so the response still returns HTTP 200.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUser
from app.core.database import get_db
from app.ml_engine.rule_predict import predict_symbol_rules
from app.repositories.prediction_repo import PredictionRepository
from app.schemas.prediction_schema import (
    PredictionIntegrityVerifyRequest,
    PredictionIntegrityVerifyResponse,
    PredictionResponse,
)
from app.security.hmac_signing import sign_response_payload, verify_response_payload
from app.security.security_orchestrator import RiskAssessment, adaptive_security

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.get(
    "/{symbol}",
    response_model=PredictionResponse,
    summary="Rule-based stance + adaptive risk context",
)
async def predict_symbol(
    symbol: str,
    user: CurrentUser,
    assessment: RiskAssessment = Depends(adaptive_security),
    db=Depends(get_db),
) -> PredictionResponse:
    model_out = predict_symbol_rules(symbol)
    now = datetime.now(timezone.utc)
    subject = str(user["_id"])
    ten_min_ago = now.timestamp() - 600
    recent_count = 0
    high_count = 0
    try:
        recent_count = await db["risk_snapshots"].count_documents(
            {
                "subject": subject,
                "created_at": {
                    "$gte": datetime.fromtimestamp(ten_min_ago, tz=timezone.utc)
                },
            }
        )
        high_count = await db["risk_snapshots"].count_documents(
            {
                "subject": subject,
                "level": {"$in": ["HIGH", "CRITICAL"]},
            }
        )
    except Exception as e:
        logger.warning(
            "predict_snapshot_counts_failed subject=%s err=%s", subject, e, exc_info=False
        )

    dynamic_risk = min(
        100.0, assessment.score + (high_count * 2.0) + min(recent_count, 20) * 0.4
    )
    body = {
        "symbol": symbol.upper(),
        "user_id": str(user["_id"]),
        "predicted_at": now.isoformat(),
        "prediction": model_out,
        "risk": {
            "score": assessment.score,
            "level": assessment.level.name,
            "dynamic_score": round(dynamic_risk, 2),
            "recent_request_count_10m": recent_count,
            "historical_high_risk_events": high_count,
        },
    }
    response = PredictionResponse(
        **body,
        integrity={
            "algorithm": "HMAC-SHA256",
            "signature": sign_response_payload(body),
        },
    )
    try:
        await PredictionRepository(db).record_prediction(
            user_id=str(user["_id"]),
            symbol=symbol,
            response_payload=response.model_dump(),
        )
    except Exception as e:
        logger.warning("predict_record_persist_failed err=%s", e, exc_info=False)
    return response


@router.post(
    "/verify-integrity",
    response_model=PredictionIntegrityVerifyResponse,
    summary="Verify HMAC signature for prediction payload",
)
async def verify_prediction_integrity(
    payload: PredictionIntegrityVerifyRequest,
) -> PredictionIntegrityVerifyResponse:
    return PredictionIntegrityVerifyResponse(
        ok=verify_response_payload(payload.payload, payload.signature)
    )
