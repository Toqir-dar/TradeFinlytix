"use client";

import type { MarketSummaryData } from "@/lib/queries";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

interface Props {
  data?: MarketSummaryData;
  loading?: boolean;
  error?: boolean;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-PK", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVol(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function MarketSummaryCard({ data, loading, error }: Props) {
  const mono = useTheme();

  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280" };

  if (loading) {
    return (
      <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: 28, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #4ADE80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: 28, textAlign: "center", color: card.muted, fontSize: 14 }}>
        Market data unavailable
      </div>
    );
  }

  const positive = data.change_pct >= 0;
  const changeColor = positive ? "#16A34A" : "#DC2626";
  const changeBg = positive ? "#DCFCE7" : "#FEE2E2";

  return (
    <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#4ADE80,#16A34A)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={20} color="white" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: card.muted, fontWeight: 500 }}>PSX Index</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: card.text }}>{data.index}</div>
          </div>
        </div>
        <span style={{ background: changeBg, color: changeColor, borderRadius: 100, padding: "4px 12px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {positive ? "+" : ""}{fmt(data.change_pct)}%
        </span>
      </div>

      <div style={{ fontSize: 36, fontWeight: 800, color: card.text, letterSpacing: "-1px", marginBottom: 8 }}>
        {fmt(data.price, 0)}
      </div>
      <div style={{ fontSize: 14, color: changeColor, fontWeight: 600, marginBottom: 20 }}>
        {positive ? "+" : ""}{fmt(data.change)} pts today
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, paddingTop: 16, borderTop: `1px solid ${card.border}` }}>
        {[
          { label: "High", value: fmt(data.high, 0) },
          { label: "Low", value: fmt(data.low, 0) },
          { label: "Volume", value: fmtVol(data.volume) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: card.muted, fontWeight: 500, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: card.text }}>{value}</div>
          </div>
        ))}
      </div>

      {data.source && data.source !== "unknown" && (
        <div style={{ marginTop: 12, fontSize: 10, color: card.muted }}>
          Source: {data.source} · {data.updated_at ? new Date(data.updated_at).toLocaleTimeString("en-PK", { timeStyle: "short" }) : ""}
        </div>
      )}
    </div>
  );
}
