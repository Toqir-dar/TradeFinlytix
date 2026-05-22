"""
AnalyticsService — TTL-cached PSX analytics with MongoDB persistence.

Cache strategy (per the integration plan):
  - store updated_at on every MongoDB document
  - if now − updated_at ≤ TTL_SECONDS → return cached doc
  - if stale → refresh from scraper; on failure return stale doc
  - never scrape inside routes; all scraping happens here

Safe-response guards prevent null / partial payloads from reaching the frontend.
Symbol normalisation: symbol.upper().strip() everywhere.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics import scraper
from app.analytics.schemas import (
    CompanyProfileResponse,
    GainerLoserItem,
    GainersLosersResponse,
    MarketSummaryResponse,
    OHLCPoint,
    OHLCResponse,
)

logger = logging.getLogger(__name__)

_MARKET_COL = "analytics_market_summary"
_MOVERS_COL = "analytics_movers"
_OHLC_COL = "analytics_ohlc"
_PROFILE_COL = "analytics_company_profiles"

TTL_SECONDS = 60


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _is_fresh(doc: dict | None) -> bool:
    if not doc:
        return False
    updated = doc.get("updated_at")
    if not updated:
        return False
    if isinstance(updated, str):
        try:
            updated = datetime.fromisoformat(updated.replace("Z", "+00:00"))
        except ValueError:
            return False
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return (_now_utc() - updated).total_seconds() < TTL_SECONDS


# ── safe guard helpers ───────────────────────────────────────────────────────

def _safe_market_summary(raw: dict) -> MarketSummaryResponse:
    return MarketSummaryResponse(
        index=str(raw.get("index") or "KSE-100"),
        price=float(raw.get("price") or 0),
        change=float(raw.get("change") or 0),
        change_pct=float(raw.get("change_pct") or 0),
        volume=int(raw.get("volume") or 0),
        high=float(raw.get("high") or 0),
        low=float(raw.get("low") or 0),
        updated_at=str(raw.get("updated_at") or _now_utc().isoformat()),
        source=str(raw.get("source") or "cache"),
    )


def _safe_gainer_loser(items: list[Any]) -> list[GainerLoserItem]:
    result = []
    for item in (items or []):
        try:
            result.append(GainerLoserItem(
                symbol=str(item.get("symbol") or ""),
                price=float(item.get("price") or 0),
                change_pct=float(item.get("change_pct") or 0),
                volume=float(item.get("volume") or 0),
                high=float(item.get("high") or 0),
                low=float(item.get("low") or 0),
            ))
        except Exception:
            pass
    return result


def _safe_ohlc(symbol: str, interval: str, candles: list[Any], updated_at: str) -> OHLCResponse:
    safe_candles = []
    for c in (candles or []):
        try:
            safe_candles.append(OHLCPoint(
                time=str(c.get("time") or ""),
                open=float(c.get("open") or 0),
                high=float(c.get("high") or 0),
                low=float(c.get("low") or 0),
                close=float(c.get("close") or 0),
                volume=int(c.get("volume") or 0),
            ))
        except Exception:
            pass
    return OHLCResponse(
        symbol=symbol,
        interval=interval,
        candles=safe_candles,
        updated_at=updated_at or _now_utc().isoformat(),
    )


def _safe_profile(symbol: str, raw: dict, updated_at: str) -> CompanyProfileResponse:
    return CompanyProfileResponse(
        symbol=str(raw.get("symbol") or symbol),
        name=str(raw.get("name") or symbol),
        sector=str(raw.get("sector") or "N/A"),
        industry=str(raw.get("industry") or "N/A"),
        market_cap=float(raw.get("market_cap") or 0),
        pe_ratio=float(raw.get("pe_ratio") or 0),
        eps=float(raw.get("eps") or 0),
        description=str(raw.get("description") or ""),
        website=str(raw.get("website") or ""),
        employees=int(raw.get("employees") or 0),
        country=str(raw.get("country") or "Pakistan"),
        exchange=str(raw.get("exchange") or "PSX"),
        updated_at=updated_at or _now_utc().isoformat(),
    )


# ── service ──────────────────────────────────────────────────────────────────

class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self._db = db

    # ── market summary ───────────────────────────────────────────────────────

    async def get_market_summary(self) -> MarketSummaryResponse:
        doc = await self._db[_MARKET_COL].find_one({"_id": "kse100"})
        if _is_fresh(doc):
            return _safe_market_summary(doc)
        return await self.refresh_market_summary(stale_doc=doc)

    async def refresh_market_summary(self, stale_doc: dict | None = None) -> MarketSummaryResponse:
        try:
            raw = await scraper.fetch_market_summary()
            if raw:
                raw["_id"] = "kse100"
                raw["updated_at"] = _now_utc()
                await self._db[_MARKET_COL].replace_one(
                    {"_id": "kse100"}, raw, upsert=True
                )
                return _safe_market_summary(raw)
        except Exception as exc:
            logger.warning("refresh_market_summary scraper failed: %s", exc)
        if stale_doc:
            logger.info("refresh_market_summary: returning stale cache")
            return _safe_market_summary(stale_doc)
        return MarketSummaryResponse()

    # ── gainers / losers ─────────────────────────────────────────────────────

    async def get_gainers_losers(self) -> GainersLosersResponse:
        doc = await self._db[_MOVERS_COL].find_one({"_id": "movers"})
        if _is_fresh(doc):
            return GainersLosersResponse(
                gainers=_safe_gainer_loser(doc.get("gainers", [])),
                losers=_safe_gainer_loser(doc.get("losers", [])),
                updated_at=str(doc.get("updated_at", "")),
            )
        return await self.refresh_gainers_losers(stale_doc=doc)

    async def refresh_gainers_losers(self, stale_doc: dict | None = None) -> GainersLosersResponse:
        try:
            gainers_raw, losers_raw = await scraper.fetch_movers()
            now = _now_utc()
            doc = {
                "_id": "movers",
                "gainers": gainers_raw,
                "losers": losers_raw,
                "updated_at": now,
            }
            await self._db[_MOVERS_COL].replace_one({"_id": "movers"}, doc, upsert=True)
            return GainersLosersResponse(
                gainers=_safe_gainer_loser(gainers_raw),
                losers=_safe_gainer_loser(losers_raw),
                updated_at=now.isoformat(),
            )
        except Exception as exc:
            logger.warning("refresh_gainers_losers failed: %s", exc)
        if stale_doc:
            return GainersLosersResponse(
                gainers=_safe_gainer_loser(stale_doc.get("gainers", [])),
                losers=_safe_gainer_loser(stale_doc.get("losers", [])),
                updated_at=str(stale_doc.get("updated_at", "")),
            )
        return GainersLosersResponse()

    # ── OHLC ─────────────────────────────────────────────────────────────────

    async def get_ohlc(self, symbol: str, interval: str) -> OHLCResponse:
        doc_id = f"{symbol}:{interval}"
        doc = await self._db[_OHLC_COL].find_one({"_id": doc_id})
        if _is_fresh(doc):
            return _safe_ohlc(symbol, interval, doc.get("candles", []), str(doc.get("updated_at", "")))
        return await self.refresh_ohlc(symbol, interval, stale_doc=doc)

    async def refresh_ohlc(self, symbol: str, interval: str, stale_doc: dict | None = None) -> OHLCResponse:
        doc_id = f"{symbol}:{interval}"
        try:
            candles = await scraper.fetch_ohlc(symbol, interval)
            if candles:
                now = _now_utc()
                doc = {"_id": doc_id, "symbol": symbol, "interval": interval, "candles": candles, "updated_at": now}
                await self._db[_OHLC_COL].replace_one({"_id": doc_id}, doc, upsert=True)
                return _safe_ohlc(symbol, interval, candles, now.isoformat())
        except Exception as exc:
            logger.warning("refresh_ohlc failed sym=%s interval=%s: %s", symbol, interval, exc)
        if stale_doc:
            return _safe_ohlc(symbol, interval, stale_doc.get("candles", []), str(stale_doc.get("updated_at", "")))
        return OHLCResponse(symbol=symbol, interval=interval)

    # ── company profile ──────────────────────────────────────────────────────

    async def get_company_profile(self, symbol: str) -> CompanyProfileResponse:
        doc = await self._db[_PROFILE_COL].find_one({"_id": symbol})
        if _is_fresh(doc):
            return _safe_profile(symbol, doc, str(doc.get("updated_at", "")))
        return await self.refresh_company_profile(symbol, stale_doc=doc)

    async def refresh_company_profile(self, symbol: str, stale_doc: dict | None = None) -> CompanyProfileResponse:
        try:
            raw = await scraper.fetch_company_profile(symbol)
            if raw:
                now = _now_utc()
                raw["_id"] = symbol
                raw["updated_at"] = now
                await self._db[_PROFILE_COL].replace_one({"_id": symbol}, raw, upsert=True)
                return _safe_profile(symbol, raw, now.isoformat())
        except Exception as exc:
            logger.warning("refresh_company_profile failed sym=%s: %s", symbol, exc)
        if stale_doc:
            return _safe_profile(symbol, stale_doc, str(stale_doc.get("updated_at", "")))
        return CompanyProfileResponse(symbol=symbol, name=symbol)
