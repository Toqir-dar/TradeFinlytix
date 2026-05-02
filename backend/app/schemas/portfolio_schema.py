"""Schemas for encrypted portfolio/trade APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PortfolioPosition(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    quantity: float
    avg_price: float


class PortfolioUpsertRequest(BaseModel):
    positions: list[PortfolioPosition]
    metadata: dict[str, Any] = Field(default_factory=dict)


class PortfolioResponse(BaseModel):
    user_id: str
    positions: list[PortfolioPosition]
    metadata: dict[str, Any]
    updated_at: datetime | None = None


class TradeCreateRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=20)
    side: str = Field(pattern="^(buy|sell)$")
    quantity: float
    price: float


class TradeRow(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    timestamp: datetime
    trade: dict[str, Any]


class TradeListResponse(BaseModel):
    items: list[TradeRow]
    total: int

