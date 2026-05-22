"""
PSX data scraper.

Primary:  yfinance (proven in this codebase via market_service.py)
Fallback: cached MongoDB data (handled by service.py)
Final:    safe zero defaults (safe_* guards in service.py)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import yfinance as yf
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

_KA_SUFFIX = ".KA"
_KSE100_TICKER = "^KSE100"

# Representative liquid PSX universe for gainers/losers computation
PSX_UNIVERSE: list[str] = [
    "OGDC", "HBL", "ENGRO", "LUCK", "PSO",
    "MCB", "UBL", "PPL", "SYS", "EFERT",
    "HCAR", "ATRL", "BAFL", "NBP", "BAHL",
    "FABL", "MLCF", "KOHC", "FCCL", "PIOC",
]

_INTERVAL_TO_PERIOD: dict[str, str] = {
    "1d": "5d",
    "5d": "1mo",
    "1mo": "6mo",
    "3mo": "1y",
    "1y": "5y",
    "5y": "10y",
}


def _ka(symbol: str) -> str:
    s = symbol.upper().strip()
    return s if s.endswith(_KA_SUFFIX) else f"{s}{_KA_SUFFIX}"


# ── sync helpers (called via run_in_threadpool) ──────────────────────────────

def _sync_kse100() -> dict[str, Any]:
    try:
        hist = yf.Ticker(_KSE100_TICKER).history(period="5d", interval="1d", auto_adjust=True)
        if hist.empty:
            return {}
        if hasattr(hist.index, "tz") and hist.index.tz:
            hist.index = hist.index.tz_localize(None)
        last = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else last
        price = float(last["Close"])
        prev_price = float(prev["Close"])
        change = round(price - prev_price, 2)
        change_pct = round(change / prev_price * 100, 2) if prev_price else 0.0
        return {
            "index": "KSE-100",
            "price": round(price, 2),
            "change": change,
            "change_pct": change_pct,
            "volume": int(last.get("Volume", 0)),
            "high": round(float(last.get("High", price)), 2),
            "low": round(float(last.get("Low", price)), 2),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "yfinance",
        }
    except Exception as exc:
        logger.warning("_sync_kse100 failed: %s", exc)
        return {}


def _sync_movers() -> tuple[list[dict], list[dict]]:
    """Return (gainers, losers) sorted by change_pct from PSX universe."""
    symbols_ka = [_ka(s) for s in PSX_UNIVERSE]
    try:
        raw = yf.download(
            symbols_ka,
            period="5d",
            interval="1d",
            auto_adjust=True,
            progress=False,
            group_by="ticker",
        )
    except Exception as exc:
        logger.warning("yf.download movers failed: %s", exc)
        return [], []

    quotes: list[dict] = []
    for sym in PSX_UNIVERSE:
        ka = _ka(sym)
        try:
            if isinstance(raw.columns, type(raw.columns)) and hasattr(raw[ka], "dropna"):
                df = raw[ka].dropna(how="all")
            else:
                df = raw.xs(ka, axis=1, level=1).dropna(how="all") if ka in raw.columns.get_level_values(1) else None
            if df is None or df.empty:
                continue
            if hasattr(df.index, "tz") and df.index.tz:
                df.index = df.index.tz_localize(None)
            last = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else last
            price = float(last["Close"])
            prev_price = float(prev["Close"])
            change_pct = round((price - prev_price) / prev_price * 100, 2) if prev_price else 0.0
            quotes.append({
                "symbol": sym,
                "price": round(price, 2),
                "change_pct": change_pct,
                "volume": float(last.get("Volume", 0)),
                "high": round(float(last.get("High", price)), 2),
                "low": round(float(last.get("Low", price)), 2),
            })
        except Exception as exc:
            logger.debug("movers parse failed sym=%s: %s", sym, exc)

    quotes.sort(key=lambda x: x["change_pct"])
    losers = quotes[:5]
    gainers = list(reversed(quotes[-5:]))
    return gainers, losers


def _sync_ohlc(symbol: str, interval: str) -> list[dict]:
    period = _INTERVAL_TO_PERIOD.get(interval, "6mo")
    try:
        hist = yf.Ticker(_ka(symbol)).history(
            period=period, interval="1d", auto_adjust=True
        )
        if hist.empty:
            return []
        if hasattr(hist.index, "tz") and hist.index.tz:
            hist.index = hist.index.tz_localize(None)
        candles = []
        for ts, row in hist.iterrows():
            candles.append({
                "time": ts.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row.get("Volume", 0)),
            })
        return candles
    except Exception as exc:
        logger.warning("_sync_ohlc failed sym=%s interval=%s: %s", symbol, interval, exc)
        return []


def _sync_profile(symbol: str) -> dict:
    try:
        info = yf.Ticker(_ka(symbol)).info or {}
        return {
            "symbol": symbol,
            "name": info.get("longName") or info.get("shortName") or symbol,
            "sector": info.get("sector") or "N/A",
            "industry": info.get("industry") or "N/A",
            "market_cap": float(info.get("marketCap") or 0),
            "pe_ratio": float(info.get("trailingPE") or 0),
            "eps": float(info.get("trailingEps") or 0),
            "description": info.get("longBusinessSummary") or "",
            "website": info.get("website") or "",
            "employees": int(info.get("fullTimeEmployees") or 0),
            "country": info.get("country") or "Pakistan",
            "exchange": "PSX",
        }
    except Exception as exc:
        logger.warning("_sync_profile failed sym=%s: %s", symbol, exc)
        return {}


# ── public async API ─────────────────────────────────────────────────────────

async def fetch_market_summary() -> dict[str, Any]:
    result = await run_in_threadpool(_sync_kse100)
    if result:
        return result
    logger.warning("fetch_market_summary: all sources failed, returning empty dict")
    return {}


async def fetch_movers() -> tuple[list[dict], list[dict]]:
    """Returns (gainers, losers)."""
    return await run_in_threadpool(_sync_movers)


async def fetch_ohlc(symbol: str, interval: str) -> list[dict]:
    return await run_in_threadpool(_sync_ohlc, symbol, interval)


async def fetch_company_profile(symbol: str) -> dict:
    result = await run_in_threadpool(_sync_profile, symbol)
    return result
