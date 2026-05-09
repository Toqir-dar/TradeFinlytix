"""Stock screener rule engine."""
from __future__ import annotations

import logging
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.ml_engine.data.market_data import build_live_feature_payload
from app.schemas.screener_schema import (
    ScreenerMatch,
    ScreenerRequest,
    ScreenerResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "SPY"]


class ScreenerService:
    async def screen(self, payload: ScreenerRequest) -> ScreenerResponse:
        symbols = payload.symbols or DEFAULT_UNIVERSE
        matches: list[ScreenerMatch] = []
        failed: list[str] = []

        for symbol in symbols:
            try:
                symbol_data, _history = await run_in_threadpool(
                    build_live_feature_payload,
                    symbol,
                )
                match = self._evaluate_symbol(symbol, symbol_data, payload)
            except Exception as exc:
                logger.warning(
                    "screener_symbol_failed symbol=%s err=%s",
                    symbol,
                    exc,
                    exc_info=False,
                )
                failed.append(symbol)
                continue

            if match is not None:
                matches.append(match)

        matches.sort(key=lambda item: item.score, reverse=True)
        limited = matches[: payload.limit]
        return ScreenerResponse(
            items=limited,
            total=len(matches),
            scanned=len(symbols),
            failed=failed,
        )

    def _evaluate_symbol(
        self,
        symbol: str,
        data: dict[str, Any],
        payload: ScreenerRequest,
    ) -> ScreenerMatch | None:
        price = _as_float(data.get("price"))
        volume = _as_float(data.get("volume"))
        change_pct = _as_float(data.get("change_pct"))
        volume_ratio = _as_float(data.get("volume_ratio"))
        return_20d = _as_float(data.get("return_20d"))
        return_60d = _as_float(data.get("return_60d"))
        volatility_20d = _as_float(data.get("volatility_20d"))
        atr_pct = _as_float(data.get("atr_pct"))
        rsi_14 = _as_float(data.get("rsi_14"))
        sma_cross = _as_float(data.get("sma5_cross_sma20"))
        price_to_sma20 = _as_float(data.get("price_to_sma20"))

        if payload.min_price is not None and price < payload.min_price:
            return None
        if payload.max_price is not None and price > payload.max_price:
            return None
        if payload.min_volume is not None and volume < payload.min_volume:
            return None
        if payload.high_volume and volume_ratio < 1.2:
            return None

        trend = _classify_trend(
            change_pct=change_pct,
            return_20d=return_20d,
            sma_cross=sma_cross,
            price_to_sma20=price_to_sma20,
        )
        if payload.trend != "any" and trend != payload.trend:
            return None

        preset_ok = self._passes_preset(
            payload=payload,
            return_20d=return_20d,
            return_60d=return_60d,
            volume_ratio=volume_ratio,
            trend=trend,
            volatility_20d=volatility_20d,
            atr_pct=atr_pct,
        )
        if not preset_ok:
            return None

        score, reasons = _score_symbol(
            trend=trend,
            change_pct=change_pct,
            return_20d=return_20d,
            return_60d=return_60d,
            volume_ratio=volume_ratio,
            volatility_20d=volatility_20d,
            atr_pct=atr_pct,
            rsi_14=rsi_14,
            preset=payload.preset,
        )
        if score < payload.min_score:
            return None

        return ScreenerMatch(
            symbol=symbol,
            price=round(price, 4),
            volume=round(volume, 2),
            change_pct=round(change_pct, 6),
            trend=trend,
            score=score,
            reasons=reasons,
            indicators={
                "return_20d": round(return_20d, 6),
                "return_60d": round(return_60d, 6),
                "volume_ratio": round(volume_ratio, 4),
                "volatility_20d": round(volatility_20d, 6),
                "atr_pct": round(atr_pct, 6),
                "rsi_14": round(rsi_14, 2),
                "price_to_sma20": round(price_to_sma20, 4),
            },
            as_of=str(data.get("date")) if data.get("date") else None,
        )

    def _passes_preset(
        self,
        *,
        payload: ScreenerRequest,
        return_20d: float,
        return_60d: float,
        volume_ratio: float,
        trend: str,
        volatility_20d: float,
        atr_pct: float,
    ) -> bool:
        if payload.preset == "custom":
            return True
        if payload.preset == "growing":
            return trend == "bullish" and return_20d > 0.02 and return_60d > 0.04
        if payload.preset == "low_risk":
            return volatility_20d <= 0.025 and atr_pct <= 0.04
        if payload.preset == "trending":
            return trend == "bullish" and volume_ratio >= 1.2
        return True


def _classify_trend(
    *,
    change_pct: float,
    return_20d: float,
    sma_cross: float,
    price_to_sma20: float,
) -> str:
    if return_20d > 0.015 and (sma_cross >= 1.0 or price_to_sma20 > 1.0):
        return "bullish"
    if return_20d < -0.015 and (sma_cross <= 0.0 or price_to_sma20 < 1.0):
        return "bearish"
    if abs(change_pct) < 0.01 and abs(return_20d) < 0.015:
        return "neutral"
    return "bullish" if return_20d >= 0 else "bearish"


def _score_symbol(
    *,
    trend: str,
    change_pct: float,
    return_20d: float,
    return_60d: float,
    volume_ratio: float,
    volatility_20d: float,
    atr_pct: float,
    rsi_14: float,
    preset: str,
) -> tuple[float, list[str]]:
    score = 35.0
    reasons: list[str] = []

    if trend == "bullish":
        score += 20.0
        reasons.append("bullish trend")
    elif trend == "neutral":
        score += 8.0
        reasons.append("stable trend")
    else:
        score -= 10.0
        reasons.append("bearish trend")

    if return_20d > 0:
        score += min(return_20d * 250.0, 15.0)
        reasons.append("positive 20-day return")
    if return_60d > 0:
        score += min(return_60d * 120.0, 12.0)
        reasons.append("positive 60-day return")
    if volume_ratio >= 1.2:
        score += min((volume_ratio - 1.0) * 12.0, 12.0)
        reasons.append("volume above average")
    if change_pct > 0:
        score += min(change_pct * 150.0, 6.0)

    risk_penalty = min((volatility_20d * 180.0) + (atr_pct * 100.0), 18.0)
    score -= risk_penalty
    if volatility_20d <= 0.025 and atr_pct <= 0.04:
        score += 10.0
        reasons.append("lower volatility profile")

    if 45 <= rsi_14 <= 70:
        score += 5.0
        reasons.append("healthy RSI range")
    elif rsi_14 > 75:
        score -= 5.0
        reasons.append("RSI looks extended")

    if preset != "custom":
        reasons.append(f"{preset} preset matched")

    return round(max(0.0, min(100.0, score)), 2), reasons


def _as_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

