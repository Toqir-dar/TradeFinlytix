from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.ml_engine.rule_predict import predict_symbol_rules
from app.repositories.prediction_repo import PredictionRepository
from app.schemas.prediction_schema import PredictionResponse
from app.security.hmac_signing import sign_response_payload
from app.security.security_orchestrator import RiskAssessment

logger = logging.getLogger(__name__)


class PredictionService:
    def __init__(self, db) -> None:
        self.repo = PredictionRepository(db)

    async def predict_symbol(
        self,
        *,
        symbol: str,
        user: dict,
        assessment: RiskAssessment,
        recent_request_count_10m: int = 0,
        historical_high_risk_events: int = 0,
    ) -> PredictionResponse:
        model_out = predict_symbol_rules(symbol)
        now = datetime.now(timezone.utc)
        dynamic_score = min(
            100.0,
            assessment.score
            + (historical_high_risk_events * 2.0)
            + min(recent_request_count_10m, 20) * 0.4,
        )
        body = {
            "symbol": symbol,
            "user_id": str(user["_id"]),
            "predicted_at": now.isoformat(),
            "prediction": model_out,
            "risk": {
                "score": assessment.score,
                "level": assessment.level.name,
                "dynamic_score": round(dynamic_score, 2),
                "recent_request_count_10m": recent_request_count_10m,
                "historical_high_risk_events": historical_high_risk_events,
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
            await self.repo.record_prediction(
                user_id=str(user["_id"]),
                symbol=symbol,
                response_payload=response.model_dump(),
            )
        except Exception as exc:
            logger.warning("predict_record_persist_failed err=%s", exc, exc_info=False)

        return response

