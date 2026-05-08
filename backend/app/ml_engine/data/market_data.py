"""Real-time market data fetching and 57-feature engineering for the prediction pipeline."""
from __future__ import annotations

import logging
import threading
import time
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf

from ..features.feature_engineering import FEATURE_COLS

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TTL cache — 5-minute OHLCV cache per ticker; avoids hammering Yahoo Finance
# ---------------------------------------------------------------------------

_OHLCV_CACHE: dict[str, tuple[float, pd.DataFrame]] = {}
_CACHE_LOCK = threading.Lock()
_CACHE_TTL = 300  # seconds


def _cache_get(key: str) -> pd.DataFrame | None:
    with _CACHE_LOCK:
        entry = _OHLCV_CACHE.get(key)
        if entry and (time.monotonic() - entry[0]) < _CACHE_TTL:
            logger.debug("OHLCV cache hit: %s", key)
            return entry[1].copy()
    return None


def _cache_put(key: str, df: pd.DataFrame) -> None:
    with _CACHE_LOCK:
        _OHLCV_CACHE[key] = (time.monotonic(), df.copy())


# ---------------------------------------------------------------------------
# OHLCV fetch
# ---------------------------------------------------------------------------

def _fetch_ohlcv(symbol: str) -> pd.DataFrame:
    """Download 2 years of daily OHLCV for *symbol*; results cached for 5 min."""
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    ticker = yf.Ticker(symbol)
    df = ticker.history(period="2y", interval="1d", auto_adjust=True)

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df = df.dropna(subset=["Open", "High", "Low", "Close"])

    # Normalise to tz-naive DatetimeIndex so all series align cleanly.
    if getattr(df.index, "tz", None) is not None:
        df.index = df.index.tz_localize(None)

    if not df.empty:
        _cache_put(symbol, df)

    return df


# ---------------------------------------------------------------------------
# Feature helpers
# ---------------------------------------------------------------------------

def _calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _calc_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    tr = pd.concat(
        [high - low, (high - close.shift(1)).abs(), (low - close.shift(1)).abs()],
        axis=1,
    ).max(axis=1)
    return tr.ewm(com=period - 1, min_periods=period).mean()


def _calc_direction_streak(close: pd.Series) -> pd.Series:
    """Signed count of consecutive up/down sessions."""
    diff = close.diff()
    streaks: list[float] = []
    current: float = 0.0
    for val in diff:
        if pd.isna(val) or val == 0:
            current = 0.0
        elif val > 0:
            current = current + 1 if current > 0 else 1.0
        else:
            current = current - 1 if current < 0 else -1.0
        streaks.append(current)
    return pd.Series(streaks, index=close.index, dtype=float)


def _rolling_percentile_rank(series: pd.Series, window: int = 252) -> pd.Series:
    """Within-window percentile rank; proxy for cross-sectional rank."""
    def _rank(x: np.ndarray) -> float:
        return float((x[:-1] < x[-1]).sum()) / (len(x) - 1) if len(x) >= 2 else 0.5

    return series.rolling(window, min_periods=10).apply(_rank, raw=True)


def _safe_float(val: Any) -> float:
    try:
        f = float(val)
        return 0.0 if (np.isnan(f) or np.isinf(f)) else f
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Feature matrix computation
# ---------------------------------------------------------------------------

def _build_features_df(
    df: pd.DataFrame,
    spy_ret_1d: pd.Series,
    market_breadth: pd.Series,
    vix: pd.Series,
) -> pd.DataFrame:
    """Compute all 57 FEATURE_COLS for every row in *df*."""
    close = df["Close"]
    open_ = df["Open"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"].clip(lower=1)

    feat = pd.DataFrame(index=df.index)

    # --- Price Structure (5) ---
    body_high = pd.concat([open_, close], axis=1).max(axis=1)
    body_low = pd.concat([open_, close], axis=1).min(axis=1)
    feat["close_open_ratio"] = close / open_.replace(0, np.nan) - 1
    feat["high_low_range"] = (high - low) / close.replace(0, np.nan)
    feat["upper_wick"] = (high - body_high) / close.replace(0, np.nan)
    feat["lower_wick"] = (body_low - low) / close.replace(0, np.nan)
    feat["body_size"] = (close - open_).abs() / close.replace(0, np.nan)

    # --- Returns (7) ---
    ret_1d = close.pct_change(1)
    feat["return_1d"] = ret_1d
    feat["return_5d"] = close.pct_change(5)
    feat["return_10d"] = close.pct_change(10)
    feat["return_20d"] = close.pct_change(20)
    feat["return_60d"] = close.pct_change(60)
    feat["return_120d"] = close.pct_change(120)
    feat["log_return_1d"] = np.log(close / close.shift(1).replace(0, np.nan))

    # --- MA Ratios (3) ---
    sma20 = close.rolling(20).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    sma5 = close.rolling(5).mean()
    feat["price_to_sma20"] = close / sma20.replace(0, np.nan) - 1
    feat["price_to_ema26"] = close / ema26.replace(0, np.nan) - 1
    feat["sma5_cross_sma20"] = sma5 / sma20.replace(0, np.nan) - 1

    # --- Momentum (10) ---
    feat["rsi_14"] = _calc_rsi(close, 14) / 100

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26_m = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26_m
    macd_sig = macd_line.ewm(span=9, adjust=False).mean()
    feat["macd_pct"] = macd_line / close.replace(0, np.nan)
    feat["macd_signal_pct"] = macd_sig / close.replace(0, np.nan)
    feat["macd_hist_pct"] = (macd_line - macd_sig) / close.replace(0, np.nan)

    feat["roc_10"] = close.pct_change(10)

    hh14 = high.rolling(14).max()
    ll14 = low.rolling(14).min()
    denom14 = (hh14 - ll14).replace(0, np.nan)
    feat["williams_r_14"] = -100 * (hh14 - close) / denom14 / 100
    stoch_k = 100 * (close - ll14) / denom14
    feat["stoch_k"] = stoch_k / 100
    feat["stoch_d"] = stoch_k.rolling(3).mean() / 100

    feat["direction_streak"] = _calc_direction_streak(close)
    feat["overnight_gap"] = open_ / close.shift(1).replace(0, np.nan) - 1

    # --- Volatility (6) ---
    bb_std = close.rolling(20).std()
    bb_upper = sma20 + 2 * bb_std
    bb_lower = sma20 - 2 * bb_std
    feat["bb_width"] = (bb_upper - bb_lower) / sma20.replace(0, np.nan)
    feat["bb_pct"] = (close - bb_lower) / (bb_upper - bb_lower).replace(0, np.nan)
    feat["atr_pct"] = _calc_atr(high, low, close, 14) / close.replace(0, np.nan)
    feat["volatility_5d"] = ret_1d.rolling(5).std()
    feat["volatility_10d"] = ret_1d.rolling(10).std()
    feat["volatility_20d"] = ret_1d.rolling(20).std()

    # --- Risk-Adjusted (2) ---
    feat["sharpe_5d"] = (
        ret_1d.rolling(5).mean() / ret_1d.rolling(5).std().replace(0, np.nan)
    )
    feat["sharpe_20d"] = (
        ret_1d.rolling(20).mean() / ret_1d.rolling(20).std().replace(0, np.nan)
    )

    # --- Volume (2) ---
    vol_ma20 = volume.rolling(20).mean()
    feat["volume_ratio"] = volume / vol_ma20.replace(0, np.nan)
    obv = (np.sign(close.diff()).fillna(0) * volume).cumsum()
    obv_std = obv.rolling(20).std()
    feat["obv_zscore"] = (obv - obv.rolling(20).mean()) / obv_std.replace(0, np.nan)

    # --- Lag Returns (5) ---
    for lag in range(1, 6):
        feat[f"lag_return_{lag}d"] = ret_1d.shift(lag)

    # --- Time (5) ---
    feat["day_of_week"] = df.index.dayofweek.astype(float)
    feat["month"] = df.index.month.astype(float)
    feat["quarter"] = df.index.quarter.astype(float)
    feat["is_month_end"] = df.index.is_month_end.astype(float)
    feat["is_quarter_end"] = df.index.is_quarter_end.astype(float)

    # --- Cross-Sectional Ranks (10) — percentile rank within rolling window ---
    _rank_pairs = [
        ("return_1d_xrank", "return_1d"),
        ("return_5d_xrank", "return_5d"),
        ("return_20d_xrank", "return_20d"),
        ("return_60d_xrank", "return_60d"),
        ("rsi_14_xrank", "rsi_14"),
        ("stoch_k_xrank", "stoch_k"),
        ("bb_pct_xrank", "bb_pct"),
        ("volume_ratio_xrank", "volume_ratio"),
        ("atr_pct_xrank", "atr_pct"),
        ("volatility_20d_xrank", "volatility_20d"),
    ]
    for out_col, src_col in _rank_pairs:
        feat[out_col] = _rolling_percentile_rank(feat[src_col])

    # --- Market-Wide (3) ---
    feat["market_return_1d"] = spy_ret_1d.reindex(df.index, method="ffill").fillna(0.0)
    feat["market_breadth"] = market_breadth.reindex(df.index, method="ffill").fillna(0.0)
    # VIX is 0–100; normalise to decimal annualised vol proxy
    feat["market_vol"] = vix.reindex(df.index, method="ffill").fillna(20.0) / 100.0

    return feat.replace([np.inf, -np.inf], 0.0).fillna(0.0)


# ---------------------------------------------------------------------------
# Row serialisation
# ---------------------------------------------------------------------------

def _row_to_dict(feat_row: pd.Series, ohlcv_row: pd.Series) -> dict[str, Any]:
    record: dict[str, Any] = {
        col: _safe_float(feat_row.get(col, 0.0)) for col in FEATURE_COLS
    }
    record["price"] = _safe_float(ohlcv_row["Close"])
    record["open"] = _safe_float(ohlcv_row["Open"])
    record["high"] = _safe_float(ohlcv_row["High"])
    record["low"] = _safe_float(ohlcv_row["Low"])
    record["volume"] = _safe_float(ohlcv_row["Volume"])
    record["change_pct"] = _safe_float(feat_row.get("return_1d", 0.0))
    idx = feat_row.name
    record["date"] = str(idx.date()) if hasattr(idx, "date") else str(idx)
    return record


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_live_feature_payload(
    symbol: str,
    history_rows: int = 30,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Fetch real-time OHLCV data and compute all 57 technical features.

    Results are cached for 5 minutes per ticker so repeated prediction
    requests do not re-hit Yahoo Finance.  SPY and VIX are fetched
    separately and aligned to the symbol's trading calendar.

    Args:
        symbol: Ticker symbol, e.g. ``"AAPL"``.
        history_rows: Preceding feature rows returned for LSTM input
            (default 30 covers any reasonable ``seq_len``).

    Returns:
        ``(symbol_data, history)`` — both dicts contain all 57
        ``FEATURE_COLS`` keys plus ``price``, ``open``, ``high``,
        ``low``, ``volume``, ``change_pct``, ``date``.

    Raises:
        ValueError: Symbol returned no data or has < 30 rows.
    """
    logger.info("build_live_feature_payload: symbol=%s", symbol)

    df = _fetch_ohlcv(symbol)
    if df.empty:
        raise ValueError(f"No market data returned for symbol: {symbol}")
    if len(df) < 30:
        raise ValueError(f"Insufficient history for {symbol}: {len(df)} rows")

    # --- SPY: market return + breadth proxy ---
    try:
        spy_df = _fetch_ohlcv("SPY")
        spy_ret_1d = spy_df["Close"].pct_change(1)
        # fraction of last-5 SPY sessions that closed positive → [-1, 1]
        market_breadth = np.sign(spy_ret_1d).rolling(5, min_periods=1).mean()
    except Exception as exc:
        logger.warning("SPY fetch failed (%s) — zeroing market features", exc)
        spy_ret_1d = pd.Series(0.0, index=df.index)
        market_breadth = pd.Series(0.0, index=df.index)

    # --- VIX: market volatility proxy ---
    try:
        vix_df = _fetch_ohlcv("^VIX")
        vix_series = vix_df["Close"] if not vix_df.empty else pd.Series(dtype=float)
    except Exception as exc:
        logger.warning("VIX fetch failed (%s) — using default 20.0", exc)
        vix_series = pd.Series(dtype=float)

    feat_df = _build_features_df(df, spy_ret_1d, market_breadth, vix_series)

    latest_idx = df.index[-1]
    symbol_data = _row_to_dict(feat_df.loc[latest_idx], df.loc[latest_idx])

    hist_start = max(0, len(df) - history_rows - 1)
    history = [
        _row_to_dict(feat_df.loc[idx], df.loc[idx])
        for idx in df.index[hist_start:-1]
    ]

    logger.info(
        "build_live_feature_payload: symbol=%s date=%s close=%.4f features=%d history=%d",
        symbol,
        symbol_data.get("date"),
        symbol_data.get("price", 0.0),
        len(FEATURE_COLS),
        len(history),
    )
    return symbol_data, history
