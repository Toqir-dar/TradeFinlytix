"""Pydantic shapes for the NHITS price forecast endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    date:  str   = Field(..., description="Trading date (YYYY-MM-DD).")
    close: float = Field(..., description="Forecast close price (PKR).")


class ForecastSummary(BaseModel):
    last_close:              float = Field(..., description="Last known close price.")
    close_day1:              float = Field(..., description="Forecast close on day 1.")
    close_day50:             float = Field(..., description="Forecast close on final forecast day.")
    expected_return_50d_pct: float = Field(..., description="Expected return over the forecast horizon (%).")
    close_min:               float = Field(..., description="Minimum forecast close.")
    close_max:               float = Field(..., description="Maximum forecast close.")


class NHITSForecastResponse(BaseModel):
    symbol:   str
    model:    str = "NHITS"
    horizon:  int = Field(default=50, description="Forecast horizon read from the loaded model.")
    forecast: list[ForecastPoint]
    summary:  ForecastSummary | None = None
