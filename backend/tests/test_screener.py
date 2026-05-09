from __future__ import annotations

from tests.conftest import auth_header


REG_BODY = {
    "email": "screen@example.com",
    "password": "Aa123456!",
    "full_name": "Screener User",
}


def _market_payload(symbol: str):
    fixtures = {
        "AAPL": {
            "price": 185.0,
            "volume": 91000000,
            "change_pct": 0.018,
            "volume_ratio": 1.8,
            "return_20d": 0.08,
            "return_60d": 0.16,
            "volatility_20d": 0.018,
            "atr_pct": 0.025,
            "rsi_14": 61.0,
            "sma5_cross_sma20": 1.0,
            "price_to_sma20": 1.06,
            "date": "2026-05-08",
        },
        "TSLA": {
            "price": 220.0,
            "volume": 80000000,
            "change_pct": -0.025,
            "volume_ratio": 0.8,
            "return_20d": -0.09,
            "return_60d": -0.12,
            "volatility_20d": 0.055,
            "atr_pct": 0.07,
            "rsi_14": 35.0,
            "sma5_cross_sma20": 0.0,
            "price_to_sma20": 0.94,
            "date": "2026-05-08",
        },
    }
    return fixtures[symbol], []


def test_screener_filters_bullish_high_volume_symbols(harness, monkeypatch):
    monkeypatch.setattr(
        "app.services.screener_service.build_live_feature_payload",
        _market_payload,
    )

    c, _ = harness
    reg = c.post("/api/v1/auth/register", json=REG_BODY)
    assert reg.status_code == 201, reg.text
    tok = reg.json()["tokens"]["access_token"]

    res = c.post(
        "/api/v1/screener",
        headers=auth_header(tok),
        json={
            "symbols": ["AAPL", "TSLA"],
            "preset": "trending",
            "min_price": 100,
            "high_volume": True,
            "trend": "bullish",
        },
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["scanned"] == 2
    assert body["total"] == 1
    assert body["items"][0]["symbol"] == "AAPL"
    assert body["items"][0]["trend"] == "bullish"
    assert "volume above average" in body["items"][0]["reasons"]
