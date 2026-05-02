"""
Domain model for User documents stored in MongoDB.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.core.roles import UserRole
from app.utils.helpers import normalize_email


@dataclass
class User:
    email: str
    password_hash: str
    full_name: str
    role: UserRole = UserRole.INVESTOR
    is_active: bool = True
    is_verified: bool = False
    jwt_version: int = 1
    failed_login_attempts: int = 0
    locked_until: datetime | None = None
    last_login_at: datetime | None = None
    last_login_ip: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict[str, Any]:
        return {
            "email": normalize_email(self.email),
            "password_hash": self.password_hash,
            "full_name": self.full_name.strip(),
            "role": self.role.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "jwt_version": self.jwt_version,
            "failed_login_attempts": self.failed_login_attempts,
            "locked_until": self.locked_until,
            "last_login_at": self.last_login_at,
            "last_login_ip": self.last_login_ip,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
