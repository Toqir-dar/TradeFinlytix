"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { usePsxIntraday, type IntradayResponse } from "@/lib/queries";

const DEFAULT_SYMBOLS = ["OGDC", "HBL", "ENGRO", "LUCK", "PSO"] as const;

const LINE_COLORS: Record<string, string> = {
  OGDC: "#16A34A",
  HBL: "#2563EB",
  ENGRO: "#F59E0B",
  LUCK: "#DC2626",
  PSO: "#0D9488",
};

const BASE_PRICES: Record<string, number> = {
  OGDC: 175.5,
  HBL: 142.0,
  ENGRO: 318.5,
  LUCK: 892.0,
  PSO: 221.0,
};

type ChartRow = { time: string; price: number | null };

type PsxLiveChartCardProps = {
  title?: string;
  subtitle?: string;
  symbols?: string[];
  height?: number;
  badge?: string;
  className?: string;
  style?: CSSProperties;
};

function formatTime(ts: string) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

function buildMockSeries(symbol: string, count = 36): ChartRow[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, idx) => {
    const stamp = new Date(now - (count - 1 - idx) * 60000);
    const base = BASE_PRICES[symbol] ?? 160;
    const drift = Math.sin(idx / 4) * base * 0.003;
    return {
      time: stamp.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
      price: Number((base + drift).toFixed(2)),
    };
  });
}

function buildChartSeries(payload: IntradayResponse | undefined, symbol: string): ChartRow[] {
  const basePoints = payload?.data?.[symbol] ?? [];
  if (!basePoints.length) {
    return buildMockSeries(symbol);
  }

  return basePoints.map((point) => ({
    time: formatTime(point.ts),
    price: point.price,
  }));
}

export function PsxLiveChartCard({
  title = "Live PSX Prices",
  subtitle = "Updated every minute",
  symbols,
  height = 240,
  badge,
  className,
  style,
}: PsxLiveChartCardProps) {
  const resolvedSymbols = useMemo(
    () => (symbols && symbols.length ? symbols : Array.from(DEFAULT_SYMBOLS)),
    [symbols]
  );
  const [activeSymbol, setActiveSymbol] = useState(resolvedSymbols[0] ?? "");

  useEffect(() => {
    if (!resolvedSymbols.length) return;
    setActiveSymbol((prev) => (resolvedSymbols.includes(prev) ? prev : resolvedSymbols[0]));
  }, [resolvedSymbols]);

  const displaySymbol = activeSymbol || resolvedSymbols[0] || "OGDC";

  const { data, isLoading, isFetching } = usePsxIntraday(resolvedSymbols, "1m", 60);

  const chartData = useMemo(
    () => buildChartSeries(data, displaySymbol),
    [data, displaySymbol]
  );

  const yDomain = useMemo((): [number, number] | undefined => {
    const values = chartData
      .map((row) => row.price)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, max * 0.002, 0.5);
    return [min - range, max + range];
  }, [chartData]);

  const latestPrice = chartData.length ? chartData[chartData.length - 1]?.price : null;
  const priceLabel = typeof latestPrice === "number" ? `PKR ${latestPrice.toFixed(2)}` : "No data";
  const lineColor = LINE_COLORS[displaySymbol] ?? "#16A34A";

  const updatedAt = data?.updated_at ? new Date(data.updated_at) : null;
  const updatedLabel = updatedAt && !Number.isNaN(updatedAt.getTime())
    ? updatedAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
    : "pending";

  const statusText = isLoading
    ? "Fetching"
    : isFetching
      ? "Refreshing"
      : "Updated";

  return (
    <div
      className={className}
      style={{
        background: "white",
        border: "1.5px solid #E5E7EB",
        borderRadius: 16,
        padding: 24,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{title}</h3>
          {subtitle && (
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{subtitle}</p>
          )}
        </div>
        {badge && (
          <span
            style={{
              background: "#DCFCE7",
              color: "#15803D",
              padding: "4px 10px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {resolvedSymbols.map((sym) => {
            const isActive = sym === displaySymbol;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => setActiveSymbol(sym)}
                style={{
                  border: isActive ? `1.5px solid ${LINE_COLORS[sym] ?? "#16A34A"}` : "1.5px solid #E5E7EB",
                  background: isActive ? "#F0FDF4" : "#FFFFFF",
                  color: "#111827",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                aria-pressed={isActive}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: LINE_COLORS[sym] ?? "#16A34A",
                  }}
                />
                {sym}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#6B7280", fontWeight: 600, flexWrap: "wrap" }}>
          <span style={{ color: "#111827", fontWeight: 700 }}>{displaySymbol}</span>
          <span style={{ color: "#16A34A" }}>{priceLabel}</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#16A34A",
              boxShadow: "0 0 0 0 rgba(22,163,74,0.6)",
              animation: "livePulse 1.6s ease-in-out infinite",
            }}
          />
          {statusText} {updatedLabel}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `${value.toFixed(0)}`}
            domain={yDomain ?? ["auto", "auto"]}
          />
          <Tooltip
            formatter={(value: number | string) => {
              const num = typeof value === "number" ? value : Number(value);
              const label = Number.isFinite(num) ? num.toFixed(2) : String(value);
              return [`PKR ${label}`, displaySymbol];
            }}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive
            animationDuration={450}
          />
        </LineChart>
      </ResponsiveContainer>

      <style>{`
        @keyframes livePulse {
          0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.6); }
          70% { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
      `}</style>
    </div>
  );
}
