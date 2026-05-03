"""Feature engineering for prediction models."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def extract_technical_features(data: dict[str, Any]) -> np.ndarray:
    """
    Extract technical features from stock data.

    Args:
        data: Dictionary containing stock data with keys like 'price', 'volume', 'high', 'low', etc.

    Returns:
        Feature array (1D numpy array)
    """
    features = []

    # Price-based features
    if "price" in data:
        features.append(float(data["price"]))
    if "high" in data and "low" in data:
        price_range = float(data.get("high", 0)) - float(data.get("low", 0))
        features.append(price_range)
    if "volume" in data:
        features.append(float(data["volume"]))
    if "change_pct" in data:
        features.append(float(data["change_pct"]))

    # Use default values if features are missing
    while len(features) < 4:
        features.append(0.0)

    return np.array(features[:4], dtype=np.float32)


def extract_sequence_features(
    history: list[dict[str, Any]], seq_len: int = 5
) -> np.ndarray:
    """
    Extract sequence features from historical data.

    Args:
        history: List of historical data points (must be sorted by time, ascending)
        seq_len: Length of sequence to extract

    Returns:
        Sequence array (seq_len,) for LSTM input
    """
    prices = []

    for item in history:
        if isinstance(item, dict) and "price" in item:
            prices.append(float(item["price"]))
        elif isinstance(item, (int, float)):
            prices.append(float(item))

    # Ensure we have at least seq_len data points
    if len(prices) < seq_len:
        prices = prices + [prices[-1] if prices else 0.0] * (seq_len - len(prices))

    # Take the last seq_len points
    prices = prices[-seq_len:]

    return np.array(prices, dtype=np.float32)


def normalize_features(features: np.ndarray) -> np.ndarray:
    """Normalize features to [-1, 1] range."""
    min_val = features.min()
    max_val = features.max()

    if max_val == min_val:
        return np.zeros_like(features)

    return 2 * (features - min_val) / (max_val - min_val) - 1


def prepare_prediction_input(
    symbol_data: dict[str, Any], history: list[dict[str, Any]] | None = None
) -> tuple[np.ndarray, np.ndarray | None]:
    """
    Prepare features and sequences for ensemble prediction.

    Args:
        symbol_data: Current symbol data
        history: Historical data for sequence extraction

    Returns:
        Tuple of (features, sequences) where sequences can be None
    """
    # Extract and normalize features
    features = extract_technical_features(symbol_data)
    features = normalize_features(features).reshape(1, -1)

    # Extract sequences if history available
    sequences = None
    if history:
        try:
            seq = extract_sequence_features(history, seq_len=5)
            sequences = seq.reshape(1, -1)
        except Exception as e:
            logger.warning(f"Failed to extract sequences: {e}")

    return features, sequences

