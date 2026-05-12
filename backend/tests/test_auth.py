from __future__ import annotations

import pytest

from tests.conftest import auth_header

REG_BODY = {"email": "inv@example.com", "password": "Testpass1", "full_name": "Investor One"}


def test_register_login_refresh_and_duplicate(harness):
    c, db = harness
    r = c.post("/api/v1/auth/register", json=REG_BODY)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["tokens"]["access_token"]
    stored_user = db["users"].docs[0]
    assert "email_encrypted" in stored_user
    assert "email_hash" in stored_user
    assert "email" not in stored_user

    dup = c.post("/api/v1/auth/register", json=REG_BODY)
    assert dup.status_code == 409

    # Discard register-time refresh tokens so rotation/reuse tests exercise a single lineage.
    db["refresh_tokens"].docs.clear()

    lg = c.post(
        "/api/v1/auth/login",
        json={"email": REG_BODY["email"], "password": REG_BODY["password"]},
    )
    assert lg.status_code == 200, lg.text
    body = lg.json()
    rt = body["tokens"]["refresh_token"]

    refreshed = c.post("/api/v1/auth/refresh", json={"refresh_token": rt})
    assert refreshed.status_code == 200, refreshed.text
    rt_new = refreshed.json()["refresh_token"]

    replay = c.post("/api/v1/auth/refresh", json={"refresh_token": rt})
    assert replay.status_code == 401

    still_ok = c.post("/api/v1/auth/refresh", json={"refresh_token": rt_new})
    assert still_ok.status_code == 200


def test_failed_attempts_increment(harness):
    c, db = harness
    c.post("/api/v1/auth/register", json=REG_BODY)
    for _ in range(3):
        r = c.post(
            "/api/v1/auth/login",
            json={
                "email": REG_BODY["email"],
                "password": "Wrongpass1!",
            },
        )
        assert r.status_code == 401
    user = db["users"].docs[0]
    assert user["failed_login_attempts"] >= 3


def test_lockout_after_threshold(harness):
    c, db = harness
    c.post("/api/v1/auth/register", json=REG_BODY)

    # Default auth_lockout_failed_attempts == 5
    for _ in range(5):
        c.post(
            "/api/v1/auth/login",
            json={"email": REG_BODY["email"], "password": "badguess1"},
        )

    blocked = c.post(
        "/api/v1/auth/login",
        json={"email": REG_BODY["email"], "password": REG_BODY["password"]},
    )
    assert blocked.status_code == 423


def test_expired_refresh_rejected(harness):
    from datetime import datetime, timedelta, timezone

    c, db = harness
    body = {**REG_BODY, "email": "exp@example.com"}
    assert c.post("/api/v1/auth/register", json=body).status_code == 201

    lg = c.post("/api/v1/auth/login", json={"email": body["email"], "password": body["password"]})
    refresh = lg.json()["tokens"]["refresh_token"]

    for doc in db["refresh_tokens"].docs:
        doc["expires_at"] = datetime.now(timezone.utc) - timedelta(days=1)

    bad = c.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert bad.status_code == 401


def test_forgot_password_otp_verify_then_reset(harness, monkeypatch):
    captured: dict[str, str] = {}

    async def _capture_otp(self, *, to_email: str, otp: str) -> None:
        captured["to_email"] = to_email
        captured["otp"] = otp

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_password_reset_otp",
        _capture_otp,
    )

    c, db = harness
    assert c.post("/api/v1/auth/register", json=REG_BODY).status_code == 201

    requested = c.post(
        "/api/v1/auth/forgot-password",
        json={"email": REG_BODY["email"]},
    )
    assert requested.status_code == 200, requested.text
    assert captured["to_email"] == REG_BODY["email"]
    assert len(captured["otp"]) == 6

    otp_doc = db["password_reset_otps"].docs[0]
    assert otp_doc["otp_hash"] != captured["otp"]
    assert otp_doc["attempts"] == 0
    assert otp_doc["consumed_at"] is None

    blocked = c.post(
        "/api/v1/auth/forgot-password/reset",
        json={
            "email": REG_BODY["email"],
            "otp": captured["otp"],
            "new_password": "Newpass1!",
        },
    )
    assert blocked.status_code == 400
    assert "verified" in blocked.json()["detail"].lower()

    verified = c.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"email": REG_BODY["email"], "otp": captured["otp"]},
    )
    assert verified.status_code == 200, verified.text

    reset = c.post(
        "/api/v1/auth/forgot-password/reset",
        json={
            "email": REG_BODY["email"],
            "otp": captured["otp"],
            "new_password": "Newpass1!",
        },
    )
    assert reset.status_code == 200, reset.text
    assert db["password_reset_otps"].docs[0]["consumed_at"] is not None

    old_login = c.post(
        "/api/v1/auth/login",
        json={"email": REG_BODY["email"], "password": REG_BODY["password"]},
    )
    assert old_login.status_code == 401

    new_login = c.post(
        "/api/v1/auth/login",
        json={"email": REG_BODY["email"], "password": "Newpass1!"},
    )
    assert new_login.status_code == 200, new_login.text


def test_forgot_password_otp_attempt_limit(harness, monkeypatch):
    captured: dict[str, str] = {}

    async def _capture_otp(self, *, to_email: str, otp: str) -> None:
        captured["otp"] = otp

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_password_reset_otp",
        _capture_otp,
    )

    c, db = harness
    assert c.post("/api/v1/auth/register", json=REG_BODY).status_code == 201
    assert c.post(
        "/api/v1/auth/forgot-password",
        json={"email": REG_BODY["email"]},
    ).status_code == 200

    for _ in range(4):
        bad = c.post(
            "/api/v1/auth/forgot-password/verify-otp",
            json={"email": REG_BODY["email"], "otp": "000000"},
        )
        assert bad.status_code == 400

    locked = c.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"email": REG_BODY["email"], "otp": "000000"},
    )
    assert locked.status_code == 429
    assert db["password_reset_otps"].docs[0]["consumed_at"] is not None

    valid_after_limit = c.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"email": REG_BODY["email"], "otp": captured["otp"]},
    )
    assert valid_after_limit.status_code == 400
