"""Real-time market data fetching and 58-feature engineering for the prediction pipeline."""
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
    """Download 2 years of daily OHLCV for *symbol*; results cached for 5 min.

    PSX tickers (Pakistan Stock Exchange) that return no data bare are retried
    with the Yahoo Finance ``.KA`` suffix automatically.
    """
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    def _download(sym: str) -> pd.DataFrame:
        ticker = yf.Ticker(sym)
        raw = ticker.history(period="2y", interval="1d", auto_adjust=True)
        if isinstance(raw.columns, pd.MultiIndex):
            raw.columns = raw.columns.get_level_values(0)
        for col in ("Open", "High", "Low", "Close", "Volume"):
            if col not in raw.columns:
                return pd.DataFrame()
        raw = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
        raw = raw.dropna(subset=["Open", "High", "Low", "Close"])
        if getattr(raw.index, "tz", None) is not None:
            raw.index = raw.index.tz_localize(None)
        return raw

    df = _download(symbol)

    # PSX fallback: retry with .KA suffix for Karachi-listed tickers.
    if df.empty and not symbol.endswith(".KA"):
        ka_symbol = symbol + ".KA"
        logger.debug("Empty data for %s — retrying as %s", symbol, ka_symbol)
        df = _download(ka_symbol)

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
    spy_atr_pct: pd.Series,
) -> pd.DataFrame:
    """
    Compute all 59 FEATURE_COLS for every row in *df*.

    Formulas mirror 01_feature_engineering + 03_preprocessing_fix notebooks exactly:
    - Price structure uses open as denominator (not close)
    - RSI, Stochastic, Williams %R on native 0-100 / -100-0 scale (not /100)
    - ROC multiplied by 100
    - price_to_sma20/ema26 are plain ratios (no -1)
    - sma5_cross_sma20 is binary 0/1
    - Sharpe = returnXd / (volatilityXd + 1e-8)
    - MACD normalised (÷close) added at end
    - OBV z-scored (rolling 20-day) added at end
    - sentiment_of_market = 1 if SPY closed up, else 0
    """
    close = df["Close"]
    open_ = df["Open"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"].clip(lower=1)
    open_safe = open_.replace(0, np.nan)

    feat = pd.DataFrame(index=df.index)

    # --- Price Structure (5) — denominator is OPEN as in training ---
    body_high = pd.concat([open_, close], axis=1).max(axis=1)
    body_low = pd.concat([open_, close], axis=1).min(axis=1)
    feat["close_open_ratio"] = (close - open_) / open_safe
    feat["high_low_range"] = (high - low) / open_safe
    feat["upper_wick"] = (high - body_high) / open_safe
    feat["lower_wick"] = (body_low - low) / open_safe
    feat["body_size"] = (close - open_).abs() / open_safe

    # --- Returns (7) ---
    ret_1d = close.pct_change(1)
    ret_5d = close.pct_change(5)
    ret_20d = close.pct_change(20)
    feat["return_1d"] = ret_1d
    feat["return_5d"] = ret_5d
    feat["return_10d"] = close.pct_change(10)
    feat["return_20d"] = ret_20d
    feat["return_60d"] = close.pct_change(60)
    feat["return_120d"] = close.pct_change(120)
    feat["log_return_1d"] = np.log(close / close.shift(1).replace(0, np.nan))

    # --- MA Ratios (3) — plain ratio, NO -1 subtraction ---
    sma20 = close.rolling(20).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    sma5 = close.rolling(5).mean()
    feat["price_to_sma20"] = close / sma20.replace(0, np.nan)
    feat["price_to_ema26"] = close / ema26.replace(0, np.nan)
    feat["sma5_cross_sma20"] = (sma5 > sma20).astype(float)  # binary 0/1

    # --- Momentum (5) — native scales matching training ---
    # RSI on 0-100 (NOT divided by 100)
    feat["rsi_14"] = _calc_rsi(close, 14)
    # ROC multiplied by 100 to give percentage (matches training * 100)
    feat["roc_10"] = close.pct_change(10) * 100
    # Williams %R on -100..0 (NOT divided by 100)
    hh14 = high.rolling(14).max()
    ll14 = low.rolling(14).min()
    denom14 = (hh14 - ll14).replace(0, np.nan)
    feat["williams_r_14"] = -100 * (hh14 - close) / denom14
    # Stochastic on 0-100 (NOT divided by 100)
    stoch_k = 100 * (close - ll14) / denom14
    feat["stoch_k"] = stoch_k
    feat["stoch_d"] = stoch_k.rolling(3).mean()

    # --- Volatility (6) ---
    bb_std = close.rolling(20).std()
    bb_upper = sma20 + 2 * bb_std
    bb_lower = sma20 - 2 * bb_std
    feat["bb_width"] = (bb_upper - bb_lower) / sma20.replace(0, np.nan)
    feat["bb_pct"] = (close - bb_lower) / (bb_upper - bb_lower).replace(0, np.nan)
    feat["atr_pct"] = _calc_atr(high, low, close, 14) / close.replace(0, np.nan)
    vol_5d = ret_1d.rolling(5).std()
    vol_10d = ret_1d.rolling(10).std()
    vol_20d = ret_1d.rolling(20).std()
    feat["volatility_5d"] = vol_5d
    feat["volatility_10d"] = vol_10d
    feat["volatility_20d"] = vol_20d

    # --- Volume (1) — obv_zscore added at end ---
    vol_ma20 = volume.rolling(20).mean()
    feat["volume_ratio"] = volume / vol_ma20.replace(0, np.nan)

    # --- Lag Returns (5) ---
    for lag in range(1, 6):
        feat[f"lag_return_{lag}d"] = ret_1d.shift(lag)

    # --- Time (5) ---
    feat["day_of_week"] = df.index.dayofweek.astype(float)
    feat["month"] = df.index.month.astype(float)
    feat["quarter"] = df.index.quarter.astype(float)
    feat["is_month_end"] = df.index.is_month_end.astype(float)
    feat["is_quarter_end"] = df.index.is_quarter_end.astype(float)

    # --- V2 additions (4) — match pipeline order from training ---
    feat["overnight_gap"] = (open_ - close.shift(1)) / close.shift(1).replace(0, np.nan)
    feat["direction_streak"] = _calc_direction_streak(close)
    # Sharpe = period return / period volatility (matches training: return_Xd / (vol_Xd + 1e-8))
    feat["sharpe_5d"] = ret_5d / (vol_5d + 1e-8)
    feat["sharpe_20d"] = ret_20d / (vol_20d + 1e-8)

    # --- Cross-Sectional Ranks (10) — rolling percentile within symbol's own history ---
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
    feat["market_breadth"] = (spy_ret_1d > 0).astype(float).reindex(
        df.index, method="ffill"
    ).fillna(0.0)
    feat["market_vol"] = spy_atr_pct.reindex(df.index, method="ffill").fillna(0.015)

    # --- MACD normalised (3) — added by 03_preprocessing_fix, at end ---
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26_m = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26_m
    macd_sig = macd_line.ewm(span=9, adjust=False).mean()
    close_safe = close.replace(0, np.nan)
    feat["macd_pct"] = macd_line / close_safe
    feat["macd_signal_pct"] = macd_sig / close_safe
    feat["macd_hist_pct"] = (macd_line - macd_sig) / close_safe

    # --- OBV z-scored (1) — added by 03_preprocessing_fix, at end ---
    obv = (np.sign(close.diff()).fillna(0) * volume).cumsum()
    obv_std = obv.rolling(20).std()
    feat["obv_zscore"] = (obv - obv.rolling(20).mean()) / obv_std.replace(0, np.nan)

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
    Fetch real-time OHLCV data and compute all 59 technical features.

    Results are cached for 5 minutes per ticker so repeated prediction
    requests do not re-hit Yahoo Finance.  SPY is fetched for market-wide
    features and aligned to the symbol's trading calendar.

    Args:
        symbol: Ticker symbol, e.g. ``"AAPL"``.
        history_rows: Preceding feature rows returned for LSTM input
            (default 30 covers any reasonable ``seq_len``).

    Returns:
        ``(symbol_data, history)`` — both dicts contain all 59
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

    # --- SPY: market return, breadth, vol proxy ---
    try:
        spy_df = _fetch_ohlcv("SPY")
        spy_ret_1d = spy_df["Close"].pct_change(1)
        spy_atr_pct = (
            _calc_atr(spy_df["High"], spy_df["Low"], spy_df["Close"], 14)
            / spy_df["Close"].replace(0, np.nan)
        )
    except Exception as exc:
        logger.warning("SPY fetch failed (%s) — zeroing market features", exc)
        spy_ret_1d = pd.Series(0.0, index=df.index)
        spy_atr_pct = pd.Series(0.015, index=df.index)

    feat_df = _build_features_df(df, spy_ret_1d, spy_atr_pct)

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
