"""Shared HTTP client for outbound requests (connection pooling)."""
from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    """Lazily create a shared AsyncClient with keep-alive enabled."""
    global _client
    if _client is None:
        limits = httpx.Limits(max_connections=100, max_keepalive_connections=20)
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0),
            limits=limits,
            headers={"User-Agent": "TradeFinlytix-Backend/1"},
        )
        logger.info("http_client_initialized")
    return _client


async def close_http_client() -> None:
    """Close the shared client on shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("http_client_closed")
