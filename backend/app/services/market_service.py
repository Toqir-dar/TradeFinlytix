from __future__ import annotations

import logging
import re
import threading
import time
from typing import Any

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

_ALLOWED_INTERVALS = {"1m", "2m", "5m", "15m", "30m", "60m"}
_DEFAULT_PERIOD = "1d"

_INTRADAY_CACHE: dict[str, tuple[float, pd.DataFrame]] = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 55


def _cache_get(key: str) -> pd.DataFrame | None:
    with _CACHE_LOCK:
        entry = _INTRADAY_CACHE.get(key)
        if entry and (time.monotonic() - entry[0]) < _CACHE_TTL_SECONDS:
            return entry[1].copy()
    return None


def _cache_put(key: str, df: pd.DataFrame) -> None:
    with _CACHE_LOCK:
        _INTRADAY_CACHE[key] = (time.monotonic(), df.copy())


def _download_intraday(symbol: str, interval: str, period: str) -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    raw = ticker.history(period=period, interval=interval, auto_adjust=True)
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    if "Close" not in raw.columns:
        return pd.DataFrame()
    raw = raw[["Close"]].copy()
    raw = raw.dropna(subset=["Close"])
    if getattr(raw.index, "tz", None) is not None:
        raw.index = raw.index.tz_localize(None)
    return raw


def fetch_intraday_series(
    symbol: str,
    interval: str = "1m",
    limit: int = 60,
    period: str = _DEFAULT_PERIOD,
) -> list[dict[str, Any]]:
    if interval not in _ALLOWED_INTERVALS:
        raise ValueError(f"Unsupported interval: {interval}")

    cache_key = f"{symbol}|{interval}|{period}"
    df = _cache_get(cache_key)
    if df is None:
        df = _download_intraday(symbol, interval, period)
        if df.empty and not symbol.endswith(".KA"):
            df = _download_intraday(f"{symbol}.KA", interval, period)
        if df.empty:
            return []
        _cache_put(cache_key, df)

    df = df.sort_index()
    if limit:
        df = df.tail(limit)

    return [
        {"ts": idx.isoformat(), "price": round(float(row["Close"]), 4)}
        for idx, row in df.iterrows()
    ]


def fetch_intraday_batch(
    symbols: list[str],
    interval: str = "1m",
    limit: int = 60,
    period: str = _DEFAULT_PERIOD,
) -> dict[str, list[dict[str, Any]]]:
    data: dict[str, list[dict[str, Any]]] = {}
    for raw in symbols:
        sym = raw.strip().upper()
        if not sym or not re.fullmatch(r"^[A-Z0-9._-]+$", sym):
            continue
        try:
            data[sym] = fetch_intraday_series(
                sym, interval=interval, limit=limit, period=period
            )
        except Exception as exc:
            logger.warning("intraday_fetch_failed symbol=%s err=%s", sym, exc)
            data[sym] = []
    return data
