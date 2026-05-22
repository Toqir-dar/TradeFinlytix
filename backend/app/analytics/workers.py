"""
Analytics background worker — periodic cache refresh every TTL_SECONDS.

Plug into main.py lifespan:
    from app.analytics.workers import start_analytics_worker, stop_analytics_worker
    task = asyncio.create_task(start_analytics_worker())
    ...
    stop_analytics_worker()
    await task
"""
from __future__ import annotations

import asyncio
import logging

from app.analytics.service import AnalyticsService, TTL_SECONDS
from app.core.database import get_db

logger = logging.getLogger(__name__)

_STOP_EVENT: asyncio.Event | None = None


async def start_analytics_worker() -> None:
    global _STOP_EVENT
    _STOP_EVENT = asyncio.Event()
    logger.info("analytics_worker started (refresh every %ss)", TTL_SECONDS)

    while not _STOP_EVENT.is_set():
        try:
            db = await get_db()
            svc = AnalyticsService(db)

            # Refresh market summary + movers
            await svc.refresh_market_summary()
            await svc.refresh_gainers_losers()
            logger.debug("analytics_worker: market summary + movers refreshed")
        except Exception as exc:
            logger.warning("analytics_worker iteration failed: %s", exc)

        # Sleep until next cycle, but wake immediately if stop requested
        try:
            await asyncio.wait_for(_STOP_EVENT.wait(), timeout=float(TTL_SECONDS))
        except asyncio.TimeoutError:
            pass


def stop_analytics_worker() -> None:
    if _STOP_EVENT:
        _STOP_EVENT.set()
