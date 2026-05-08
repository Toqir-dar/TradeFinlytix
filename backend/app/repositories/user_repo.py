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
from app.core.roles import UserRole
from app.core.security import decrypt_field, encrypt_field, stable_identifier_hash
from app.repositories.audit_repo import record_event
from app.utils.helpers import normalize_email

logger = logging.getLogger(__name__)


class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.users = db["users"]
        self.refresh_tokens = db["refresh_tokens"]

    async def _inflate_user_doc(self, doc: dict[str, Any] | None) -> dict[str, Any] | None:
        if not doc:
            return None
        out = dict(doc)
        if "email" not in out and out.get("email_encrypted"):
            try:
                out["email"] = normalize_email(decrypt_field(out["email_encrypted"]))
            except Exception:
                logger.warning("email_decryption_failed user_id=%s", out.get("_id"))
                out["email"] = "unknown@invalid.local"
        return out

    async def _migrate_legacy_plain_email(self, doc: dict[str, Any]) -> dict[str, Any]:
        if "email" not in doc:
            return doc
        normalized = normalize_email(str(doc["email"]))
        enc = encrypt_field(normalized)
        hashed = stable_identifier_hash(normalized)
        await self.users.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "email_hash": hashed,
                    "email_encrypted": enc,
                },
                "$unset": {"email": ""},
            },
        )
        doc["email_hash"] = hashed
        doc["email_encrypted"] = enc
        doc.pop("email", None)
        return doc

    @staticmethod
    def _build_user_doc(
        *,
        email: str,
        password_hash: str,
        full_name: str,
        role: UserRole = UserRole.INVESTOR,
        is_active: bool = True,
        is_verified: bool = False,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        email_norm = normalize_email(email)
        return {
            "email_hash": stable_identifier_hash(email_norm),
            "email_encrypted": encrypt_field(email_norm),
            "password_hash": password_hash,
            "full_name": full_name.strip(),
            "role": role.value,
            "is_active": is_active,
            "is_verified": is_verified,
            "jwt_version": 1,
            "failed_login_attempts": 0,
            "locked_until": None,
            "last_login_at": None,
            "last_login_ip": None,
            "created_at": now,
            "updated_at": now,
        }

    async def create(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str,
        role: UserRole = UserRole.INVESTOR,
        is_active: bool = True,
        is_verified: bool = False,
    ) -> dict[str, Any]:
        try:
            result = await self.users.insert_one(
                self._build_user_doc(
                    email=email,
                    password_hash=password_hash,
                    full_name=full_name,
                    role=role,
                    is_active=is_active,
                    is_verified=is_verified,
                )
            )
        except DuplicateKeyError as e:
            raise ValueError("Email already registered.") from e
        doc = await self.users.find_one({"_id": result.inserted_id})
        return await self._inflate_user_doc(doc)

    async def get_by_email(self, email: str) -> dict[str, Any] | None:
        normalized = normalize_email(email)
        doc = await self.users.find_one({"email_hash": stable_identifier_hash(normalized)})
        if doc:
            return await self._inflate_user_doc(doc)

        # Backward-compatible fallback for old plaintext records.
        legacy = await self.users.find_one({"email": normalized})
        if legacy:
            migrated = await self._migrate_legacy_plain_email(legacy)
            return await self._inflate_user_doc(migrated)
        return None

    async def get_by_id(self, user_id: str) -> dict[str, Any] | None:
        try:
            doc = await self.users.find_one({"_id": ObjectId(user_id)})
            if doc and "email" in doc:
                doc = await self._migrate_legacy_plain_email(doc)
            return await self._inflate_user_doc(doc)
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
        thresh = settings.auth_lockout_failed_attempts
        lock_mins = settings.auth_lockout_minutes
        if attempts >= thresh:
            await self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"locked_until": now + timedelta(minutes=lock_mins)}},
            )
            logger.warning(
                "account_locked",
                extra={
                    "event": "account_locked",
                    "user_id": user_id,
                    "attempts": attempts,
                    "lock_minutes": lock_mins,
                },
            )
            await record_event(
                self.db,
                "account_locked",
                user_id=user_id,
                payload={
                    "attempts": attempts,
                    "lock_minutes": lock_mins,
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

    async def list_users(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        role: str | None = None,
        is_active: bool | None = None,
        q: str | None = None,
        projection: dict[str, int | bool | str] | None = None,
    ) -> tuple[int, list[dict[str, Any]]]:
        filter_q: dict[str, Any] = {}
        if role:
            filter_q["role"] = role
        if is_active is not None:
            filter_q["is_active"] = is_active
        proj = projection if projection is not None else {"password_hash": 0}
        cursor = (
            self.users.find(filter_q, projection=proj)
            .sort("created_at", -1)
        )
        rows_all: list[dict[str, Any]] = []
        async for doc in cursor:
            hydrated = await self._inflate_user_doc(doc)
            if hydrated:
                rows_all.append(hydrated)

        if q and q.strip():
            needle = q.strip().lower()
            rows_all = [
                d
                for d in rows_all
                if needle in str(d.get("email", "")).lower()
                or needle in str(d.get("full_name", "")).lower()
            ]

        total = len(rows_all)
        return total, rows_all[skip : skip + limit]

    async def deactivate_user_account(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {"is_active": False, "updated_at": now},
                "$inc": {"jwt_version": 1},
            },
        )
        await self.revoke_all_refresh_tokens(user_id)

    async def activate_user_account(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True, "updated_at": now}},
        )

    async def reset_password_and_invalidate_sessions(
        self,
        user_id: str,
        password_hash: str,
    ) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc)
        updated = await self.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": password_hash,
                    "failed_login_attempts": 0,
                    "locked_until": None,
                    "updated_at": now,
                },
                "$inc": {"jwt_version": 1},
            },
            return_document=ReturnDocument.AFTER,
        )
        if updated:
            await self.revoke_all_refresh_tokens(user_id)
        return updated
