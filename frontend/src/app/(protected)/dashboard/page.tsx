"use client";

import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";
import { motion, type Variants } from "framer-motion";
import { PsxLiveChartCard } from "@/components/psx-live-chart";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/use-theme";
import { usePortfolio, useTrades, useScreener, useRiskTrend, useCisoAudit } from "@/lib/queries";
import { useState } from "react";
import { Button, Card } from "@/design-system";
import { DollarSign, TrendingUp, Briefcase, Award, Zap, History, UserCircle, Users, UserCheck, UserX, UserPlus, FileText, AlertCircle, Shield, CheckCircle2, FileSearch, AlertTriangle } from "lucide-react";
import { ErrorState, SkeletonBlock, StatCardSkeleton, TableSkeleton } from "@/components/ux-states";

const MOCK_RISK = [
  { day: "Mon", count: 2 }, { day: "Tue", count: 5 }, { day: "Wed", count: 3 },
  { day: "Thu", count: 8 }, { day: "Fri", count: 4 }, { day: "Sat", count: 1 }, { day: "Today", count: 6 },
];

const SIGNAL_COLORS: Record<string, { bg: string; color: string }> = {
  BUY: { bg: "#DCFCE7", color: "#15803D" },
  SELL: { bg: "#FEE2E2", color: "#991B1B" },
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const cardStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } }
};

const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } }
};

const listItem: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } }
};

const rowStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const rowItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const mono = useTheme();

  const isInvestor = !user?.role || user?.role === "investor";
  const isAdmin = user?.role === "admin";
  const isCiso = user?.role === "ciso";

  const { data: portfolio, isLoading: isPortfolioLoading, isError: isPortfolioError, refetch: refetchPortfolio } = usePortfolio({ enabled: isInvestor });
  const { data: trades, isLoading: isTradesLoading, isError: isTradesError, refetch: refetchTrades } = useTrades({ enabled: isInvestor });
  const { data: screener, isLoading: isScreenerLoading, isError: isScreenerError, refetch: refetchScreener } = useScreener({ enabled: isInvestor });
  const { data: riskTrend, isError: isRiskTrendError, refetch: refetchRiskTrend } = useRiskTrend(7, { enabled: isCiso });

  const portfolioPositions: any[] = portfolio?.positions ?? [];
  const portfolioValue = portfolioPositions.reduce(
    (sum: number, position: any) => sum + position.quantity * (position.current_price ?? position.avg_price),
    0,
  );
  const portfolioCost = portfolioPositions.reduce(
    (sum: number, position: any) => sum + position.quantity * position.avg_price,
    0,
  );
  const totalPositions = portfolioPositions.length;
  const totalTrades = trades?.total ?? 0;
  const recentTrades = trades?.items ?? [];
  const signalItems = screener?.items?.slice(0, 5) ?? [];
  const chartData = portfolioPositions.length ? portfolioPositions.map((position: any) => ({ day: position.symbol, value: position.quantity * (position.current_price ?? position.avg_price) })) : [];
  const riskData = riskTrend?.items?.length ? riskTrend.items : MOCK_RISK;
  // CISO audit panel state + query
  const [auditFilters, setAuditFilters] = useState({ skip: 0, limit: 5 } as any);
  const { data: cisoAudit, isLoading: isCisoAuditLoading, isError: isCisoAuditError, refetch: refetchCisoAudit } = useCisoAudit(auditFilters, { enabled: isCiso });

  const firstName = user?.full_name?.split(" ")[0] ?? (isAdmin ? "Admin" : isCiso ? "CISO" : "Trader");

  const th = mono ? {
    heading: "#f1f5f9",
    bgSubtext: "#94a3b8",
    text: "#f1f5f9",
    subtext: "#94a3b8",
    muted: "#64748b",
    card: "#1e293b",
    border: "#334155",
    borderSubtle: "#253347",
    innerCard: "#111827",
    symbolIconBg: "#14532d",
    symbolIconColor: "#4ade80",
    chartGrid: "#334155",
    tooltipBg: "#1e293b",
    tooltipBorder: "#334155",
    headerBtnBg: "#111827",
    headerBtnBorder: "#334155",
    headerBtnColor: "#cbd5e1",
  } : {
    heading: "#111827",
    bgSubtext: "#6B7280",
    text: "#111827",
    subtext: "#6B7280",
    muted: "#9CA3AF",
    card: "white",
    border: "#E5E7EB",
    borderSubtle: "#F3F4F6",
    innerCard: "#F9FAFB",
    symbolIconBg: "#F0FDF4",
    symbolIconColor: "#16A34A",
    chartGrid: "#F3F4F6",
    tooltipBg: "white",
    tooltipBorder: "#E5E7EB",
    headerBtnBg: "white",
    headerBtnBorder: "#E5E7EB",
    headerBtnColor: "#374151",
  };

  const tooltipStyle = { borderRadius: 10, border: `1px solid ${th.tooltipBorder}`, fontSize: 13, background: th.tooltipBg, color: th.text };
  const tone = mono ? "dark" : "light";
  const investorLoading = isPortfolioLoading || isTradesLoading || isScreenerLoading;

  return (
    <motion.div
      suppressHydrationWarning
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: th.text }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .section-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 16px; padding: 24px; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .trade-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 12px 16px; border-bottom: 1px solid ${th.borderSubtle}; align-items: center; font-size: 14px; }
        .trade-row:last-child { border-bottom: none; }
        .dash-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .dash-two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 24px; }
        .dash-two-col-equal { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .dash-quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .dash-admin-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .dash-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .dash-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 1024px) {
          .dash-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-quick-actions { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-admin-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .dash-two-col { grid-template-columns: 1fr !important; }
          .dash-two-col-equal { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .dash-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-header-actions { width: 100%; }
          .dash-header-actions > * { flex: 1; justify-content: center; text-align: center; }
        }
        @media (max-width: 400px) {
          .dash-stat-grid { grid-template-columns: 1fr !important; }
          .dash-quick-actions { grid-template-columns: 1fr !important; }
          .dash-admin-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ marginBottom: 28 }}
      >
        <div className="dash-header">
          <div>
            <h1 className="page-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: th.heading, letterSpacing: "-0.5px" }}>
              {getGreeting()}, {firstName}
            </h1>
            <p style={{ fontSize: 14, color: th.bgSubtext, marginTop: 4 }}>
              Here&apos;s your {user?.role ?? "investor"} overview for today — {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {isInvestor && (
            <div className="dash-header-actions">
              <Link href="/predict" style={{ background: "#16A34A", color: "white", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={15} color="white" strokeWidth={2} />
                Get Signal
              </Link>
              <Link href="/portfolio" style={{ background: th.headerBtnBg, color: th.headerBtnColor, border: `1.5px solid ${th.headerBtnBorder}`, padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center" }}>
                Portfolio
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── INVESTOR VIEW ── */}
      {isInvestor && (
        <>
          {/* Stat Cards */}
          {investorLoading ? (
            <div className="dash-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} tone={tone} />)}
            </div>
          ) : (
          <motion.div
            className="dash-stat-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            variants={cardStagger}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: "Portfolio Value", value: `PKR ${portfolioValue.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`,
                change: portfolioPositions.length ? `Based on ${portfolioPositions.length} positions` : "No positions yet",
                up: true, Icon: DollarSign, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Portfolio Cost", value: `PKR ${portfolioCost.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`,
                change: "Calculated from avg buy prices", up: true, Icon: TrendingUp, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Open Positions", value: `${totalPositions}`,
                change: "Current holdings", up: true, Icon: Briefcase, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
              { label: "Recent Trades", value: `${totalTrades}`,
                change: "Most recent entries", up: true, Icon: Award, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={cardItem}
                whileHover={{ y: -2, boxShadow: mono ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: th.muted, fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: th.text }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: s.up ? "#16A34A" : "#DC2626", marginTop: 4, fontWeight: 500 }}>
                      {s.up ? "▲" : "▼"} {s.change}
                    </p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.iconColor, flexShrink: 0 }}>
                    <s.Icon size={18} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          )}

          {/* Chart + Signals */}
          <div className="dash-two-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
            >
              <Card style={{ padding: 20, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: th.text }}>Portfolio Performance</h3>
                    <p style={{ fontSize: 12, color: th.muted, marginTop: 2 }}>Last 7 days</p>
                  </div>
                  <span style={{ background: "#DCFCE7", color: "#15803D", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>+4.3% ▲</span>
                </div>
                {isPortfolioError ? (
                  <ErrorState tone={tone} title="Portfolio chart unavailable" message="Your portfolio endpoint could not be refreshed." onRetry={() => refetchPortfolio()} />
                ) : isPortfolioLoading ? (
                  <div style={{ height: 200, display: "grid", alignContent: "end", gap: 10 }}>
                    <SkeletonBlock tone={tone} height={150} radius={12} />
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={th.chartGrid}/>
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: th.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: th.muted }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                    <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Value"]} contentStyle={tooltipStyle}/>
                    <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2.5} fill="url(#colorValue)"/>
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.45, ease: EASE }}
            >
              <Card style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: th.text }}>AI Signals</h3>
                  <Link href="/predict" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
                </div>
                <motion.div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  variants={listStagger}
                  initial="hidden"
                  animate="visible"
                >
                {isScreenerError ? (
                  <ErrorState tone={tone} title="AI signals unavailable" message="The screener endpoint could not be refreshed." onRetry={() => refetchScreener()} />
                ) : isScreenerLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ padding: "10px 12px" }}>
                      <SkeletonBlock tone={tone} height={36} radius={10} />
                    </div>
                  ))
                ) : signalItems.length > 0 ? signalItems.map((s: any) => (
                  <motion.div key={s.symbol} variants={listItem}>
                    <Link href={`/predict/${s.symbol}`} style={{ textDecoration: "none" }}>
                      <motion.div
                        whileHover={{ backgroundColor: th.innerCard, x: 2, transition: { duration: 0.12 } }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, backgroundColor: "transparent" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, background: th.symbolIconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: th.symbolIconColor }}>{s.symbol.slice(0, 3)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{s.symbol}</div>
                            <div style={{ fontSize: 11, color: th.muted }}>{s.price ? `PKR ${s.price}` : `${s.score ?? 0}% score`}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="chip" style={{ background: SIGNAL_COLORS[s.signal ?? "BUY"]?.bg ?? "#DCFCE7", color: SIGNAL_COLORS[s.signal ?? "BUY"]?.color ?? "#15803D" }}>{s.signal ?? "TREND"}</span>
                          <div style={{ fontSize: 11, color: th.muted, marginTop: 2 }}>{typeof s.score === "number" ? `${s.score}% score` : s.reasons?.[0] ?? "Live trend"}</div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                )) : (
                  <div style={{ padding: 20, color: th.muted }}>{isScreenerLoading ? "Loading trending signals..." : "No trending signals available."}</div>
                )}
              </motion.div>
              </Card>
            </motion.div>
          </div>

          {/* Live Market */}
          <motion.div
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5, ease: EASE }}
          >
            <PsxLiveChartCard
              title="Live PSX Prices"
              subtitle="Updated every minute"
              badge="1m refresh"
            />
          </motion.div>

          {/* Recent Trades */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.55, ease: EASE }}
          >
            <Card style={{ padding: 18, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: th.text }}>Recent Trades</h3>
                <Link href="/trades" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
              </div>
              <div className="table-scroll">
                <div className="table-min">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 16px", fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <span>Symbol</span><span>Type</span><span>Quantity</span><span>Price</span><span>Time</span>
                  </div>
                  <motion.div variants={rowStagger} initial="hidden" animate="visible">
                    {isTradesError ? (
                      <div style={{ padding: 16 }}>
                        <ErrorState tone={tone} title="Recent trades unavailable" message="The trade history endpoint could not be refreshed." onRetry={() => refetchTrades()} />
                      </div>
                    ) : isTradesLoading ? (
                      <TableSkeleton rows={5} columns={5} tone={tone} />
                    ) : recentTrades.length > 0 ? recentTrades.slice(0, 5).map((item: any, i: number) => (
                      <motion.div
                        key={item.id ?? i}
                        className="trade-row"
                        variants={rowItem}
                        whileHover={{ backgroundColor: th.innerCard, transition: { duration: 0.1 } }}
                        style={{ backgroundColor: "transparent", borderRadius: 8, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}
                      >
                        <span style={{ fontWeight: 700, color: th.text }}>{item.trade?.symbol ?? "-"}</span>
                        <span>
                          <span className="chip" style={{ background: item.trade?.side === "sell" ? "#FEE2E2" : "#DCFCE7", color: item.trade?.side === "sell" ? "#991B1B" : "#15803D" }}>{(item.trade?.side ?? "-").toUpperCase()}</span>
                        </span>
                        <span style={{ color: th.subtext }}>{item.trade?.quantity ?? "-"}</span>
                        <span style={{ color: th.subtext }}>{item.trade?.price ? `PKR ${item.trade.price}` : "-"}</span>
                        <span style={{ color: th.muted }}>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
                      </motion.div>
                    )) : (
                      <div style={{ padding: 24, textAlign: "center", color: th.muted }}>No recent trades available.</div>
                    )}
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.65, ease: EASE }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: th.heading }}>Quick Actions</h3>
            <motion.div
              className="dash-quick-actions"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
              variants={cardStagger}
              initial="hidden"
              animate="visible"
            >
              {[
                { href: "/predict", label: "Get AI Signal", sub: "Any PSX symbol", Icon: Zap, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
                { href: "/portfolio", label: "View Portfolio", sub: "P&L overview", Icon: Briefcase, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
                { href: "/trades", label: "Trade History", sub: "All transactions", Icon: History, iconBg: "linear-gradient(135deg,#F3F4F6,#E5E7EB)", iconColor: "#374151" },
                { href: "/profile", label: "My Profile", sub: "Account settings", Icon: UserCircle, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
              ].map((a) => (
                <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    variants={cardItem}
                    whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(74,222,128,0.15), 0 0 0 1.5px #4ADE80", transition: { duration: 0.15 } }}
                    style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                      <a.Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: th.muted }}>{a.sub}</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </>
      )}

      {/* ── ADMIN VIEW ── */}
      {isAdmin && (
        <>
          <motion.div
            className="dash-stat-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            variants={cardStagger}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: "Total Users", value: "1,284", change: "+12 today", Icon: Users, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
              { label: "Active Users", value: "1,201", change: "93.5% active", Icon: UserCheck, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Deactivated", value: "83", change: "6.5% inactive", Icon: UserX, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
              { label: "New Today", value: "12", change: "+3 from yesterday", Icon: UserPlus, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={cardItem}
                whileHover={{ y: -2, boxShadow: mono ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: th.muted, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: th.text }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: th.subtext, marginTop: 4 }}>{s.change}</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.iconColor, flexShrink: 0 }}>
                    <s.Icon size={18} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: EASE }}
          >
            <Card style={{ padding: 18, marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: th.text }}>Quick Actions</h3>
              <motion.div
                className="dash-admin-actions"
                style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}
                variants={cardStagger}
                initial="hidden"
                animate="visible"
              >
              {[
                { href: "/admin/users", label: "Manage Users", sub: "View & edit all users", Icon: Users, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
                { href: "/profile", label: "My Profile", sub: "Account settings", Icon: UserCircle, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
                { href: "/predict", label: "AI Signals", sub: "View predictions", Icon: Zap, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              ].map((a) => (
                <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    variants={cardItem}
                    whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(74,222,128,0.15), 0 0 0 1.5px #4ADE80", transition: { duration: 0.15 } }}
                    style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                      <a.Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: th.muted }}>{a.sub}</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
              </motion.div>
            </Card>
          </motion.div>
        </>
      )}

      {/* ── CISO VIEW ── */}
      {isCiso && (
        <>
          {isRiskTrendError && (
            <div style={{ marginBottom: 24 }}>
              <ErrorState tone={tone} title="Risk trend unavailable" message="The risk chart could not be refreshed." onRetry={() => refetchRiskTrend()} />
            </div>
          )}
          <motion.div
            className="dash-stat-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            variants={cardStagger}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: "Audit Events", value: "3,421", change: "+48 today", Icon: FileText, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
              { label: "Anomalies", value: "7", change: "2 high severity", Icon: AlertCircle, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
              { label: "Risk Score", value: "LOW", change: "All systems normal", Icon: Shield, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Chain Status", value: "Verified", change: "Last checked 2m ago", Icon: CheckCircle2, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={cardItem}
                whileHover={{ y: -2, boxShadow: mono ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: th.muted, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: th.text }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: th.subtext, marginTop: 4 }}>{s.change}</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.iconColor, flexShrink: 0 }}>
                    <s.Icon size={18} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <div className="dash-two-col-equal">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4, ease: EASE }}
            >
              <Card style={{ padding: 18 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: th.text }}>Risk Trend (7 Days)</h3>
                {isRiskTrendError ? (
                  <ErrorState tone={tone} title="Could not load risk trend" message="Try refreshing this widget." onRetry={() => refetchRiskTrend()} />
                ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={riskData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={th.chartGrid}/>
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: th.muted }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 12, fill: th.muted }} axisLine={false} tickLine={false}/>
                    <Tooltip cursor={false} contentStyle={tooltipStyle}/>
                    <Bar dataKey="count" fill="#4ADE80" radius={[6, 6, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
                )}
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5, ease: EASE }}
            >
              <Card style={{ padding: 18 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: th.text }}>Quick Actions</h3>
                <motion.div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  variants={cardStagger}
                  initial="hidden"
                  animate="visible"
                >
                {[
                  { href: "/ciso/audit", label: "Audit Explorer", sub: "View event stream", Icon: FileSearch, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
                  { href: "/ciso/risk", label: "Risk Dashboard", sub: "Anomalies & trends", Icon: AlertTriangle, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
                  { href: "/profile", label: "My Profile", sub: "Account settings", Icon: UserCircle, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
                ].map((a) => (
                  <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                    <motion.div
                      variants={cardItem}
                      whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(74,222,128,0.15), 0 0 0 1.5px #4ADE80", transition: { duration: 0.15 } }}
                      style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                        <a.Icon size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: th.text }}>{a.label}</div>
                        <div style={{ fontSize: 12, color: th.muted }}>{a.sub}</div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </motion.div>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
