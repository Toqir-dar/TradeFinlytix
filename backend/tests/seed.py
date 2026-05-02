"""Factories for deterministic test fixtures."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId

from app.core.security import hash_password


def utc_now():
    return datetime.now(timezone.utc)


def seed_user(
    mongo,
    *,
    email: str,
    password: str,
    full_name: str = "Tester",
    role: str = "investor",
    is_active: bool = True,
    is_verified: bool = True,
    jwt_version: int = 1,
    failed: int = 0,
    locked_until=None,
):
    oid = ObjectId()
    doc = {
        "_id": oid,
        "email": email.strip().lower(),
        "password_hash": hash_password(password),
        "full_name": full_name,
        "role": role,
        "is_active": is_active,
        "is_verified": is_verified,
        "jwt_version": jwt_version,
        "failed_login_attempts": failed,
        "locked_until": locked_until,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    mongo["users"].docs.append(doc)
    return str(oid)
