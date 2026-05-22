"""NHITS 50-day close price forecast endpoint.

GET /api/v1/forecast/nhits/{symbol}

Requires `predict:read` permission (same as the ensemble prediction endpoint).
Inference runs in a threadpool to avoid blocking the event loop.
Results are cached for 1 hour inside nhits_model.py.
"""
from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Path
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import require_permission
from app.ml_engine.models.nhits_model import get_nhits_forecast
from app.schemas.forecast_schema import (
    ForecastPoint,
    ForecastSummary,
    NHITSForecastResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/forecast", tags=["Forecast"])

_SYMBOL_RE = re.compile(r"^[A-Z0-9._-]+$")


@router.get("/nhits/status", summary="NHITS model load status (no auth)")
async def nhits_status() -> dict:
    """
    Diagnostic endpoint — no auth required.
    Returns whether the NHITS model is loaded and, if not, the error reason.
    """
    from app.ml_engine.models.nhits_model import _MODEL_DIR, _load_attempted, _nf_model  # noqa
    files_present = {
        "NHITS_0.ckpt":       (_MODEL_DIR / "NHITS_0.ckpt").exists(),
        "configuration.pkl":  (_MODEL_DIR / "configuration.pkl").exists(),
        "alias_to_model.pkl": (_MODEL_DIR / "alias_to_model.pkl").exists(),
    }
    try:
        import neuralforecast  # noqa
        nf_version = neuralforecast.__version__
    except ImportError:
        nf_version = None

    return {
        "model_loaded":    _nf_model is not None,
        "load_attempted":  _load_attempted,
        "model_dir":       str(_MODEL_DIR),
        "files_present":   files_present,
        "neuralforecast_version": nf_version,
    }


@router.get(
    "/nhits/{symbol}",
    response_model=NHITSForecastResponse,
    summary="NHITS 50-day close price forecast",
    description=(
        "Runs the trained NHITS (Neural Hierarchical Interpolation for Time Series) "
        "model to predict the next 50 trading-day close prices for the given symbol. "
        "Results are cached for 1 hour; first call per symbol takes a few seconds."
    ),
)
async def nhits_forecast(
    symbol: str = Path(..., min_length=1, max_length=32, description="PSX stock symbol."),
    _user: dict = Depends(require_permission("predict:read")),
) -> NHITSForecastResponse:
    symbol = symbol.strip().upper()
    if not _SYMBOL_RE.fullmatch(symbol):
        raise HTTPException(status_code=422, detail="Invalid symbol format.")

    result = await run_in_threadpool(get_nhits_forecast, symbol)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"NHITS forecast unavailable for {symbol}. "
                "The model may still be loading or market data is insufficient. "
                "Try again in a few seconds."
            ),
        )

    logger.info("nhits_forecast symbol=%s points=%d", symbol, len(result["forecast"]))

    return NHITSForecastResponse(
        symbol   = result["symbol"],
        horizon  = result.get("horizon", 50),
        forecast = [ForecastPoint(**p) for p in result["forecast"]],
        summary  = ForecastSummary(**result["summary"]) if result.get("summary") else None,
    )
