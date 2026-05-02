"""Read-only oversight surfaces for CISO role."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.audit_repo import AuditRepository
from app.repositories.risk_history_repo import count_recent_snapshots, list_recent_snapshots
from app.utils.mongo_json import json_safe_document


class CISOService:
    MAX_RISK_SCAN_FOR_TOP = 2000

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def list_audit_events(
        self,
        *,
        event_type: str | None,
        user_id: str | None,
        since: datetime | None,
        skip: int,
        limit: int,
    ) -> dict[str, Any]:
        repo = AuditRepository(self.db)
        total = await repo.count_events(
            event_type=event_type,
            user_id=user_id,
            since=since,
        )
        rows = await repo.list_events(
            event_type=event_type,
            user_id=user_id,
            since=since,
            skip=skip,
            limit=limit,
        )
        return {
            "items": [json_safe_document(r) for r in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def verify_chain(self, *, limit: int) -> dict[str, Any]:
        return await AuditRepository(self.db).verify_chain(limit=limit)

    async def list_anomalies(self, *, skip: int, limit: int) -> dict[str, Any]:
        coll = self.db["anomaly_logs"]
        total = await coll.count_documents({})
        cursor = coll.find({}).sort("created_at", -1).skip(skip).limit(limit)
        docs: list[dict[str, Any]] = []
        async for doc in cursor:
            docs.append(json_safe_document(doc))
        return {
            "items": docs,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def list_risk_snapshots(
        self, *, subject: str | None, skip: int, limit: int
    ) -> dict[str, Any]:
        total = await count_recent_snapshots(self.db, subject=subject)
        rows = await list_recent_snapshots(
            self.db,
            subject=subject,
            skip=skip,
            limit=limit,
        )
        return {
            "items": [json_safe_document(r) for r in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def risk_trend(
        self,
        *,
        user_id: str | None,
        days: int,
        bucket_skip: int,
        bucket_limit: int,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=days)
        subject = user_id.strip() if user_id else None
        query: dict[str, Any] = {"created_at": {"$gte": since}}
        if subject:
            query["subject"] = subject
        rows = self.db["risk_snapshots"].find(query).sort("created_at", 1)
        buckets: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"count": 0, "avg_score": 0.0, "high_risk_count": 0}
        )
        async for doc in rows:
            ts = doc.get("created_at")
            day_key = (
                ts.astimezone(timezone.utc).date().isoformat()
                if isinstance(ts, datetime)
                else str(ts)[:10]
            )
            b = buckets[day_key]
            score = float(doc.get("score", 0.0))
            b["count"] += 1
            b["avg_score"] += score
            if doc.get("level") in {"HIGH", "CRITICAL"}:
                b["high_risk_count"] += 1
        out: list[dict[str, Any]] = []
        for day in sorted(buckets.keys()):
            b = buckets[day]
            count = b["count"] or 1
            out.append(
                {
                    "day": day,
                    "count": b["count"],
                    "avg_score": round(b["avg_score"] / count, 3),
                    "high_risk_count": b["high_risk_count"],
                }
            )
        total = len(out)
        page = out[bucket_skip : bucket_skip + bucket_limit]
        return {
            "items": page,
            "total": total,
            "skip": bucket_skip,
            "limit": bucket_limit,
        }

    async def top_risky_subjects(
        self, *, skip: int, limit: int
    ) -> dict[str, Any]:
        rows = (
            self.db["risk_snapshots"]
            .find({})
            .sort("created_at", -1)
            .limit(self.MAX_RISK_SCAN_FOR_TOP)
        )
        grouped: dict[str, dict[str, Any]] = {}
        async for doc in rows:
            subject = str(doc.get("subject", "unknown"))
            g = grouped.setdefault(
                subject,
                {"subject": subject, "count": 0, "avg_score": 0.0, "high_count": 0},
            )
            score = float(doc.get("score", 0.0))
            g["count"] += 1
            g["avg_score"] += score
            if doc.get("level") in {"HIGH", "CRITICAL"}:
                g["high_count"] += 1
        out: list[dict[str, Any]] = []
        for item in grouped.values():
            count = item["count"] or 1
            item["avg_score"] = round(item["avg_score"] / count, 3)
            out.append(item)
        out.sort(
            key=lambda x: (x["high_count"], x["avg_score"], x["count"]), reverse=True
        )
        total = len(out)
        page = out[skip : skip + limit]
        return {
            "items": page,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def anomaly_frequency_stats(
        self,
        *,
        days: int,
        skip: int,
        limit: int,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=days)
        rows = (
            self.db["anomaly_logs"]
            .find({"created_at": {"$gte": since}})
            .sort("created_at", 1)
        )
        by_day: dict[str, int] = defaultdict(int)
        async for doc in rows:
            ts = doc.get("created_at")
            day_key = (
                ts.astimezone(timezone.utc).date().isoformat()
                if isinstance(ts, datetime)
                else str(ts)[:10]
            )
            by_day[day_key] += 1
        ordered = [
            {"day": day, "count": by_day[day]} for day in sorted(by_day.keys())
        ]
        total = len(ordered)
        page = ordered[skip : skip + limit]
        return {"items": page, "total": total, "skip": skip, "limit": limit}

    async def recent_risk_events(self, *, skip: int, limit: int) -> dict[str, Any]:
        query = {"event_type": {"$in": ["critical_block"]}}
        coll = self.db["audit_logs"]
        total = await coll.count_documents(query)
        cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
        rows: list[dict[str, Any]] = []
        async for doc in cursor:
            rows.append(json_safe_document(doc))
        return {
            "items": rows,
            "total": total,
            "skip": skip,
            "limit": limit,
        }
