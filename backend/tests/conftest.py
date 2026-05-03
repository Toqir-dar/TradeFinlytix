"""
Pytest bootstrap: stable env BEFORE app import, patched Mongo lifecycle, mocked Redis bootstrap.
"""

from __future__ import annotations

import os
from unittest.mock import AsyncMock
from typing import NamedTuple

# --- Environment (must precede importing app.settings) ----------------------------
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "testjwt_0123456789abcdef_deadbeefcafef00d_secure_key_not_change_placeholder",
)
os.environ.setdefault("AES_SECRET_KEY", "0123456789abcdef0123456789abcdef")
os.environ.setdefault("ENABLE_BOOTSTRAP", "false")
os.environ.setdefault("MONGODB_URI", "mongodb://127.0.0.1:27017")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379")
os.environ.setdefault("AUDIT_STARTUP_VERIFY_CHAIN", "false")

import pytest
from starlette.testclient import TestClient

import app.core.database as db_module
from app.main import app
from tests.fakes.fake_async_motor import FakeDatabase


class ApiHarness(NamedTuple):
    client: TestClient
    db: FakeDatabase


@pytest.fixture
def harness(monkeypatch) -> ApiHarness:
    mongo = FakeDatabase()

    async def _fake_connect():
        db_module._client = None
        db_module._database = mongo

    async def _fake_close():
        db_module._client = None
        db_module._database = None

    # main.py imports connect_db before tests run — patch both module globals and bound names.
    monkeypatch.setattr(db_module, "connect_db", _fake_connect)
    monkeypatch.setattr(db_module, "close_db", _fake_close)
    monkeypatch.setattr("app.main.connect_db", _fake_connect)
    monkeypatch.setattr("app.main.close_db", _fake_close)

    monkeypatch.setattr(
        "app.main.bootstrap_privileged_users", AsyncMock(return_value=None)
    )
    monkeypatch.setattr("app.main.close_redis", AsyncMock())

    with TestClient(app, raise_server_exceptions=True) as c:
        yield ApiHarness(client=c, db=mongo)


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}
