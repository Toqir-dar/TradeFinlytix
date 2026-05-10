"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMarketPrediction } from "@/lib/queries";

const MOCK_DATA = {
  symbol: "OGDC",
  predicted_at: new Date().toISOString(),
  prediction: {
    signal: "BUY",
    confidence: 0.814,
    tier: "HIGH",
    engine: "ensemble_v2",
    entry_price: 173.5,
    target_price: 127.5,
    stop_loss: 168.0,
    expected_gain_pct: 8.4,
    rationale: "Strong momentum with bullish MACD crossover. Volume surge detected above 20-day average. RSI at 58 — not overbought. Fundamental value supported by recent earnings beat.",
    features: [
      { name: "Price Momentum", value: 0.82 },
      { name: "Volume Signal", value: 0.74 },
      { name: "RSI Score", value: 0.61 },
      { name: "MACD Signal", value: 0.58 },
      { name: "Earnings Beat", value: 0.49 },
      { name: "Sector Trend", value: 0.43 },
    ]
  },
  risk: {
    level: "LOW",
    score: 0.24,
    dynamic_score: 0.31,
    recent_request_count_10m: 3,
    historical_high_risk_events: 1,
  },
  integrity: {
    signature: "hmac_sha256_verified_a1b2c3d4e5f6",
    verified: true,
  }
};

const SIGNAL_CONFIG: Record<string, { bg: string; color: string; border: string; label: string; emoji: string }> = {
  BUY:  { bg: "#DCFCE7", color: "#15803D", border: "#4ADE80", label: "Strong Buy Signal", emoji: "📈" },
  HOLD: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A", label: "Hold Position", emoji: "⏸️" },
  TRIM: { bg: "#FFEDD5", color: "#9A3412", border: "#FED7AA", label: "Consider Trimming", emoji: "✂️" },
  SELL: { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA", label: "Exit Position", emoji: "📉" },
};

const RISK_CONFIG: Record<string, { bg: string; color: string }> = {
  LOW:      { bg: "#DCFCE7", color: "#15803D" },
  MEDIUM:   { bg: "#FEF9C3", color: "#854D0E" },
  HIGH:     { bg: "#FEE2E2", color: "#991B1B" },
  CRITICAL: { bg: "#7F1D1D", color: "white" },
};

export default function PredictSymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "OGDC").toUpperCase();
  const { data: raw, isLoading, error } = useMarketPrediction(symbol);
  const data = raw ?? { ...MOCK_DATA, symbol };

  const signal = data?.prediction?.signal ?? "BUY";
  const sigConfig = SIGNAL_CONFIG[signal] ?? SIGNAL_CONFIG.BUY;
  const riskLevel = data?.risk?.level ?? "LOW";
  const riskConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.LOW;
  const confidence = ((data?.prediction?.confidence ?? 0.814) * 100).toFixed(1);
  const features = data?.prediction?.features ?? MOCK_DATA.prediction.features;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .metric-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 20px; transition: all 0.2s; }
        .metric-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .chip { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; color: #6B7280; font-size: 14px; font-weight: 500; text-decoration: none; padding: 8px 14px; border: 1.5px solid #E5E7EB; border-radius: 8px; background: white; transition: all 0.2s; }
        .back-btn:hover { border-color: #4ADE80; color: #16A34A; }
        .feature-bar { height: 8px; border-radius: 100px; background: #F3F4F6; overflow: hidden; }
        .feature-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #4ADE80, #16A34A); transition: width 0.8s ease; }
        .action-btn { padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
      `}</style>

      {/* Back Button */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/predict" className="back-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Predictions
        </Link>
      </div>

      {/* Hero Section */}
      <div style={{ background: `linear-gradient(135deg, ${sigConfig.bg}, white)`, border: `2px solid ${sigConfig.border}`, borderRadius: 20, padding: 32, marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: sigConfig.bg, opacity: 0.5 }}/>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, background: "white", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#16A34A", border: "1.5px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  {symbol.slice(0, 4)}
                </div>
                <div>
                  <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, letterSpacing: "-0.5px", color: "#111827" }}>{symbol}</h1>
                  <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                    Generated {new Date(data?.predicted_at ?? Date.now()).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ background: sigConfig.color, color: "white", padding: "8px 24px", borderRadius: 12, fontWeight: 800, fontSize: 18, letterSpacing: "1px" }}>
                  {sigConfig.emoji} {signal}
                </span>
                <span style={{ fontSize: 15, color: "#6B7280", fontWeight: 500 }}>{sigConfig.label}</span>
              </div>
            </div>

            {/* Confidence Circle */}
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke={sigConfig.color} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - parseFloat(confidence) / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{confidence}%</span>
                  <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>Confidence</span>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="chip" style={{ background: riskConfig.bg, color: riskConfig.color }}>
                  {riskLevel} RISK
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14, color: "#15803D", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
          Fetching live prediction for {symbol}...
        </div>
      )}
      {error && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14, color: "#92400E" }}>
          ⚠️ Backend offline — showing demo data. Connect backend to see live signals.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Execution Levels */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>📊 Execution Levels</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Entry Price", value: data?.prediction?.entry_price ? `PKR ${data.prediction.entry_price}` : "PKR 173.50", sub: "Recommended entry", color: "#16A34A" },
              { label: "Target Price", value: data?.prediction?.target_price ? `PKR ${data.prediction.target_price}` : "PKR 127.50", sub: "Upside target", color: "#16A34A" },
              { label: "Stop Loss", value: data?.prediction?.stop_loss ? `PKR ${data.prediction.stop_loss}` : "PKR 168.00", sub: "Risk limit", color: "#DC2626" },
              { label: "Expected Gain", value: data?.prediction?.expected_gain_pct ? `${data.prediction.expected_gain_pct}%` : "8.4%", sub: "Potential upside", color: "#16A34A" },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{m.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Rationale */}
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 16, marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>🧠 AI Rationale</p>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.65 }}>
              {data?.prediction?.rationale ?? MOCK_DATA.prediction.rationale}
            </p>
          </div>
        </div>

        {/* SHAP Feature Importance */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>⚡ Signal Drivers</h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>SHAP feature importance</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map((f: any, i: number) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{f.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{(f.value * 100).toFixed(0)}%</span>
                </div>
                <div className="feature-bar">
                  <div className="feature-fill" style={{ width: `${f.value * 100}%` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk & Integrity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Risk Details */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>🛡️ Risk Assessment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Risk Level", value: riskLevel, highlight: true },
              { label: "Risk Score", value: (data?.risk?.score ?? 0.24).toFixed(2) },
              { label: "Dynamic Score", value: (data?.risk?.dynamic_score ?? 0.31).toFixed(2) },
              { label: "Recent Requests (10m)", value: data?.risk?.recent_request_count_10m ?? 3 },
              { label: "High Risk Events", value: data?.risk?.historical_high_risk_events ?? 1 },
              { label: "Engine", value: data?.prediction?.engine ?? "ensemble_v2" },
            ].map(r => (
              <div key={r.label} style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{r.label}</p>
                {r.highlight ? (
                  <span className="chip" style={{ background: riskConfig.bg, color: riskConfig.color, fontSize: 13 }}>{r.value}</span>
                ) : (
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{r.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Integrity */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>🔐 Integrity Verification</h3>
          <div style={{ background: data?.integrity?.verified !== false ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${data?.integrity?.verified !== false ? "#BBF7D0" : "#FECACA"}`, borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{data?.integrity?.verified !== false ? "✅" : "❌"}</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: data?.integrity?.verified !== false ? "#15803D" : "#991B1B" }}>
              {data?.integrity?.verified !== false ? "HMAC Verified" : "Verification Failed"}
            </p>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              {data?.integrity?.verified !== false ? "Prediction data is authentic and untampered" : "Data integrity check failed"}
            </p>
          </div>
          <div style={{ background: "#F9FAFB", borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>HMAC SIGNATURE</p>
            <p style={{ fontSize: 11, color: "#374151", wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.6 }}>
              {data?.integrity?.signature ?? MOCK_DATA.integrity.signature}
            </p>
          </div>

          {/* Tier Badge */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>Prediction Tier:</span>
            <span className="chip" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
              {data?.prediction?.tier ?? "HIGH"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/portfolio" className="action-btn" style={{ background: "#16A34A", color: "white" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14l4-4 3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Add to Portfolio
        </Link>
        <Link href="/trades" className="action-btn" style={{ background: "white", color: "#374151", border: "1.5px solid #E5E7EB" }}>
          📋 Log Trade
        </Link>
        <Link href="/predict" className="action-btn" style={{ background: "white", color: "#374151", border: "1.5px solid #E5E7EB" }}>
          🔍 Another Symbol
        </Link>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
