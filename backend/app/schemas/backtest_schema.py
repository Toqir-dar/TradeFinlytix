"""Schemas for backtesting API."""
from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Strategy = Literal["sma_crossover", "rsi", "buy_and_hold"]


class BacktestRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=32)
    start_date: str = Field(..., description="Start date YYYY-MM-DD")
    end_date: str = Field(..., description="End date YYYY-MM-DD")
    initial_capital: float = Field(default=10000.0, ge=100.0, le=10_000_000.0)
    strategy: Strategy = Field(default="sma_crossover")
    sma_fast: int = Field(default=5, ge=2, le=50)
    sma_slow: int = Field(default=20, ge=5, le=200)
    rsi_period: int = Field(default=14, ge=2, le=50)
    rsi_oversold: float = Field(default=35.0, ge=10.0, le=50.0)
    rsi_overbought: float = Field(default=65.0, ge=50.0, le=90.0)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        s = v.strip().upper()
        if not re.fullmatch(r"[A-Z0-9._-]+", s):
            raise ValueError("Symbol may only contain letters, digits, dot, underscore, or hyphen.")
        return s

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            raise ValueError("Date must be in YYYY-MM-DD format.")
        return v


class TradeRecord(BaseModel):
    date: str
    action: Literal["BUY", "SELL"]
    price: float
    shares: float
    value: float
    pnl: Optional[float] = None


class EquityPoint(BaseModel):
    date: str
    equity: float
    benchmark: float
    drawdown_pct: float


class BacktestResponse(BaseModel):
    symbol: str
    strategy: str
    start_date: str
    end_date: str
    initial_capital: float
    final_equity: float
    total_return_pct: float
    annualized_return_pct: float
    max_drawdown_pct: float
    sharpe_ratio: float
    win_rate: float
    total_trades: int
    profitable_trades: int
    benchmark_return_pct: float
    equity_curve: list[EquityPoint]
    trades: list[TradeRecord]
