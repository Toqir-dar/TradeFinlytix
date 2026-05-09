"""Pydantic schemas for alert endpoints."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field
from bson import ObjectId


class AlertType(str, Enum):
    SECURITY = "security"
    PORTFOLIO = "portfolio"
    PREDICTION = "prediction"
    SYSTEM = "system"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertBase(BaseModel):
    type: AlertType
    severity: AlertSeverity
    message: str = Field(min_length=1, max_length=500)
    user_id: str  # ObjectId as str
    metadata: dict = Field(default_factory=dict)


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(alias="_id")
    is_read: bool = False
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> AlertResponse:
        return cls(
            _id=str(doc["_id"]),
            type=doc["type"],
            severity=doc["severity"],
            message=doc["message"],
            user_id=str(doc["user_id"]),
            metadata=doc.get("metadata", {}),
            is_read=doc.get("is_read", False),
            created_at=doc["created_at"],
        )


class AlertMarkRead(BaseModel):
    is_read: bool = True