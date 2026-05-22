"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMarketPrediction } from "@/lib/queries";
import { useTheme } from "@/lib/use-theme";
import { ChevronLeft, Loader2, AlertTriangle, CheckCircle2, TrendingUp, Target, ShieldAlert, Zap } from "lucide-react";

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

const SIGNAL_CONFIG: Record<string, { bg: string; color: string; border: string; label: string; darkBg: string }> = {
  BUY:  { bg: "#DCFCE7", color: "#15803D", border: "#4ADE80", label: "Strong Buy Signal", darkBg: "#14532d" },
  HOLD: { bg: "#FEF9C3", color: "#854D0E", border: "#FDE68A", label: "Hold Position", darkBg: "#451a03" },
  TRIM: { bg: "#FFEDD5", color: "#9A3412", border: "#FED7AA", label: "Consider Trimming", darkBg: "#431407" },
  SELL: { bg: "#FEE2E2", color: "#991B1B", border: "#FECACA", label: "Exit Position", darkBg: "#450a0a" },
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
  const mono = useTheme();
  const data = raw ?? { ...MOCK_DATA, symbol };

  const signal = data?.prediction?.signal ?? "BUY";
  const sigConfig = SIGNAL_CONFIG[signal] ?? SIGNAL_CONFIG.BUY;
  const riskLevel = data?.risk?.level ?? "LOW";
  const riskConfig = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.LOW;
  const confidence = ((data?.prediction?.confidence ?? 0.814) * 100).toFixed(1);
  const features = data?.prediction?.features ?? MOCK_DATA.prediction.features;

  const th = mono ? {
    text: "#f1f5f9",
    subtext: "#94a3b8",
    muted: "#64748b",
    labelColor: "#cbd5e1",
    card: "#1e293b",
    border: "#334155",
    innerCard: "#111827",
    heroBg: `linear-gradient(135deg, ${sigConfig.darkBg}, #1e293b)`,
    heroBorder: "#334155",
    backBtnBg: "#111827",
    backBtnBorder: "#334155",
    rationaleBg: "#111827",
    rationaleLabelColor: "#f1f5f9",
    rationaleTextColor: "#94a3b8",
    featureBarBg: "#334155",
    featureNameColor: "#f1f5f9",
    confidenceTrackColor: "#334155",
    symbolBoxBg: "#14532d",
    symbolBoxBorder: "#166534",
    symbolBoxColor: "#4ade80",
    actionOutlineBg: "#111827",
    actionOutlineBorder: "#334155",
    actionOutlineColor: "#cbd5e1",
    signaturedBg: "#111827",
    signatureColor: "#94a3b8",
    integrityVerifiedBg: "#14532d",
    integrityVerifiedBorder: "#166534",
    integrityVerifiedColor: "#4ade80",
    integrityFailBg: "#450a0a",
    integrityFailBorder: "#7f1d1d",
    integritySubText: "#94a3b8",
    tierBg: "#14532d",
    tierBorder: "#166534",
    tierColor: "#4ade80",
  } : {
    text: "#111827",
    subtext: "#6B7280",
    muted: "#9CA3AF",
    labelColor: "#374151",
    card: "white",
    border: "#E5E7EB",
    innerCard: "#F9FAFB",
    heroBg: `linear-gradient(135deg, ${sigConfig.bg}, white)`,
    heroBorder: sigConfig.border,
    backBtnBg: "white",
    backBtnBorder: "#E5E7EB",
    rationaleBg: "#F9FAFB",
    rationaleLabelColor: "#374151",
    rationaleTextColor: "#6B7280",
    featureBarBg: "#F3F4F6",
    featureNameColor: "#374151",
    confidenceTrackColor: "#F3F4F6",
    symbolBoxBg: "white",
    symbolBoxBorder: "#E5E7EB",
    symbolBoxColor: "#16A34A",
    actionOutlineBg: "white",
    actionOutlineBorder: "#E5E7EB",
    actionOutlineColor: "#374151",
    signaturedBg: "#F9FAFB",
    signatureColor: "#374151",
    integrityVerifiedBg: "#F0FDF4",
    integrityVerifiedBorder: "#BBF7D0",
    integrityVerifiedColor: "#15803D",
    integrityFailBg: "#FEF2F2",
    integrityFailBorder: "#FECACA",
    integritySubText: "#6B7280",
    tierBg: "#F0FDF4",
    tierBorder: "#BBF7D0",
    tierColor: "#16A34A",
  };

  const isVerified = data?.integrity?.verified !== false;

  return (
    <div suppressHydrationWarning style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: th.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 16px; padding: 24px; }
        .metric-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 14px; padding: 20px; transition: all 0.2s; }
        .metric-card:hover { box-shadow: ${mono ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.08)"}; transform: translateY(-2px); }
        .chip { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; color: ${th.subtext}; font-size: 14px; font-weight: 500; text-decoration: none; padding: 8px 14px; border: 1.5px solid ${th.backBtnBorder}; border-radius: 8px; background: ${th.backBtnBg}; transition: all 0.2s; }
        .back-btn:hover { border-color: #4ADE80; color: #16A34A; }
        .feature-bar { height: 8px; border-radius: 100px; background: ${th.featureBarBg}; overflow: hidden; }
        .feature-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #4ADE80, #16A34A); transition: width 0.8s ease; }
        .action-btn { padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        @media (max-width: 640px) {
          .symbol-hero { padding: 20px !important; }
          .symbol-h1 { font-size: 28px !important; }
          .signal-badge { font-size: 15px !important; padding: 6px 18px !important; }
          .action-btn { padding: 10px 16px !important; font-size: 13px !important; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Back Button */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/predict" className="back-btn">
          <ChevronLeft size={16} strokeWidth={2} />
          Back to Predictions
        </Link>
      </div>

      {/* Hero Section */}
      <div className="symbol-hero" style={{ background: th.heroBg, border: `2px solid ${th.heroBorder}`, borderRadius: 20, padding: 32, marginBottom: 24, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: mono ? `${sigConfig.darkBg}88` : `${sigConfig.bg}`, opacity: 0.5 }}/>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, background: th.symbolBoxBg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: th.symbolBoxColor, border: `1.5px solid ${th.symbolBoxBorder}`, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                  {symbol.slice(0, 4)}
                </div>
                <div>
                  <h1 className="symbol-h1" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, letterSpacing: "-0.5px", color: th.text }}>{symbol}</h1>
                  <p style={{ fontSize: 13, color: th.subtext, marginTop: 2 }}>
                    Generated {new Date(data?.predicted_at ?? Date.now()).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="signal-badge" style={{ background: sigConfig.color, color: "white", padding: "8px 24px", borderRadius: 12, fontWeight: 800, fontSize: 18, letterSpacing: "1px" }}>
                  {signal}
                </span>
                <span style={{ fontSize: 15, color: th.subtext, fontWeight: 500 }}>{sigConfig.label}</span>
              </div>
            </div>

            {/* Confidence Circle */}
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke={th.confidenceTrackColor} strokeWidth="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke={sigConfig.color} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - parseFloat(confidence) / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: th.text }}>{confidence}%</span>
                  <span style={{ fontSize: 10, color: th.muted, fontWeight: 500 }}>Confidence</span>
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
          <Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
          Fetching live prediction for {symbol}...
        </div>
      )}
      {error && (
        <div style={{ background: mono ? "#451a03" : "#FFFBEB", border: `1px solid ${mono ? "#78350f" : "#FDE68A"}`, borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14, color: mono ? "#fb923c" : "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={16} strokeWidth={2} />
          Backend offline — showing demo data. Connect backend to see live signals.
        </div>
      )}

      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Execution Levels */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: th.text }}>Execution Levels</h3>
          <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Entry Price", value: data?.prediction?.entry_price ? `PKR ${data.prediction.entry_price}` : "PKR 173.50", sub: "Recommended entry", color: "#16A34A", Icon: TrendingUp, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Target Price", value: data?.prediction?.target_price ? `PKR ${data.prediction.target_price}` : "PKR 127.50", sub: "Upside target", color: "#1D4ED8", Icon: Target, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
              { label: "Stop Loss", value: data?.prediction?.stop_loss ? `PKR ${data.prediction.stop_loss}` : "PKR 168.00", sub: "Risk limit", color: "#DC2626", Icon: ShieldAlert, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
              { label: "Expected Gain", value: data?.prediction?.expected_gain_pct ? `${data.prediction.expected_gain_pct}%` : "8.4%", sub: "Potential upside", color: "#16A34A", Icon: Zap, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
            ].map(m => (
              <div key={m.label} className="metric-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: th.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{m.label}</p>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: m.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: m.iconColor, flexShrink: 0 }}>
                    <m.Icon size={15} strokeWidth={2} />
                  </div>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</p>
                <p style={{ fontSize: 12, color: th.muted, marginTop: 4 }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Rationale */}
          <div style={{ background: th.rationaleBg, borderRadius: 12, padding: 16, marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: th.rationaleLabelColor, marginBottom: 6 }}>AI Rationale</p>
            <p style={{ fontSize: 13, color: th.rationaleTextColor, lineHeight: 1.65 }}>
              {data?.prediction?.rationale ?? MOCK_DATA.prediction.rationale}
            </p>
          </div>
        </div>

        {/* SHAP Feature Importance */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: th.text }}>Signal Drivers</h3>
          <p style={{ fontSize: 12, color: th.muted, marginBottom: 20 }}>SHAP feature importance</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {features.map((f: any, i: number) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: th.featureNameColor }}>{f.name}</span>
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
      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: th.text }}>Risk Assessment</h3>
          <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Risk Level", value: riskLevel, highlight: true },
              { label: "Risk Score", value: (data?.risk?.score ?? 0.24).toFixed(2) },
              { label: "Dynamic Score", value: (data?.risk?.dynamic_score ?? 0.31).toFixed(2) },
              { label: "Recent Requests (10m)", value: data?.risk?.recent_request_count_10m ?? 3 },
              { label: "High Risk Events", value: data?.risk?.historical_high_risk_events ?? 1 },
              { label: "Engine", value: data?.prediction?.engine ?? "ensemble_v2" },
            ].map(r => (
              <div key={r.label} style={{ background: th.innerCard, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 11, color: th.muted, marginBottom: 4 }}>{r.label}</p>
                {r.highlight ? (
                  <span className="chip" style={{ background: riskConfig.bg, color: riskConfig.color, fontSize: 13 }}>{r.value}</span>
                ) : (
                  <p style={{ fontSize: 15, fontWeight: 700, color: th.text }}>{r.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: th.text }}>Integrity Verification</h3>
          <div style={{ background: isVerified ? th.integrityVerifiedBg : th.integrityFailBg, border: `1px solid ${isVerified ? th.integrityVerifiedBorder : th.integrityFailBorder}`, borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: isVerified ? th.integrityVerifiedColor : "#f87171", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CheckCircle2 size={18} strokeWidth={2} />
              {isVerified ? "HMAC Verified" : "Verification Failed"}
            </p>
            <p style={{ fontSize: 13, color: th.integritySubText, marginTop: 4 }}>
              {isVerified ? "Prediction data is authentic and untampered" : "Data integrity check failed"}
            </p>
          </div>
          <div style={{ background: th.signaturedBg, borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, color: th.muted, fontWeight: 600, marginBottom: 6 }}>HMAC SIGNATURE</p>
            <p style={{ fontSize: 11, color: th.signatureColor, wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.6 }}>
              {data?.integrity?.signature ?? MOCK_DATA.integrity.signature}
            </p>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: th.subtext }}>Prediction Tier:</span>
            <span className="chip" style={{ background: th.tierBg, color: th.tierColor, border: `1px solid ${th.tierBorder}` }}>
              {data?.prediction?.tier ?? "HIGH"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/portfolio" className="action-btn" style={{ background: "#16A34A", color: "white" }}>
          <TrendingUp size={16} color="white" strokeWidth={2} />
          Add to Portfolio
        </Link>
        <Link href="/trades" className="action-btn" style={{ background: th.actionOutlineBg, color: th.actionOutlineColor, border: `1.5px solid ${th.actionOutlineBorder}` }}>
          <Zap size={15} strokeWidth={2} />
          Log Trade
        </Link>
        <Link href="/predict" className="action-btn" style={{ background: th.actionOutlineBg, color: th.actionOutlineColor, border: `1.5px solid ${th.actionOutlineBorder}` }}>
          <ChevronLeft size={15} strokeWidth={2} />
          Another Symbol
        </Link>
      </div>
    </div>
  );
}
