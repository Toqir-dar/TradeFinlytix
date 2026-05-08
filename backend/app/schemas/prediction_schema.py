"""OpenAPI shapes for `/predict` — ensemble prediction + adaptive risk."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PredictionPayload(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    signal: str
    confidence: float
    model_version: str | None = None
    engine: str
    rationale: list[str]
    tier: str

    entry_price: float | None = Field(
        None,
        description="Suggested execution price for the trade signal.",
    )
    target_price: float | None = Field(
        None,
        description="Recommended target price for profit taking.",
    )
    stop_loss: float | None = Field(
        None,
        description="Recommended stop-loss price to limit downside.",
    )
    expected_gain_pct: float | None = Field(
        None,
        description="Expected gain or loss percentage for the signal.",
    )
    time_horizon_days: int | None = Field(
        None,
        description="Suggested holding horizon for the signal in days.",
    )


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
    prediction: PredictionPayload
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
                    "model_version": "stacked_ensemble_v1",
                    "engine": "ensemble_v1",
                    "rationale": [
                        "stacked_ensemble_prediction",
                        "confidence=0.510",
                        "base_learners_consensus",
                    ],
                    "tier": "core",
                    "entry_price": 122.45,
                    "target_price": 127.50,
                    "stop_loss": 118.00,
                    "expected_gain_pct": 4.1,
                    "time_horizon_days": 5,
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
