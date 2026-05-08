from __future__ import annotations

import asyncio

from tests.conftest import auth_header
from tests.seed import seed_user


def _user_id(user_json: dict) -> str:
    return str(user_json.get("_id") or user_json["id"])


def test_investor_cannot_hit_admin_panel(harness):
    c, _ = harness
    c.post(
        "/api/v1/auth/register",
        json={
            "email": "i@example.com",
            "password": "Aa123456!",
            "full_name": "Inv",
        },
    )
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "i@example.com", "password": "Aa123456!"},
    ).json()["tokens"]["access_token"]

    r = c.get("/api/v1/admin/users", headers=auth_header(tok))
    assert r.status_code == 403


def test_admin_lists_users(harness):
    c, db = harness
    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")

    lg = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    )
    assert lg.status_code == 200, lg.text
    tok = lg.json()["tokens"]["access_token"]

    lst = c.get("/api/v1/admin/users", headers=auth_header(tok))
    assert lst.status_code == 200
    body = lst.json()
    assert body["total"] >= 1


def test_admin_get_user_by_id(harness):
    c, db = harness
    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")
    seed_user(db, email="who@example.com", password="Aa123456!", role="investor")

    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]
    inv = c.post(
        "/api/v1/auth/login",
        json={"email": "who@example.com", "password": "Aa123456!"},
    ).json()["user"]
    uid = _user_id(inv)

    got = c.get(f"/api/v1/admin/users/{uid}", headers=auth_header(adm))
    assert got.status_code == 200, got.text
    assert got.json()["email"] == "who@example.com"


def test_admin_can_view_user_activity(harness):
    c, db = harness
    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "activity@example.com",
            "password": "Aa123456!",
            "full_name": "Activity User",
        },
    )
    uid = _user_id(reg.json()["user"])
    _ = c.post(
        "/api/v1/auth/login",
        json={"email": "activity@example.com", "password": "Aa123456!"},
    )
    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]
    act = c.get(f"/api/v1/admin/users/{uid}/activity", headers=auth_header(adm))
    assert act.status_code == 200, act.text
    assert any(row.get("event_type") == "login_success" for row in act.json())


def test_admin_deactivate_blocks_me_and_relogin(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "vic@example.com",
            "password": "Aa123456!",
            "full_name": "Victim",
        },
    )
    assert reg.status_code == 201, reg.text
    uid = _user_id(reg.json()["user"])
    inv_tok = reg.json()["tokens"]["access_token"]

    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")
    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]

    de = c.post(
        f"/api/v1/admin/users/{uid}/deactivate",
        headers=auth_header(adm),
    )
    assert de.status_code == 200, de.text
    assert de.json()["is_active"] is False

    me = c.get("/api/v1/auth/me", headers=auth_header(inv_tok))
    assert me.status_code == 403

    blocked = c.post(
        "/api/v1/auth/login",
        json={"email": "vic@example.com", "password": "Aa123456!"},
    )
    assert blocked.status_code == 403


def test_admin_activate_restores_access(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "back@example.com",
            "password": "Aa123456!",
            "full_name": "Back",
        },
    )
    uid = _user_id(reg.json()["user"])
    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")
    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]

    assert (
        c.post(
            f"/api/v1/admin/users/{uid}/deactivate",
            headers=auth_header(adm),
        ).status_code
        == 200
    )
    ac = c.post(
        f"/api/v1/admin/users/{uid}/activate",
        headers=auth_header(adm),
    )
    assert ac.status_code == 200, ac.text
    assert ac.json()["is_active"] is True

    lg = c.post(
        "/api/v1/auth/login",
        json={"email": "back@example.com", "password": "Aa123456!"},
    )
    assert lg.status_code == 200, lg.text
    tok = lg.json()["tokens"]["access_token"]
    me = c.get("/api/v1/auth/me", headers=auth_header(tok))
    assert me.status_code == 200


def test_admin_reset_password_invalidates_old_jwt(harness):
    c, db = harness
    reg = c.post(
        "/api/v1/auth/register",
        json={
            "email": "reset@example.com",
            "password": "Aa123456!",
            "full_name": "Re",
        },
    )
    uid = _user_id(reg.json()["user"])
    old_tok = reg.json()["tokens"]["access_token"]

    seed_user(db, email="admin@test.com", password="AdminSecure1!", role="admin")
    adm = c.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "AdminSecure1!"},
    ).json()["tokens"]["access_token"]

    rp = c.post(
        f"/api/v1/admin/users/{uid}/reset-password",
        headers=auth_header(adm),
    )
    assert rp.status_code == 200, rp.text
    new_pw = rp.json()["new_password"]

    stale = c.get("/api/v1/auth/me", headers=auth_header(old_tok))
    assert stale.status_code == 401

    lg = c.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": new_pw},
    )
    assert lg.status_code == 200


def test_investor_cannot_hit_ciso_routes(harness):
    c, _ = harness
    c.post(
        "/api/v1/auth/register",
        json={
            "email": "ni@example.com",
            "password": "Aa123456!",
            "full_name": "No",
        },
    )
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "ni@example.com", "password": "Aa123456!"},
    ).json()["tokens"]["access_token"]

    assert c.get("/api/v1/ciso/audit", headers=auth_header(tok)).status_code == 403
    assert (
        c.get("/api/v1/ciso/audit/verify", headers=auth_header(tok)).status_code == 403
    )


def test_ciso_lists_audit_events(harness):
    c, db = harness
    from app.repositories.audit_repo import AuditRepository

    repo = AuditRepository(db)

    async def _seed_audits():
        await repo.record(event_type="b_list_a", payload={"k": "a"})
        await repo.record(event_type="b_list_b", payload={"k": "b"})

    asyncio.run(_seed_audits())

    seed_user(db, email="ciso_aud@gov.example", password="CisoSafe1!", role="ciso")
    tok = c.post(
        "/api/v1/auth/login",
        json={
            "email": "ciso_aud@gov.example",
            "password": "CisoSafe1!",
        },
    ).json()["tokens"]["access_token"]

    lst = c.get("/api/v1/ciso/audit?limit=20", headers=auth_header(tok))
    assert lst.status_code == 200, lst.text
    body = lst.json()
    assert "items" in body
    types = {row["event_type"] for row in body["items"]}
    assert types >= {"b_list_a", "b_list_b"}


def test_ciso_anomalies_and_recent_risk_return_200(harness):
    c, db = harness
    seed_user(db, email="cyber@risk.example", password="CisoSafe1!", role="ciso")
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "cyber@risk.example", "password": "CisoSafe1!"},
    ).json()["tokens"]["access_token"]

    ann = c.get("/api/v1/ciso/anomalies?limit=5", headers=auth_header(tok))
    assert ann.status_code == 200
    assert ann.json()["items"] == []

    risk = c.get("/api/v1/ciso/risk/recent?limit=5", headers=auth_header(tok))
    assert risk.status_code == 200
    assert risk.json()["items"] == []

    snaps = c.get("/api/v1/ciso/risk/snapshots?limit=5", headers=auth_header(tok))
    assert snaps.status_code == 200
    assert snaps.json()["items"] == []


def test_ciso_risk_trend_top_and_anomaly_stats(harness):
    c, db = harness
    from datetime import datetime, timedelta, timezone

    seed_user(db, email="cyber2@risk.example", password="CisoSafe1!", role="ciso")
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "cyber2@risk.example", "password": "CisoSafe1!"},
    ).json()["tokens"]["access_token"]

    now = datetime.now(timezone.utc)
    db["risk_snapshots"].docs.append(
        {
            "subject": "user-1",
            "score": 88.0,
            "level": "CRITICAL",
            "created_at": now - timedelta(days=1),
            "path": "/api/v1/predict/PSO",
            "factors": {"anomaly_score": 15.0},
        }
    )
    db["risk_snapshots"].docs.append(
        {
            "subject": "user-1",
            "score": 61.0,
            "level": "HIGH",
            "created_at": now,
            "path": "/api/v1/predict/OGDC",
            "factors": {"anomaly_score": 5.0},
        }
    )
    db["anomaly_logs"].docs.append(
        {
            "created_at": now,
            "type": "request_spike",
        }
    )

    trend = c.get(
        "/api/v1/ciso/risk/trend?user_id=user-1&days=7", headers=auth_header(tok)
    )
    assert trend.status_code == 200
    assert len(trend.json()["items"]) >= 1

    top = c.get("/api/v1/ciso/risk/top?limit=5", headers=auth_header(tok))
    assert top.status_code == 200
    assert top.json()["items"][0]["subject"] == "user-1"

    stats = c.get("/api/v1/ciso/anomalies/stats?days=7", headers=auth_header(tok))
    assert stats.status_code == 200
    assert stats.json()["items"][0]["count"] >= 1


def test_investor_cannot_list_risk_snapshots(harness):
    c, _ = harness
    c.post(
        "/api/v1/auth/register",
        json={
            "email": "nsnap@example.com",
            "password": "Aa123456!",
            "full_name": "No",
        },
    )
    tok = c.post(
        "/api/v1/auth/login",
        json={"email": "nsnap@example.com", "password": "Aa123456!"},
    ).json()["tokens"]["access_token"]

    denied = c.get("/api/v1/ciso/risk/snapshots", headers=auth_header(tok))
    assert denied.status_code == 403


def test_ciso_can_verify_audit_chain(harness):
    c, db = harness
    # Chain verify must see monotonic chronological inserts stored in mongo
    from app.repositories.audit_repo import AuditRepository

    repo = AuditRepository(db)

    async def _two():
        await repo.record(event_type="unit_a", payload={"n": 1})
        await repo.record(event_type="unit_b", payload={"n": 2})

    import asyncio

    asyncio.run(_two())

    seed_user(db, email="cyber@ciso.gov", password="CisoSafe1!", role="ciso")
    lg = c.post(
        "/api/v1/auth/login",
        json={"email": "cyber@ciso.gov", "password": "CisoSafe1!"},
    )
    tok = lg.json()["tokens"]["access_token"]

    vr = c.get("/api/v1/ciso/audit/verify", headers=auth_header(tok))
    assert vr.status_code == 200, vr.text
    assert vr.json()["ok"] is True
