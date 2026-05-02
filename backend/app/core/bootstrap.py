"""
Seed privileged accounts (admin, ciso) on app startup.

Idempotent — safe to run on every restart. Creates accounts only if missing.
Disabled by setting ENABLE_BOOTSTRAP=false in .env once initial deploy is done.
"""
from __future__ import annotations

import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.roles import UserRole
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.utils.helpers import normalize_email, validate_password_strength

logger = logging.getLogger(__name__)


async def bootstrap_privileged_users() -> None:
    if not settings.enable_bootstrap:
        logger.info("bootstrap_disabled")
        return

    db = await get_db()
    repo = UserRepository(db)

    targets: list[tuple[str, UserRole, str, str]] = [
        (
            "admin",
            UserRole.ADMIN,
            settings.bootstrap_admin_email,
            settings.bootstrap_admin_password,
        ),
        (
            "ciso",
            UserRole.CISO,
            settings.bootstrap_ciso_email,
            settings.bootstrap_ciso_password,
        ),
    ]

    for label, role, email, password in targets:
        if not email or not password:
            logger.info(
                "bootstrap_skipped_missing_creds",
                extra={"role": label},
            )
            continue

        try:
            validate_password_strength(password)
        except ValueError as e:
            logger.error(
                "bootstrap_weak_password",
                extra={"role": label, "error": str(e)},
            )
            continue

        existing = await repo.get_by_email(email)
        if existing:
            if existing.get("role") != role.value:
                logger.warning(
                    "bootstrap_role_mismatch",
                    extra={
                        "email": normalize_email(email),
                        "expected_role": role.value,
                        "actual_role": existing.get("role"),
                    },
                )
            continue

        await repo.create(
            User(
                email=email,
                password_hash=hash_password(password),
                full_name=f"Bootstrap {label.upper()}",
                role=role,
                is_verified=True,
            )
        )
        logger.warning(
            "bootstrap_account_created",
            extra={
                "event": "bootstrap_account_created",
                "role": role.value,
                "email": normalize_email(email),
            },
        )

    if settings.is_production and settings.enable_bootstrap:
        logger.warning(
            "bootstrap_enabled_in_production",
            extra={
                "action": "set ENABLE_BOOTSTRAP=false after first deploy "
                "and rotate seeded passwords"
            },
        )
