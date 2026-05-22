"""NHITS live inference module.

Loads the saved NeuralForecast model (NHITS_0.ckpt + configuration.pkl) from
the same directory as this file and runs close price forecasts for any symbol
whose OHLCV history can be fetched via yfinance.

H (forecast horizon) is read directly from the loaded model so the code works
regardless of which H was used at training time (10, 50, etc.).

Forecast results are in-process cached for 1 hour per symbol.
"""
from __future__ import annotations

import logging
import sys
import time
import types
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Directory that holds NHITS_0.ckpt / configuration.pkl / alias_to_model.pkl
_MODEL_DIR = Path(__file__).parent

# H and INPUT_SIZE are read from the loaded model after NeuralForecast.load().
# Defaults here are only used before the model loads (e.g. for min-row filtering).
_H_DEFAULT          = 50   # overwritten post-load from nf.models[0].h
_INPUT_SIZE_DEFAULT = 250  # overwritten post-load from nf.models[0].input_size
FREQ                = "B"

# 59 features — exact order from notebook cell-features
NHITS_FEATURE_COLS: list[str] = [
    # Price structure (5)
    "close_open_ratio", "high_low_range", "upper_wick", "lower_wick", "body_size",
    # Returns (7)
    "return_1d", "return_5d", "return_10d", "return_20d",
    "return_60d", "return_120d", "log_return_1d",
    # MA ratios (3)
    "price_to_sma20", "price_to_ema26", "sma5_cross_sma20",
    # Momentum (5)
    "rsi_14", "roc_10", "williams_r_14", "stoch_k", "stoch_d",
    # MACD normalised (3)
    "macd_pct", "macd_signal_pct", "macd_hist_pct",
    # Volatility (6)
    "bb_width", "bb_pct", "atr_pct",
    "volatility_5d", "volatility_10d", "volatility_20d",
    # Volume (2) — obv_zscore here, not at the end
    "volume_ratio", "obv_zscore",
    # Lag returns (5)
    "lag_return_1d", "lag_return_2d", "lag_return_3d", "lag_return_4d", "lag_return_5d",
    # Calendar / future exogenous (5)
    "day_of_week", "month", "quarter", "is_month_end", "is_quarter_end",
    # Candlestick extras (4)
    "overnight_gap", "direction_streak", "sharpe_5d", "sharpe_20d",
    # Cross-sectional ranks (10)
    "return_1d_xrank", "return_5d_xrank", "return_20d_xrank", "return_60d_xrank",
    "rsi_14_xrank", "stoch_k_xrank", "bb_pct_xrank",
    "volume_ratio_xrank", "atr_pct_xrank", "volatility_20d_xrank",
    # Market-wide (4) — includes sentiment_of_market
    "market_return_1d", "market_breadth", "market_vol", "sentiment_of_market",
]

FUTR_EXOG: list[str] = ["day_of_week", "month", "quarter", "is_month_end", "is_quarter_end"]
HIST_EXOG: list[str] = [c for c in NHITS_FEATURE_COLS if c not in FUTR_EXOG]

# Clip bounds matching notebook cell-load
_CLIP_BOUNDS: dict[str, tuple[float, float]] = {
    "sharpe_5d":        (-50,  50),
    "sharpe_20d":       (-50,  50),
    "direction_streak": (-30,  30),
    "return_60d":       (-1,   10),
    "return_120d":      (-1,   20),
    "overnight_gap":    (-0.5, 0.5),
    "volatility_5d":    (0,    1),
    "volatility_10d":   (0,    1),
    "volatility_20d":   (0,    1),
}

# ── Ray stub (no Python 3.13 wheels) ─────────────────────────────────────────

def _stub_ray() -> None:
    """Inject empty ray modules before neuralforecast tries to import them."""
    _ray_mods = [
        "ray", "ray.air", "ray.air.config",
        "ray.tune", "ray.tune.integration",
        "ray.tune.integration.pytorch_lightning",
        "ray.tune.schedulers", "ray.tune.schedulers.async_hyperband",
        "ray.tune.schedulers.hb_bohb",
        "ray.tune.search", "ray.tune.search.optuna",
        "ray.tune.search.basic_variant", "ray.tune.search.sample",
        "ray.tune.search.variant_generator",
        "ray.tune.logger", "ray.tune.result", "ray.tune.utils",
        "ray.tune.utils.placement_groups",
        "ray.tune.experiment", "ray.tune.experiment.trial",
        "ray.tune.execution", "ray.tune.execution.placement_groups",
    ]
    for name in _ray_mods:
        if name not in sys.modules:
            m = types.ModuleType(name)
            m.__path__ = []
            m.__package__ = name
            sys.modules[name] = m
            parts = name.split(".")
            if len(parts) > 1:
                parent = sys.modules.get(".".join(parts[:-1]))
                if parent:
                    setattr(parent, parts[-1], m)

    class _Dummy:
        def __init__(self, *a, **kw): pass
        def __call__(self, *a, **kw): pass
        def __getattr__(self, n): return _Dummy()

    for mod_name, attrs in [
        ("ray.tune.integration.pytorch_lightning",
         ["TuneReportCallback", "TuneReportCheckpointCallback"]),
        ("ray.tune.search.basic_variant", ["BasicVariantGenerator"]),
        ("ray.tune.search.optuna",        ["OptunaSearch"]),
        ("ray.tune.search.sample",        ["Domain", "Float", "Integer", "Categorical"]),
        ("ray.tune.schedulers",
         ["ASHAScheduler", "HyperBandScheduler", "PopulationBasedTraining"]),
        ("ray.tune.search.variant_generator", ["generate_variants"]),
    ]:
        for attr in attrs:
            setattr(sys.modules[mod_name], attr, _Dummy)

    tune = sys.modules["ray.tune"]
    tune.choice      = lambda x: x[0] if x else None  # type: ignore[attr-defined]
    tune.uniform     = lambda a, b: a                  # type: ignore[attr-defined]
    tune.loguniform  = lambda a, b: a                  # type: ignore[attr-defined]
    tune.randint     = lambda a, b: a                  # type: ignore[attr-defined]
    tune.grid_search = lambda x: x[0] if x else None  # type: ignore[attr-defined]
    tune.run         = _Dummy()                        # type: ignore[attr-defined]
    tune.Tuner       = _Dummy                          # type: ignore[attr-defined]
    tune.TuneConfig  = _Dummy                          # type: ignore[attr-defined]
    tune.RunConfig   = _Dummy                          # type: ignore[attr-defined]


_stub_ray()

# ── Model loader (lazy, singleton) ───────────────────────────────────────────

_nf_model: Any = None
_load_attempted = False


def _get_nf_model() -> Any:
    global _nf_model, _load_attempted
    if _load_attempted:
        return _nf_model
    _load_attempted = True

    ckpt = _MODEL_DIR / "NHITS_0.ckpt"
    cfg  = _MODEL_DIR / "configuration.pkl"
    if not ckpt.exists() or not cfg.exists():
        logger.warning(
            "NHITS model files not found in %s — forecast endpoint disabled", _MODEL_DIR
        )
        return None

    try:
        from neuralforecast import NeuralForecast  # noqa: PLC0415
        logger.info("Loading NeuralForecast NHITS from %s", _MODEL_DIR)
        _nf_model = NeuralForecast.load(str(_MODEL_DIR))
        logger.info("NHITS model loaded — H=%s", getattr(_nf_model.models[0], "h", "?"))
    except Exception as exc:
        logger.error("NHITS model load failed: %s", exc, exc_info=True)
        _nf_model = None
    return _nf_model


def preload() -> bool:
    """Call at app startup to surface load errors early. Returns True if loaded."""
    return _get_nf_model() is not None


def _get_h() -> int:
    """Return the actual horizon from the loaded model, or the default."""
    m = _get_nf_model()
    if m is not None:
        try:
            return int(m.models[0].h)
        except Exception:
            pass
    return _H_DEFAULT


def _get_input_size() -> int:
    """Return the actual input_size from the loaded model, or the default."""
    m = _get_nf_model()
    if m is not None:
        try:
            return int(m.models[0].input_size)
        except Exception:
            pass
    return _INPUT_SIZE_DEFAULT


# ── In-process TTL cache ──────────────────────────────────────────────────────

_CACHE_TTL = 3600.0  # seconds
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _cache_get(symbol: str) -> dict[str, Any] | None:
    entry = _cache.get(symbol)
    if entry and (time.monotonic() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None


def _cache_put(symbol: str, result: dict[str, Any]) -> None:
    _cache[symbol] = (time.monotonic(), result)


# ── Feature-building helpers ──────────────────────────────────────────────────

def _build_nf_df(symbol: str, history_rows: int = 450) -> pd.DataFrame | None:
    """
    Fetch OHLCV + compute all 59 features → NeuralForecast long-format DataFrame.

    Re-uses the existing market_data pipeline, then adds `sentiment_of_market`
    (identical to `market_breadth` — 1 if SPY closed up, else 0) which is the
    extra market-wide feature present in the training data but absent from the
    backend's default FEATURE_COLS.
    """
    try:
        from ..data.market_data import build_live_feature_payload  # noqa: PLC0415
        symbol_data, history = build_live_feature_payload(symbol, history_rows=history_rows)
    except ValueError as exc:
        logger.warning("NHITS: market data unavailable for %s — %s", symbol, exc)
        return None

    all_records = history + [symbol_data]
    _h   = _get_h()
    _inp = _get_input_size()
    if len(all_records) < _inp + _h:
        logger.warning(
            "NHITS: insufficient history for %s (%d rows, need %d)",
            symbol, len(all_records), _inp + _h,
        )
        return None

    rows: list[dict[str, Any]] = []
    for rec in all_records:
        row: dict[str, Any] = {
            "unique_id": symbol,
            "ds":        pd.to_datetime(rec["date"]),
            "y":         float(rec.get("price", 0.0)),
        }
        for col in NHITS_FEATURE_COLS:
            if col == "sentiment_of_market":
                # Equivalent to market_breadth: 1.0 if SPY was up, else 0.0
                row[col] = float(rec.get("market_breadth", 0.0))
            else:
                row[col] = float(rec.get(col, 0.0))
        rows.append(row)

    nf_df = (
        pd.DataFrame(rows)
        .sort_values("ds")
        .reset_index(drop=True)
    )

    # Apply clip bounds
    for col, (lo, hi) in _CLIP_BOUNDS.items():
        if col in nf_df.columns:
            nf_df[col] = nf_df[col].clip(lo, hi)

    # Replace any remaining inf / NaN
    num_cols = nf_df.select_dtypes(include=[np.number]).columns
    nf_df[num_cols] = nf_df[num_cols].replace([np.inf, -np.inf], 0.0).fillna(0.0)

    return nf_df


def _build_futr_df(nf_df: pd.DataFrame) -> pd.DataFrame:
    """Generate H future business-day rows with calendar features only."""
    last_date = nf_df["ds"].max()
    future_dates = pd.bdate_range(
        start=last_date + pd.Timedelta(days=1),
        periods=_get_h(),
        freq=FREQ,
    )
    rows = [
        {
            "unique_id":      nf_df["unique_id"].iloc[0],
            "ds":             dt,
            "day_of_week":    dt.dayofweek,
            "month":          dt.month,
            "quarter":        dt.quarter,
            "is_month_end":   int(dt.is_month_end),
            "is_quarter_end": int(dt.is_quarter_end),
        }
        for dt in future_dates
    ]
    futr_df = pd.DataFrame(rows)
    futr_df["ds"] = pd.to_datetime(futr_df["ds"])
    return futr_df


# ── Public API ────────────────────────────────────────────────────────────────

def get_nhits_forecast(symbol: str) -> dict[str, Any] | None:
    """
    Return an N-day close price forecast for *symbol* (N = model's trained horizon).

    Result shape
    ------------
    {
      "symbol":   str,
      "horizon":  int,
      "forecast": [{"date": "YYYY-MM-DD", "close": float}, ...],  # horizon items
      "summary":  {
          "last_close":              float,
          "close_day1":              float,
          "close_day50":             float,   # last forecast day (regardless of H)
          "expected_return_50d_pct": float,   # return over the full horizon
          "close_min":               float,
          "close_max":               float,
      }
    }
    Returns None when the model is not loaded or data is unavailable.
    """
    sym = symbol.strip().upper()

    cached = _cache_get(sym)
    if cached is not None:
        logger.debug("NHITS cache hit: %s", sym)
        return cached

    nf = _get_nf_model()
    if nf is None:
        return None

    nf_df = _build_nf_df(sym)
    if nf_df is None:
        return None

    futr_df = _build_futr_df(nf_df)

    try:
        raw = nf.predict(df=nf_df, futr_df=futr_df)
    except Exception as exc:
        logger.error("NHITS predict failed for %s: %s", sym, exc, exc_info=True)
        return None

    if "unique_id" not in raw.columns:
        raw = raw.reset_index()

    pred_col = next(c for c in raw.columns if c not in ("unique_id", "ds"))
    preds = raw[pred_col].clip(lower=0).tolist()

    h          = _get_h()
    last_close = float(nf_df["y"].iloc[-1])
    day1       = float(preds[0])  if preds else last_close
    day_last   = float(preds[-1]) if preds else last_close

    result: dict[str, Any] = {
        "symbol":  sym,
        "horizon": h,
        "forecast": [
            {"date": row["ds"].strftime("%Y-%m-%d"), "close": round(float(row[pred_col]), 4)}
            for _, row in raw.iterrows()
        ],
        "summary": {
            "last_close":              round(last_close, 4),
            "close_day1":              round(day1,       4),
            "close_day50":             round(day_last,   4),
            "expected_return_50d_pct": round((day_last - last_close) / (last_close + 1e-8) * 100, 2),
            "close_min":               round(min(preds), 4),
            "close_max":               round(max(preds), 4),
        },
    }
    _cache_put(sym, result)
    return result


def invalidate_cache(symbol: str | None = None) -> None:
    """Clear cached forecast. Pass symbol to clear one entry, or None for all."""
    if symbol:
        _cache.pop(symbol.strip().upper(), None)
    else:
        _cache.clear()
