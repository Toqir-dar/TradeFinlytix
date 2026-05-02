"""Cross-cutting helpers (IP extraction, email normalization, password rules)."""
from __future__ import annotations

from fastapi import Request

from app.core.config import settings


def get_client_ip(request: Request) -> str:
    """
    Resolve the client IP, honoring reverse-proxy headers.
    Order: X-Forwarded-For (first hop) -> X-Real-IP -> request.client.host.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "unknown"


def normalize_email(email: str) -> str:
    return email.strip().lower()


PASSWORD_MIN_LEN = 8
PASSWORD_MAX_LEN = 128


def validate_password_strength(password: str) -> str:
    """
    Shared password-policy enforcement. Used by:
      - UserRegisterRequest schema validator
      - bootstrap module (admin/ciso seeding)
    Raises ValueError on failure; returns the password unchanged on success.
    """
    if not (PASSWORD_MIN_LEN <= len(password) <= PASSWORD_MAX_LEN):
        raise ValueError(
            f"Password length must be between {PASSWORD_MIN_LEN} and {PASSWORD_MAX_LEN}."
        )
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password too long (max 72 bytes).")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one digit.")
    if not any(c.isalpha() for c in password):
        raise ValueError("Password must contain at least one letter.")
    if settings.password_require_symbol and not any(
        not c.isalnum() for c in password
    ):
        raise ValueError("Password must contain at least one symbol.")
    return password
