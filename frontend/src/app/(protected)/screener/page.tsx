"use client";

import { useState } from "react";
import { AxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, Filter, Loader2, Search, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/use-theme";

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

function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    const message = typeof detail === "string" ? detail : error.message;
    return `Screener request failed${error.response?.status ? ` (${error.response.status})` : ""}: ${message}`;
  }
  return "Screener request failed. Check backend logs or adjust the symbol list.";
}

export default function ScreenerPage() {
  const mono = useTheme();
  const [preset, setPreset] = useState<ScreenerPreset>("trending");
  const [symbols, setSymbols] = useState("OGDC,HBL,ENGRO,LUCK,PSO");
  const [trend, setTrend] = useState<TrendFilter>("any");
  const [minScore, setMinScore] = useState("0");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [highVolume, setHighVolume] = useState(true);
  const [limit, setLimit] = useState("20");
  const [result, setResult] = useState<ScreenerResponse | null>(null);

  const th = mono ? {
    heading: "#f1f5f9",
    bgSubtext: "#94a3b8",
    text: "#f1f5f9",
    subtext: "#94a3b8",
    muted: "#64748b",
    label: "#cbd5e1",
    card: "#1e293b",
    border: "#334155",
    borderSubtle: "#253347",
    innerCard: "#111827",
    inputBg: "#111827",
    inputBorder: "#334155",
    presetBg: "#111827",
    presetBorder: "#334155",
    presetActiveBg: "#14532d",
    presetActiveBorder: "#166534",
    presetText: "#f1f5f9",
    presetSub: "#94a3b8",
    resultHeadBorder: "#334155",
    emptyIconColor: "#64748b",
    emptyTitleColor: "#94a3b8",
    symbolIconBg: "#14532d",
    symbolIconColor: "#4ade80",
    trendNeutralBg: "#334155",
    trendNeutralColor: "#94a3b8",
    failedBg: "#451a03",
    failedBorder: "#92400e",
    failedColor: "#fbbf24",
  } : {
    heading: "#111827",
    bgSubtext: "#6B7280",
    text: "#111827",
    subtext: "#6B7280",
    muted: "#9CA3AF",
    label: "#374151",
    card: "white",
    border: "#E5E7EB",
    borderSubtle: "#F3F4F6",
    innerCard: "#F9FAFB",
    inputBg: "white",
    inputBorder: "#E5E7EB",
    presetBg: "white",
    presetBorder: "#E5E7EB",
    presetActiveBg: "#F0FDF4",
    presetActiveBorder: "#16A34A",
    presetText: "#111827",
    presetSub: "#6B7280",
    resultHeadBorder: "#F3F4F6",
    emptyIconColor: "#9CA3AF",
    emptyTitleColor: "#374151",
    symbolIconBg: "#F0FDF4",
    symbolIconColor: "#16A34A",
    trendNeutralBg: "#F3F4F6",
    trendNeutralColor: "#374151",
    failedBg: "#FFFBEB",
    failedBorder: "#FDE68A",
    failedColor: "#92400E",
  };

  const TREND_STYLES: Record<string, { bg: string; color: string }> = {
    bullish: { bg: "#DCFCE7", color: "#15803D" },
    bearish: { bg: "#FEE2E2", color: "#991B1B" },
    neutral: { bg: th.trendNeutralBg, color: th.trendNeutralColor },
  };

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
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: th.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .section-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 16px; padding: 24px; transition: background 0.2s ease, border-color 0.2s ease; }
        .input-field { width: 100%; padding: 11px 14px; border: 1.5px solid ${th.inputBorder}; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; color: ${th.text}; background: ${th.inputBg}; transition: all 0.2s; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field option { background: ${th.inputBg}; color: ${th.text}; }
        .preset-btn { text-align: left; border: 1.5px solid ${th.presetBorder}; background: ${th.presetBg}; border-radius: 12px; padding: 14px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .preset-btn.active { border-color: ${th.presetActiveBorder}; background: ${th.presetActiveBg}; }
        .run-btn { background: #16A34A; color: white; border: none; border-radius: 10px; padding: 12px 22px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .run-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .result-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr 1fr 2fr; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid ${th.borderSubtle}; transition: background 0.15s; }
        .result-row:hover { background: ${th.innerCard}; border-radius: 8px; }
        .result-row:last-child { border-bottom: none; }
        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        @media (max-width: 900px) {
          .screener-grid { grid-template-columns: 1fr !important; }
          .result-row { grid-template-columns: 1fr 1fr; }
          .result-head { display: none !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 6, color: th.heading }}>Stock Screener</h1>
          <p style={{ fontSize: 14, color: th.bgSubtext }}>Filter PSX symbols by score, trend, price, and volume.</p>
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
            <h2 style={{ fontSize: 16, fontWeight: 800, color: th.text }}>Filters</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {PRESETS.map((item) => (
              <button key={item.value} className={`preset-btn ${preset === item.value ? "active" : ""}`} onClick={() => setPreset(item.value)}>
                <div style={{ fontSize: 13, fontWeight: 800, color: th.presetText }}>{item.label}</div>
                <div style={{ fontSize: 11, color: th.presetSub, marginTop: 2 }}>{item.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Symbols</span>
              <input className="input-field" value={symbols} onChange={(e) => setSymbols(e.target.value.toUpperCase())} placeholder="OGDC,HBL,ENGRO" />
            </label>

            <label>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Trend</span>
              <select className="input-field" value={trend} onChange={(e) => setTrend(e.target.value as TrendFilter)}>
                <option value="any">Any</option>
                <option value="bullish">Bullish</option>
                <option value="bearish">Bearish</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Min Price</span>
                <input className="input-field" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Max Price</span>
                <input className="input-field" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Min Score</span>
                <input className="input-field" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} />
              </label>
              <label>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: th.label, marginBottom: 6 }}>Limit</span>
                <input className="input-field" type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(e.target.value)} />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: th.label }}>
              <input type="checkbox" checked={highVolume} onChange={(e) => setHighVolume(e.target.checked)} />
              Require high volume
            </label>
          </div>
        </div>

        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: th.text }}>Matches</h2>
              <p style={{ fontSize: 12, color: th.muted, marginTop: 2 }}>
                {result ? `${result.total} matched, ${result.scanned} scanned` : "Run the screener to load live matches."}
              </p>
            </div>
            <SlidersHorizontal size={18} color={th.muted} />
          </div>

          {screenStocks.isError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
              {getApiErrorMessage(screenStocks.error)}
            </div>
          )}

          <div className="table-scroll">
            <div className="table-min">
              <div className="result-row result-head" style={{ padding: "8px 16px", borderBottom: `2px solid ${th.resultHeadBorder}` }}>
                {["Symbol", "Price", "Change", "Volume", "Score", "Reasons"].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 800, color: th.muted, textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "52px 20px", color: th.muted }}>
                  <BarChart3 size={34} strokeWidth={1.8} color={th.emptyIconColor} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: th.emptyTitleColor, marginTop: 12 }}>No screener results yet</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Choose filters and run the endpoint.</div>
                </div>
              ) : items.map((item) => {
                const trendStyle = TREND_STYLES[item.trend] ?? TREND_STYLES.neutral;
                const isUp = item.change_pct >= 0;
                return (
                  <div key={item.symbol} className="result-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: th.symbolIconBg, color: th.symbolIconColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11 }}>
                        {item.symbol.slice(0, 4)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, color: th.text }}>{item.symbol}</div>
                        <span className="chip" style={{ background: trendStyle.bg, color: trendStyle.color }}>
                          {item.trend}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>PKR {item.price.toFixed(2)}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: isUp ? "#15803D" : "#991B1B", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {item.change_pct.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 14, color: th.subtext }}>{Math.round(item.volume).toLocaleString()}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: item.score >= 70 ? "#15803D" : th.subtext }}>{item.score.toFixed(0)}</span>
                    <span style={{ fontSize: 12, color: th.muted, lineHeight: 1.5 }}>{item.reasons.slice(0, 2).join(", ") || "No reason returned"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {result?.failed?.length ? (
            <div style={{ marginTop: 14, fontSize: 12, color: th.failedColor, background: th.failedBg, border: `1px solid ${th.failedBorder}`, borderRadius: 10, padding: 12 }}>
              Failed symbols: {result.failed.join(", ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
