"""
Best-effort security alerting: always logs at CRITICAL; optional webhook POST.
Extend with email/slack/APScheduler jobs as needed — see settings.security_alert_webhook_url.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.http_client import get_http_client

from app.core.config import settings

logger = logging.getLogger(__name__)

_LOG_REDACT_KEYS = frozenset(
    {"expected_prev", "stored_prev", "expected_hash", "stored_hash"}
)


def redact_security_log_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Keep audit/webhook payloads full for transports; shorten chain digests in logs."""
    out: dict[str, Any] = {}
    for k, v in payload.items():
        if k in _LOG_REDACT_KEYS and isinstance(v, str) and len(v) > 16:
            out[k] = v[:12] + "…"
        else:
            out[k] = v
    return out


async def emit_security_alert(kind: str, payload: dict[str, Any]) -> None:
    """Fire-and-forget style: failures never raise to callers."""
    log_payload = redact_security_log_payload(payload)
    logger.critical("security_alert", extra={"alert_kind": kind, **log_payload})
    url = (settings.security_alert_webhook_url or "").strip()
    if not url:
        return
    retries = 3
    for attempt in range(1, retries + 1):
        try:
            client = get_http_client()
            await client.post(
                url,
                json={"alert_kind": kind, "payload": payload},
                headers={"User-Agent": f"{settings.app_name}-security-alert/1"},
                timeout=8.0,
            )
            return
        except Exception as e:
            logger.warning(
                "security_alert_webhook_failed",
                extra={
                    "alert_kind": kind,
                    "error": str(e),
                    "attempt": attempt,
                    "max_attempts": retries,
                },
            )
            if attempt < retries:
                await asyncio.sleep(0.5 * attempt)
