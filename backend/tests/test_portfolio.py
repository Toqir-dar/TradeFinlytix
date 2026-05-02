from __future__ import annotations

from tests.conftest import auth_header


def test_portfolio_upsert_and_get_uses_encrypted_storage(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "pf@example.com",
            "password": "Aa123456!",
            "full_name": "Portfolio User",
        },
    )
    assert reg.status_code == 201, reg.text
    tok = reg.json()["tokens"]["access_token"]

    up = c.put(
        "/api/v1/portfolio",
        headers=auth_header(tok),
        json={
            "positions": [{"symbol": "OGDC", "quantity": 10, "avg_price": 85.5}],
            "metadata": {"currency": "PKR"},
        },
    )
    assert up.status_code == 200, up.text
    body = up.json()
    assert body["positions"][0]["symbol"] == "OGDC"

    stored = db["portfolio"].docs[0]
    assert "positions_encrypted" in stored
    assert "metadata_encrypted" in stored
    assert "positions" not in stored

    getp = c.get("/api/v1/portfolio", headers=auth_header(tok))
    assert getp.status_code == 200
    assert getp.json()["positions"][0]["symbol"] == "OGDC"


def test_portfolio_trades_are_encrypted_at_rest(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "trader@example.com",
            "password": "Aa123456!",
            "full_name": "Trader User",
        },
    )
    assert reg.status_code == 201
    tok = reg.json()["tokens"]["access_token"]

    crt = c.post(
        "/api/v1/portfolio/trades",
        headers=auth_header(tok),
        json={"symbol": "PSO", "side": "buy", "quantity": 5, "price": 210.25},
    )
    assert crt.status_code == 204

    raw = db["transactions"].docs[0]
    assert "trade_encrypted" in raw
    assert "trade" not in raw

    lst = c.get("/api/v1/portfolio/trades?limit=5", headers=auth_header(tok))
    assert lst.status_code == 200
    assert lst.json()["items"][0]["trade"]["symbol"] == "PSO"

