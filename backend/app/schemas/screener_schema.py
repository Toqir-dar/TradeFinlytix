"""Schemas for stock screener APIs."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


TrendFilter = Literal["any", "bullish", "bearish", "neutral"]
ScreenerPreset = Literal["custom", "growing", "low_risk", "trending"]


class ScreenerRequest(BaseModel):
    symbols: list[str] = Field(
        default_factory=list,
        description="Optional stock universe. Defaults to a small liquid US universe.",
        max_length=50,
    )
    preset: ScreenerPreset = Field(
        default="custom",
        description="Convenience rule set for common user intents.",
    )
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    min_volume: float | None = Field(default=None, ge=0)
    high_volume: bool = Field(
        default=False,
        description="Require current volume to be above 20-day average volume.",
    )
    trend: TrendFilter = "any"
    min_score: float = Field(default=0.0, ge=0.0, le=100.0)
    limit: int = Field(default=20, ge=1, le=50)

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, value: list[str]) -> list[str]:
        seen: set[str] = set()
        symbols: list[str] = []
        for raw in value:
            symbol = raw.strip().upper()
            if not symbol:
                continue
            if not symbol.replace(".", "").replace("_", "").replace("-", "").isalnum():
                raise ValueError(
                    "Symbols may only contain letters, digits, dot, underscore, or hyphen."
                )
            if symbol not in seen:
                seen.add(symbol)
                symbols.append(symbol)
        return symbols


class ScreenerMatch(BaseModel):
    symbol: str
    price: float
    volume: float
    change_pct: float
    trend: Literal["bullish", "bearish", "neutral"]
    score: float
    reasons: list[str]
    indicators: dict[str, float]
    as_of: str | None = None


class ScreenerResponse(BaseModel):
    items: list[ScreenerMatch]
    total: int
    scanned: int
    failed: list[str] = Field(default_factory=list)
