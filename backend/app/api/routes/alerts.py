"""Alerts API: get user alerts, mark as read."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import CurrentUser, require_permission
from app.core.database import get_db
from app.schemas.alert_schema import AlertResponse, AlertSeverity
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertResponse])
async def get_alerts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    severity: AlertSeverity | None = Query(None),
    current_user: dict = Depends(require_permission("alerts:read")),
    db=Depends(get_db),
) -> list[AlertResponse]:
    service = AlertService(db)
    return await service.get_user_alerts(
        str(current_user["_id"]),
        limit,
        offset,
        severity=severity,
    )


@router.patch("/{alert_id}/read", response_model=dict)
async def mark_alert_read(
    alert_id: str,
    current_user: dict = Depends(require_permission("alerts:write")),
    db=Depends(get_db),
) -> dict:
    service = AlertService(db)
    success = await service.mark_as_read(alert_id, str(current_user["_id"]))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or not owned by user.",
        )
    return {"message": "Alert marked as read."}


@router.patch("/read-all", response_model=dict)
async def mark_all_read(
    current_user: dict = Depends(require_permission("alerts:write")),
    db=Depends(get_db),
) -> dict:
    service = AlertService(db)
    count = await service.mark_all_as_read(str(current_user["_id"]))
    return {"updated_count": count, "message": "All alerts marked as read."}


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: dict = Depends(require_permission("alerts:read")),
    db=Depends(get_db),
) -> dict:
    service = AlertService(db)
    count = await service.get_unread_count(str(current_user["_id"]))
    return {"unread_count": count}

