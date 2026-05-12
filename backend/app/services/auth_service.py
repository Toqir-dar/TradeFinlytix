"""
Authentication service: register, login, refresh (rotation), logout.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
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
from app.repositories.audit_repo import record_event
from app.repositories.user_repo import UserRepository
from app.schemas.user_schema import TokenResponse
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

PASSWORD_RESET_REQUEST_MESSAGE = (
    "If an active account exists for this email, a password reset OTP has been sent."
)
INVALID_RESET_OTP_MESSAGE = "Invalid or expired OTP."


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.repo = UserRepository(db)
        self.email_service = EmailService()

    async def register(
        self, email: str, password: str, full_name: str
    ) -> tuple[dict[str, Any], TokenResponse]:
        existing = await self.repo.get_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered.",
            )

        doc = await self.repo.create(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=UserRole.INVESTOR,
        )
        tokens = await self._issue_tokens(doc)
        logger.info("user_registered", extra={"user_id": str(doc["_id"])})
        await record_event(
            self.db,
            "user_registered",
            user_id=str(doc["_id"]),
            payload={"email": doc["email"]},
        )
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
            await record_event(
                self.db,
                "login_failed",
                user_id=str(user["_id"]),
                ip=ip,
                payload={"attempts": attempts},
            )
            raise invalid

        await self.repo.record_successful_login(str(user["_id"]), ip)
        user = await self.repo.get_by_id(str(user["_id"]))
        assert user is not None
        tokens = await self._issue_tokens(user)
        logger.info("login_success", extra={"user_id": str(user["_id"]), "ip": ip})
        await record_event(
            self.db,
            "login_success",
            user_id=str(user["_id"]),
            ip=ip,
            payload={"role": user.get("role")},
        )
        return user, tokens

    async def refresh(self, refresh_token: str, ip: str) -> TokenResponse:
        invalid = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )
        async def _record_misuse(reason: str, uid: str | None = None) -> None:
            await record_event(
                self.db,
                "refresh_token_misuse",
                user_id=uid,
                ip=ip,
                payload={"reason": reason},
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
            await _record_misuse("decode_failed")
            raise invalid

        if payload.get("type") != "refresh":
            logger.warning(
                "refresh_token_misuse",
                extra={"event": "refresh_misuse", "reason": "wrong_type", "ip": ip},
            )
            await _record_misuse("wrong_type")
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
            await _record_misuse("user_or_version", user_id or None)
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
            await _record_misuse("invalid_or_revoked_or_expired", user_id)
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

    async def request_password_reset(self, email: str, ip: str) -> str:
        user = await self.repo.get_by_email(email)
        if not user or not user.get("is_active", True):
            await record_event(
                self.db,
                "password_reset_requested_unknown_or_inactive",
                ip=ip,
                payload={"email": email},
            )
            return PASSWORD_RESET_REQUEST_MESSAGE

        await self._create_and_send_password_reset_otp(
            user=user,
            ip=ip,
            resend_count=0,
            event_name="password_reset_otp_requested",
        )
        return PASSWORD_RESET_REQUEST_MESSAGE

    async def resend_password_reset_otp(self, email: str, ip: str) -> str:
        user = await self.repo.get_by_email(email)
        if not user or not user.get("is_active", True):
            await record_event(
                self.db,
                "password_reset_resend_unknown_or_inactive",
                ip=ip,
                payload={"email": email},
            )
            return PASSWORD_RESET_REQUEST_MESSAGE

        latest = await self.repo.get_latest_password_reset_otp(str(user["_id"]))
        resend_count = 1
        if latest:
            now = datetime.now(timezone.utc)
            sent_at = self._as_utc(latest.get("sent_at"))
            expires_at = self._as_utc(latest.get("expires_at"))
            if expires_at and expires_at > now:
                if sent_at:
                    cooldown_until = sent_at + timedelta(
                        seconds=settings.password_reset_otp_resend_cooldown_seconds
                    )
                    if cooldown_until > now:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Please wait before requesting another OTP.",
                        )
                resend_count = int(latest.get("resend_count", 0)) + 1
                if resend_count > settings.password_reset_otp_max_resends:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Maximum OTP resend limit reached. Try again later.",
                    )

        await self._create_and_send_password_reset_otp(
            user=user,
            ip=ip,
            resend_count=resend_count,
            event_name="password_reset_otp_resent",
        )
        return PASSWORD_RESET_REQUEST_MESSAGE

    async def verify_password_reset_otp(self, email: str, otp: str, ip: str) -> str:
        user = await self.repo.get_by_email(email)
        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=INVALID_RESET_OTP_MESSAGE,
            )

        otp_doc = await self._validate_password_reset_otp(
            user_id=str(user["_id"]),
            otp=otp,
            require_verified=False,
        )
        await self.repo.mark_password_reset_otp_verified(otp_doc["_id"])
        await record_event(
            self.db,
            "password_reset_otp_verified",
            user_id=str(user["_id"]),
            ip=ip,
        )
        return "OTP verified. You can now set a new password."

    async def reset_password_with_otp(
        self,
        email: str,
        otp: str,
        new_password: str,
        ip: str,
    ) -> str:
        user = await self.repo.get_by_email(email)
        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=INVALID_RESET_OTP_MESSAGE,
            )

        otp_doc = await self._validate_password_reset_otp(
            user_id=str(user["_id"]),
            otp=otp,
            require_verified=True,
        )
        if verify_password(new_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from the current password.",
            )

        await self.repo.reset_password_and_invalidate_sessions(
            str(user["_id"]),
            hash_password(new_password),
        )
        await self.repo.consume_password_reset_otp(otp_doc["_id"])
        await record_event(
            self.db,
            "password_reset_completed",
            user_id=str(user["_id"]),
            ip=ip,
        )
        return "Password reset successfully."

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

    async def _create_and_send_password_reset_otp(
        self,
        *,
        user: dict[str, Any],
        ip: str,
        resend_count: int,
        event_name: str,
    ) -> None:
        user_id = str(user["_id"])
        otp = self._generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.password_reset_otp_expire_seconds
        )
        await self.repo.create_password_reset_otp(
            user_id=user_id,
            otp_hash=self._hash_otp(user_id, otp),
            expires_at=expires_at,
            max_attempts=settings.password_reset_otp_max_attempts,
            resend_count=resend_count,
        )
        try:
            await self.email_service.send_password_reset_otp(
                to_email=user["email"],
                otp=otp,
            )
        except Exception:
            await self.repo.invalidate_active_password_reset_otps(user_id)
            raise

        await record_event(
            self.db,
            event_name,
            user_id=user_id,
            ip=ip,
            payload={
                "expires_in_seconds": settings.password_reset_otp_expire_seconds,
                "resend_count": resend_count,
            },
        )

    async def _validate_password_reset_otp(
        self,
        *,
        user_id: str,
        otp: str,
        require_verified: bool,
    ) -> dict[str, Any]:
        otp_doc = await self.repo.get_latest_password_reset_otp(user_id)
        if not otp_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=INVALID_RESET_OTP_MESSAGE,
            )

        now = datetime.now(timezone.utc)
        expires_at = self._as_utc(otp_doc.get("expires_at"))
        if not expires_at or expires_at <= now:
            await self.repo.consume_password_reset_otp(otp_doc["_id"])
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=INVALID_RESET_OTP_MESSAGE,
            )

        attempts = int(otp_doc.get("attempts", 0))
        max_attempts = int(
            otp_doc.get("max_attempts", settings.password_reset_otp_max_attempts)
        )
        if attempts >= max_attempts:
            await self.repo.consume_password_reset_otp(otp_doc["_id"])
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum OTP verification attempts reached. Request a new OTP.",
            )

        expected = str(otp_doc.get("otp_hash", ""))
        supplied = self._hash_otp(user_id, otp)
        if not hmac.compare_digest(expected, supplied):
            updated = await self.repo.record_password_reset_otp_attempt(otp_doc["_id"])
            if updated and int(updated.get("attempts", 0)) >= max_attempts:
                await self.repo.consume_password_reset_otp(otp_doc["_id"])
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Maximum OTP verification attempts reached. Request a new OTP.",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=INVALID_RESET_OTP_MESSAGE,
            )

        if require_verified and not otp_doc.get("verified_at"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP must be verified before setting a new password.",
            )

        return otp_doc

    @staticmethod
    def _generate_otp() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    @staticmethod
    def _hash_otp(user_id: str, otp: str) -> str:
        return hmac.new(
            settings.hmac_secret_key.encode(),
            f"password-reset:{user_id}:{otp}".encode(),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def _as_utc(value: Any) -> datetime | None:
        if not isinstance(value, datetime):
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
