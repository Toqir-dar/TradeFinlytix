"""LSTM base model wrapper."""
from __future__ import annotations

import logging
import pickle
from pathlib import Path

import numpy as np

try:
    import tensorflow as tf
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
            # Load model
            self.model = keras.models.load_model(
                str(MODEL_DIR / "lstm_model.keras")
            )

            # Load scaler
            with open(MODEL_DIR / "lstm_scaler.pkl", "rb") as f:
                self.scaler = pickle.load(f)

            self.is_loaded = True
            logger.info("LSTM model and scaler loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load LSTM model: {e}", exc_info=True)
            return False

    def preprocess_sequences(self, sequences: np.ndarray) -> np.ndarray:
        """Preprocess sequences using the scaler."""
        if self.scaler is None:
            raise ValueError("Scaler not loaded")

        # Scale sequences
        seq_len = sequences.shape[1]
        scaled_sequences = np.zeros_like(sequences)
        for i in range(sequences.shape[0]):
            scaled_sequences[i] = self.scaler.transform(
                sequences[i].reshape(-1, 1)
            ).flatten()

        # Reshape for LSTM (batch_size, seq_len, n_features)
        return scaled_sequences.reshape(scaled_sequences.shape[0], seq_len, 1)

    def predict(self, sequences: np.ndarray) -> np.ndarray:
        """Make predictions on sequences."""
        if not self.is_loaded:
            raise ValueError("Model not loaded")

        # Preprocess
        preprocessed = self.preprocess_sequences(sequences)

        # Predict
        predictions = self.model.predict(preprocessed, verbose=0)
        return predictions.flatten()

    def predict_proba(self, sequences: np.ndarray) -> np.ndarray:
        """Get probabilities (for binary classification)."""
        preds = self.predict(sequences)
        return np.column_stack([1 - preds, preds])


# Global instance
_lstm_model = None


def get_lstm_model() -> LSTMModelWrapper:
    """Get or initialize LSTM model."""
    global _lstm_model
    if _lstm_model is None:
        _lstm_model = LSTMModelWrapper()
        _lstm_model.load()
    return _lstm_model
