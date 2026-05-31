"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  FlaskConical,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/use-theme";

// ── Types ──────────────────────────────────────────────────────────────────

type Strategy = "sma_crossover" | "rsi" | "buy_and_hold";

type BacktestRequest = {
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  strategy: Strategy;
  sma_fast: number;
  sma_slow: number;
  rsi_period: number;
  rsi_oversold: number;
  rsi_overbought: number;
};

type TradeRecord = {
  date: string;
  action: "BUY" | "SELL";
  price: number;
  shares: number;
  value: number;
  pnl?: number | null;
};

type EquityPoint = {
  date: string;
  equity: number;
  benchmark: number;
  drawdown_pct: number;
};

type BacktestResult = {
  symbol: string;
  strategy: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  annualized_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  win_rate: number;
  total_trades: number;
  profitable_trades: number;
  benchmark_return_pct: number;
  equity_curve: EquityPoint[];
  trades: TradeRecord[];
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number) {
  return "$" + fmt(n);
}

function SignedPct({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const pos = value >= 0;
  return (
    <span style={{ color: pos ? "#16A34A" : "#DC2626", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
      {pos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {pos ? "+" : ""}{fmt(value, decimals)}%
    </span>
  );
}

// ── Thin sampler so large equity curves render fast ────────────────────────

function sampleEquityCurve(curve: EquityPoint[], maxPoints = 120): EquityPoint[] {
  if (curve.length <= maxPoints) return curve;
  const step = Math.ceil(curve.length / maxPoints);
  const sampled = curve.filter((_, i) => i % step === 0);
  const last = curve[curve.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

// ── Custom Recharts tooltip ────────────────────────────────────────────────

function EquityTooltip({ active, payload, label, mono }: any) {
  if (!active || !payload?.length) return null;
  const bg = mono ? "#1e293b" : "white";
  const border = mono ? "#334155" : "#E5E7EB";
  const text = mono ? "#f1f5f9" : "#111827";
  const muted = mono ? "#94a3b8" : "#6B7280";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: text, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: muted }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>${fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const STRATEGIES: { value: Strategy; label: string; desc: string }[] = [
  { value: "sma_crossover", label: "SMA Crossover", desc: "Buy golden cross, sell death cross" },
  { value: "rsi", label: "RSI Momentum", desc: "Buy oversold, sell overbought" },
  { value: "buy_and_hold", label: "Buy & Hold", desc: "Benchmark — hold for entire period" },
];

export default function BacktestPage() {
  const mono = useTheme();

  const [symbol, setSymbol] = useState("AAPL");
  const [startDate, setStartDate] = useState("2022-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [capital, setCapital] = useState("10000");
  const [strategy, setStrategy] = useState<Strategy>("sma_crossover");
  const [smaFast, setSmaFast] = useState("5");
  const [smaSlow, setSmaSlow] = useState("20");
  const [rsiPeriod, setRsiPeriod] = useState("14");
  const [rsiOversold, setRsiOversold] = useState("35");
  const [rsiOverbought, setRsiOverbought] = useState("65");
  const [showTrades, setShowTrades] = useState(false);

  const mutation = useMutation<BacktestResult, Error, BacktestRequest>({
    mutationFn: async (payload) => (await api.post("/backtest", payload)).data,
  });

  const th = mono
    ? {
        heading: "#f1f5f9",
        text: "#f1f5f9",
        subtext: "#94a3b8",
        muted: "#64748b",
        label: "#cbd5e1",
        card: "#1e293b",
        border: "#334155",
        innerCard: "#111827",
        inputBg: "#111827",
        inputBorder: "#334155",
        stratActiveBg: "#14532d",
        stratActiveBorder: "#166534",
        stratBg: "#111827",
        stratBorder: "#334155",
        stratText: "#f1f5f9",
        stratSub: "#94a3b8",
        tableBorder: "#334155",
        tableHead: "#0f172a",
        tableHeadText: "#94a3b8",
        tableRowEven: "#111827",
        buyBg: "#14532d",
        buyColor: "#4ade80",
        sellBg: "#450a0a",
        sellColor: "#f87171",
      }
    : {
        heading: "#111827",
        text: "#111827",
        subtext: "#6B7280",
        muted: "#9CA3AF",
        label: "#374151",
        card: "white",
        border: "#E5E7EB",
        innerCard: "#F9FAFB",
        inputBg: "white",
        inputBorder: "#D1D5DB",
        stratActiveBg: "#F0FDF4",
        stratActiveBorder: "#86EFAC",
        stratBg: "#F9FAFB",
        stratBorder: "#E5E7EB",
        stratText: "#111827",
        stratSub: "#6B7280",
        tableBorder: "#E5E7EB",
        tableHead: "#F9FAFB",
        tableHeadText: "#6B7280",
        tableRowEven: "#F9FAFB",
        buyBg: "#DCFCE7",
        buyColor: "#15803D",
        sellBg: "#FEE2E2",
        sellColor: "#DC2626",
      };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1.5px solid ${th.inputBorder}`,
    background: th.inputBg,
    color: th.text,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: th.label,
    marginBottom: 5,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const handleRun = () => {
    mutation.mutate({
      symbol: symbol.trim().toUpperCase(),
      start_date: startDate,
      end_date: endDate,
      initial_capital: parseFloat(capital) || 10000,
      strategy,
      sma_fast: parseInt(smaFast) || 5,
      sma_slow: parseInt(smaSlow) || 20,
      rsi_period: parseInt(rsiPeriod) || 14,
      rsi_oversold: parseFloat(rsiOversold) || 35,
      rsi_overbought: parseFloat(rsiOverbought) || 65,
    });
  };

  const result = mutation.data;
  const chartData = result ? sampleEquityCurve(result.equity_curve) : [];
  const strategyOutperforms = result ? result.total_return_pct > result.benchmark_return_pct : false;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        .bt-input:focus { border-color: #4ADE80 !important; }
        .bt-btn-primary { background: linear-gradient(135deg,#16A34A,#15803D); color: white; border: none; border-radius: 10px; padding: 11px 28px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.15s, transform 0.15s; display: flex; align-items: center; gap: 8px; }
        .bt-btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .bt-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .bt-strat { border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; }
        .bt-trade-row:nth-child(even) { background: ${th.tableRowEven}; }
        .bt-trade-row:hover { background: ${mono ? "#1a2e1a" : "#F0FDF4"}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .bt-results { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4ADE80,#16A34A)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FlaskConical size={18} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: th.heading, margin: 0 }}>Strategy Backtester</h1>
        </div>
        <p style={{ color: th.subtext, fontSize: 14, margin: 0, marginLeft: 46 }}>
          Simulate trading strategies on historical data and measure risk-adjusted performance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Config Panel ─────────────────────────────────────────────────── */}
        <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

          <div>
            <label style={labelStyle}>Symbol</label>
            <input className="bt-input" style={inputStyle} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="e.g. AAPL, OGDC" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input className="bt-input" style={inputStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input className="bt-input" style={inputStyle} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Initial Capital (USD)</label>
            <input className="bt-input" style={inputStyle} type="number" min="100" value={capital} onChange={e => setCapital(e.target.value)} placeholder="10000" />
          </div>

          {/* Strategy selector */}
          <div>
            <label style={labelStyle}>Strategy</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRATEGIES.map(s => {
                const active = strategy === s.value;
                return (
                  <div
                    key={s.value}
                    className="bt-strat"
                    onClick={() => setStrategy(s.value)}
                    style={{
                      border: `1.5px solid ${active ? th.stratActiveBorder : th.stratBorder}`,
                      background: active ? th.stratActiveBg : th.stratBg,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${active ? "#16A34A" : th.muted}`, background: active ? "#16A34A" : "transparent", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: th.stratText }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: th.stratSub }}>{s.desc}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy params */}
          {strategy === "sma_crossover" && (
            <div style={{ background: th.innerCard, border: `1px solid ${th.border}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: th.label, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>SMA Parameters</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Fast Period</label>
                  <input className="bt-input" style={{ ...inputStyle, fontSize: 13 }} type="number" min="2" max="50" value={smaFast} onChange={e => setSmaFast(e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Slow Period</label>
                  <input className="bt-input" style={{ ...inputStyle, fontSize: 13 }} type="number" min="5" max="200" value={smaSlow} onChange={e => setSmaSlow(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {strategy === "rsi" && (
            <div style={{ background: th.innerCard, border: `1px solid ${th.border}`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: th.label, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>RSI Parameters</p>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>RSI Period</label>
                <input className="bt-input" style={{ ...inputStyle, fontSize: 13 }} type="number" min="2" max="50" value={rsiPeriod} onChange={e => setRsiPeriod(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Oversold (&lt;)</label>
                  <input className="bt-input" style={{ ...inputStyle, fontSize: 13 }} type="number" min="10" max="50" value={rsiOversold} onChange={e => setRsiOversold(e.target.value)} />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Overbought (&gt;)</label>
                  <input className="bt-input" style={{ ...inputStyle, fontSize: 13 }} type="number" min="50" max="90" value={rsiOverbought} onChange={e => setRsiOverbought(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <button className="bt-btn-primary" onClick={handleRun} disabled={mutation.isPending} style={{ width: "100%", justifyContent: "center" }}>
            {mutation.isPending ? <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : <Activity size={16} />}
            {mutation.isPending ? "Running..." : "Run Backtest"}
          </button>

          {mutation.isError && (
            <div style={{ background: mono ? "#450a0a" : "#FEF2F2", border: `1px solid ${mono ? "#7f1d1d" : "#FECACA"}`, borderRadius: 8, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#DC2626", margin: 0, lineHeight: 1.5 }}>
                {(mutation.error as any)?.response?.data?.detail ?? "Backtest failed. Check the symbol and date range."}
              </p>
            </div>
          )}
        </div>

        {/* ── Results Panel ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {!result && !mutation.isPending && (
            <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
              <FlaskConical size={36} color={th.muted} style={{ marginBottom: 12 }} />
              <p style={{ color: th.subtext, fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>No results yet</p>
              <p style={{ color: th.muted, fontSize: 13, margin: 0 }}>Configure your strategy and click Run Backtest.</p>
            </div>
          )}

          {mutation.isPending && (
            <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
              <Loader2 size={32} color="#4ADE80" style={{ animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
              <p style={{ color: th.subtext, fontSize: 15, fontWeight: 600, margin: 0 }}>Fetching data & simulating trades…</p>
            </div>
          )}

          {result && (
            <div className="bt-results" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Summary header */}
              <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: th.heading, margin: "0 0 4px" }}>
                      {result.symbol} — {result.strategy}
                    </h2>
                    <p style={{ fontSize: 13, color: th.subtext, margin: 0 }}>
                      {result.start_date} → {result.end_date} · Capital: {fmtCurrency(result.initial_capital)}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: strategyOutperforms ? (mono ? "#14532d" : "#DCFCE7") : (mono ? "#450a0a" : "#FEE2E2"), borderRadius: 8, padding: "6px 12px" }}>
                    {strategyOutperforms ? <TrendingUp size={14} color="#16A34A" /> : <TrendingDown size={14} color="#DC2626" />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: strategyOutperforms ? "#16A34A" : "#DC2626" }}>
                      {strategyOutperforms ? "Outperforms" : "Underperforms"} buy & hold
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Total Return", value: <SignedPct value={result.total_return_pct} />, sub: `Final: ${fmtCurrency(result.final_equity)}` },
                  { label: "Ann. Return", value: <SignedPct value={result.annualized_return_pct} />, sub: `Benchmark: ${result.benchmark_return_pct >= 0 ? "+" : ""}${fmt(result.benchmark_return_pct)}%` },
                  { label: "Max Drawdown", value: <span style={{ color: "#DC2626", fontWeight: 700 }}>-{fmt(result.max_drawdown_pct)}%</span>, sub: "Peak-to-trough" },
                  { label: "Sharpe Ratio", value: <span style={{ color: result.sharpe_ratio >= 1 ? "#16A34A" : result.sharpe_ratio >= 0 ? th.text : "#DC2626", fontWeight: 700 }}>{fmt(result.sharpe_ratio, 3)}</span>, sub: "Annualized" },
                  { label: "Win Rate", value: <span style={{ fontWeight: 700, color: th.text }}>{fmt(result.win_rate, 1)}%</span>, sub: `${result.profitable_trades}/${result.total_trades} trades` },
                  { label: "Total Trades", value: <span style={{ fontWeight: 700, color: th.text }}>{result.total_trades}</span>, sub: "Round trips" },
                  { label: "Strategy", value: <span style={{ fontWeight: 700, color: th.text, fontSize: 13 }}>{result.strategy}</span>, sub: "Active" },
                  { label: "B&H Return", value: <SignedPct value={result.benchmark_return_pct} />, sub: "Passive baseline" },
                ].map((m, i) => (
                  <div key={i} style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: "14px 16px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{m.label}</p>
                    <div style={{ fontSize: 16, marginBottom: 3, display: "flex", alignItems: "center" }}>{m.value}</div>
                    <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Equity curve chart */}
              <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: th.heading, margin: "0 0 16px" }}>Equity Curve</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={mono ? "#1e293b" : "#F3F4F6"} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: th.muted }}
                      tickFormatter={d => d.slice(0, 7)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: th.muted }}
                      tickFormatter={v => "$" + (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v)}
                      width={70}
                    />
                    <Tooltip content={<EquityTooltip mono={mono} />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      name="Strategy"
                      stroke="#16A34A"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="benchmark"
                      name="Buy & Hold"
                      stroke="#6366F1"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Drawdown chart */}
              <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: th.heading, margin: "0 0 16px" }}>Drawdown (%)</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={mono ? "#1e293b" : "#F3F4F6"} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: th.muted }} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: th.muted }} tickFormatter={v => "-" + v + "%"} width={60} />
                    <Tooltip
                      formatter={(v: number) => [`-${fmt(v)}%`, "Drawdown"]}
                      contentStyle={{ background: mono ? "#1e293b" : "white", border: `1px solid ${th.border}`, borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="drawdown_pct" name="Drawdown" stroke="#DC2626" strokeWidth={1.5} dot={false} fill="#DC262620" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Trade log */}
              {result.trades.length > 0 && (
                <div style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, overflow: "hidden" }}>
                  <button
                    onClick={() => setShowTrades(!showTrades)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", color: th.heading, fontFamily: "inherit" }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Trade Log ({result.trades.length} entries)</span>
                    <ChevronDown size={16} color={th.muted} style={{ transform: showTrades ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>

                  {showTrades && (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: th.tableHead }}>
                            {["Date", "Action", "Price", "Shares", "Value", "P&L"].map(h => (
                              <th key={h} style={{ padding: "10px 16px", textAlign: h === "Action" ? "center" : "right", color: th.tableHeadText, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${th.tableBorder}` }}>
                                {h === "Date" ? <span style={{ textAlign: "left", display: "block" }}>{h}</span> : h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.trades.map((t, i) => (
                            <tr key={i} className="bt-trade-row">
                              <td style={{ padding: "9px 16px", color: th.text }}>{t.date}</td>
                              <td style={{ padding: "9px 16px", textAlign: "center" }}>
                                <span style={{ background: t.action === "BUY" ? th.buyBg : th.sellBg, color: t.action === "BUY" ? th.buyColor : th.sellColor, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                                  {t.action}
                                </span>
                              </td>
                              <td style={{ padding: "9px 16px", textAlign: "right", color: th.text }}>${fmt(t.price, 4)}</td>
                              <td style={{ padding: "9px 16px", textAlign: "right", color: th.text }}>{fmt(t.shares, 4)}</td>
                              <td style={{ padding: "9px 16px", textAlign: "right", color: th.text }}>${fmt(t.value)}</td>
                              <td style={{ padding: "9px 16px", textAlign: "right" }}>
                                {t.pnl != null ? (
                                  <span style={{ color: t.pnl >= 0 ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                                    {t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}
                                  </span>
                                ) : <span style={{ color: th.muted }}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
