"""
Stacked Ensemble Model for prediction.
Combines XGBoost, LightGBM, and LSTM base models with a meta-learner.
"""
from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import xgboost as xgb
from sklearn.preprocessing import StandardScaler

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

try:
    import tensorflow as tf
    from tensorflow import keras
except ImportError:
    keras = None

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent


class EnsembleModel:
    """Stacked ensemble model combining XGBoost, LightGBM, and LSTM."""

    def __init__(self):
        self.xgb_model = None
        self.lgb_model = None
        self.lstm_model = None
        self.meta_learner = None
        self.lstm_scaler = None
        self.meta_scaler = None
        self.hyperparams = None
        self.is_loaded = False

    def load_models(self) -> bool:
        """Load all trained models from disk."""
        try:
            # Load hyperparameters
            with open(MODEL_DIR / "best_hyperparams.json", "r") as f:
                self.hyperparams = json.load(f)

            # Load XGBoost model
            self.xgb_model = xgb.Booster()
            self.xgb_model.load_model(str(MODEL_DIR / "xgb_model.pkl"))
            logger.info("XGBoost model loaded successfully")

            # Load LightGBM model
            if lgb is not None:
                with open(MODEL_DIR / "lgb_model.pkl", "rb") as f:
                    self.lgb_model = pickle.load(f)
                logger.info("LightGBM model loaded successfully")

            # Load LSTM model
            if keras is not None:
                self.lstm_model = keras.models.load_model(
                    str(MODEL_DIR / "lstm_model.keras")
                )
                logger.info("LSTM model loaded successfully")

                # Load LSTM scaler
                with open(MODEL_DIR / "lstm_scaler.pkl", "rb") as f:
                    self.lstm_scaler = pickle.load(f)
                logger.info("LSTM scaler loaded successfully")

            # Load meta-learner
            with open(MODEL_DIR / "meta_learner.pkl", "rb") as f:
                self.meta_learner = pickle.load(f)
            logger.info("Meta-learner loaded successfully")

            # Load meta-learner scaler
            with open(MODEL_DIR / "meta_scaler.pkl", "rb") as f:
                self.meta_scaler = pickle.load(f)
            logger.info("Meta-scaler loaded successfully")

            self.is_loaded = True
            logger.info("All ensemble models loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load ensemble models: {e}", exc_info=True)
            self.is_loaded = False
            return False

    def predict_xgb(self, features: np.ndarray) -> np.ndarray:
        """Get XGBoost base model predictions."""
        if self.xgb_model is None:
            raise ValueError("XGBoost model not loaded")

        dmatrix = xgb.DMatrix(features)
        return self.xgb_model.predict(dmatrix)

    def predict_lgb(self, features: np.ndarray) -> np.ndarray:
        """Get LightGBM base model predictions."""
        if self.lgb_model is None:
            raise ValueError("LightGBM model not loaded")

        return self.lgb_model.predict_proba(features)[:, 1]

    def predict_lstm(self, sequences: np.ndarray) -> np.ndarray:
        """Get LSTM base model predictions."""
        if self.lstm_model is None:
            raise ValueError("LSTM model not loaded")
        if self.lstm_scaler is None:
            raise ValueError("LSTM scaler not loaded")

        # Scale sequences
        seq_len = sequences.shape[1]
        scaled_sequences = np.zeros_like(sequences)
        for i in range(sequences.shape[0]):
            scaled_sequences[i] = self.lstm_scaler.transform(
                sequences[i].reshape(-1, 1)
            ).flatten()

        # Reshape for LSTM (batch_size, seq_len, n_features)
        scaled_sequences = scaled_sequences.reshape(
            scaled_sequences.shape[0], seq_len, 1
        )

        predictions = self.lstm_model.predict(scaled_sequences, verbose=0)
        return predictions.flatten()

    def predict_ensemble(
        self, features: np.ndarray, sequences: np.ndarray | None = None
    ) -> dict[str, Any]:
        """
        Make ensemble prediction combining all base models.

        Args:
            features: Feature array for XGBoost and LightGBM (n_samples, n_features)
            sequences: Sequence array for LSTM (n_samples, seq_len) - optional

        Returns:
            Dictionary with predictions and confidence
        """
        if not self.is_loaded:
            raise ValueError("Models not loaded. Call load_models() first.")

        try:
            # Get base model predictions
            xgb_preds = self.predict_xgb(features)
            lgb_preds = self.predict_lgb(features)

            # Stack base predictions
            base_predictions = np.column_stack([xgb_preds, lgb_preds])

            # Add LSTM predictions if sequences provided
            if sequences is not None and self.lstm_model is not None:
                lstm_preds = self.predict_lstm(sequences)
                base_predictions = np.column_stack([base_predictions, lstm_preds])

            # Scale meta-features
            if self.meta_scaler is not None:
                base_predictions = self.meta_scaler.transform(base_predictions)

            # Get meta-learner final prediction
            final_prediction = self.meta_learner.predict_proba(base_predictions)[
                :, 1
            ]

            return {
                "prediction": final_prediction,
                "confidence": final_prediction,
                "base_predictions": {
                    "xgb": xgb_preds,
                    "lgb": lgb_preds,
                    "lstm": lstm_preds if sequences is not None else None,
                },
            }

        except Exception as e:
            logger.error(f"Ensemble prediction failed: {e}", exc_info=True)
            raise

    def predict_symbol(self, features: np.ndarray, sequences: np.ndarray | None = None) -> dict:
        """
        Make prediction for a symbol.

        Args:
            features: Feature vector for the symbol
            sequences: Optional sequence data for LSTM

        Returns:
            Prediction result with signal, confidence, and explanation
        """
        result = self.predict_ensemble(features, sequences)
        prediction_value = result["prediction"][0] if isinstance(result["prediction"], np.ndarray) else result["prediction"]
        confidence = float(prediction_value)

        # Determine signal based on confidence
        if confidence >= 0.65:
            signal = "buy"
        elif confidence >= 0.55:
            signal = "hold"
        elif confidence >= 0.45:
            signal = "trim"
        else:
            signal = "sell"

        return {
            "signal": signal,
            "confidence": round(confidence, 3),
            "probability": round(confidence, 3),
            "base_scores": result.get("base_predictions", {}),
            "model_version": "stacked_ensemble_v1",
        }


# Global ensemble instance
_ensemble = None


def get_ensemble() -> EnsembleModel:
    """Get or initialize the global ensemble model instance."""
    global _ensemble
    if _ensemble is None:
        _ensemble = EnsembleModel()
        _ensemble.load_models()
    return _ensemble


def predict_symbol_ensemble(
    features: np.ndarray, sequences: np.ndarray | None = None
) -> dict:
    """Convenience function for ensemble prediction."""
    ensemble = get_ensemble()
    return ensemble.predict_symbol(features, sequences)
