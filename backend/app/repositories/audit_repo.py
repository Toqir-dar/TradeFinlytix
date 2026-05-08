"""
Audit log repository — append-only, chain-hashed via compute_audit_hash().
All public methods are best-effort: they swallow exceptions and log warnings,
so a Mongo hiccup never blocks the actual request flow.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.security import compute_audit_hash
from app.repositories.audit_chain_state import audit_chain_append_allowed

logger = logging.getLogger(__name__)

GENESIS_HASH = "genesis"


class AuditRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.collection = db["audit_logs"]

    async def _get_chain_head(self) -> str:
        latest = await self.collection.find_one(
            {},
            sort=[("created_at", -1), ("_id", -1)],
            projection={"chain_hash": 1},
        )
        if latest and latest.get("chain_hash"):
            return latest["chain_hash"]
        return GENESIS_HASH

    async def record(
        self,
        *,
        event_type: str,
        user_id: str | None = None,
        ip: str | None = None,
        path: str | None = None,
        payload: dict[str, Any] | None = None,
        created_at: datetime | None = None,
    ) -> None:
        if settings.audit_reject_new_events_when_chain_untrusted and (
            not audit_chain_append_allowed()
        ):
            logger.critical(
                "audit_append_skipped_chain_untrusted",
                extra={"event_type": event_type},
            )
            return
        try:
            doc = {
                "event_type": event_type,
                "user_id": user_id,
                "ip": ip,
                "path": path,
                "payload": payload or {},
                "created_at": created_at or datetime.now(timezone.utc),
            }
            prev_hash = await self._get_chain_head()
            doc["prev_hash"] = prev_hash
            doc["chain_hash"] = compute_audit_hash(doc, prev_hash)
            await self.collection.insert_one(doc)
        except Exception as e:
            logger.warning(
                "audit_record_failed",
                extra={"event_type": event_type, "error": str(e)},
            )

    async def list_events(
        self,
        *,
        event_type: str | None = None,
        user_id: str | None = None,
        since: datetime | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        query: dict[str, Any] = {}
        if event_type:
            query["event_type"] = event_type
        if user_id:
            query["user_id"] = user_id
        if since:
            query["created_at"] = {"$gte": since}
        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return [doc async for doc in cursor]

    async def count_events(
        self,
        *,
        event_type: str | None = None,
        user_id: str | None = None,
        since: datetime | None = None,
    ) -> int:
        query: dict[str, Any] = {}
        if event_type:
            query["event_type"] = event_type
        if user_id:
            query["user_id"] = user_id
        if since:
            query["created_at"] = {"$gte": since}
        return await self.collection.count_documents(query)

    async def verify_chain(self, limit: int = 1000) -> dict[str, Any]:
        """
        Re-walks the chain in chronological order. Returns:
          {"ok": bool, "checked": int, "broken_at": <doc_id or None>}
        """
        cursor = (
            self.collection.find({}).sort([("created_at", 1), ("_id", 1)]).limit(limit)
        )
        prev_hash = GENESIS_HASH
        checked = 0
        async for doc in cursor:
            checked += 1
            stored_chain = doc.get("chain_hash")
            stored_prev = doc.get("prev_hash")
            # Must mirror record(): hash is over event fields plus prev_hash, with same outer concat.
            if stored_prev != prev_hash:
                return {
                    "ok": False,
                    "checked": checked,
                    "broken_at": str(doc.get("_id")),
                    "expected_prev": prev_hash,
                    "stored_prev": stored_prev,
                }
            recomputed = compute_audit_hash(
                {
                    "event_type": doc.get("event_type"),
                    "user_id": doc.get("user_id"),
                    "ip": doc.get("ip"),
                    "path": doc.get("path"),
                    "payload": doc.get("payload"),
                    "created_at": doc.get("created_at"),
                    "prev_hash": stored_prev,
                },
                prev_hash,
            )
            if stored_chain != recomputed:
                return {
                    "ok": False,
                    "checked": checked,
                    "broken_at": str(doc.get("_id")),
                    "expected_prev": prev_hash,
                    "expected_hash": recomputed,
                }
            prev_hash = stored_chain or ""
        return {"ok": True, "checked": checked, "broken_at": None}


async def record_event(
    db: AsyncIOMotorDatabase,
    event_type: str,
    *,
    user_id: str | None = None,
    ip: str | None = None,
    path: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Convenience helper: build and record an event in one call."""
    await AuditRepository(db).record(
        event_type=event_type,
        user_id=user_id,
        ip=ip,
        path=path,
        payload=payload or {},
        created_at=datetime.now(timezone.utc),
    )
