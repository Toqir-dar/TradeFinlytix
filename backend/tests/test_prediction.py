from __future__ import annotations

from app.ml_engine.rule_predict import predict_symbol_rules
from tests.conftest import auth_header

REG_BODY = {
    "email": "pred@example.com",
    "password": "Aa123456!",
    "full_name": "Predict User",
}


def test_predict_symbol_returns_trade_signal_and_prices(harness):
    c, _ = harness
    reg = c.post("/api/v1/auth/register", json=REG_BODY)
    assert reg.status_code == 201, reg.text
    tok = reg.json()["tokens"]["access_token"]

    r = c.get("/api/v1/predict/OGDC", headers=auth_header(tok))
    assert r.status_code == 200, r.text

    data = r.json()
    assert data["symbol"] == "OGDC"
    prediction = data["prediction"]

    assert prediction["signal"] in {"buy", "sell", "trim", "hold"}
    assert prediction["entry_price"] > 0
    assert isinstance(prediction["confidence"], float)
    assert prediction["engine"] == "rule_v1"
    assert isinstance(prediction["time_horizon_days"], int)
    assert isinstance(prediction["expected_gain_pct"], float)

    if prediction["signal"] == "hold":
        assert prediction["target_price"] is None
        assert prediction["stop_loss"] is None
        assert prediction["expected_gain_pct"] == 0.0
    else:
        assert prediction["target_price"] is not None
        assert prediction["stop_loss"] is not None
        assert prediction["target_price"] > 0
        assert prediction["stop_loss"] > 0
        if prediction["signal"] == "buy":
            assert prediction["target_price"] > prediction["entry_price"]
            assert prediction["stop_loss"] < prediction["entry_price"]
            assert prediction["expected_gain_pct"] > 0
        elif prediction["signal"] == "sell":
            assert prediction["target_price"] < prediction["entry_price"]
            assert prediction["stop_loss"] > prediction["entry_price"]
            assert prediction["expected_gain_pct"] < 0
        else:
            assert prediction["target_price"] > prediction["entry_price"]
            assert prediction["stop_loss"] < prediction["entry_price"]


def test_predict_invalid_symbol_returns_error(harness):
    c, _ = harness
    reg = c.post("/api/v1/auth/register", json=REG_BODY)
    assert reg.status_code == 201, reg.text
    tok = reg.json()["tokens"]["access_token"]

    r = c.get("/api/v1/predict/%20%20", headers=auth_header(tok))
    assert r.status_code == 422
    assert r.json()["detail"] == "Symbol must be non-empty."


def test_predict_symbol_rules_buy_and_sell_logic():
    buy = predict_symbol_rules("AHE")
    assert buy["signal"] == "buy"
    assert buy["entry_price"] > 0
    assert buy["target_price"] > buy["entry_price"]
    assert buy["stop_loss"] < buy["entry_price"]
    assert buy["expected_gain_pct"] > 0

    sell = predict_symbol_rules("MMMMM")
    assert sell["signal"] == "sell"
    assert sell["entry_price"] > 0
    assert sell["target_price"] < sell["entry_price"]
    assert sell["stop_loss"] > sell["entry_price"]
    assert sell["expected_gain_pct"] < 0


def test_predict_symbol_rules_empty_symbol_raises():
    try:
        predict_symbol_rules("")
        assert False, "Empty symbol should raise ValueError"
    except ValueError as exc:
        assert str(exc) == "Symbol must be non-empty."

