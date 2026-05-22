"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Predictions ──────────────────────────────────────────────
export const useMarketPrediction = (symbol: string) =>
  useQuery({
    queryKey: ["predict", symbol],
    queryFn: async () => (await api.get(`/predict/${symbol}`)).data,
    enabled: !!symbol,
  });

// ── Portfolio ─────────────────────────────────────────────────
export const usePortfolio = () =>
  useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => (await api.get("/portfolio")).data,
  });

export const useTrades = () =>
  useQuery({
    queryKey: ["trades"],
    queryFn: async () => (await api.get("/portfolio/trades")).data,
  });

// ── Admin ─────────────────────────────────────────────────────
export const useAdminUsers = () =>
  useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/admin/users")).data,
  });

export const useAdminUser = (userId: string) =>
  useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async () => (await api.get(`/admin/users/${userId}`)).data,
    enabled: !!userId,
  });

export const useAdminUserActivity = (userId: string) =>
  useQuery({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => (await api.get(`/admin/users/${userId}/activity`)).data,
    enabled: !!userId,
  });

// ── CISO Audit ────────────────────────────────────────────────
export const useAudit = (params?: { event_type?: string; user_id?: string; limit?: number; skip?: number }) =>
  useQuery({
    queryKey: ["ciso-audit", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.event_type) p.set("event_type", params.event_type);
      if (params?.user_id) p.set("user_id", params.user_id);
      if (params?.limit) p.set("limit", String(params.limit));
      if (params?.skip) p.set("skip", String(params.skip));
      return (await api.get(`/ciso/audit?${p.toString()}`)).data;
    },
  });

export const useAuditLogs = () =>
  useQuery({
    queryKey: ["ciso-audit-logs"],
    queryFn: async () => (await api.get("/ciso/audit/logs")).data,
  });

export const useAuditVerify = (enabled = false) =>
  useQuery({
    queryKey: ["ciso-audit-verify"],
    queryFn: async () => (await api.get("/ciso/audit/verify")).data,
    enabled,
  });

// ── CISO Anomalies ────────────────────────────────────────────
export const useAnomalies = () =>
  useQuery({
    queryKey: ["ciso-anomalies"],
    queryFn: async () => (await api.get("/ciso/anomalies")).data,
  });

export const useAnomalyStats = (days = 7) =>
  useQuery({
    queryKey: ["anomaly-stats", days],
    queryFn: async () => (await api.get(`/ciso/anomalies/stats?days=${days}`)).data,
  });

// ── CISO Risk ─────────────────────────────────────────────────
export const useRiskTrend = (days = 7) =>
  useQuery({
    queryKey: ["risk-trend", days],
    queryFn: async () => (await api.get(`/ciso/risk/trend?days=${days}`)).data,
  });

export const useTopRisk = () =>
  useQuery({
    queryKey: ["risk-top"],
    queryFn: async () => (await api.get("/ciso/risk/top")).data,
  });

export const useRiskRecent = () =>
  useQuery({
    queryKey: ["risk-recent"],
    queryFn: async () => (await api.get("/ciso/risk/recent")).data,
  });

export const useRiskSnapshots = () =>
  useQuery({
    queryKey: ["risk-snapshots"],
    queryFn: async () => (await api.get("/ciso/risk/snapshots")).data,
  });

// ── Alerts ────────────────────────────────────────────────────
export const useAlerts = (limit = 50) =>
  useQuery({
    queryKey: ["alerts", limit],
    queryFn: async () => (await api.get(`/alerts?limit=${limit}`)).data,
    refetchInterval: 30000,
  });

export const useUnreadAlertCount = () =>
  useQuery({
    queryKey: ["alerts-unread"],
    queryFn: async () => (await api.get("/alerts/unread-count")).data,
    refetchInterval: 30000,
  });

// ── Screener ──────────────────────────────────────────────────
export const useScreener = () =>
  useQuery({
    queryKey: ["screener"],
    queryFn: async () =>
      (await api.post("/screener", { preset: "trending", limit: 20 })).data,
  });

// ── Analytics ─────────────────────────────────────────────────
export type GainerLoserItem = {
  symbol: string;
  price: number;
  change_pct: number;
  volume: number;
  high: number;
  low: number;
};

export type MarketSummaryData = {
  index: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  high: number;
  low: number;
  updated_at: string;
  source: string;
};

export type GainersLosersData = {
  gainers: GainerLoserItem[];
  losers: GainerLoserItem[];
  updated_at: string;
};

export type OHLCPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OHLCData = {
  symbol: string;
  interval: string;
  candles: OHLCPoint[];
  updated_at: string;
};

export type CompanyProfileData = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  pe_ratio: number;
  eps: number;
  description: string;
  website: string;
  employees: number;
  country: string;
  exchange: string;
  updated_at: string;
};

export const useMarketSummary = () =>
  useQuery<MarketSummaryData>({
    queryKey: ["analytics-market-summary"],
    queryFn: async () => (await api.get("/analytics/market-summary")).data,
    refetchInterval: 60000,
    staleTime: 55000,
  });

export const useGainersLosers = () =>
  useQuery<GainersLosersData>({
    queryKey: ["analytics-gainers-losers"],
    queryFn: async () => (await api.get("/analytics/market-summary/gainers-losers")).data,
    refetchInterval: 60000,
    staleTime: 55000,
  });

export const useOhlc = (symbol: string, interval: string) =>
  useQuery<OHLCData>({
    queryKey: ["analytics-ohlc", symbol, interval],
    queryFn: async () =>
      (await api.get("/analytics/ohlc", { params: { symbol, interval } })).data,
    enabled: !!symbol && !!interval,
    staleTime: 55000,
  });

export const useCompanyProfile = (symbol: string) =>
  useQuery<CompanyProfileData>({
    queryKey: ["analytics-company-profile", symbol],
    queryFn: async () =>
      (await api.get(`/analytics/company-profile/${symbol.toUpperCase().trim()}`)).data,
    enabled: !!symbol,
    staleTime: 55000,
  });

// ── Market ───────────────────────────────────────────────────
export type IntradayPoint = { ts: string; price: number };
export type IntradayResponse = {
  interval: string;
  updated_at: string;
  data: Record<string, IntradayPoint[]>;
};

export const usePsxIntraday = (symbols: string[], interval = "1m", limit = 60) =>
  useQuery<IntradayResponse>({
    queryKey: ["market-intraday", symbols, interval, limit],
    queryFn: async () =>
      (
        await api.get("/market/intraday", {
          params: { symbols: symbols.join(","), interval, limit },
        })
      ).data,
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    staleTime: 55000,
  });
