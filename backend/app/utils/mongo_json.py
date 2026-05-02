"""Normalize Mongo-style values before JSON/OpenAPI serialization."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId


def json_safe_document(obj: Any) -> Any:
    """
    Convert ObjectIds to str; coerce naive datetimes to UTC for consistent JSON.
    """
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        dt = obj
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {str(k): json_safe_document(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe_document(v) for v in obj]
    return obj
