"""Feature engineering for prediction models."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Must match the exact training-time order from 04_model_training - Copy.ipynb.
FEATURE_COLS: list[str] = [
    # Price Structure (5)
    "close_open_ratio", "high_low_range", "upper_wick", "lower_wick", "body_size",
    # Returns (7)
    "return_1d", "return_5d", "return_10d", "return_20d",
    "return_60d", "return_120d", "log_return_1d",
    # MA Ratios (3)
    "price_to_sma20", "price_to_ema26", "sma5_cross_sma20",
    # Momentum (10)
    "rsi_14", "macd_pct", "macd_signal_pct", "macd_hist_pct",
    "roc_10", "williams_r_14", "stoch_k", "stoch_d",
    "direction_streak", "overnight_gap",
    # Volatility (6)
    "bb_width", "bb_pct", "atr_pct",
    "volatility_5d", "volatility_10d", "volatility_20d",
    # Risk-Adjusted (2)
    "sharpe_5d", "sharpe_20d",
    # Volume (2)
    "volume_ratio", "obv_zscore",
    # Lag Returns (5)
    "lag_return_1d", "lag_return_2d", "lag_return_3d", "lag_return_4d", "lag_return_5d",
    # Time (5)
    "day_of_week", "month", "quarter", "is_month_end", "is_quarter_end",
    # Cross-Sectional Ranks (10)
    "return_1d_xrank", "return_5d_xrank", "return_20d_xrank", "return_60d_xrank",
    "rsi_14_xrank", "stoch_k_xrank", "bb_pct_xrank",
    "volume_ratio_xrank", "atr_pct_xrank", "volatility_20d_xrank",
    # Market-Wide (3)
    "market_return_1d", "market_breadth", "market_vol",
]

DEFAULT_LSTM_SEQ_LEN = 10
LEGACY_SEQ_LEN = 5


def _is_full_feature_payload(data: dict[str, Any]) -> bool:
    return all(col in data for col in FEATURE_COLS)


def _extract_legacy_features(data: dict[str, Any]) -> np.ndarray:
    features: list[float] = []
    if "price" in data:
        features.append(float(data["price"]))
    if "high" in data and "low" in data:
        price_range = float(data.get("high", 0)) - float(data.get("low", 0))
        features.append(price_range)
    if "volume" in data:
        features.append(float(data["volume"]))
    if "change_pct" in data:
        features.append(float(data["change_pct"]))

    while len(features) < 4:
        features.append(0.0)

    return np.array(features[:4], dtype=np.float32)


def extract_technical_features(data: dict[str, Any]) -> np.ndarray:
    """
    Extract technical features from stock data.

    Args:
        data: Dictionary containing stock data with keys like 'price', 'volume', 'high', 'low', etc.

    Returns:
        Feature array (1D numpy array)
    """
    if _is_full_feature_payload(data):
        return np.array([float(data[col]) for col in FEATURE_COLS], dtype=np.float32)

    return _extract_legacy_features(data)


def extract_sequence_features(
    history: list[dict[str, Any]], seq_len: int = DEFAULT_LSTM_SEQ_LEN
) -> np.ndarray:
    """
    Extract sequence features from historical data.

    Args:
        history: List of historical data points (must be sorted by time, ascending)
        seq_len: Length of sequence to extract

    Returns:
        Sequence array (seq_len,) for LSTM input
    """
    if not history:
        return np.zeros(seq_len, dtype=np.float32)

    # Full pipeline mode: 2D sequence matrix for LSTM (seq_len, n_features)
    dict_items = [item for item in history if isinstance(item, dict)]
    if dict_items and _is_full_feature_payload(dict_items[0]):
        rows = [extract_technical_features(item) for item in dict_items]
        while len(rows) < seq_len:
            rows.append(rows[-1].copy())
        return np.vstack(rows[-seq_len:]).astype(np.float32)

    # Legacy mode: 1D price sequence for tests/compatibility.
    prices: list[float] = []
    for item in history:
        if isinstance(item, dict) and "price" in item:
            prices.append(float(item["price"]))
        elif isinstance(item, (int, float)):
            prices.append(float(item))

    if not prices:
        prices = [0.0]
    while len(prices) < seq_len:
        prices.append(prices[-1])
    return np.array(prices[-seq_len:], dtype=np.float32)


def normalize_features(features: np.ndarray) -> np.ndarray:
    """Normalize features to [-1, 1] range."""
    min_val = features.min()
    max_val = features.max()

    if max_val == min_val:
        return np.zeros_like(features)

    return 2 * (features - min_val) / (max_val - min_val) - 1


def prepare_prediction_input(
    symbol_data: dict[str, Any], history: list[dict[str, Any]] | None = None, seq_len: int = LEGACY_SEQ_LEN
) -> tuple[np.ndarray, np.ndarray | None]:
    """
    Prepare features and sequences for ensemble prediction.

    Args:
        symbol_data: Current symbol data
        history: Historical data for sequence extraction

    Returns:
        Tuple of (features, sequences) where sequences can be None
    """
    features = extract_technical_features(symbol_data).reshape(1, -1)

    # Extract sequences if history available
    sequences = None
    if history:
        try:
            # Full feature mode keeps 3D shape expected by LSTM wrapper.
            if _is_full_feature_payload(symbol_data):
                seq_rows = list(history)
                seq_rows.append(symbol_data)
                seq = extract_sequence_features(seq_rows, seq_len=seq_len)
                sequences = seq.reshape(1, seq_len, len(FEATURE_COLS))
            else:
                # Legacy mode used by existing tests.
                seq = extract_sequence_features(history, seq_len=seq_len)
                sequences = seq.reshape(1, -1)
        except Exception as e:
            logger.warning(f"Failed to extract sequences: {e}")

    return features, sequences

