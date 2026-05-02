"""
Domain model for tamper-evident audit log entries.
Each row carries a SHA-256 chain hash linking it to the previous row, so
post-hoc tampering is detectable by re-walking the chain.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class AuditEvent:
    event_type: str
    user_id: str | None = None
    ip: str | None = None
    path: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict[str, Any]:
        return {
            "event_type": self.event_type,
            "user_id": self.user_id,
            "ip": self.ip,
            "path": self.path,
            "payload": self.payload,
            "created_at": self.created_at,
        }
