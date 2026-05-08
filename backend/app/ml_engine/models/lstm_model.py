"""LSTM base model wrapper."""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np

try:
    from tensorflow import keras
except ImportError:
    keras = None

logger = logging.getLogger(__name__)
MODEL_DIR = Path(__file__).parent


class LSTMModelWrapper:
    """Wrapper for LSTM base model."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_loaded = False

    def load(self) -> bool:
        """Load the LSTM model and scaler from disk."""
        if keras is None:
            logger.warning("TensorFlow/Keras not installed, skipping LSTM load")
            return False

        try:
            self.model = keras.models.load_model(str(MODEL_DIR / "lstm_model.keras"))
            self.scaler = joblib.load(MODEL_DIR / "lstm_scaler.pkl")
            self.is_loaded = True
            logger.info("LSTM model and scaler loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load LSTM model: {e}", exc_info=True)
            return False

    def preprocess_sequences(self, sequences: np.ndarray) -> np.ndarray:
        """Scale sequences using the RobustScaler fit on training features.

        sequences shape: (batch, seq_len, n_features)
        The scaler was fit on (n_samples, n_features), so we flatten the batch
        and seq dimensions, transform, then restore the original shape.
        """
        if self.scaler is None:
            raise ValueError("Scaler not loaded")
        if sequences.ndim != 3:
            raise ValueError("Expected sequences with shape (batch, seq_len, n_features)")

        batch, seq_len, n_features = sequences.shape
        flat = sequences.reshape(batch * seq_len, n_features)
        scaled_flat = self.scaler.transform(flat)
        return scaled_flat.reshape(batch, seq_len, n_features).astype(np.float32)

    def predict_proba(self, sequences: np.ndarray) -> np.ndarray:
        """Return class probabilities with shape (n_samples, n_classes)."""
        if not self.is_loaded:
            raise ValueError("Model not loaded")

        preprocessed = self.preprocess_sequences(sequences)
        predictions = self.model.predict(preprocessed, verbose=0)
        if predictions.ndim == 2:
            return predictions
        preds = predictions.flatten()
        return np.column_stack([1 - preds, preds])

    def predict(self, sequences: np.ndarray) -> np.ndarray:
        """Return predicted class indices."""
        return np.argmax(self.predict_proba(sequences), axis=1)


# Global instance
_lstm_model = None


def get_lstm_model() -> LSTMModelWrapper:
    """Get or initialize LSTM model."""
    global _lstm_model
    if _lstm_model is None:
        _lstm_model = LSTMModelWrapper()
        _lstm_model.load()
    return _lstm_model
