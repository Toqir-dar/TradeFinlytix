"""Schemas for public market data endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class IntradayPoint(BaseModel):
    ts: str = Field(..., description="ISO timestamp for the price point")
    price: float = Field(..., description="Last traded price")


class IntradayResponse(BaseModel):
    interval: str = Field(..., description="Requested interval, e.g., 1m")
    updated_at: str = Field(..., description="Server timestamp for this snapshot")
    data: dict[str, list[IntradayPoint]] = Field(
        ..., description="Symbol to list of intraday points"
    )
