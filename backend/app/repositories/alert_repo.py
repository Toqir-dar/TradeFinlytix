"""Alert repository — MongoDB operations for user alerts."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.alert_schema import AlertCreate, AlertResponse, AlertSeverity, AlertType

logger = logging.getLogger(__name__)


class AlertRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.alerts = db["alerts"]

    async def create_alert(self, alert: AlertCreate) -> dict[str, Any]:
        doc = {
            "user_id": ObjectId(alert.user_id),
            "type": alert.type.value,
            "severity": alert.severity.value,
            "message": alert.message,
            "metadata": alert.metadata,
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        result = await self.alerts.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    async def get_user_alerts(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        severity: AlertSeverity | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {"user_id": ObjectId(user_id)}
        if severity is not None:
            query["severity"] = severity.value
        cursor = self.alerts.find(query).sort("created_at", -1).skip(offset).limit(limit)
        return await cursor.to_list(length=None)

    async def mark_as_read(self, alert_id: str, user_id: str) -> bool:
        result = await self.alerts.update_one(
            {"_id": ObjectId(alert_id), "user_id": ObjectId(user_id)},
            {"$set": {"is_read": True}}
        )
        return result.modified_count > 0

    async def get_unread_count(self, user_id: str) -> int:
        return await self.alerts.count_documents(
            {"user_id": ObjectId(user_id), "is_read": False}
        )

    async def mark_all_as_read(self, user_id: str) -> int:
        result = await self.alerts.update_many(
            {"user_id": ObjectId(user_id), "is_read": False},
            {"$set": {"is_read": True}},
        )
        return int(result.modified_count)

