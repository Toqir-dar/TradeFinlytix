"use client";

import Link from "next/link";
import type { GainersLosersData, GainerLoserItem } from "@/lib/queries";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

interface Props {
  data?: GainersLosersData;
  loading?: boolean;
  error?: boolean;
}

function SymbolRow({ item, mode }: { item: GainerLoserItem; mode: "gainer" | "loser" }) {
  const mono = useTheme();
  const positive = mode === "gainer";
  const color = positive ? "#16A34A" : "#DC2626";
  const bg = positive ? "#DCFCE7" : "#FEE2E2";
  const rowBg = mono ? "#0f172a" : "transparent";
  const textColor = mono ? "#f1f5f9" : "#111827";
  const mutedColor = mono ? "#64748b" : "#6B7280";

  return (
    <Link
      href={`/analytics/company-profile/${item.symbol}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${mono ? "#1e293b" : "#F3F4F6"}`, textDecoration: "none", transition: "background 0.15s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {positive ? <TrendingUp size={15} color={color} /> : <TrendingDown size={15} color={color} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{item.symbol}</div>
          <div style={{ fontSize: 11, color: mutedColor }}>{item.volume >= 1_000_000 ? `${(item.volume / 1_000_000).toFixed(1)}M` : `${(item.volume / 1000).toFixed(0)}K`} vol</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>PKR {item.price.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color }}>
          {positive ? "+" : ""}{item.change_pct.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

function TableSection({ title, items, mode, card }: {
  title: string;
  items: GainerLoserItem[];
  mode: "gainer" | "loser";
  card: { bg: string; border: string; text: string; muted: string };
}) {
  const positive = mode === "gainer";
  return (
    <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        {positive ? <TrendingUp size={16} color="#16A34A" /> : <TrendingDown size={16} color="#DC2626" />}
        <span style={{ fontWeight: 700, fontSize: 14, color: card.text }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: card.muted }}>{items.length} stocks</span>
      </div>
      {items.length === 0 ? (
        <div style={{ color: card.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No data</div>
      ) : (
        items.map((item) => <SymbolRow key={item.symbol} item={item} mode={mode} />)
      )}
    </div>
  );
}

export function GainersLosersTable({ data, loading, error }: Props) {
  const mono = useTheme();
  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280" };

   if (loading) {
    return (
      <div className="gainers-losers-grid">
        {[0, 1].map((i) => (
          <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: 28, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #4ADE80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ))}
      </div>
    );
  }

  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  return (
    <>
      <style>{`
        .gainers-losers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) {
          .gainers-losers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="gainers-losers-grid">
        <TableSection title="Top Gainers" items={gainers} mode="gainer" card={card} />
        <TableSection title="Top Losers" items={losers} mode="loser" card={card} />
      </div>
    </>
  );
}
