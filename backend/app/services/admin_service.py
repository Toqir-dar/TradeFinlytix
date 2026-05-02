"""
Privileged user management — admin-facing operations only.
Protects privileged roles from cross-admin tampering unless actions are scoped.
"""
from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.roles import UserRole
from app.core.security import hash_password
from app.repositories.audit_repo import record_event
from app.repositories.user_repo import UserRepository
from app.schemas.admin_schema import PaginatedUsers, PasswordResetResponse, UserSummary
from app.utils.helpers import validate_password_strength
from app.utils.mongo_json import json_safe_document

logger = logging.getLogger(__name__)

PROTECTED_ROLES = frozenset({UserRole.ADMIN.value, UserRole.CISO.value})


def _generate_reset_password() -> str:
    body = "".join(
        secrets.choice(string.ascii_letters + string.digits) for _ in range(14)
    )
    return body + "9Az!"


def _sanitize_user(doc: dict[str, Any]) -> dict[str, Any]:
    """Strip sensitive fields before returning."""
    out = dict(doc)
    out.pop("password_hash", None)
    if "_id" in out:
        out["_id"] = str(out["_id"])
    return out


class AdminService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.repo = UserRepository(db)

    def _privileged_target(self, target: dict[str, Any]) -> bool:
        return target.get("role") in PROTECTED_ROLES

    async def list_users(
        self,
        *,
        skip: int,
        limit: int,
        role: str | None,
        is_active: bool | None,
        q: str | None,
    ) -> PaginatedUsers:
        total, rows = await self.repo.list_users(
            skip=skip, limit=limit, role=role, is_active=is_active, q=q
        )
        items: list[UserSummary] = []
        for row in rows:
            r = dict(row)
            if "_id" in r:
                r["_id"] = str(r["_id"])
            items.append(UserSummary.model_validate(r))
        return PaginatedUsers(total=total, skip=skip, limit=limit, items=items)

    async def get_user(self, user_id: str) -> UserSummary:
        doc = await self.repo.get_by_id(user_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        doc.pop("password_hash", None)
        doc["_id"] = str(doc["_id"])
        return UserSummary.model_validate(doc)

    async def deactivate_user(
        self,
        *,
        actor: dict[str, Any],
        target_id: str,
        actor_ip: str | None,
        actor_path: str,
    ) -> UserSummary:
        if str(actor["_id"]) == target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account.",
            )
        target = await self.repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if self._privileged_target(target):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate an admin or CISO account.",
            )

        await self.repo.deactivate_user_account(target_id)
        await record_event(
            self.db,
            "admin_user_deactivated",
            user_id=str(actor["_id"]),
            ip=actor_ip,
            path=actor_path,
            payload={"target_user_id": target_id},
        )
        logger.info("admin_deactivated_user", extra={"target": target_id})

        refreshed = await self.repo.get_by_id(target_id)
        assert refreshed is not None
        return UserSummary.model_validate(_sanitize_user(refreshed))

    async def activate_user(
        self,
        *,
        actor: dict[str, Any],
        target_id: str,
        actor_ip: str | None,
        actor_path: str,
    ) -> UserSummary:
        target = await self.repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if self._privileged_target(target):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Changing activation for admin/CISO accounts is forbidden.",
            )

        await self.repo.activate_user_account(target_id)
        await record_event(
            self.db,
            "admin_user_activated",
            user_id=str(actor["_id"]),
            ip=actor_ip,
            path=actor_path,
            payload={"target_user_id": target_id},
        )

        refreshed = await self.repo.get_by_id(target_id)
        assert refreshed is not None
        return UserSummary.model_validate(_sanitize_user(refreshed))

    async def reset_password(
        self,
        *,
        actor: dict[str, Any],
        target_id: str,
        actor_ip: str | None,
        actor_path: str,
    ) -> PasswordResetResponse:
        target = await self.repo.get_by_id(target_id)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        if self._privileged_target(target):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot reset password for admin or CISO accounts.",
            )

        plaintext = _generate_reset_password()
        validate_password_strength(plaintext)

        hashed = hash_password(plaintext)
        updated = await self.repo.reset_password_and_invalidate_sessions(target_id, hashed)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password reset failed.",
            )

        now = datetime.now(timezone.utc)
        await record_event(
            self.db,
            "admin_password_reset",
            user_id=str(actor["_id"]),
            ip=actor_ip,
            path=actor_path,
            payload={"target_user_id": target_id},
        )

        return PasswordResetResponse(
            user_id=target_id,
            email=target["email"],
            new_password=plaintext,
            jwt_version_invalidated_at=now,
        )

    async def user_activity(self, user_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        cursor = (
            self.db["audit_logs"]
            .find({"user_id": str(user["_id"])})
            .sort("created_at", -1)
            .limit(limit)
        )
        rows: list[dict[str, Any]] = []
        async for doc in cursor:
            rows.append(json_safe_document(doc))
        return rows
