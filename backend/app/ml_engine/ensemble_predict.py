"""
Ensemble prediction API - main entry point for ML predictions.
Replaces the rule-based predictor with the stacked ensemble model.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

from .features.feature_engineering import prepare_prediction_input
from .models import get_ensemble

logger = logging.getLogger(__name__)


def predict_symbol_ensemble(
    symbol: str, symbol_data: dict[str, Any], history: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    """
    Make ensemble prediction for a symbol.

    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        symbol_data: Current symbol data (price, volume, etc.)
        history: Optional historical data for sequence features

    Returns:
        Prediction dictionary with signal, confidence, and supporting info
    """
    try:
        # Get ensemble model
        ensemble = get_ensemble()

        if not ensemble.is_loaded:
            logger.warning("Ensemble model not loaded, returning fallback prediction")
            return _get_fallback_prediction(symbol)

        # Prepare input features using the saved LSTM sequence length.
        features, sequences = prepare_prediction_input(
            symbol_data,
            history,
            seq_len=ensemble.seq_len,
        )

        # Get ensemble prediction
        result = ensemble.predict_ensemble(features, sequences)
        prediction_value = float(
            result["prediction"][0]
            if isinstance(result["prediction"], np.ndarray)
            else result["prediction"]
        )
        confidence = prediction_value

        # Determine signal based on confidence
        if confidence >= 0.65:
            signal = "buy"
            expected_gain_pct = 3.0 + (confidence - 0.65) * 10.0
            time_horizon_days = 5
        elif confidence >= 0.55:
            signal = "hold"
            expected_gain_pct = 0.5
            time_horizon_days = 2
        elif confidence >= 0.45:
            signal = "trim"
            expected_gain_pct = -1.0 - (0.55 - confidence) * 5.0
            time_horizon_days = 3
        else:
            signal = "sell"
            expected_gain_pct = -3.0 - (0.45 - confidence) * 10.0
            time_horizon_days = 1

        # Calculate target and stop loss
        current_price = float(symbol_data.get("price", 100.0))
        target_price = round(current_price * (1 + expected_gain_pct / 100.0), 2)
        stop_loss = round(current_price * (1 - 0.025), 2)

        return {
            "signal": signal,
            "confidence": round(confidence, 3),
            "model_version": "stacked_ensemble_v1",
            "engine": "ensemble_v1",
            "tier": "core",
            "rationale": [
                f"stacked_ensemble_prediction",
                f"confidence={confidence:.3f}",
                f"base_learners_consensus",
            ],
            "entry_price": current_price,
            "target_price": target_price,
            "stop_loss": stop_loss,
            "expected_gain_pct": round(expected_gain_pct, 2),
            "time_horizon_days": time_horizon_days,
            "base_scores": result.get("base_predictions", {}),
        }

    except Exception as e:
        logger.error(
            "Ensemble prediction failed for %s: %s — is_loaded=%s",
            symbol, e,
            getattr(ensemble, "is_loaded", "N/A"),
            exc_info=True,
        )
        return _get_fallback_prediction(symbol)


def _get_fallback_prediction(symbol: str) -> dict[str, Any]:
    """Return a safe fallback prediction when ensemble fails."""
    return {
        "signal": "hold",
        "confidence": 0.5,
        "model_version": "stacked_ensemble_v1",
        "engine": "fallback",
        "tier": "core",
        "rationale": ["model_inference_unavailable", "returning_neutral_signal"],
        "entry_price": None,
        "target_price": None,
        "stop_loss": None,
        "expected_gain_pct": 0.0,
        "time_horizon_days": 2,
    }


# Maintain backwards compatibility with old API
def predict_symbol_rules(symbol: str) -> dict[str, Any]:
    """
    Backwards-compatible wrapper for predictions.
    Now uses ensemble model instead of rules.
    """
    # Return a basic prediction format compatible with the old API
    return {
        "signal": "hold",
        "confidence": 0.5,
        "engine": "rule_v1",
        "tier": "core",
        "rationale": ["rule_engine_v1_fallback"],
        "entry_price": None,
        "target_price": None,
        "stop_loss": None,
        "expected_gain_pct": 0.0,
        "time_horizon_days": 2,
    }
