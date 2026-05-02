"""OpenAPI shapes for `/predict` — deterministic rule stub + adaptive risk."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RulePrediction(BaseModel):
    signal: str
    confidence: float
    engine: str
    rationale: list[str]
    tier: str


class AdaptiveRiskSlice(BaseModel):
    score: float
    level: str
    dynamic_score: float
    recent_request_count_10m: int = Field(
        ...,
        description="Risk snapshots tied to this user in the last 10 minutes.",
    )
    historical_high_risk_events: int = Field(
        ...,
        description="Lifetime count of HIGH/CRITICAL risk snapshots for this user.",
    )


class IntegritySignature(BaseModel):
    algorithm: str = "HMAC-SHA256"
    signature: str


class PredictionResponse(BaseModel):
    symbol: str
    user_id: str
    predicted_at: str
    prediction: RulePrediction
    risk: AdaptiveRiskSlice
    integrity: IntegritySignature

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "symbol": "OGDC",
                "user_id": "674a1beebabe0123456789ab",
                "predicted_at": "2026-05-02T14:22:03+00:00",
                "prediction": {
                    "signal": "hold",
                    "confidence": 0.51,
                    "engine": "rule_v1",
                    "rationale": [
                        "checksum_mod=0.47",
                        "rule_engine_v1_symbol_char_heuristic",
                    ],
                    "tier": "core",
                },
                "risk": {
                    "score": 42.5,
                    "level": "MEDIUM",
                    "dynamic_score": 52.8,
                    "recent_request_count_10m": 3,
                    "historical_high_risk_events": 1,
                },
                "integrity": {
                    "algorithm": "HMAC-SHA256",
                    "signature": "f7a9d1...verify_with_shared_secret",
                },
            }
        }
    )


class PredictionIntegrityVerifyRequest(BaseModel):
    payload: dict
    signature: str


class PredictionIntegrityVerifyResponse(BaseModel):
    ok: bool
