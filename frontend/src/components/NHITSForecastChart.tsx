"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Loader2, AlertTriangle } from "lucide-react";
import { useNhitsForecast, useOhlc } from "@/lib/queries";

interface Props {
  symbol: string;
  isDark?: boolean;
}

export default function NHITSForecastChart({ symbol, isDark = false }: Props) {
  // Forecast is the critical query — gate rendering on it only
  const { data: forecast, isLoading: fl, error: fe } = useNhitsForecast(symbol);
  // OHLC is optional enrichment — we do NOT block rendering on it
  const { data: ohlc } = useOhlc(symbol, "1d");

  const border   = isDark ? "#334155" : "#E5E7EB";
  const gridLine = isDark ? "#1e293b" : "#F3F4F6";
  const tickClr  = isDark ? "#64748b" : "#9CA3AF";
  const cardBg   = isDark ? "#1e293b" : "#F9FAFB";
  const textClr  = isDark ? "#f1f5f9" : "#111827";

  // ── Loading (only block on the forecast, not OHLC) ──────────────────────
  if (fl) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, gap: 8, color: tickClr }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13 }}>Running NHITS inference for {symbol}…</span>
      </div>
    );
  }

  // ── Error / no data ──────────────────────────────────────────────────────
  if (fe || !forecast?.forecast?.length) {
    const status = (fe as any)?.response?.status;
    const detail = (fe as any)?.response?.data?.detail ?? "";
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 160, color: tickClr }}>
        <AlertTriangle size={20} color="#F59E0B" strokeWidth={2} />
        <span style={{ fontSize: 13, textAlign: "center" }}>
          {status === 404
            ? `No NHITS forecast available for ${symbol} yet.`
            : fe
            ? `Forecast error: ${detail || "model may still be loading"}`
            : `No forecast data returned for ${symbol}.`}
        </span>
        <span style={{ fontSize: 11 }}>
          {status === 404
            ? "Install neuralforecast in the backend and restart the server."
            : "Try again in a few seconds."}
        </span>
      </div>
    );
  }

  // ── Build chart data ─────────────────────────────────────────────────────
  // Last 60 historical closes (optional — skipped if OHLC unavailable)
  const historical = (ohlc?.candles ?? []).slice(-60).map((c) => ({
    date:       c.time.slice(0, 10),
    historical: c.close,
    forecast:   undefined as number | undefined,
  }));

  // 50-day forecast rows
  const forecastRows: { date: string; historical?: number; forecast?: number }[] =
    forecast.forecast.map((f) => ({
      date:       f.date,
      historical: undefined,
      forecast:   f.close,
    }));

  // Connect last historical close to first forecast point
  if (historical.length && forecastRows.length) {
    forecastRows[0].historical = historical[historical.length - 1].historical;
  }

  // Merge by date (de-duplicate)
  const byDate: Record<string, { date: string; historical?: number; forecast?: number }> = {};
  [...historical, ...forecastRows].forEach((p) => {
    byDate[p.date] = { ...(byDate[p.date] ?? {}), ...p };
  });
  const merged = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  const dividerDate = forecast.forecast[0]?.date;
  const s           = forecast.summary;
  const returnPct   = s?.expected_return_50d_pct ?? 0;
  const returnColor = returnPct >= 0 ? "#16A34A" : "#DC2626";
  const hasHistory  = historical.length > 0;

  return (
    <div>
      {/* Summary chips */}
      {s && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Last Close",      value: `PKR ${s.last_close.toFixed(2)}` },
            { label: "Day 1 Forecast",  value: `PKR ${s.close_day1.toFixed(2)}` },
            { label: "Day 50 Forecast", value: `PKR ${s.close_day50.toFixed(2)}` },
            { label: "50d Expected Return", value: `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`, color: returnColor },
            { label: "Forecast Range",  value: `${s.close_min.toFixed(1)} – ${s.close_max.toFixed(1)} PKR` },
          ].map((m) => (
            <div key={m.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ fontSize: 10, color: tickClr, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.color ?? textClr }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={merged} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridLine} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: tickClr }}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: tickClr }}
            width={64}
            tickFormatter={(v: number) => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={{ background: isDark ? "#1e293b" : "white", border: `1px solid ${border}`, borderRadius: 8, fontSize: 12 }}
            formatter={(v: number | string) => [`PKR ${Number(v).toFixed(2)}`]}
            labelFormatter={(label: string) => `Date: ${label}`}
          />
          <Legend
            formatter={(v: string) =>
              v === "historical" ? "Historical (60d)" : "NHITS 50-Day Forecast"
            }
            wrapperStyle={{ fontSize: 12 }}
          />
          {dividerDate && (
            <ReferenceLine
              x={dividerDate}
              stroke={isDark ? "#475569" : "#D1D5DB"}
              strokeDasharray="4 2"
              label={{ value: "Forecast →", fontSize: 10, fill: tickClr, position: "insideTopRight" }}
            />
          )}
          {hasHistory && (
            <Line dataKey="historical" name="historical" stroke="#3B82F6" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
          )}
          <Line dataKey="forecast" name="forecast" stroke="#F97316" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
