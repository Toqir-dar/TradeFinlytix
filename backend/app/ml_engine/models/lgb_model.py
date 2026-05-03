"""LightGBM base model wrapper."""
from __future__ import annotations

import logging
import pickle
from pathlib import Path

import numpy as np

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

logger = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).parent


class LGBModelWrapper:
    """Wrapper for LightGBM base model."""

    def __init__(self):
        self.model = None
        self.is_loaded = False

    def load(self) -> bool:
        """Load the LightGBM model from disk."""
        if lgb is None:
            logger.warning("LightGBM not installed, skipping model load")
            return False

        try:
            with open(MODEL_DIR / "lgb_model.pkl", "rb") as f:
                self.model = pickle.load(f)
            self.is_loaded = True
            logger.info("LightGBM model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load LightGBM model: {e}", exc_info=True)
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
        preds = self.model.predict_proba(features)
        return preds if preds.ndim == 2 else np.column_stack([1 - preds, preds])


# Global instance
_lgb_model = None


def get_lgb_model() -> LGBModelWrapper:
    """Get or initialize LightGBM model."""
    global _lgb_model
    if _lgb_model is None:
        _lgb_model = LGBModelWrapper()
        _lgb_model.load()
    return _lgb_model
