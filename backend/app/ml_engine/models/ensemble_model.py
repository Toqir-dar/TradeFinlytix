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

import joblib
import numpy as np
import xgboost as xgb

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
        self.seq_len = 10
        self.is_loaded = False

    def load_models(self) -> bool:
        """Load all trained models from disk."""
        try:
            # Load hyperparameters
            with open(MODEL_DIR / "best_hyperparams.json", "r") as f:
                self.hyperparams = json.load(f)
            self.seq_len = int(self.hyperparams.get("lstm", {}).get("seq_len", 10))

            # Load XGBoost model
            self.xgb_model = joblib.load(MODEL_DIR / "xgb_model.pkl")
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
        """Get XGBoost base model probabilities with shape (n_samples, 2)."""
        if self.xgb_model is None:
            raise ValueError("XGBoost model not loaded")

        if hasattr(self.xgb_model, "predict_proba"):
            proba = self.xgb_model.predict_proba(features)
            return proba if proba.ndim == 2 else np.column_stack([1 - proba, proba])

        if isinstance(self.xgb_model, xgb.Booster):
            preds = self.xgb_model.predict(xgb.DMatrix(features))
            return np.column_stack([1 - preds, preds])

        raise TypeError("Unsupported XGBoost model format")

    def predict_lgb(self, features: np.ndarray) -> np.ndarray:
        """Get LightGBM base model probabilities with shape (n_samples, 2)."""
        if self.lgb_model is None:
            raise ValueError("LightGBM model not loaded")

        proba = self.lgb_model.predict_proba(features)
        return proba if proba.ndim == 2 else np.column_stack([1 - proba, proba])

    def predict_lstm(self, sequences: np.ndarray) -> np.ndarray:
        """Get LSTM base model probabilities with shape (n_samples, 2)."""
        if self.lstm_model is None:
            raise ValueError("LSTM model not loaded")
        if self.lstm_scaler is None:
            raise ValueError("LSTM scaler not loaded")

        if sequences.ndim != 3:
            raise ValueError(
                "Expected LSTM sequences with shape (batch, seq_len, n_features)"
            )

        batch_size, seq_len, n_features = sequences.shape
        flat = sequences.reshape(batch_size * seq_len, n_features)
        scaled_flat = self.lstm_scaler.transform(flat)
        scaled_sequences = scaled_flat.reshape(batch_size, seq_len, n_features)

        predictions = self.lstm_model.predict(scaled_sequences, verbose=0)
        if predictions.ndim == 2 and predictions.shape[1] == 2:
            return predictions

        preds = predictions.flatten()
        return np.column_stack([1 - preds, preds])

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
            xgb_probs = self.predict_xgb(features)
            lgb_probs = self.predict_lgb(features)

            # Notebook stack contract: [lgb_0, lgb_1, xgb_0, xgb_1, lstm_0, lstm_1]
            base_predictions = np.column_stack([
                lgb_probs[:, 0],
                lgb_probs[:, 1],
                xgb_probs[:, 0],
                xgb_probs[:, 1],
            ])
            lstm_probs = None

            # Add LSTM predictions if sequences provided
            if sequences is not None and self.lstm_model is not None:
                lstm_probs = self.predict_lstm(sequences)
                base_predictions = np.column_stack([
                    base_predictions,
                    lstm_probs[:, 0],
                    lstm_probs[:, 1],
                ])

            # Scale meta-features
            if self.meta_scaler is not None and base_predictions.shape[1] == 6:
                base_predictions = self.meta_scaler.transform(base_predictions)

            # Use meta-learner only when full 6-column stack is available.
            if self.meta_learner is not None and base_predictions.shape[1] == 6:
                final_prediction = self.meta_learner.predict_proba(base_predictions)[:, 1]
            else:
                # Safe fallback: average available base up-probabilities.
                up_scores = [lgb_probs[:, 1], xgb_probs[:, 1]]
                if lstm_probs is not None:
                    up_scores.append(lstm_probs[:, 1])
                final_prediction = np.mean(np.column_stack(up_scores), axis=1)

            return {
                "prediction": final_prediction,
                "confidence": final_prediction,
                "base_predictions": {
                    "xgb": xgb_probs,
                    "lgb": lgb_probs,
                    "lstm": lstm_probs,
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
