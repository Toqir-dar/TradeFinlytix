"""Schemas for Admin and CISO management APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.roles import UserRole


class UserSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    jwt_version: int
    failed_login_attempts: int
    locked_until: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class PaginatedUsers(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[UserSummary]


class PasswordResetResponse(BaseModel):
    """New password appears once — client must persist it securely."""

    user_id: str
    email: str
    new_password: str
    jwt_version_invalidated_at: datetime


class ChainVerifyResponse(BaseModel):
    ok: bool
    checked: int
    broken_at: str | None = None
    expected_prev: str | None = None
    stored_prev: str | None = None
    expected_hash: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "ok": True,
                    "checked": 12844,
                    "broken_at": None,
                    "expected_prev": None,
                    "stored_prev": None,
                    "expected_hash": None,
                }
            ]
        }
    )

