"""CISO oversight: audit trail, anomaly store, critical risk summaries.

Pagination: always use ``skip`` + ``limit`` (bounded) to reduce abuse cost.

Auth: Bearer JWT — role **ciso** required for all routes in this module.

Paths are mounted under ``/api/v1`` (see ``app.main``), e.g. ``GET /api/v1/ciso/risk/trend``.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.repositories.audit_chain_state import set_audit_chain_trusted
from app.schemas.admin_schema import ChainVerifyResponse
from app.schemas.ciso_schema import (
    AnomalyStatsPage,
    AuditSearchRequest,
    AuditSearchResponse,
    PaginatedJsonItems,
    RiskTrendPage,
    TopRiskyPage,
)

from app.security.security_alerts import emit_security_alert
from app.services.ciso_service import CISOService

from app.rag.rag_service import answer_query

router = APIRouter(
    prefix="/ciso",
    tags=["CISO"],
    responses={
        401: {"description": "Missing/invalid bearer token"},
        403: {"description": "Role **ciso** required"},
    },
)


def _svc(db) -> CISOService:
    return CISOService(db)


@router.get("/audit", response_model=PaginatedJsonItems)
async def list_audit(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    event_type: str | None = None,
    user_id: str | None = Query(
        None, description="Audit ``user_id`` field (string ObjectId hex)."
    ),
    since: datetime | None = None,
    skip: int = Query(0, ge=0, le=5000),
    limit: int = Query(100, ge=1, le=500),
):
    return await _svc(db).list_audit_events(
        event_type=event_type,
        user_id=user_id,
        since=since,
        skip=skip,
        limit=limit,
    )


@router.get("/audit/logs", response_model=PaginatedJsonItems)
async def list_audit_logs(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    event_type: str | None = None,
    user_id: str | None = None,
    since: datetime | None = None,
    skip: int = Query(0, ge=0, le=5000),
    limit: int = Query(100, ge=1, le=500),
):
    """Alias of ``GET /ciso/audit`` (panel-friendly naming)."""
    return await _svc(db).list_audit_events(
        event_type=event_type,
        user_id=user_id,
        since=since,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/audit/verify",
    response_model=ChainVerifyResponse,
    summary="Verify tamper-evident audit hash chain",
)
async def verify_audit_chain(
    _: dict = Depends(require_permission("audit:write")),
    db=Depends(get_db),
    limit: int = Query(
        2000,
        ge=10,
        le=100_000,
        description="Maximum audit documents to walk (oldest-first).",
    ),
):
    result = await _svc(db).verify_chain(limit=limit)
    if result["ok"]:
        set_audit_chain_trusted(True)
    else:
        set_audit_chain_trusted(False)
        await emit_security_alert(
            "audit_chain_verify_failed",
            {
                "checked": result.get("checked"),
                "broken_at": result.get("broken_at"),
                "expected_prev": result.get("expected_prev"),
                "stored_prev": result.get("stored_prev"),
            },
        )
    return ChainVerifyResponse(
        ok=result["ok"],
        checked=result["checked"],
        broken_at=result.get("broken_at"),
        expected_prev=result.get("expected_prev"),
        stored_prev=result.get("stored_prev"),
        expected_hash=result.get("expected_hash"),
    )


@router.get("/anomalies", response_model=PaginatedJsonItems)
async def list_anomalies_stored(
    _: dict = Depends(require_permission("anomaly:read")),
    db=Depends(get_db),
    skip: int = Query(0, ge=0, le=5000),
    limit: int = Query(50, ge=1, le=500),
):
    return await _svc(db).list_anomalies(skip=skip, limit=limit)


@router.get("/anomalies/stats", response_model=AnomalyStatsPage)
async def anomaly_stats_view(
    _: dict = Depends(require_permission("anomaly:read")),
    db=Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    skip: int = Query(0, ge=0, le=366),
    limit: int = Query(31, ge=1, le=366),
):
    return await _svc(db).anomaly_frequency_stats(days=days, skip=skip, limit=limit)


@router.get("/risk/snapshots", response_model=PaginatedJsonItems)
async def risk_snapshot_history_view(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    subject: str | None = Query(
        None,
        description="Exact subject key (Mongo user ObjectId hex or anon:<ip>)",
    ),
    skip: int = Query(0, ge=0, le=5000),
    limit: int = Query(50, ge=1, le=500),
):
    return await _svc(db).list_risk_snapshots(
        subject=subject, skip=skip, limit=limit
    )


@router.get("/risk/trend", response_model=RiskTrendPage)
async def risk_trend_view(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    user_id: str | None = Query(
        None, description="Mongo user ObjectId hex to scope trend to one user."
    ),
    days: int = Query(7, ge=1, le=90),
    skip: int = Query(
        0,
        ge=0,
        le=366,
        description="Skip this many daily buckets after aggregation.",
    ),
    limit: int = Query(31, ge=1, le=366),
):
    return await _svc(db).risk_trend(
        user_id=user_id,
        days=days,
        bucket_skip=skip,
        bucket_limit=limit,
    )


@router.get("/risk/top", response_model=TopRiskyPage)
async def top_risk_subjects_view(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    skip: int = Query(0, ge=0, le=500),
    limit: int = Query(10, ge=1, le=100),
):
    return await _svc(db).top_risky_subjects(skip=skip, limit=limit)


@router.get("/risk/recent", response_model=PaginatedJsonItems)
async def recent_risk_events_view(
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
    skip: int = Query(0, ge=0, le=5000),
    limit: int = Query(50, ge=1, le=500),
):
    return await _svc(db).recent_risk_events(skip=skip, limit=limit)

@router.post("/audit/search", response_model=AuditSearchResponse)
async def semantic_audit_search(
    payload: AuditSearchRequest,
    _: dict = Depends(require_permission("audit:read")),
    db=Depends(get_db),
):
    return await answer_query(db, payload.question)

