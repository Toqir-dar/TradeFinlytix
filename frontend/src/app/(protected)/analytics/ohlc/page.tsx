"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Search } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { useOhlc } from "@/lib/queries";
import { OHLCChart } from "@/components/analytics/OHLCChart";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const POPULAR = ["OGDC", "HBL", "ENGRO", "LUCK", "PSO", "MCB", "UBL", "PPL"];

export default function OhlcPage() {
  const mono = useTheme();
  const [inputValue, setInputValue] = useState("OGDC");
  const [symbol, setSymbol] = useState("OGDC");
  const [interval, setInterval] = useState("1mo");

  const { data, isLoading, isError } = useOhlc(symbol, interval);

  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b", inputBg: "#0f172a" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280", inputBg: "#F9FAFB" };

  const handleSearch = () => {
    const s = inputValue.toUpperCase().trim();
    if (s) setSymbol(s);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#60A5FA,#2563EB)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LineChart size={22} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: card.text, margin: 0 }}>OHLC Chart</h1>
            <p style={{ fontSize: 13, color: card.muted, margin: 0 }}>Candlestick price history for any PSX symbol</p>
          </div>
        </div>
      </motion.div>

      {/* Symbol search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06, ease: EASE }} style={{ marginBottom: 20 }}>
        <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: card.text, marginBottom: 10 }}>Search Symbol</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="e.g. OGDC"
              style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${card.border}`, background: card.inputBg, color: card.text, fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: "10px 20px", borderRadius: 10, background: "#16A34A", color: "white", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#15803D"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#16A34A"; }}
            >
              <Search size={15} /> Search
            </button>
          </div>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {POPULAR.map(s => (
              <button
                key={s}
                onClick={() => { setInputValue(s); setSymbol(s); }}
                style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${symbol === s ? "#4ADE80" : card.border}`,
                  background: symbol === s ? "#DCFCE7" : "transparent",
                  color: symbol === s ? "#15803D" : card.muted,
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12, ease: EASE }}>
        <OHLCChart
          data={data}
          loading={isLoading}
          error={isError}
          interval={interval}
          onIntervalChange={setInterval}
        />
      </motion.div>

      {/* Stats summary if data loaded */}
      {data?.candles && data.candles.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ marginTop: 16, background: card.bg, border: `1px solid ${card.border}`, borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: card.text, marginBottom: 12 }}>Period Stats — {symbol}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12 }}>
            {(() => {
              const candles = data.candles;
              const first = candles[0];
              const last = candles[candles.length - 1];
              const allHigh = Math.max(...candles.map(c => c.high));
              const allLow = Math.min(...candles.map(c => c.low));
              const totalVol = candles.reduce((acc, c) => acc + c.volume, 0);
              const ret = ((last.close - first.open) / first.open * 100).toFixed(2);
              const positive = parseFloat(ret) >= 0;
              const stats = [
                { label: "Period Return", value: `${positive ? "+" : ""}${ret}%`, color: positive ? "#16A34A" : "#DC2626" },
                { label: "Period High", value: last.high.toLocaleString("en-PK") },
                { label: "Period Low", value: allLow.toLocaleString("en-PK") },
                { label: "Latest Close", value: last.close.toLocaleString("en-PK") },
                { label: "Avg Volume", value: (totalVol / candles.length / 1_000_000).toFixed(2) + "M" },
                { label: "Data Points", value: String(candles.length) },
              ];
              return stats.map(({ label, value, color }) => (
                <div key={label} style={{ background: mono ? "#0f172a" : "#F9FAFB", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: card.muted, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: color ?? card.text }}>{value}</div>
                </div>
              ));
            })()}
          </div>
        </motion.div>
      )}
    </div>
  );
}
