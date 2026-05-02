"""Encrypted trade/transaction storage primitives."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decrypt_field, encrypt_field


class TradeRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["transactions"]

    async def record_trade(
        self,
        *,
        user_id: str,
        trade: dict[str, Any],
    ) -> None:
        await self.collection.insert_one(
            {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc),
                "trade_encrypted": encrypt_field(json.dumps(trade, default=str)),
            }
        )

    async def list_trades(
        self, *, user_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        cursor = (
            self.collection.find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        out: list[dict[str, Any]] = []
        async for doc in cursor:
            row = dict(doc)
            row["_id"] = str(row["_id"])
            if row.get("trade_encrypted"):
                row["trade"] = json.loads(decrypt_field(row["trade_encrypted"]))
            out.append(row)
        return out
