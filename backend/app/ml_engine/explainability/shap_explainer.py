"""SHAP-based feature attribution for the ensemble's tree base models."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

try:
    import shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    Wraps shap.TreeExplainer for XGBoost and LightGBM.

    Designed to be embedded inside EnsembleModel after model load.
    All public methods return None (rather than raising) when SHAP is
    unavailable or a computation fails, so prediction flow is never blocked.
    """

    def __init__(self, feature_names: list[str]) -> None:
        self.feature_names = feature_names
        self._xgb_explainer: Any = None
        self._lgb_explainer: Any = None

    # ------------------------------------------------------------------
    # Setup — call once after the underlying sklearn/tree models are loaded
    # ------------------------------------------------------------------

    def setup_xgb(self, model: Any) -> None:
        if not _SHAP_AVAILABLE:
            logger.debug("shap not installed — XGB explainer skipped")
            return
        try:
            self._xgb_explainer = shap.TreeExplainer(model)
            logger.info("SHAP TreeExplainer ready for XGBoost")
        except Exception as exc:
            logger.warning("SHAP XGB setup failed: %s", exc)

    def setup_lgb(self, model: Any) -> None:
        if not _SHAP_AVAILABLE:
            return
        try:
            self._lgb_explainer = shap.TreeExplainer(model)
            logger.info("SHAP TreeExplainer ready for LightGBM")
        except Exception as exc:
            logger.warning("SHAP LGB setup failed: %s", exc)

    # ------------------------------------------------------------------
    # Explanation
    # ------------------------------------------------------------------

    def explain(
        self,
        features: np.ndarray,
        top_n: int = 10,
        prefer: str = "xgb",
    ) -> dict[str, Any] | None:
        """Compute SHAP attribution for a single feature row.

        Args:
            features: shape (1, n_features) — same array fed to the model.
            top_n: how many top-|SHAP| features to surface.
            prefer: "xgb" or "lgb" — which base model to explain.

        Returns:
            dict with keys ``method``, ``base_value``, ``top_features``,
            or None when unavailable / failed.
        """
        if not _SHAP_AVAILABLE:
            return None

        explainer = (
            self._xgb_explainer if prefer == "xgb" else self._lgb_explainer
        )
        if explainer is None:
            explainer = self._lgb_explainer or self._xgb_explainer
        if explainer is None:
            return None

        # SHAP only makes sense for the full 59-feature payload.
        if features.ndim != 2 or features.shape[1] != len(self.feature_names):
            return None

        try:
            raw = explainer.shap_values(features)

            # Normalise shape across XGBoost / LightGBM versions:
            #  - list[array(1, n), array(1, n)]  → binary, pick class-1
            #  - ndarray(1, n, 2)                → binary 3-D, pick class-1
            #  - ndarray(1, n)                   → single-output (log-odds)
            if isinstance(raw, list) and len(raw) >= 2:
                sv = raw[1][0]
            elif isinstance(raw, np.ndarray) and raw.ndim == 3:
                sv = raw[0, :, 1]
            elif isinstance(raw, np.ndarray) and raw.ndim == 2:
                sv = raw[0]
            else:
                return None

            # Base value (expected model output before seeing features)
            ev = explainer.expected_value
            if isinstance(ev, (list, np.ndarray)):
                base_value = float(ev[1] if len(ev) > 1 else ev[0])
            else:
                base_value = float(ev)

            # Top-N features by absolute SHAP value
            abs_sv = np.abs(sv)
            indices = np.argsort(abs_sv)[::-1][:top_n]

            top_features = []
            for idx in indices:
                name = (
                    self.feature_names[idx]
                    if idx < len(self.feature_names)
                    else f"feature_{idx}"
                )
                val = float(sv[idx])
                top_features.append({
                    "feature": name,
                    "shap_value": round(val, 6),
                    "feature_value": round(float(features[0, idx]), 4),
                    "direction": "bullish" if val > 0 else "bearish",
                })

            model_tag = "xgb" if explainer is self._xgb_explainer else "lgb"
            return {
                "method": f"shap_tree_explainer_{model_tag}",
                "base_value": round(base_value, 6),
                "top_features": top_features,
            }

        except Exception as exc:
            logger.warning("SHAP explain failed: %s", exc)
            return None
