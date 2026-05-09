"""CISO dashboards — pagination + OpenAPI examples."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PaginatedJsonItems(BaseModel):
    items: list[dict[str, Any]]
    total: int
    skip: int
    limit: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "_id": "665c3c2e94c3c3c3c3c3c301",
                        "event_type": "login_success",
                        "user_id": "6688cafebabe000111222333",
                        "created_at": "2026-05-02T10:30:12+00:00",
                        "path": "/api/v1/auth/login",
                        "payload": {"role": "investor"},
                    }
                ],
                "total": 42,
                "skip": 0,
                "limit": 50,
            }
        }
    )


class RiskDayBucket(BaseModel):
    day: str
    count: int
    avg_score: float
    high_risk_count: int


class RiskTrendPage(BaseModel):
    items: list[RiskDayBucket]
    total: int
    skip: int
    limit: int


class AnomalyDailyStat(BaseModel):
    day: str
    count: int


class AnomalyStatsPage(BaseModel):
    items: list[AnomalyDailyStat]
    total: int
    skip: int
    limit: int


class SubjectRiskAgg(BaseModel):
    subject: str
    count: int
    avg_score: float
    high_count: int


class TopRiskyPage(BaseModel):
    items: list[SubjectRiskAgg]
    total: int = Field(description="Total subjects in the ranked pool (after scan cap).")
    skip: int
    limit: int

class AuditSearchRequest(BaseModel):
    question: str

class AuditSearchResponse(BaseModel):
    answer: str
    sources: list[dict[str, Any]]
