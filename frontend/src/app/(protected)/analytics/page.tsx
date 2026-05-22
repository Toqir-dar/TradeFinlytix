"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, LineChart, Building2 } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { useMarketSummary, useGainersLosers } from "@/lib/queries";
import { MarketSummaryCard } from "@/components/analytics/MarketSummaryCard";
import { GainersLosersTable } from "@/components/analytics/GainersLosersTable";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const shortcuts = [
  {
    href: "/analytics/market-summary",
    icon: <TrendingUp size={22} color="white" />,
    title: "Market Summary",
    description: "KSE-100 index, intraday stats, top movers at a glance.",
    gradient: "linear-gradient(135deg,#4ADE80,#16A34A)",
  },
  {
    href: "/analytics/ohlc",
    icon: <LineChart size={22} color="white" />,
    title: "OHLC Chart",
    description: "Candlestick charts with volume for any PSX symbol.",
    gradient: "linear-gradient(135deg,#60A5FA,#2563EB)",
  },
  {
    href: "/analytics/company-profile/OGDC",
    icon: <Building2 size={22} color="white" />,
    title: "Company Profiles",
    description: "Sector, market cap, P/E ratio and more for any listed company.",
    gradient: "linear-gradient(135deg,#A78BFA,#7C3AED)",
  },
];

export default function AnalyticsOverviewPage() {
  const mono = useTheme();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useMarketSummary();
  const { data: movers, isLoading: moversLoading, isError: moversError } = useGainersLosers();

  const bg = mono ? "#0f172a" : "#F9FAFB";
  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280" };

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "0 0 40px" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#4ADE80,#16A34A)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart2 size={22} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: card.text, margin: 0 }}>PSX Analytics</h1>
            <p style={{ fontSize: 13, color: card.muted, margin: 0 }}>Live market intelligence for Pakistan Stock Exchange</p>
          </div>
        </div>
      </motion.div>

      {/* Shortcut cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16, marginBottom: 32 }}>
        {shortcuts.map(({ href, icon, title, description, gradient }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
          >
            <Link href={href} style={{ display: "block", textDecoration: "none" }}>
              <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: "20px 22px", cursor: "pointer", transition: "box-shadow 0.2s, border-color 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(74,222,128,0.15)"; e.currentTarget.style.borderColor = "#4ADE80"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = card.border; }}>
                <div style={{ width: 44, height: 44, background: gradient, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  {icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: card.text, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 13, color: card.muted, lineHeight: 1.5 }}>{description}</div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Market Summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: EASE }} style={{ marginBottom: 24 }}>
        <MarketSummaryCard data={summary} loading={summaryLoading} error={summaryError} />
      </motion.div>

      {/* Gainers / Losers */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24, ease: EASE }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: card.text, marginBottom: 12 }}>Top Movers</div>
        <GainersLosersTable data={movers} loading={moversLoading} error={moversError} />
      </motion.div>
    </div>
  );
}
