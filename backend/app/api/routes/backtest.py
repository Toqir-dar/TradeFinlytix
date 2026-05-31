"""Backtesting endpoint."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_permission
from app.schemas.backtest_schema import BacktestRequest, BacktestResponse
from app.services.backtest_service import BacktestService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/backtest",
    tags=["Backtest"],
    responses={401: {"description": "Missing/invalid bearer token"}},
)


@router.post(
    "",
    response_model=BacktestResponse,
    summary="Run a historical strategy backtest on OHLC data",
)
async def run_backtest(
    payload: BacktestRequest,
    _current: dict = Depends(require_permission("screener:read")),
) -> BacktestResponse:
    service = BacktestService()
    try:
        return await service.run(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("backtest_failed symbol=%s err=%s", payload.symbol, exc, exc_info=True)
        raise HTTPException(status_code=502, detail="Backtest failed. Market data may be unavailable.")
