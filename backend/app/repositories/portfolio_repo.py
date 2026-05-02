"""Encrypted portfolio storage primitives (at-rest protection)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import decrypt_field, encrypt_field


class PortfolioRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.collection = db["portfolio"]

    async def save_portfolio_snapshot(
        self,
        *,
        user_id: str,
        positions: list[dict[str, Any]],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "user_id": user_id,
            "positions_encrypted": encrypt_field(json.dumps(positions, default=str)),
            "metadata_encrypted": encrypt_field(json.dumps(metadata or {}, default=str)),
            "updated_at": datetime.now(timezone.utc),
        }
        existing = await self.collection.find_one({"user_id": user_id})
        if existing:
            await self.collection.update_one({"user_id": user_id}, {"$set": payload})
        else:
            payload["created_at"] = datetime.now(timezone.utc)
            await self.collection.insert_one(payload)

    async def load_portfolio_snapshot(self, *, user_id: str) -> dict[str, Any] | None:
        doc = await self.collection.find_one({"user_id": user_id})
        if not doc:
            return None
        out = dict(doc)
        out["_id"] = str(out["_id"])
        if out.get("positions_encrypted"):
            out["positions"] = json.loads(decrypt_field(out["positions_encrypted"]))
        else:
            out["positions"] = []
        if out.get("metadata_encrypted"):
            out["metadata"] = json.loads(decrypt_field(out["metadata_encrypted"]))
        else:
            out["metadata"] = {}
        return out

