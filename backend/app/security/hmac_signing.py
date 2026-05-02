"""HMAC helpers for API response integrity."""

from __future__ import annotations

from typing import Any

from app.core.security import sign_payload, verify_signature


def sign_response_payload(payload: dict[str, Any]) -> str:
    return sign_payload(payload)


def verify_response_payload(payload: dict[str, Any], signature: str) -> bool:
    return verify_signature(payload, signature)

