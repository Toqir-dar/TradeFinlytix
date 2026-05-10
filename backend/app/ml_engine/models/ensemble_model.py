"""
Stacked Ensemble Model for prediction.
Combines XGBoost, LightGBM, and LSTM base models with a meta-learner.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np

try:
    import lightgbm as lgb
except ImportError:
    lgb = None

try:
    from tensorflow import keras
except ImportError:
    keras = None

from app.ml_engine.explainability.shap_explainer import SHAPExplainer
from app.ml_engine.features.feature_engineering import FEATURE_COLS

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
        self._shap: SHAPExplainer | None = None

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
                self.lgb_model = joblib.load(MODEL_DIR / "lgb_model.pkl")
                logger.info("LightGBM model loaded successfully")

            # Load LSTM model
            if keras is not None:
                self.lstm_model = keras.models.load_model(
                    str(MODEL_DIR / "lstm_model.keras")
                )
                logger.info("LSTM model loaded successfully")
                self.lstm_scaler = joblib.load(MODEL_DIR / "lstm_scaler.pkl")
                logger.info("LSTM scaler loaded successfully")

            # Load meta-learner
            self.meta_learner = joblib.load(MODEL_DIR / "meta_learner.pkl")
            logger.info("Meta-learner loaded successfully")

            # Load meta-learner scaler
            self.meta_scaler = joblib.load(MODEL_DIR / "meta_scaler.pkl")
            logger.info("Meta-scaler loaded successfully")

            self.is_loaded = True
            logger.info("All ensemble models loaded successfully")

            # Initialise SHAP explainers (non-fatal if they fail)
            self._shap = SHAPExplainer(FEATURE_COLS)
            self._shap.setup_xgb(self.xgb_model)
            if self.lgb_model is not None:
                self._shap.setup_lgb(self.lgb_model)

            return True

        except Exception as e:
            logger.error(f"Failed to load ensemble models: {e}", exc_info=True)
            self.is_loaded = False
            return False

    def explain(self, features: np.ndarray, top_n: int = 10) -> dict | None:
        """Return SHAP attribution for a single feature row (1, n_features)."""
        if self._shap is None:
            return None
        return self._shap.explain(features, top_n=top_n)

    def predict_xgb(self, features: np.ndarray) -> np.ndarray:
        """Get XGBoost base model probabilities with shape (n_samples, 2)."""
        if self.xgb_model is None:
            raise ValueError("XGBoost model not loaded")

        proba = self.xgb_model.predict_proba(features)
        return proba if proba.ndim == 2 else np.column_stack([1 - proba, proba])

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
            xgb_probs = self.predict_xgb(features)
            lgb_probs = self.predict_lgb(features) if self.lgb_model is not None else None
            lstm_probs = None

            if lgb_probs is not None:
                # Full stack contract: [lgb_0, lgb_1, xgb_0, xgb_1, ...]
                base_predictions = np.column_stack([
                    lgb_probs[:, 0], lgb_probs[:, 1],
                    xgb_probs[:, 0], xgb_probs[:, 1],
                ])
            else:
                logger.warning("LightGBM not available; using XGBoost only")
                base_predictions = np.column_stack([xgb_probs[:, 0], xgb_probs[:, 1]])

            # Add LSTM predictions if sequences provided
            if sequences is not None and self.lstm_model is not None:
                lstm_probs = self.predict_lstm(sequences)
                base_predictions = np.column_stack([
                    base_predictions,
                    lstm_probs[:, 0],
                    lstm_probs[:, 1],
                ])

            # Meta-learner requires the full 6-column stack (lgb + xgb + lstm).
            if self.meta_scaler is not None and base_predictions.shape[1] == 6:
                base_predictions = self.meta_scaler.transform(base_predictions)

            if self.meta_learner is not None and base_predictions.shape[1] == 6:
                final_prediction = self.meta_learner.predict_proba(base_predictions)[:, 1]
            else:
                up_scores = [xgb_probs[:, 1]]
                if lgb_probs is not None:
                    up_scores.append(lgb_probs[:, 1])
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
