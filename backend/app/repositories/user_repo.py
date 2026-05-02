"""User repository — MongoDB operations for users and refresh tokens."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.models.user import User
from app.utils.helpers import normalize_email

logger = logging.getLogger(__name__)

LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15


class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.users = db["users"]
        self.refresh_tokens = db["refresh_tokens"]

    async def create(self, user: User) -> dict[str, Any]:
        try:
            result = await self.users.insert_one(user.to_doc())
        except DuplicateKeyError as e:
            raise ValueError("Email already registered.") from e
        doc = await self.users.find_one({"_id": result.inserted_id})
        assert doc is not None
        return doc

    async def get_by_email(self, email: str) -> dict[str, Any] | None:
        return await self.users.find_one({"email": normalize_email(email)})

    async def get_by_id(self, user_id: str) -> dict[str, Any] | None:
        try:
            return await self.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None

    async def bump_jwt_version(self, user_id: str) -> None:
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$inc": {"jwt_version": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )

    async def record_successful_login(self, user_id: str, ip: str) -> None:
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "last_login_at": datetime.now(timezone.utc),
                    "last_login_ip": ip,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    async def record_failed_login(self, user_id: str) -> int:
        """Returns updated failed_login_attempts count; locks account if >= threshold."""
        now = datetime.now(timezone.utc)
        user = await self.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$inc": {"failed_login_attempts": 1}, "$set": {"updated_at": now}},
            return_document=ReturnDocument.AFTER,
        )
        if not user:
            return 0
        attempts = user.get("failed_login_attempts", 0)
        if attempts >= LOCKOUT_THRESHOLD:
            await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"locked_until": now + timedelta(minutes=LOCKOUT_MINUTES)}},
            )
            logger.warning(
                "account_locked",
                extra={
                    "event": "account_locked",
                    "user_id": user_id,
                    "attempts": attempts,
                    "lock_minutes": LOCKOUT_MINUTES,
                },
            )
        return attempts

    @staticmethod
    def is_locked(user: dict[str, Any]) -> bool:
        locked_until = user.get("locked_until")
        if not locked_until:
            return False
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        return locked_until > datetime.now(timezone.utc)

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def store_refresh_token(self, user_id: str, token: str) -> None:
        await self.refresh_tokens.insert_one(
            {
                "user_id": ObjectId(user_id),
                "token_hash": self._hash_token(token),
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc)
                + timedelta(days=settings.refresh_token_expire_days),
                "revoked": False,
            }
        )

    async def is_refresh_token_valid(self, user_id: str, token: str) -> bool:
        doc = await self.refresh_tokens.find_one(
            {
                "user_id": ObjectId(user_id),
                "token_hash": self._hash_token(token),
                "revoked": False,
            }
        )
        if not doc:
            return False

        expires_at = doc.get("expires_at")
        if expires_at is None:
            return False
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at > datetime.now(timezone.utc)

    async def revoke_refresh_token(self, user_id: str, token: str) -> None:
        await self.refresh_tokens.update_one(
            {"user_id": ObjectId(user_id), "token_hash": self._hash_token(token)},
            {"$set": {"revoked": True}},
        )

    async def revoke_all_refresh_tokens(self, user_id: str) -> None:
        await self.refresh_tokens.update_many(
            {"user_id": ObjectId(user_id)},
            {"$set": {"revoked": True}},
        )
