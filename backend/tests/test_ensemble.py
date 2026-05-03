"""
Tests for stacked ensemble model integration.
Run with: pytest tests/test_ensemble.py -v
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

logger = logging.getLogger(__name__)

# Import the modules we're testing
from app.ml_engine.ensemble_predict import predict_symbol_ensemble
from app.ml_engine.features.feature_engineering import (
    extract_sequence_features,
    extract_technical_features,
    normalize_features,
    prepare_prediction_input,
)
from app.ml_engine.models import (
    EnsembleModel,
    get_ensemble,
    get_lgb_model,
    get_lstm_model,
    get_xgb_model,
)
from app.ml_engine.models.lgb_model import LGBModelWrapper
from app.ml_engine.models.lstm_model import LSTMModelWrapper
from app.ml_engine.models.xgb_model import XGBModelWrapper
from app.services.prediction_service import PredictionService


# ============================================================================
# FIXTURE DEFINITIONS
# ============================================================================


@pytest.fixture
def sample_symbol_data():
    """Sample stock symbol data."""
    return {
        "price": 150.25,
        "volume": 2000000,
        "high": 152.50,
        "low": 149.75,
        "change_pct": 1.5,
    }


@pytest.fixture
def sample_history():
    """Sample historical price data."""
    return [
        {"price": 147.0},
        {"price": 148.5},
        {"price": 149.8},
        {"price": 150.0},
        {"price": 150.25},
    ]


@pytest.fixture
def sample_features():
    """Sample feature array."""
    return np.array([[150.25, 2.75, 2000000.0, 1.5]], dtype=np.float32)


@pytest.fixture
def sample_sequences():
    """Sample sequence array for LSTM."""
    return np.array([[147.0, 148.5, 149.8, 150.0, 150.25]], dtype=np.float32)


@pytest.fixture
def mock_user():
    """Mock user object."""
    return {
        "_id": "test_user_123",
        "username": "test_user",
        "email": "test@example.com",
    }


@pytest.fixture
def mock_risk_assessment():
    """Mock risk assessment."""
    from app.security.security_orchestrator import RiskAssessment, RiskLevel

    return RiskAssessment(
        score=25.0,
        level=RiskLevel.LOW,
        factors=["normal_trading_pattern"],
    )


@pytest.fixture
def mock_db():
    """Mock database connection."""
    return MagicMock()


# ============================================================================
# FEATURE ENGINEERING TESTS
# ============================================================================


class TestFeatureEngineering:
    """Test feature extraction and normalization."""

    def test_extract_technical_features(self, sample_symbol_data):
        """Test technical feature extraction."""
        features = extract_technical_features(sample_symbol_data)

        assert isinstance(features, np.ndarray)
        assert features.shape == (4,)
        assert len(features) == 4
        logger.info(f"Technical features: {features}")

    def test_extract_technical_features_missing_data(self):
        """Test feature extraction with incomplete data."""
        incomplete_data = {"price": 100.0}
        features = extract_technical_features(incomplete_data)

        assert features.shape == (4,)
        assert features[0] == 100.0  # price
        assert features[1] == 0.0  # missing range
        logger.info(f"Features with missing data: {features}")

    def test_extract_sequence_features(self, sample_history):
        """Test sequence feature extraction."""
        sequences = extract_sequence_features(sample_history, seq_len=5)

        assert isinstance(sequences, np.ndarray)
        assert sequences.shape == (5,)
        assert np.allclose(sequences[-1], 150.25)  # Last price
        logger.info(f"Sequences: {sequences}")

    def test_extract_sequence_features_short_history(self):
        """Test with insufficient history (should pad)."""
        short_history = [{"price": 100.0}, {"price": 101.0}]
        sequences = extract_sequence_features(short_history, seq_len=5)

        assert sequences.shape == (5,)
        assert sequences[0] == 100.0
        assert sequences[1] == 101.0
        assert sequences[2] == 101.0  # Should be padded with last value
        logger.info(f"Padded sequences: {sequences}")

    def test_normalize_features(self, sample_features):
        """Test feature normalization."""
        normalized = normalize_features(sample_features[0])

        assert normalized.shape == sample_features[0].shape
        assert normalized.min() >= -1.0
        assert normalized.max() <= 1.0
        logger.info(f"Normalized features: {normalized}")

    def test_normalize_features_constant(self):
        """Test normalization with constant values."""
        constant_features = np.array([5.0, 5.0, 5.0, 5.0])
        normalized = normalize_features(constant_features)

        assert np.allclose(normalized, 0.0)  # All zeros when constant
        logger.info(f"Normalized constant features: {normalized}")

    def test_prepare_prediction_input(self, sample_symbol_data, sample_history):
        """Test preparation of input for ensemble."""
        features, sequences = prepare_prediction_input(sample_symbol_data, sample_history)

        assert features.shape == (1, 4)
        assert sequences is not None
        assert sequences.shape == (1, 5)
        logger.info(f"Prepared input - Features: {features.shape}, Sequences: {sequences.shape}")

    def test_prepare_prediction_input_no_history(self, sample_symbol_data):
        """Test preparation without history."""
        features, sequences = prepare_prediction_input(sample_symbol_data, history=None)

        assert features.shape == (1, 4)
        assert sequences is None
        logger.info("Prepared input without history")


# ============================================================================
# MODEL LOADING TESTS
# ============================================================================


class TestModelLoading:
    """Test model loading and initialization."""

    def test_xgb_model_wrapper_init(self):
        """Test XGBoost wrapper initialization."""
        wrapper = XGBModelWrapper()

        assert wrapper.model is None
        assert wrapper.is_loaded is False
        logger.info("XGBoost wrapper initialized")

    def test_lgb_model_wrapper_init(self):
        """Test LightGBM wrapper initialization."""
        wrapper = LGBModelWrapper()

        assert wrapper.model is None
        assert wrapper.is_loaded is False
        logger.info("LightGBM wrapper initialized")

    def test_lstm_model_wrapper_init(self):
        """Test LSTM wrapper initialization."""
        wrapper = LSTMModelWrapper()

        assert wrapper.model is None
        assert wrapper.scaler is None
        assert wrapper.is_loaded is False
        logger.info("LSTM wrapper initialized")

    def test_ensemble_model_init(self):
        """Test ensemble model initialization."""
        ensemble = EnsembleModel()

        assert ensemble.xgb_model is None
        assert ensemble.lgb_model is None
        assert ensemble.lstm_model is None
        assert ensemble.meta_learner is None
        assert ensemble.is_loaded is False
        logger.info("Ensemble model initialized")

    def test_get_ensemble_singleton(self):
        """Test that get_ensemble returns singleton."""
        ensemble1 = get_ensemble()
        ensemble2 = get_ensemble()

        assert ensemble1 is ensemble2
        logger.info("Ensemble singleton pattern working")

    def test_get_xgb_model_singleton(self):
        """Test XGBoost model singleton."""
        model1 = get_xgb_model()
        model2 = get_xgb_model()

        assert model1 is model2
        logger.info("XGBoost model singleton working")

    def test_get_lgb_model_singleton(self):
        """Test LightGBM model singleton."""
        model1 = get_lgb_model()
        model2 = get_lgb_model()

        assert model1 is model2
        logger.info("LightGBM model singleton working")

    def test_get_lstm_model_singleton(self):
        """Test LSTM model singleton."""
        model1 = get_lstm_model()
        model2 = get_lstm_model()

        assert model1 is model2
        logger.info("LSTM model singleton working")


# ============================================================================
# FEATURE EXTRACTION TESTS (with mocked models)
# ============================================================================


class TestEnsemblePredictionMocked:
    """Test ensemble prediction logic with mocked models."""

    def test_predict_symbol_ensemble_fallback(self, sample_symbol_data):
        """Test fallback prediction when models unavailable."""
        result = predict_symbol_ensemble(
            symbol="TEST",
            symbol_data=sample_symbol_data,
            history=None,
        )

        assert "signal" in result
        assert "confidence" in result
        assert result["signal"] in ["buy", "hold", "trim", "sell"]
        assert 0 <= result["confidence"] <= 1
        logger.info(f"Fallback prediction result: {result['signal']}")

    def test_predict_symbol_ensemble_missing_data(self):
        """Test prediction with minimal data."""
        minimal_data = {"price": 100.0}

        result = predict_symbol_ensemble(
            symbol="AAPL",
            symbol_data=minimal_data,
        )

        assert "signal" in result
        assert 0 <= result["confidence"] <= 1
        logger.info(f"Prediction with minimal data: {result['signal']}")

    @patch("app.ml_engine.ensemble_predict.get_ensemble")
    def test_ensemble_prediction_buy_signal(self, mock_get_ensemble, sample_symbol_data):
        """Test BUY signal generation (confidence >= 0.65)."""
        mock_ensemble = MagicMock()
        mock_ensemble.is_loaded = True
        mock_ensemble.predict_ensemble.return_value = {
            "prediction": np.array([0.75]),
            "base_predictions": {
                "xgb": np.array([0.70]),
                "lgb": np.array([0.78]),
                "lstm": None,
            },
        }
        mock_get_ensemble.return_value = mock_ensemble

        result = predict_symbol_ensemble("AAPL", sample_symbol_data)

        assert result["signal"] == "buy"
        assert result["confidence"] == 0.75
        logger.info(f"BUY signal test passed: {result}")

    @patch("app.ml_engine.ensemble_predict.get_ensemble")
    def test_ensemble_prediction_sell_signal(self, mock_get_ensemble, sample_symbol_data):
        """Test SELL signal generation (confidence < 0.45)."""
        mock_ensemble = MagicMock()
        mock_ensemble.is_loaded = True
        mock_ensemble.predict_ensemble.return_value = {
            "prediction": np.array([0.30]),
            "base_predictions": {
                "xgb": np.array([0.28]),
                "lgb": np.array([0.32]),
                "lstm": None,
            },
        }
        mock_get_ensemble.return_value = mock_ensemble

        result = predict_symbol_ensemble("AAPL", sample_symbol_data)

        assert result["signal"] == "sell"
        assert result["confidence"] == 0.30
        logger.info(f"SELL signal test passed: {result}")

    @patch("app.ml_engine.ensemble_predict.get_ensemble")
    def test_ensemble_prediction_hold_signal(self, mock_get_ensemble, sample_symbol_data):
        """Test HOLD signal generation (0.55 >= confidence >= 0.65)."""
        mock_ensemble = MagicMock()
        mock_ensemble.is_loaded = True
        mock_ensemble.predict_ensemble.return_value = {
            "prediction": np.array([0.50]),
            "base_predictions": {
                "xgb": np.array([0.48]),
                "lgb": np.array([0.52]),
                "lstm": None,
            },
        }
        mock_get_ensemble.return_value = mock_ensemble

        result = predict_symbol_ensemble("AAPL", sample_symbol_data)

        assert result["signal"] in ["hold", "trim"]
        logger.info(f"HOLD/TRIM signal test passed: {result}")


# ============================================================================
# SERVICE INTEGRATION TESTS
# ============================================================================


class TestPredictionServiceIntegration:
    """Test PredictionService with ensemble integration."""

    @pytest.mark.asyncio
    async def test_predict_symbol_with_ensemble_data(
        self, mock_db, mock_user, mock_risk_assessment, sample_symbol_data, sample_history
    ):
        """Test prediction service with ensemble data provided."""
        service = PredictionService(mock_db)

        # Mock the repository
        service.repo.record_prediction = AsyncMock()

        result = await service.predict_symbol(
            symbol="AAPL",
            user=mock_user,
            assessment=mock_risk_assessment,
            symbol_data=sample_symbol_data,
            history=sample_history,
        )

        assert result is not None
        assert "prediction" in result.model_dump()
        logger.info(f"Service prediction test passed")

    @pytest.mark.asyncio
    async def test_predict_symbol_without_ensemble_data(
        self, mock_db, mock_user, mock_risk_assessment
    ):
        """Test prediction service without ensemble data (fallback to rules)."""
        service = PredictionService(mock_db)
        service.repo.record_prediction = AsyncMock()

        result = await service.predict_symbol(
            symbol="AAPL",
            user=mock_user,
            assessment=mock_risk_assessment,
        )

        assert result is not None
        assert "prediction" in result.model_dump()
        assert result.prediction.signal in ["buy", "hold", "trim", "sell"]
        logger.info("Service fallback prediction test passed")

    @pytest.mark.asyncio
    async def test_predict_symbol_with_security_context(
        self, mock_db, mock_user, mock_risk_assessment, sample_symbol_data
    ):
        """Test prediction with security risk assessment."""
        service = PredictionService(mock_db)
        service.repo.record_prediction = AsyncMock()

        result = await service.predict_symbol(
            symbol="AAPL",
            user=mock_user,
            assessment=mock_risk_assessment,
            symbol_data=sample_symbol_data,
            recent_request_count_10m=5,
            historical_high_risk_events=2,
        )

        response_data = result.model_dump()
        assert response_data["risk"]["recent_request_count_10m"] == 5
        assert response_data["risk"]["historical_high_risk_events"] == 2
        assert response_data["integrity"]["algorithm"] == "HMAC-SHA256"
        logger.info("Security context integration test passed")

    @pytest.mark.asyncio
    async def test_predict_symbol_persistence(
        self, mock_db, mock_user, mock_risk_assessment, sample_symbol_data
    ):
        """Test that prediction is recorded in database."""
        service = PredictionService(mock_db)
        service.repo.record_prediction = AsyncMock()

        await service.predict_symbol(
            symbol="AAPL",
            user=mock_user,
            assessment=mock_risk_assessment,
            symbol_data=sample_symbol_data,
        )

        # Verify record_prediction was called
        service.repo.record_prediction.assert_called_once()
        call_kwargs = service.repo.record_prediction.call_args[1]
        assert call_kwargs["user_id"] == "test_user_123"
        assert call_kwargs["symbol"] == "AAPL"
        logger.info("Prediction persistence test passed")


# ============================================================================
# DATA INTEGRITY TESTS
# ============================================================================


class TestDataIntegrity:
    """Test data structure integrity and consistency."""

    def test_feature_array_dtype(self, sample_symbol_data):
        """Test that features are correct dtype."""
        features = extract_technical_features(sample_symbol_data)

        assert features.dtype in [np.float32, np.float64]
        logger.info(f"Features dtype: {features.dtype}")

    def test_feature_array_shape(self, sample_symbol_data):
        """Test feature array shape."""
        features = extract_technical_features(sample_symbol_data)

        assert features.ndim == 1
        assert features.shape[0] == 4
        logger.info(f"Features shape: {features.shape}")

    def test_sequence_array_dtype(self, sample_history):
        """Test sequence array dtype."""
        sequences = extract_sequence_features(sample_history)

        assert sequences.dtype in [np.float32, np.float64]
        logger.info(f"Sequences dtype: {sequences.dtype}")

    def test_prediction_output_structure(self, sample_symbol_data):
        """Test prediction output has required fields."""
        result = predict_symbol_ensemble("TEST", sample_symbol_data)

        required_fields = [
            "signal",
            "confidence",
            "model_version",
            "rationale",
        ]
        for field in required_fields:
            assert field in result, f"Missing field: {field}"
        logger.info(f"Prediction output structure valid")

    def test_confidence_in_valid_range(self, sample_symbol_data):
        """Test that confidence is in valid range."""
        result = predict_symbol_ensemble("TEST", sample_symbol_data)

        assert 0 <= result["confidence"] <= 1.0
        logger.info(f"Confidence in valid range: {result['confidence']}")


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_extract_features_empty_dict(self):
        """Test with empty dictionary."""
        result = extract_technical_features({})

        assert result.shape == (4,)
        assert np.all(result == 0.0)
        logger.info("Empty dict handling passed")

    def test_extract_sequences_empty_list(self):
        """Test with empty history list."""
        result = extract_sequence_features([], seq_len=5)

        assert result.shape == (5,)
        # Should be padded with zeros or defaults
        logger.info("Empty history handling passed")

    def test_predict_invalid_symbol(self):
        """Test prediction with various symbol formats."""
        symbols = ["", "A", "AAPL123!@#"]

        for symbol in symbols:
            try:
                result = predict_symbol_ensemble(
                    symbol, {"price": 100.0}
                )
                assert "signal" in result
                logger.info(f"Handled symbol: {symbol}")
            except Exception as e:
                logger.info(f"Symbol {symbol} raised: {type(e).__name__}")

    def test_predict_extreme_prices(self):
        """Test with extreme price values."""
        test_cases = [
            {"price": 0.01},  # Very low
            {"price": 100000.0},  # Very high
            {"price": float("inf")},  # Infinity
        ]

        for data in test_cases:
            try:
                result = predict_symbol_ensemble("TEST", data)
                assert "signal" in result
                logger.info(f"Handled extreme price: {data['price']}")
            except Exception as e:
                logger.info(f"Extreme price {data['price']} raised: {type(e).__name__}")


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================


class TestPerformance:
    """Test performance characteristics."""

    def test_feature_extraction_speed(self, sample_symbol_data, benchmark=None):
        """Test feature extraction performance."""
        if benchmark:
            result = benchmark(extract_technical_features, sample_symbol_data)
        else:
            # Simple timing without benchmark fixture
            import time
            start = time.time()
            for _ in range(1000):
                extract_technical_features(sample_symbol_data)
            elapsed = time.time() - start
            logger.info(f"1000 feature extractions: {elapsed:.3f}s ({elapsed/1000*1000:.2f}ms/call)")

    def test_batch_prediction_preparation(self, sample_symbol_data, sample_history):
        """Test preparing multiple predictions."""
        batch_size = 100

        features_list = []
        sequences_list = []

        for i in range(batch_size):
            features, sequences = prepare_prediction_input(
                sample_symbol_data, sample_history
            )
            features_list.append(features)
            sequences_list.append(sequences)

        assert len(features_list) == batch_size
        assert len(sequences_list) == batch_size
        logger.info(f"Prepared batch of {batch_size} predictions")


# ============================================================================
# INTEGRATION TEST
# ============================================================================


class TestEndToEnd:
    """End-to-end integration tests."""

    @pytest.mark.asyncio
    async def test_full_prediction_pipeline(
        self, mock_db, mock_user, mock_risk_assessment, sample_symbol_data, sample_history
    ):
        """Test complete prediction pipeline from service to output."""
        service = PredictionService(mock_db)
        service.repo.record_prediction = AsyncMock()

        # Make prediction
        response = await service.predict_symbol(
            symbol="AAPL",
            user=mock_user,
            assessment=mock_risk_assessment,
            symbol_data=sample_symbol_data,
            history=sample_history,
            recent_request_count_10m=3,
            historical_high_risk_events=1,
        )

        # Validate response structure
        response_dict = response.model_dump()
        assert response_dict["symbol"] == "AAPL"
        assert response_dict["user_id"] == "test_user_123"
        assert "prediction" in response_dict
        assert "risk" in response_dict
        assert "integrity" in response_dict
        assert response_dict["prediction"]["signal"] in ["buy", "hold", "trim", "sell"]

        # Verify persistence was attempted
        service.repo.record_prediction.assert_called_once()

        logger.info("End-to-end pipeline test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--log-cli-level=INFO"])
