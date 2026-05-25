"""CSRF helpers for cookie-based clients.

For Authorization: Bearer flows, CSRF is typically unnecessary because browsers do
not attach bearer headers automatically. This module supports optional enforcement
when a project later introduces cookie-auth patterns.
"""

from __future__ import annotations

import secrets
from typing import Iterable

from fastapi import Request

from app.core.config import settings

_MUTATING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def issue_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def request_needs_csrf(
    request: Request,
    protected_prefixes: Iterable[str],
    skip_prefixes: Iterable[str] = (),
) -> bool:
    if request.method.upper() not in _MUTATING_METHODS:
        return False
    path = request.url.path
    if skip_prefixes and path.startswith(tuple(skip_prefixes)):
        return False
    if not path.startswith(tuple(protected_prefixes)):
        return False
    return True


def validate_csrf(request: Request) -> bool:
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    if not cookie_token:
        # No cookie means the client is not a browser session (Swagger, Postman,
        # curl, mobile) — CSRF does not apply to Bearer-only clients.
        return True
    header_token = request.headers.get(settings.csrf_header_name)
    return bool(header_token and cookie_token == header_token)

