"""Public market data endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from app.schemas.market_schema import IntradayResponse
from app.services.market_service import fetch_intraday_batch

router = APIRouter(
    prefix="/market",
    tags=["Market"],
)

_DEFAULT_SYMBOLS = ["OGDC", "HBL", "ENGRO", "LUCK", "PSO"]


@router.get("/intraday", response_model=IntradayResponse)
async def get_intraday_prices(
    symbols: str = Query(
        ",".join(_DEFAULT_SYMBOLS),
        description="Comma-separated list of symbols",
        max_length=200,
    ),
    interval: str = Query("1m", description="Data interval"),
    limit: int = Query(60, ge=5, le=390),
) -> IntradayResponse:
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        symbol_list = _DEFAULT_SYMBOLS
    if len(symbol_list) > 10:
        raise HTTPException(status_code=422, detail="Too many symbols requested.")

    try:
        data = await run_in_threadpool(
            fetch_intraday_batch, symbol_list, interval, limit
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return IntradayResponse(
        interval=interval,
        updated_at=datetime.now(timezone.utc).isoformat(),
        data=data,
    )
