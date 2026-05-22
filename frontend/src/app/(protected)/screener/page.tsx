"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, Filter, Loader2, Search, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

type ScreenerPreset = "custom" | "growing" | "low_risk" | "trending";
type TrendFilter = "any" | "bullish" | "bearish" | "neutral";

type ScreenerMatch = {
  symbol: string;
  price: number;
  volume: number;
  change_pct: number;
  trend: "bullish" | "bearish" | "neutral";
  score: number;
  reasons: string[];
  indicators: Record<string, number>;
  as_of?: string | null;
};

type ScreenerResponse = {
  items: ScreenerMatch[];
  total: number;
  scanned: number;
  failed: string[];
};

const PRESETS: { value: ScreenerPreset; label: string; sub: string }[] = [
  { value: "trending", label: "Trending", sub: "Momentum and liquidity" },
  { value: "growing", label: "Growing", sub: "Positive change and score" },
  { value: "low_risk", label: "Low Risk", sub: "Cleaner risk profile" },
  { value: "custom", label: "Custom", sub: "Use your own filters" },
];

const TREND_STYLES: Record<string, { bg: string; color: string }> = {
  bullish: { bg: "#DCFCE7", color: "#15803D" },
  bearish: { bg: "#FEE2E2", color: "#991B1B" },
  neutral: { bg: "#F3F4F6", color: "#374151" },
};

function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    const message = typeof detail === "string" ? detail : error.message;
    return `Screener request failed${error.response?.status ? ` (${error.response.status})` : ""}: ${message}`;
  }
  return "Screener request failed. Check backend logs or adjust the symbol list.";
}

export default function ScreenerPage() {
  const [preset, setPreset] = useState<ScreenerPreset>("trending");
  const [symbols, setSymbols] = useState("OGDC,HBL,ENGRO,LUCK,PSO");
  const [trend, setTrend] = useState<TrendFilter>("any");
  const [minScore, setMinScore] = useState("0");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [highVolume, setHighVolume] = useState(true);
  const [limit, setLimit] = useState("20");
  const [result, setResult] = useState<ScreenerResponse | null>(null);

  const screenStocks = useMutation({
    mutationFn: async () => {
      const payload = {
        preset,
        symbols: symbols.split(",").map((s) => s.trim()).filter(Boolean),
        trend,
        high_volume: highVolume,
        min_score: Number(minScore || 0),
        min_price: minPrice ? Number(minPrice) : null,
        max_price: maxPrice ? Number(maxPrice) : null,
        limit: Number(limit || 20),
      };
      return (await api.post("/screener", payload)).data as ScreenerResponse;
    },
    onSuccess: setResult,
  });

  const items = result?.items ?? [];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .input-field { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; color: #111827; background: white; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .preset-btn { text-align: left; border: 1.5px solid #E5E7EB; background: white; border-radius: 12px; padding: 14px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .preset-btn.active { border-color: #16A34A; background: #F0FDF4; }
        .run-btn { background: #16A34A; color: white; border: none; border-radius: 10px; padding: 12px 22px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .run-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .result-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 2fr; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
        .result-row:last-child { border-bottom: none; }
        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        @media (max-width: 900px) {
          .screener-grid { grid-template-columns: 1fr !important; }
          .result-row { grid-template-columns: 1fr 1fr; }
          .result-head { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 6 }}>Stock Screener</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Filter PSX symbols by score, trend, price, and volume.</p>
        </div>
        <button className="run-btn" onClick={() => screenStocks.mutate()} disabled={screenStocks.isPending}>
          {screenStocks.isPending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={16} />}
          Run Screener
        </button>
      </div>

      <div className="screener-grid" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Filter size={17} color="#16A34A" />
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Filters</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {PRESETS.map((item) => (
              <button key={item.value} className={`preset-btn ${preset === item.value ? "active" : ""}`} onClick={() => setPreset(item.value)}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{item.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Symbols</span>
              <input className="input-field" value={symbols} onChange={(e) => setSymbols(e.target.value.toUpperCase())} placeholder="OGDC,HBL,ENGRO" />
            </label>

            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Trend</span>
              <select className="input-field" value={trend} onChange={(e) => setTrend(e.target.value as TrendFilter)}>
                <option value="any">Any</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Min Price</span>
                <input className="input-field" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Max Price</span>
                <input className="input-field" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Min Score</span>
                <input className="input-field" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Limit</span>
                <input className="input-field" type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(e.target.value)} />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "#374151" }}>
              <input type="checkbox" checked={highVolume} onChange={(e) => setHighVolume(e.target.checked)} />
              Require high volume
            </label>
          </div>
        </div>

        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Matches</h2>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                {result ? `${result.total} matched, ${result.scanned} scanned` : "Run the screener to load live matches."}
              </p>
            </div>
            <SlidersHorizontal size={18} color="#9CA3AF" />
          </div>

          {screenStocks.isError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
              {getApiErrorMessage(screenStocks.error)}
            </div>
          )}

          <div className="table-scroll">
            <div className="table-min">
              <div className="result-row result-head" style={{ padding: "8px 16px", borderBottom: "2px solid #F3F4F6" }}>
                {["Symbol", "Price", "Change", "Volume", "Score", "Reasons"].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "52px 20px", color: "#9CA3AF" }}>
                  <BarChart3 size={34} strokeWidth={1.8} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginTop: 12 }}>No screener results yet</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Choose filters and run the endpoint.</div>
                </div>
              ) : items.map((item) => {
                const trendStyle = TREND_STYLES[item.trend] ?? TREND_STYLES.neutral;
                const isUp = item.change_pct >= 0;
                return (
                  <div key={item.symbol} className="result-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F0FDF4", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>
                        {item.symbol.slice(0, 4)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900 }}>{item.symbol}</div>
                        <span className="chip" style={{ background: trendStyle.bg, color: trendStyle.color }}>
                          {item.trend}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>PKR {item.price.toFixed(2)}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isUp ? "#15803D" : "#991B1B", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {item.change_pct.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 14, color: "#374151" }}>{Math.round(item.volume).toLocaleString()}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: item.score >= 70 ? "#15803D" : "#374151" }}>{item.score.toFixed(0)}</span>
                    <span style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{item.reasons.slice(0, 2).join(", ") || "No reason returned"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {result?.failed?.length ? (
            <div style={{ marginTop: 14, fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 12 }}>
              Failed symbols: {result.failed.join(", ")}
            </div>
          ) : null}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
