"""Extra auth / abuse edges (JWT, deactivate + refresh revocation)."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from jose import jwt as jose_jwt

from tests.conftest import auth_header


def test_invalid_bearer_format_me_401(harness):
    c, _ = harness
    assert (
        c.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not-even-a-jwt-structure"},
        ).status_code
        == 401
    )


def test_expired_access_token_me_401(harness):
    c, _ = harness
    r = c.post(
        "/api/v1/auth/register",
        json={
            "email": "tok@example.com",
            "password": "Aa123456!",
            "full_name": "Tok",
        },
    )
    assert r.status_code == 201, r.text
    uid = str(r.json()["user"].get("_id") or r.json()["user"]["id"])
    secret = os.environ["JWT_SECRET_KEY"]
    stale = jose_jwt.encode(
        {
            "sub": uid,
            "role": "investor",
            "ver": 1,
            "type": "access",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=10),
            "iat": datetime.now(timezone.utc) - timedelta(seconds=3600),
        },
        secret,
        algorithm="HS256",
    )
    me = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {stale}"})
    assert me.status_code == 401


def test_deactivate_revokes_refresh_tokens(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "rtd@example.com",
            "password": "Aa123456!",
            "full_name": "Rt",
        },
    )
    assert reg.status_code == 201
    uid = str(reg.json()["user"].get("_id") or reg.json()["user"]["id"])
    lg = c.post(
        "/api/v1/auth/login",
        json={"email": "rtd@example.com", "password": "Aa123456!"},
    ).json()
    rt = lg["tokens"]["refresh_token"]

    from tests.seed import seed_user

    seed_user(db, email="adm@edge.com", password="AdminSecure1!", role="admin")
    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "adm@edge.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]

    assert (
        c.post(
            f"/api/v1/admin/users/{uid}/deactivate",
            headers=auth_header(adm),
        ).status_code
        == 200
    )

    ref = c.post("/api/v1/auth/refresh", json={"refresh_token": rt})
    assert ref.status_code == 401


def test_chain_untrusted_blocks_sensitive_endpoints(harness, monkeypatch):
    c, db = harness
    from app.main import settings, audit_chain_append_allowed
    from app.repositories.audit_chain_state import set_audit_chain_trusted
    from tests.seed import seed_user

    monkeypatch.setattr(settings, "audit_reject_new_events_when_chain_untrusted", True)
    monkeypatch.setattr(
        "app.main.audit_chain_append_allowed",
        lambda: False,
    )
    set_audit_chain_trusted(False)
    seed_user(db, email="admin@hold.com", password="AdminSecure1!", role="admin")
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@hold.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]

    blocked = c.get("/api/v1/admin/users", headers=auth_header(tok))
    assert blocked.status_code == 503


def test_predict_dynamic_risk_fields_present(harness):
    c, _ = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "pred@example.com",
            "password": "Aa123456!",
            "full_name": "Predict",
        },
    )
    tok = reg.json()["tokens"]["access_token"]
    r = c.get("/api/v1/predict/OGDC", headers=auth_header(tok))
    assert r.status_code == 200, r.text
    risk = r.json()["risk"]
    assert "dynamic_score" in risk
    assert "recent_request_count_10m" in risk
    assert "historical_high_risk_events" in risk
    integrity = r.json()["integrity"]
    assert integrity["algorithm"] == "HMAC-SHA256"
    assert isinstance(integrity["signature"], str) and len(integrity["signature"]) == 64

    vr = c.post(
        "/api/v1/predict/verify-integrity",
        json={
            "payload": {
                "symbol": r.json()["symbol"],
                "user_id": r.json()["user_id"],
                "predicted_at": r.json()["predicted_at"],
                "prediction": r.json()["prediction"],
                "risk": r.json()["risk"],
            },
            "signature": integrity["signature"],
        },
    )
    assert vr.status_code == 200
    assert vr.json()["ok"] is True
