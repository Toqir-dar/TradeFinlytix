"use client";

import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { OHLCData } from "@/lib/queries";
import { useTheme } from "@/lib/use-theme";

interface Props {
  data?: OHLCData;
  loading?: boolean;
  error?: boolean;
}

const INTERVALS = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "rgba(15,23,42,0.95)", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 6 }}>{label}</div>
      {[
        { label: "Open", value: d.open, color: "#94a3b8" },
        { label: "High", value: d.high, color: "#4ADE80" },
        { label: "Low", value: d.low, color: "#F87171" },
        { label: "Close", value: d.close, color: "#60A5FA" },
        { label: "Volume", value: d.volume?.toLocaleString(), color: "#A78BFA", raw: true },
      ].map(({ label: l, value, color, raw }) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 20, color }}>
          <span style={{ color: "#64748b" }}>{l}</span>
          <span style={{ fontWeight: 600 }}>{raw ? value : Number(value).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
}

interface OHLCChartInnerProps extends Props {
  interval: string;
  onIntervalChange: (i: string) => void;
}

export function OHLCChart({ data, loading, error, interval, onIntervalChange }: OHLCChartInnerProps) {
  const mono = useTheme();
  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b", grid: "#1e293b" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#9CA3AF", grid: "#F3F4F6" };

  const candles = data?.candles ?? [];
  const chartData = candles.map((c) => ({
    ...c,
    range: [c.low, c.high] as [number, number],
  }));

  const priceMin = candles.length ? Math.min(...candles.map((c) => c.low)) * 0.998 : 0;
  const priceMax = candles.length ? Math.max(...candles.map((c) => c.high)) * 1.002 : 100;
  const volMax = candles.length ? Math.max(...candles.map((c) => c.volume)) * 4 : 1;

  return (
    <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 16, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: card.text }}>
            {data?.symbol ?? "—"} Price History
          </div>
          <div style={{ fontSize: 12, color: card.muted }}>OHLC candlestick — High/Low band + Close line</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {INTERVALS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onIntervalChange(value)}
              style={{
                padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: interval === value ? "none" : `1px solid ${card.border}`,
                background: interval === value ? "#16A34A" : "transparent",
                color: interval === value ? "white" : card.muted,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #4ADE80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && candles.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: card.muted, fontSize: 14 }}>
          No OHLC data available. Enter a valid PSX symbol above.
        </div>
      )}

      {!loading && candles.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={card.grid} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: card.muted }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="price"
              domain={[priceMin, priceMax]}
              tick={{ fontSize: 10, fill: card.muted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
              width={72}
            />
            <YAxis
              yAxisId="vol"
              orientation="right"
              domain={[0, volMax]}
              tick={{ fontSize: 10, fill: card.muted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              width={50}
            />
            <Tooltip content={<ChartTooltip />} />

            {/* High-Low band */}
            <Area
              yAxisId="price"
              dataKey="high"
              stroke="none"
              fill="#DCFCE7"
              fillOpacity={0.4}
              name="High"
            />
            <Area
              yAxisId="price"
              dataKey="low"
              stroke="none"
              fill={card.bg}
              fillOpacity={1}
              name="Low"
            />

            {/* Volume bars */}
            <Bar
              yAxisId="vol"
              dataKey="volume"
              fill="#A78BFA"
              fillOpacity={0.35}
              name="Volume"
              radius={[2, 2, 0, 0]}
            />

            {/* Close price line */}
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke="#4ADE80"
              strokeWidth={2}
              dot={false}
              name="Close"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
