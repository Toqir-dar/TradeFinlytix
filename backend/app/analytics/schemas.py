"""Pydantic schemas for analytics API responses."""
from __future__ import annotations

from pydantic import BaseModel, Field


class MarketSummaryResponse(BaseModel):
    index: str = "KSE-100"
    price: float = 0.0
    change: float = 0.0
    change_pct: float = 0.0
    volume: int = 0
    high: float = 0.0
    low: float = 0.0
    updated_at: str = ""
    source: str = "unknown"


class GainerLoserItem(BaseModel):
    symbol: str
    price: float = 0.0
    change_pct: float = 0.0
    volume: float = 0.0
    high: float = 0.0
    low: float = 0.0


class GainersLosersResponse(BaseModel):
    gainers: list[GainerLoserItem] = Field(default_factory=list)
    losers: list[GainerLoserItem] = Field(default_factory=list)
    updated_at: str = ""


class OHLCPoint(BaseModel):
    time: str
    open: float = 0.0
    high: float = 0.0
    low: float = 0.0
    close: float = 0.0
    volume: int = 0


class OHLCResponse(BaseModel):
    symbol: str
    interval: str
    candles: list[OHLCPoint] = Field(default_factory=list)
    updated_at: str = ""


class CompanyProfileResponse(BaseModel):
    symbol: str
    name: str = ""
    sector: str = "N/A"
    industry: str = "N/A"
    market_cap: float = 0.0
    pe_ratio: float = 0.0
    eps: float = 0.0
    description: str = ""
    website: str = ""
    employees: int = 0
    country: str = "Pakistan"
    exchange: str = "PSX"
    updated_at: str = ""
