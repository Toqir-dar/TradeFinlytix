"""XGBoost base model wrapper."""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np

logger = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).parent


class XGBModelWrapper:
    """Wrapper for XGBoost base model."""

    def __init__(self):
        self.model = None
        self.is_loaded = False

    def load(self) -> bool:
        """Load the XGBoost model from disk."""
        try:
            self.model = joblib.load(MODEL_DIR / "xgb_model.pkl")
            self.is_loaded = True
            logger.info("XGBoost model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load XGBoost model: {e}", exc_info=True)
            return False

    def predict(self, features: np.ndarray) -> np.ndarray:
        """Make predictions on features."""
        if not self.is_loaded:
            raise ValueError("Model not loaded")
        return self.model.predict(features)

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        """Get probabilities (for binary classification)."""
        if not self.is_loaded:
            raise ValueError("Model not loaded")
        proba = self.model.predict_proba(features)
        return proba if proba.ndim == 2 else np.column_stack([1 - proba, proba])


# Global instance
_xgb_model = None


def get_xgb_model() -> XGBModelWrapper:
    """Get or initialize XGBoost model."""
    global _xgb_model
    if _xgb_model is None:
        _xgb_model = XGBModelWrapper()
        _xgb_model.load()
    return _xgb_model
