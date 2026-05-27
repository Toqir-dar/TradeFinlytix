"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

type QueryOptions = Omit<UseQueryOptions<any>, "queryKey" | "queryFn">;

// ── Predictions ──────────────────────────────────────────────
export const useMarketPrediction = (symbol: string) =>
  useQuery({
    queryKey: ["predict", symbol],
    queryFn: async () => (await api.get(`/predict/${symbol}`)).data,
    enabled: !!symbol,
  });

// ── Portfolio ─────────────────────────────────────────────────
export const usePortfolio = (options?: QueryOptions) =>
  useQuery<any>({
    queryKey: ["portfolio"],
    queryFn: async () => (await api.get("/portfolio")).data,
    ...options,
  });

export const useTrades = (options?: QueryOptions) =>
  useQuery<any>({
    queryKey: ["trades"],
    queryFn: async () => (await api.get("/portfolio/trades")).data,
    ...options,
  });

// ── Admin ─────────────────────────────────────────────────────
export const useAdminUsers = () =>
  useQuery<any>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/admin/users")).data,
  });

export const useAdminUser = (userId: string) =>
  useQuery<any>({
    queryKey: ["admin-user", userId],
    queryFn: async () => (await api.get(`/admin/users/${userId}`)).data,
    enabled: !!userId,
  });

export const useAdminUserActivity = (userId: string) =>
  useQuery<any>({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => (await api.get(`/admin/users/${userId}/activity`)).data,
    enabled: !!userId,
  });

// ── CISO Audit ────────────────────────────────────────────────
export const useAudit = (params?: { event_type?: string; user_id?: string; limit?: number; skip?: number }) =>
  useQuery<any>({
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

export type CisoAuditParams = {
  event_type?: string;
  user_id?: string;
  ip?: string;
  path?: string;
  payload_key?: string;
  payload_value?: string;
  min_payload_score?: number;
  max_payload_score?: number;
  skip?: number;
  limit?: number;
};

export const useCisoAudit = (params?: CisoAuditParams, options?: QueryOptions) =>
  useQuery<any>({
    queryKey: ["ciso-audit-advanced", params],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (params?.event_type) p.set("event_type", params.event_type);
      if (params?.user_id) p.set("user_id", params.user_id);
      if (params?.ip) p.set("ip", params.ip);
      if (params?.path) p.set("path", params.path);
      if (params?.payload_key) p.set("payload_key", params.payload_key);
      if (params?.payload_value) p.set("payload_value", params.payload_value);
      if (params?.min_payload_score !== undefined) p.set("min_payload_score", String(params.min_payload_score));
      if (params?.max_payload_score !== undefined) p.set("max_payload_score", String(params.max_payload_score));
      if (params?.skip !== undefined) p.set("skip", String(params.skip));
      if (params?.limit !== undefined) p.set("limit", String(params.limit));
      return (await api.get(`/ciso/audit?${p.toString()}`)).data;
    },
    ...options,
  });

export const useAuditLogs = () =>
  useQuery<any>({
    queryKey: ["ciso-audit-logs"],
    queryFn: async () => (await api.get("/ciso/audit/logs")).data,
  });

export const useAuditVerify = (enabled = false) =>
  useQuery<any>({
    queryKey: ["ciso-audit-verify"],
    queryFn: async () => (await api.get("/ciso/audit/verify")).data,
    enabled,
  });

// ── CISO Anomalies ────────────────────────────────────────────
export const useAnomalies = () =>
  useQuery<any>({
    queryKey: ["ciso-anomalies"],
    queryFn: async () => (await api.get("/ciso/anomalies")).data,
  });

export const useAnomalyStats = (days = 7) =>
  useQuery<any>({
    queryKey: ["anomaly-stats", days],
    queryFn: async () => (await api.get(`/ciso/anomalies/stats?days=${days}`)).data,
  });

// ── CISO Risk ─────────────────────────────────────────────────
export const useRiskTrend = (days = 7, options?: QueryOptions) =>
  useQuery<any>({
    queryKey: ["risk-trend", days],
    queryFn: async () => (await api.get(`/ciso/risk/trend?days=${days}`)).data,
    ...options,
  });

export const useTopRisk = () =>
  useQuery<any>({
    queryKey: ["risk-top"],
    queryFn: async () => (await api.get("/ciso/risk/top")).data,
  });

export const useRiskRecent = () =>
  useQuery<any>({
    queryKey: ["risk-recent"],
    queryFn: async () => (await api.get("/ciso/risk/recent")).data,
  });

export const useRiskSnapshots = () =>
  useQuery<any>({
    queryKey: ["risk-snapshots"],
    queryFn: async () => (await api.get("/ciso/risk/snapshots")).data,
  });

// ── Alerts ────────────────────────────────────────────────────
export const useAlerts = (limit = 50) =>
  useQuery<any>({
    queryKey: ["alerts", limit],
    queryFn: async () => (await api.get(`/alerts?limit=${limit}`)).data,
    refetchInterval: 30000,
  });

export const useUnreadAlertCount = () =>
  useQuery<any>({
    queryKey: ["alerts-unread"],
    queryFn: async () => (await api.get("/alerts/unread-count")).data,
    refetchInterval: 30000,
  });

// ── Screener ──────────────────────────────────────────────────
export const useScreener = (options?: QueryOptions) =>
  useQuery<any>({
    queryKey: ["screener"],
    queryFn: async () =>
      (await api.post("/screener", { preset: "trending", limit: 20 })).data,
    ...options,
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

// ── NHITS Forecast ───────────────────────────────────────────
export type NHITSForecastPoint = { date: string; close: number };

export type NHITSForecastSummary = {
  last_close:              number;
  close_day1:              number;
  close_day50:             number;
  expected_return_50d_pct: number;
  close_min:               number;
  close_max:               number;
};

export type NHITSForecastData = {
  symbol:   string;
  model:    string;
  horizon:  number;
  forecast: NHITSForecastPoint[];
  summary:  NHITSForecastSummary | null;
};

export const useNhitsForecast = (symbol: string) =>
  useQuery<NHITSForecastData>({
    queryKey: ["nhits-forecast", symbol],
    queryFn:  async () => (await api.get(`/forecast/nhits/${symbol}`)).data,
    enabled:  !!symbol,
    staleTime: 1000 * 60 * 60, // 1 hour — matches server-side cache TTL
    retry: 1,
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
