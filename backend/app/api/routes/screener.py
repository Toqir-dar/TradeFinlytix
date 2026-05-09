"""Stock screener endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import require_permission
from app.schemas.screener_schema import ScreenerRequest, ScreenerResponse
from app.services.screener_service import ScreenerService

router = APIRouter(
    prefix="/screener",
    tags=["Screener"],
    responses={401: {"description": "Missing/invalid bearer token"}},
)


@router.post("", response_model=ScreenerResponse)
async def screen_stocks(
    payload: ScreenerRequest,
    _current: dict = Depends(require_permission("screener:read")),
) -> ScreenerResponse:
    return await ScreenerService().screen(payload)

