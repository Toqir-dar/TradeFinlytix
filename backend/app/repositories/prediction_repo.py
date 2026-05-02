"""Encrypted persistence for prediction responses."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decrypt_field, encrypt_field


class PredictionRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["predictions"]

    async def record_prediction(
        self,
        *,
        user_id: str,
        symbol: str,
        response_payload: dict[str, Any],
    ) -> None:
        doc = {
            "created_at": datetime.now(timezone.utc),
            "user_id": user_id,
            "symbol": symbol.upper(),
            "payload_encrypted": encrypt_field(json.dumps(response_payload, default=str)),
        }
        await self.collection.insert_one(doc)

    async def list_user_predictions(
        self, *, user_id: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        cursor = (
            self.collection.find({"user_id": user_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        out: list[dict[str, Any]] = []
        async for doc in cursor:
            row = dict(doc)
            row["_id"] = str(row["_id"])
            if row.get("payload_encrypted"):
                row["payload"] = decrypt_field(row["payload_encrypted"])
            out.append(row)
        return out
