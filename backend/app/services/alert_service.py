"""Alert service: create, retrieve, and manage user alerts."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.alert_repo import AlertRepository
from app.schemas.alert_schema import AlertCreate, AlertResponse, AlertSeverity, AlertType

logger = logging.getLogger(__name__)


class AlertService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.repo = AlertRepository(db)

    async def create_alert(self, alert: AlertCreate) -> AlertResponse:
        # Deduplication for security alerts: skip if same type+message within 60 seconds
        if alert.type == AlertType.SECURITY:
            recent = await self.repo.alerts.find_one(
                {
                    "user_id": ObjectId(alert.user_id),
                    "type": alert.type.value,
                    "message": alert.message,
                    "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(seconds=60)},
                }
            )
            if recent:
                # Return existing alert instead of creating duplicate
                return AlertResponse.from_doc(recent)

        doc = await self.repo.create_alert(alert)
        return AlertResponse.from_doc(doc)

    async def get_user_alerts(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        severity: AlertSeverity | None = None,
    ) -> list[AlertResponse]:
        docs = await self.repo.get_user_alerts(user_id, limit, offset, severity)
        return [AlertResponse.from_doc(doc) for doc in docs]

    async def mark_as_read(self, alert_id: str, user_id: str) -> bool:
        return await self.repo.mark_as_read(alert_id, user_id)

    async def mark_all_as_read(self, user_id: str) -> int:
        return await self.repo.mark_all_as_read(user_id)

    async def get_unread_count(self, user_id: str) -> int:
        return await self.repo.get_unread_count(user_id)

