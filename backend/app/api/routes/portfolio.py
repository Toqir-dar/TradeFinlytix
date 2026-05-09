"""Portfolio and trade endpoints backed by encrypted storage."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from starlette.responses import Response

from app.api.dependencies import require_permission
from app.core.database import get_db
from app.schemas.portfolio_schema import (
    PortfolioResponse,
    PortfolioUpsertRequest,
    TradeCreateRequest,
    TradeListResponse,
)
from app.services.portfolio_service import PortfolioService

router = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio"],
    responses={401: {"description": "Missing/invalid bearer token"}},
)


def _svc(db) -> PortfolioService:
    return PortfolioService(db)


@router.get("", response_model=PortfolioResponse)
async def get_portfolio(
    current: dict = Depends(require_permission("portfolio:read")),
    db=Depends(get_db),
) -> PortfolioResponse:
    return await _svc(db).get_portfolio(user_id=str(current["_id"]))


@router.put("", response_model=PortfolioResponse)
async def upsert_portfolio(
    payload: PortfolioUpsertRequest,
    current: dict = Depends(require_permission("portfolio:write")),
    db=Depends(get_db),
) -> PortfolioResponse:
    return await _svc(db).upsert_portfolio(user_id=str(current["_id"]), payload=payload)


@router.post("/trades", status_code=status.HTTP_204_NO_CONTENT)
async def add_trade(
    payload: TradeCreateRequest,
    current: dict = Depends(require_permission("portfolio:write")),
    db=Depends(get_db),
) -> Response:
    await _svc(db).add_trade(user_id=str(current["_id"]), payload=payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/trades", response_model=TradeListResponse)
async def list_trades(
    current: dict = Depends(require_permission("portfolio:read")),
    db=Depends(get_db),
    limit: int = Query(20, ge=1, le=200),
) -> TradeListResponse:
    return await _svc(db).list_trades(user_id=str(current["_id"]), limit=limit)

