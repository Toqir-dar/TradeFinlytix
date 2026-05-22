"use client";

import type { CompanyProfileData } from "@/lib/queries";
import { Building2, Globe, Users, TrendingUp } from "lucide-react";
import { useTheme } from "@/lib/use-theme";

interface Props {
  data?: CompanyProfileData;
  loading?: boolean;
  error?: boolean;
}

function fmtCap(n: number) {
  if (n >= 1e12) return `PKR ${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `PKR ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `PKR ${(n / 1e6).toFixed(2)}M`;
  return n > 0 ? `PKR ${n.toLocaleString()}` : "N/A";
}

export function CompanyProfilePanel({ data, loading, error }: Props) {
  const mono = useTheme();
  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b", divider: "#334155" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280", divider: "#F3F4F6" };

  if (loading) {
    return (
      <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: 28, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #4ADE80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: 28, textAlign: "center", color: card.muted, fontSize: 14 }}>
        Company profile unavailable
      </div>
    );
  }

  const stats = [
    { icon: <TrendingUp size={14} />, label: "Market Cap", value: fmtCap(data.market_cap) },
    { icon: <TrendingUp size={14} />, label: "P/E Ratio", value: data.pe_ratio > 0 ? data.pe_ratio.toFixed(2) : "N/A" },
    { icon: <TrendingUp size={14} />, label: "EPS", value: data.eps !== 0 ? data.eps.toFixed(2) : "N/A" },
    { icon: <Users size={14} />, label: "Employees", value: data.employees > 0 ? data.employees.toLocaleString() : "N/A" },
  ];

  return (
    <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#4ADE80,#16A34A)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Building2 size={22} color="white" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: card.text }}>{data.name}</div>
          <div style={{ fontSize: 13, color: card.muted, marginTop: 2 }}>
            <span style={{ background: mono ? "#334155" : "#F3F4F6", padding: "2px 8px", borderRadius: 6, fontWeight: 600, marginRight: 6 }}>{data.symbol}</span>
            {data.exchange} · {data.sector}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${card.divider}` }}>
        {stats.map(({ label, value }) => (
          <div key={label} style={{ background: mono ? "#0f172a" : "#F9FAFB", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: card.muted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: card.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: data.description ? 16 : 0 }}>
        {data.industry && data.industry !== "N/A" && (
          <div style={{ fontSize: 12, color: card.muted }}>
            <span style={{ color: card.text, fontWeight: 600 }}>Industry:</span> {data.industry}
          </div>
        )}
        {data.country && (
          <div style={{ fontSize: 12, color: card.muted }}>
            <span style={{ color: card.text, fontWeight: 600 }}>Country:</span> {data.country}
          </div>
        )}
        {data.website && (
          <a href={data.website} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#4ADE80", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
            <Globe size={12} /> Website
          </a>
        )}
      </div>

      {/* Description */}
      {data.description && (
        <p style={{ fontSize: 13, color: card.muted, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {data.description}
        </p>
      )}

      {data.updated_at && (
        <div style={{ marginTop: 14, fontSize: 10, color: card.muted }}>
          Updated {new Date(data.updated_at).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
        </div>
      )}
    </div>
  );
}
