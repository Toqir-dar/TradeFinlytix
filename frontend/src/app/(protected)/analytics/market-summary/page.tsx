"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { useMarketSummary, useGainersLosers } from "@/lib/queries";
import { MarketSummaryCard } from "@/components/analytics/MarketSummaryCard";
import { GainersLosersTable } from "@/components/analytics/GainersLosersTable";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function MarketSummaryPage() {
  const mono = useTheme();
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useMarketSummary();
  const { data: movers, isLoading: moversLoading, isError: moversError, refetch: refetchMovers } = useGainersLosers();

  const card = mono
    ? { text: "#f1f5f9", muted: "#64748b" }
    : { text: "#111827", muted: "#6B7280" };

  return (
    <div style={{ paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#4ADE80,#16A34A)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={22} color="white" strokeWidth={2} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: card.text, margin: 0 }}>Market Summary</h1>
              <p style={{ fontSize: 13, color: card.muted, margin: 0 }}>KSE-100 live stats · Auto-refreshes every 60s</p>
            </div>
          </div>
          <button
            onClick={() => { refetchSummary(); refetchMovers(); }}
            style={{ padding: "8px 18px", borderRadius: 10, border: "1.5px solid #4ADE80", background: "transparent", color: "#16A34A", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#DCFCE7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08, ease: EASE }} style={{ marginBottom: 24 }}>
        <MarketSummaryCard data={summary} loading={summaryLoading} error={summaryError} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16, ease: EASE }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: card.text, marginBottom: 12 }}>Gainers & Losers</div>
        <GainersLosersTable data={movers} loading={moversLoading} error={moversError} />
      </motion.div>
    </div>
  );
}
