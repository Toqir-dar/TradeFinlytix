"""XGBoost base model wrapper."""
from __future__ import annotations

import logging
import pickle
from pathlib import Path

import numpy as np
import xgboost as xgb

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
            self.model = xgb.Booster()
            self.model.load_model(str(MODEL_DIR / "xgb_model.pkl"))
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

        dmatrix = xgb.DMatrix(features)
        return self.model.predict(dmatrix)

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        """Get probabilities (for binary classification)."""
        preds = self.predict(features)
        return np.column_stack([1 - preds, preds])


# Global instance
_xgb_model = None


def get_xgb_model() -> XGBModelWrapper:
    """Get or initialize XGBoost model."""
    global _xgb_model
    if _xgb_model is None:
        _xgb_model = XGBModelWrapper()
        _xgb_model.load()
    return _xgb_model
