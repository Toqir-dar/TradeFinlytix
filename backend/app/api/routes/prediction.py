"""
Prediction route: adaptive risk + ensemble model output.

Requires `Authorization: Bearer` (any active account; deactivated users receive 403).

If historical snapshot aggregation fails (e.g. DB read error), aggregates fall back
to zero so the response still returns HTTP 200.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Path
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.ml_engine.data.market_data import build_live_feature_payload
from app.schemas.alert_schema import AlertCreate, AlertSeverity, AlertType
from app.schemas.prediction_schema import (
    PredictionIntegrityVerifyRequest,
    PredictionIntegrityVerifyResponse,
    PredictionResponse,
)
from app.security.hmac_signing import verify_response_payload
from app.security.security_orchestrator import RiskAssessment, adaptive_security
from app.services.alert_service import AlertService
from app.services.prediction_service import PredictionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.get(
    "/{symbol}",
    response_model=PredictionResponse,
    summary="Ensemble stance + adaptive risk context",
    include_in_schema=True,
)
async def predict_symbol(
    user: dict = Depends(require_permission("predict:read")),
    symbol: str = Path(
        ...,
        min_length=1,
        max_length=32,
        description="Stock symbol to predict.",
    ),
    assessment: RiskAssessment = Depends(adaptive_security),
    db=Depends(get_db),
    _current: dict = Depends(require_permission("predict:read")),
) -> PredictionResponse:
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=422, detail="Symbol must be non-empty.")
    if not re.fullmatch(r"^[A-Z0-9._-]+$", symbol):
        raise HTTPException(
            status_code=422,
            detail="Symbol may only contain letters, digits, dot, underscore, or hyphen.",
        )

    subject = str(user["_id"])
    now = datetime.now(timezone.utc)
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

    service = PredictionService(db)
    try:
        symbol_data, history = await run_in_threadpool(
            build_live_feature_payload,
            symbol,
        )
    except Exception as exc:
        logger.warning(
            "predict_market_data_failed symbol=%s err=%s",
            symbol,
            exc,
            exc_info=False,
        )
        raise HTTPException(
            status_code=502,
            detail="Market data unavailable for requested symbol.",
        )

    response = await service.predict_symbol(
        symbol=symbol,
        user=user,
        assessment=assessment,
        recent_request_count_10m=recent_count,
        historical_high_risk_events=high_count,
        symbol_data=symbol_data,
        history=history,
    )

    if response.risk.level in ["HIGH", "CRITICAL"]:
        alert_service = AlertService(db)
        severity = AlertSeverity.HIGH if response.risk.level == "HIGH" else AlertSeverity.CRITICAL
        await alert_service.create_alert(
            AlertCreate(
                type=AlertType.PREDICTION,
                severity=severity,
                message=f"High risk prediction for {symbol}: {response.prediction.signal} with {response.risk.level} risk level.",
                user_id=str(user["_id"]),
                metadata={"symbol": symbol, "signal": response.prediction.signal, "risk_level": response.risk.level},
            )
        )

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
