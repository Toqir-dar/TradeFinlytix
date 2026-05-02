"""Portfolio/trade service over encrypted repositories."""
from __future__ import annotations

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.portfolio_repo import PortfolioRepository
from app.repositories.trade_repo import TradeRepository
from app.schemas.portfolio_schema import (
    PortfolioResponse,
    PortfolioUpsertRequest,
    TradeCreateRequest,
    TradeListResponse,
    TradeRow,
)


class PortfolioService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.portfolios = PortfolioRepository(db)
        self.trades = TradeRepository(db)

    async def upsert_portfolio(
        self, *, user_id: str, payload: PortfolioUpsertRequest
    ) -> PortfolioResponse:
        await self.portfolios.save_portfolio_snapshot(
            user_id=user_id,
            positions=[p.model_dump() for p in payload.positions],
            metadata=dict(payload.metadata),
        )
        return await self.get_portfolio(user_id=user_id)

    async def get_portfolio(self, *, user_id: str) -> PortfolioResponse:
        row = await self.portfolios.load_portfolio_snapshot(user_id=user_id)
        if not row:
            return PortfolioResponse(user_id=user_id, positions=[], metadata={})
        return PortfolioResponse(
            user_id=row["user_id"],
            positions=row.get("positions", []),
            metadata=row.get("metadata", {}),
            updated_at=row.get("updated_at"),
        )

    async def add_trade(self, *, user_id: str, payload: TradeCreateRequest) -> None:
        await self.trades.record_trade(user_id=user_id, trade=payload.model_dump())

    async def list_trades(self, *, user_id: str, limit: int) -> TradeListResponse:
        rows = await self.trades.list_trades(user_id=user_id, limit=limit)
        return TradeListResponse(
            items=[TradeRow.model_validate(r) for r in rows],
            total=len(rows),
        )

