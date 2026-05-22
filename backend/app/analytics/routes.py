"""Analytics API endpoints — always route → service → scraper, never scrape here."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.analytics.schemas import (
    CompanyProfileResponse,
    GainersLosersResponse,
    MarketSummaryResponse,
    OHLCResponse,
)
from app.analytics.service import AnalyticsService
from app.api.dependencies import require_permission
from app.core.database import get_db

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    responses={401: {"description": "Missing/invalid bearer token"}},
)

_VALID_INTERVALS = {"1d", "5d", "1mo", "3mo", "1y", "5y"}


@router.get("/market-summary", response_model=MarketSummaryResponse)
async def get_market_summary(
    _current: dict = Depends(require_permission("analytics:read")),
    db=Depends(get_db),
) -> MarketSummaryResponse:
    return await AnalyticsService(db).get_market_summary()


@router.get("/market-summary/gainers-losers", response_model=GainersLosersResponse)
async def get_gainers_losers(
    _current: dict = Depends(require_permission("analytics:read")),
    db=Depends(get_db),
) -> GainersLosersResponse:
    return await AnalyticsService(db).get_gainers_losers()


@router.get("/ohlc", response_model=OHLCResponse)
async def get_ohlc(
    symbol: str = Query(..., description="PSX stock symbol e.g. OGDC"),
    interval: str = Query("1mo", description="1d | 5d | 1mo | 3mo | 1y | 5y"),
    _current: dict = Depends(require_permission("analytics:read")),
    db=Depends(get_db),
) -> OHLCResponse:
    sym = symbol.upper().strip()
    if not sym:
        raise HTTPException(status_code=422, detail="Symbol must not be empty.")
    if interval not in _VALID_INTERVALS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid interval. Choose from: {', '.join(sorted(_VALID_INTERVALS))}",
        )
    return await AnalyticsService(db).get_ohlc(sym, interval)


@router.get("/company-profile/{symbol}", response_model=CompanyProfileResponse)
async def get_company_profile(
    symbol: str,
    _current: dict = Depends(require_permission("analytics:read")),
    db=Depends(get_db),
) -> CompanyProfileResponse:
    sym = symbol.upper().strip()
    if not sym:
        raise HTTPException(status_code=422, detail="Symbol must not be empty.")
    return await AnalyticsService(db).get_company_profile(sym)
