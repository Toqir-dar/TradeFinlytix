"""
Persistent risk snapshots (MongoDB) — complements volatile Redis anomaly features.

Each row captures one adaptive_security assessment for CISO trends / forensics.
"""
from __future__ import annotations

import logging
import json
import re
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.security import decrypt_field, encrypt_field

logger = logging.getLogger(__name__)


async def persist_risk_snapshot_row(
    db: AsyncIOMotorDatabase,
    *,
    path: str,
    subject: str,
    score: float,
    level_name: str,
    factors: dict[str, float],
    client_ip: str | None,
) -> None:
    doc: dict[str, Any] = {
        "created_at": datetime.now(timezone.utc),
        "subject": subject,
        "score": score,
        "level": level_name,
        "path_encrypted": encrypt_field(path),
        "factors_encrypted": encrypt_field(json.dumps(dict(factors), default=str)),
        "client_ip_encrypted": encrypt_field(client_ip or ""),
    }
    try:
        await db["risk_snapshots"].insert_one(doc)
    except Exception as e:
        logger.warning("risk_snapshot_persist_failed", extra={"error": str(e)})


async def persist_risk_from_request_best_effort(
    *,
    request_path: str,
    subject: str,
    score: float,
    level_name: str,
    factors: dict[str, float],
    client_ip: str | None = None,
) -> None:
    from app.core.config import settings

    if not settings.persist_risk_snapshots_enabled:
        return
    try:
        db = await get_db()
        await persist_risk_snapshot_row(
            db,
            path=request_path,
            subject=subject,
            score=score,
            level_name=level_name,
            factors=factors,
            client_ip=client_ip,
        )
    except Exception as e:
        logger.warning("risk_snapshot_resolve_db_failed", extra={"error": str(e)})


async def count_recent_snapshots(
    db: AsyncIOMotorDatabase,
    *,
    subject: str | None = None,
) -> int:
    query: dict[str, Any] = {}
    if subject:
        esc = re.escape(subject)
        query["subject"] = {"$regex": f"^{esc}", "$options": "i"}
    return await db["risk_snapshots"].count_documents(query)


async def list_recent_snapshots(
    db: AsyncIOMotorDatabase,
    *,
    subject: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if subject:
        esc = re.escape(subject)
        query["subject"] = {"$regex": f"^{esc}", "$options": "i"}

    cursor = (
        db["risk_snapshots"]
        .find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .skip(skip)
        .limit(limit)
    )
    rows: list[dict[str, Any]] = []
    async for raw in cursor:
        d = dict(raw)
        d["_id"] = str(d["_id"])
        if "path_encrypted" in d:
            try:
                d["path"] = decrypt_field(d["path_encrypted"])
            except Exception:
                d["path"] = "[decrypt_failed]"
        if "factors_encrypted" in d:
            try:
                d["factors"] = json.loads(decrypt_field(d["factors_encrypted"]))
            except Exception:
                d["factors"] = {}
        if "client_ip_encrypted" in d:
            try:
                d["client_ip"] = decrypt_field(d["client_ip_encrypted"])
            except Exception:
                d["client_ip"] = ""
        rows.append(d)
    return rows
