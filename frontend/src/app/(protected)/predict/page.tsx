"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POPULAR_SYMBOLS = [
  { symbol: "OGDC", name: "Oil & Gas Dev. Corp", sector: "Energy" },
  { symbol: "HBL", name: "Habib Bank Limited", sector: "Banking" },
  { symbol: "ENGRO", name: "Engro Corporation", sector: "Chemicals" },
  { symbol: "LUCK", name: "Lucky Cement", sector: "Cement" },
  { symbol: "PSO", name: "Pakistan State Oil", sector: "Energy" },
  { symbol: "MCB", name: "MCB Bank Limited", sector: "Banking" },
  { symbol: "MARI", name: "Mari Petroleum", sector: "Energy" },
  { symbol: "HUBC", name: "Hub Power Company", sector: "Power" },
  { symbol: "NESTLE", name: "Nestle Pakistan", sector: "FMCG" },
  { symbol: "SEARL", name: "The Searle Company", sector: "Pharma" },
  { symbol: "UBL", name: "United Bank Limited", sector: "Banking" },
  { symbol: "FFC", name: "Fauji Fertilizer", sector: "Chemicals" },
];

const SECTORS = ["All", "Energy", "Banking", "Chemicals", "Cement", "Power", "FMCG", "Pharma"];

const MOCK_RECENT = [
  { symbol: "OGDC", signal: "BUY", confidence: 81, time: "2 min ago" },
  { symbol: "HBL", signal: "HOLD", confidence: 62, time: "15 min ago" },
  { symbol: "ENGRO", signal: "BUY", confidence: 74, time: "1 hr ago" },
  { symbol: "LUCK", signal: "TRIM", confidence: 48, time: "2 hr ago" },
];

const SIGNAL_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  BUY: { bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" },
  HOLD: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A" },
  TRIM: { bg: "#FFEDD5", color: "#9A3412", border: "#FED7AA" },
  SELL: { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA" },
};

export default function PredictPage() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [selectedSector, setSelectedSector] = useState("All");
  const [focused, setFocused] = useState(false);

  const filtered = POPULAR_SYMBOLS.filter(s =>
    (selectedSector === "All" || s.sector === selectedSector) &&
    (symbol === "" || s.symbol.includes(symbol.toUpperCase()) || s.name.toLowerCase().includes(symbol.toLowerCase()))
  );

  const handleSearch = () => {
    if (symbol.trim()) router.push(`/predict/${symbol.toUpperCase()}`);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .search-input { width: 100%; padding: 16px 20px 16px 52px; border: 2px solid #E5E7EB; border-radius: 14px; font-size: 16px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .search-input:focus { border-color: #4ADE80; box-shadow: 0 0 0 4px rgba(74,222,128,0.1); }
        .search-input::placeholder { color: #9CA3AF; }
        .sector-btn { padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1.5px solid #E5E7EB; background: white; color: #6B7280; font-family: inherit; }
        .sector-btn:hover { border-color: #4ADE80; color: #16A34A; }
        .sector-btn.active { background: #16A34A; color: white; border-color: #16A34A; }
        .symbol-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 18px; cursor: pointer; transition: all 0.25s; text-decoration: none; display: block; }
        .symbol-card:hover { border-color: #4ADE80; box-shadow: 0 8px 24px rgba(74,222,128,0.15); transform: translateY(-3px); }
        .recent-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 10px; transition: background 0.15s; cursor: pointer; }
        .recent-row:hover { background: #F9FAFB; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .predict-btn { background: #16A34A; color: white; border: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; gap: 8px; }
        .predict-btn:hover { background: #15803D; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .predict-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 8 }}>
          AI Signal Predictions
        </h1>
        <p style={{ fontSize: 15, color: "#6B7280" }}>
          Enter any PSX symbol to get AI-powered buy/hold/trim/sell signals with confidence scores.
        </p>
      </div>

      {/* Search Box */}
      <div style={{ background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "1.5px solid #BBF7D0", borderRadius: 20, padding: 32, marginBottom: 32 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <svg style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M15 15l-3-3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search symbol e.g. OGDC, HBL, ENGRO..."
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button
          className="predict-btn"
          onClick={handleSearch}
          disabled={!symbol.trim()}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 14l5-5 3 3 6-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="17" cy="5" r="2" fill="white"/>
          </svg>
          Get AI Prediction
        </button>

        {/* Quick symbols */}
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, alignSelf: "center" }}>Quick:</span>
          {["OGDC", "HBL", "ENGRO", "PSO", "MARI"].map(s => (
            <button key={s} onClick={() => router.push(`/predict/${s}`)}
              style={{ background: "white", border: "1px solid #BBF7D0", color: "#16A34A", padding: "5px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#16A34A"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#16A34A"; }}
            >{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        {/* Left — Browse Symbols */}
        <div>
          {/* Sector Filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {SECTORS.map(s => (
              <button key={s} className={`sector-btn ${selectedSector === s ? "active" : ""}`}
                onClick={() => setSelectedSector(s)}>{s}</button>
            ))}
          </div>

          {/* Symbol Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {filtered.map(s => (
              <Link key={s.symbol} href={`/predict/${s.symbol}`} className="symbol-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, background: "#F0FDF4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#16A34A" }}>
                    {s.symbol.slice(0, 3)}
                  </div>
                  <span style={{ background: "#F0FDF4", color: "#16A34A", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600 }}>
                    {s.sector}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{s.symbol}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{s.name}</div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4, color: "#16A34A", fontSize: 13, fontWeight: 600 }}>
                  Get Signal
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>No symbols found</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Try searching directly above</div>
            </div>
          )}
        </div>

        {/* Right — Recent Searches + Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Recent */}
          <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              Recent Signals
            </h3>
            {MOCK_RECENT.map((r, i) => (
              <div key={i} className="recent-row" onClick={() => router.push(`/predict/${r.symbol}`)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, background: "#F0FDF4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#16A34A" }}>
                    {r.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.symbol}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{r.time}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="chip" style={{ background: SIGNAL_COLORS[r.signal]?.bg, color: SIGNAL_COLORS[r.signal]?.color }}>
                    {r.signal}
                  </span>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{r.confidence}%</div>
                </div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>How it works</h3>
            {[
              { num: "1", text: "Enter any PSX symbol (.KA ticker)" },
              { num: "2", text: "AI ensemble runs XGBoost + LightGBM + LSTM" },
              { num: "3", text: "Get BUY/HOLD/TRIM/SELL with confidence score" },
              { num: "4", text: "SHAP explains which factors drove the signal" },
            ].map(s => (
              <div key={s.num} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 22, height: 22, background: "#4ADE80", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#14532D", flexShrink: 0 }}>
                  {s.num}
                </div>
                <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> AI signals are for informational purposes only. Always do your own research before trading.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
