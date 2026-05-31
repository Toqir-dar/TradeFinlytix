"""Backtesting service — simulates trading strategies on historical OHLC data."""
from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf
from starlette.concurrency import run_in_threadpool

from app.schemas.backtest_schema import (
    BacktestRequest,
    BacktestResponse,
    EquityPoint,
    TradeRecord,
)

logger = logging.getLogger(__name__)


class BacktestService:
    async def run(self, request: BacktestRequest) -> BacktestResponse:
        df = await run_in_threadpool(self._fetch_data, request.symbol, request.start_date, request.end_date)
        if df is None or len(df) < 5:
            raise ValueError(f"Insufficient historical data for {request.symbol} in the given date range.")

        if request.strategy == "sma_crossover":
            return self._run_sma_crossover(df, request)
        if request.strategy == "rsi":
            return self._run_rsi(df, request)
        return self._run_buy_and_hold(df, request)

    # ── Data Fetching ─────────────────────────────────────────────────────────

    def _fetch_data(self, symbol: str, start: str, end: str) -> pd.DataFrame | None:
        try:
            # Extra buffer before start for indicator warm-up
            start_dt = datetime.strptime(start, "%Y-%m-%d")
            buffer_start = (start_dt - timedelta(days=90)).strftime("%Y-%m-%d")
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=buffer_start, end=end, interval="1d", auto_adjust=True)
            if df.empty:
                return None
            df.index = pd.to_datetime(df.index).tz_localize(None)
            df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
            df.columns = ["open", "high", "low", "close", "volume"]
            df.dropna(subset=["close"], inplace=True)
            return df
        except Exception as exc:
            logger.warning("backtest_fetch_failed symbol=%s err=%s", symbol, exc)
            return None

    # ── Strategies ────────────────────────────────────────────────────────────

    def _run_sma_crossover(self, df: pd.DataFrame, req: BacktestRequest) -> BacktestResponse:
        df = df.copy()
        df["sma_fast"] = df["close"].rolling(req.sma_fast).mean()
        df["sma_slow"] = df["close"].rolling(req.sma_slow).mean()
        # Golden cross → buy; death cross → sell
        df["signal"] = 0
        cross_up = (df["sma_fast"] > df["sma_slow"]) & (df["sma_fast"].shift(1) <= df["sma_slow"].shift(1))
        cross_dn = (df["sma_fast"] < df["sma_slow"]) & (df["sma_fast"].shift(1) >= df["sma_slow"].shift(1))
        df.loc[cross_up, "signal"] = 1
        df.loc[cross_dn, "signal"] = -1
        df = df[df.index >= pd.Timestamp(req.start_date)]
        return self._simulate(df, req, "SMA Crossover")

    def _run_rsi(self, df: pd.DataFrame, req: BacktestRequest) -> BacktestResponse:
        df = df.copy()
        delta = df["close"].diff()
        gain = delta.clip(lower=0)
        loss = (-delta).clip(lower=0)
        avg_gain = gain.ewm(com=req.rsi_period - 1, min_periods=req.rsi_period).mean()
        avg_loss = loss.ewm(com=req.rsi_period - 1, min_periods=req.rsi_period).mean()
        rs = avg_gain / avg_loss.replace(0, np.nan)
        df["rsi"] = 100 - (100 / (1 + rs))
        df["signal"] = 0
        buy_sig = (df["rsi"] < req.rsi_oversold) & (df["rsi"].shift(1) >= req.rsi_oversold)
        sell_sig = (df["rsi"] > req.rsi_overbought) & (df["rsi"].shift(1) <= req.rsi_overbought)
        df.loc[buy_sig, "signal"] = 1
        df.loc[sell_sig, "signal"] = -1
        df = df[df.index >= pd.Timestamp(req.start_date)]
        return self._simulate(df, req, "RSI Strategy")

    def _run_buy_and_hold(self, df: pd.DataFrame, req: BacktestRequest) -> BacktestResponse:
        df = df.copy()
        df["signal"] = 0
        df = df[df.index >= pd.Timestamp(req.start_date)]
        if len(df) > 0:
            df.iloc[0, df.columns.get_loc("signal")] = 1
        return self._simulate(df, req, "Buy & Hold")

    # ── Core Simulator ────────────────────────────────────────────────────────

    def _simulate(self, df: pd.DataFrame, req: BacktestRequest, strategy_label: str) -> BacktestResponse:
        capital = req.initial_capital
        shares = 0.0
        in_position = False
        entry_price = 0.0
        trades: list[TradeRecord] = []
        equity_curve: list[EquityPoint] = []
        daily_returns: list[float] = []

        first_close = float(df["close"].iloc[0]) if len(df) > 0 else 1.0
        bh_shares = req.initial_capital / first_close

        peak = req.initial_capital
        max_drawdown = 0.0
        prev_equity = req.initial_capital

        for i, (idx, row) in enumerate(df.iterrows()):
            date_str = idx.strftime("%Y-%m-%d")
            price = float(row["close"])
            signal = int(row.get("signal", 0))

            if signal == 1 and not in_position and capital > 0:
                shares = capital / price
                entry_price = price
                capital = 0.0
                in_position = True
                trades.append(TradeRecord(
                    date=date_str, action="BUY",
                    price=round(price, 4), shares=round(shares, 6),
                    value=round(shares * price, 2), pnl=None,
                ))

            elif signal == -1 and in_position:
                sell_value = shares * price
                pnl = sell_value - shares * entry_price
                trades.append(TradeRecord(
                    date=date_str, action="SELL",
                    price=round(price, 4), shares=round(shares, 6),
                    value=round(sell_value, 2), pnl=round(pnl, 2),
                ))
                capital = sell_value
                shares = 0.0
                in_position = False
                entry_price = 0.0

            equity = capital + shares * price
            bh_equity = bh_shares * price

            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak * 100 if peak > 0 else 0.0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

            if i > 0 and prev_equity > 0:
                daily_returns.append((equity - prev_equity) / prev_equity)
            prev_equity = equity

            equity_curve.append(EquityPoint(
                date=date_str,
                equity=round(equity, 2),
                benchmark=round(bh_equity, 2),
                drawdown_pct=round(drawdown, 2),
            ))

        # Close any open position at end-of-period
        if in_position and len(df) > 0:
            final_price = float(df["close"].iloc[-1])
            sell_value = shares * final_price
            pnl = sell_value - shares * entry_price
            trades.append(TradeRecord(
                date=df.index[-1].strftime("%Y-%m-%d"), action="SELL",
                price=round(final_price, 4), shares=round(shares, 6),
                value=round(sell_value, 2), pnl=round(pnl, 2),
            ))
            capital = sell_value
            shares = 0.0

        final_equity = capital + (shares * float(df["close"].iloc[-1]) if len(df) > 0 else 0.0)
        bh_final = bh_shares * float(df["close"].iloc[-1]) if len(df) > 0 else req.initial_capital

        total_return = (final_equity - req.initial_capital) / req.initial_capital * 100
        bh_return = (bh_final - req.initial_capital) / req.initial_capital * 100

        days = max(len(df), 1)
        base = 1 + total_return / 100
        ann_return = ((base ** (365 / days)) - 1) * 100 if base > 0 else 0.0

        sharpe = 0.0
        if len(daily_returns) > 1:
            mean_dr = float(np.mean(daily_returns))
            std_dr = float(np.std(daily_returns, ddof=1))
            if std_dr > 0:
                sharpe = mean_dr / std_dr * math.sqrt(252)

        sell_trades = [t for t in trades if t.action == "SELL" and t.pnl is not None]
        profitable = [t for t in sell_trades if (t.pnl or 0) > 0]
        win_rate = (len(profitable) / len(sell_trades) * 100) if sell_trades else 0.0

        return BacktestResponse(
            symbol=req.symbol,
            strategy=strategy_label,
            start_date=req.start_date,
            end_date=req.end_date,
            initial_capital=req.initial_capital,
            final_equity=round(final_equity, 2),
            total_return_pct=round(total_return, 2),
            annualized_return_pct=round(ann_return, 2),
            max_drawdown_pct=round(max_drawdown, 2),
            sharpe_ratio=round(sharpe, 3),
            win_rate=round(win_rate, 1),
            total_trades=len(sell_trades),
            profitable_trades=len(profitable),
            benchmark_return_pct=round(bh_return, 2),
            equity_curve=equity_curve,
            trades=trades,
        )
