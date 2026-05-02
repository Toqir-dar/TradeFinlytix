"""
Authentication service: register, login, refresh (rotation), logout.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status
from jose import JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.roles import UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user_schema import TokenResponse

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.repo = UserRepository(db)

    async def register(
        self, email: str, password: str, full_name: str
    ) -> tuple[dict[str, Any], TokenResponse]:
        existing = await self.repo.get_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered.",
            )

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=UserRole.INVESTOR,
        )
        doc = await self.repo.create(user)
        tokens = await self._issue_tokens(doc)
        logger.info("user_registered", extra={"user_id": str(doc["_id"])})
        return doc, tokens

    async def authenticate(
        self, email: str, password: str, ip: str
    ) -> tuple[dict[str, Any], TokenResponse]:
        invalid = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

        user = await self.repo.get_by_email(email)
        if not user:
            raise invalid

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated.",
            )

        if self.repo.is_locked(user):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account temporarily locked due to failed attempts.",
            )

        if not verify_password(password, user["password_hash"]):
            attempts = await self.repo.record_failed_login(str(user["_id"]))
            logger.warning(
                "login_failed",
                extra={
                    "event": "login_failed",
                    "user_id": str(user["_id"]),
                    "attempts": attempts,
                    "ip": ip,
                },
            )
            raise invalid

        await self.repo.record_successful_login(str(user["_id"]), ip)
        user = await self.repo.get_by_id(str(user["_id"]))
        assert user is not None
        tokens = await self._issue_tokens(user)
        logger.info("login_success", extra={"user_id": str(user["_id"]), "ip": ip})
        return user, tokens

    async def refresh(self, refresh_token: str, ip: str) -> TokenResponse:
        invalid = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )
        try:
            payload = decode_token(refresh_token)
        except JWTError as e:
            logger.warning(
                "refresh_token_misuse",
                extra={
                    "event": "refresh_misuse",
                    "reason": "decode_failed",
                    "error": str(e),
                    "ip": ip,
                },
            )
            raise invalid

        if payload.get("type") != "refresh":
            logger.warning(
                "refresh_token_misuse",
                extra={"event": "refresh_misuse", "reason": "wrong_type", "ip": ip},
            )
            raise invalid

        user_id: str = payload.get("sub", "")
        token_version: int = payload.get("ver", 0)
        user = await self.repo.get_by_id(user_id)
        if not user or user.get("jwt_version", 1) != token_version:
            logger.warning(
                "refresh_token_misuse",
                extra={
                    "event": "refresh_misuse",
                    "reason": "user_or_version",
                    "user_id": user_id,
                    "ip": ip,
                },
            )
            raise invalid
        if not await self.repo.is_refresh_token_valid(user_id, refresh_token):
            logger.warning(
                "refresh_token_misuse",
                extra={
                    "event": "refresh_misuse",
                    "reason": "invalid_or_revoked_or_expired",
                    "user_id": user_id,
                    "ip": ip,
                },
            )
            raise invalid

        await self.repo.revoke_refresh_token(user_id, refresh_token)
        return await self._issue_tokens(user)

    async def logout(self, user_id: str, refresh_token: str | None = None) -> None:
        if refresh_token:
            await self.repo.revoke_refresh_token(user_id, refresh_token)
        else:
            await self.repo.revoke_all_refresh_tokens(user_id)

    async def logout_all(self, user_id: str) -> None:
        await self.repo.bump_jwt_version(user_id)
        await self.repo.revoke_all_refresh_tokens(user_id)

    async def _issue_tokens(self, user: dict[str, Any]) -> TokenResponse:
        user_id = str(user["_id"])
        version = user.get("jwt_version", 1)
        access = create_access_token(user_id, user["role"], version)
        refresh = create_refresh_token(user_id, version)
        await self.repo.store_refresh_token(user_id, refresh)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.access_token_expire_minutes * 60,
        )
