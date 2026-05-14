"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";
import { motion, type Variants } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp, Briefcase, Award, Zap, History, UserCircle, Users, UserCheck, UserX, UserPlus, FileText, AlertCircle, Shield, CheckCircle2, FileSearch, AlertTriangle } from "lucide-react";

const MOCK_PORTFOLIO_CHART = [
  { day: "Mon", value: 245000 }, { day: "Tue", value: 251000 },
  { day: "Wed", value: 248000 }, { day: "Thu", value: 263000 },
  { day: "Fri", value: 271000 }, { day: "Sat", value: 268000 },
  { day: "Today", value: 279000 },
];

const MOCK_SIGNALS = [
  { symbol: "OGDC", signal: "BUY", confidence: 81, change: "+2.3%", price: "PKR 175.5", risk: "LOW" },
  { symbol: "HBL", signal: "HOLD", confidence: 62, change: "+1.1%", price: "PKR 142.0", risk: "MEDIUM" },
  { symbol: "ENGRO", signal: "BUY", confidence: 74, change: "+0.8%", price: "PKR 318.5", risk: "LOW" },
  { symbol: "LUCK", signal: "TRIM", confidence: 48, change: "-0.5%", price: "PKR 892.0", risk: "HIGH" },
  { symbol: "PSO", signal: "BUY", confidence: 79, change: "+3.2%", price: "PKR 221.0", risk: "LOW" },
];

const MOCK_TRADES = [
  { symbol: "OGDC", type: "BUY", qty: 500, price: "PKR 173.2", time: "10:32 AM", pnl: "+PKR 1,150" },
  { symbol: "HBL", type: "SELL", qty: 200, price: "PKR 141.5", time: "11:15 AM", pnl: "+PKR 320" },
  { symbol: "ENGRO", type: "BUY", qty: 100, price: "PKR 316.0", time: "1:05 PM", pnl: "+PKR 250" },
  { symbol: "PSO", type: "BUY", qty: 300, price: "PKR 218.5", time: "2:45 PM", pnl: "+PKR 750" },
];

const MOCK_RISK = [
  { day: "Mon", count: 2 }, { day: "Tue", count: 5 }, { day: "Wed", count: 3 },
  { day: "Thu", count: 8 }, { day: "Fri", count: 4 }, { day: "Sat", count: 1 }, { day: "Today", count: 6 },
];

const SIGNAL_COLORS: Record<string, { bg: string; color: string }> = {
  BUY: { bg: "#DCFCE7", color: "#15803D" },
  HOLD: { bg: "#FEF9C3", color: "#854D0E" },
  TRIM: { bg: "#FFEDD5", color: "#9A3412" },
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

  const { data: portfolio } = useQuery({
    queryKey: ["dashboard-portfolio"],
    queryFn: async () => (await api.get("/portfolio")).data,
    enabled: user?.role === "investor",
  });

  const { data: riskTrend } = useQuery({
    queryKey: ["dashboard-risk"],
    queryFn: async () => (await api.get("/ciso/risk/trend")).data,
    enabled: user?.role === "ciso",
  });

  const chartData = portfolio?.positions?.length ? portfolio.positions : MOCK_PORTFOLIO_CHART;
  const riskData = riskTrend?.items?.length ? riskTrend.items : MOCK_RISK;

  const isInvestor = !user?.role || user?.role === "investor";
  const isAdmin = user?.role === "admin";
  const isCiso = user?.role === "ciso";

  const firstName = user?.full_name?.split(" ")[0] ?? (isAdmin ? "Admin" : isCiso ? "CISO" : "Trader");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .trade-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; font-size: 14px; }
        .trade-row:last-child { border-bottom: none; }
        .dash-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .dash-two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 24px; }
        .dash-two-col-equal { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .dash-quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .dash-admin-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .dash-header { display: flex; justify-content: space-between; align-items: flex-start; }
        @media (max-width: 1024px) {
          .dash-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-quick-actions { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-admin-actions { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .dash-two-col { grid-template-columns: 1fr !important; }
          .dash-two-col-equal { grid-template-columns: 1fr !important; }
          .dash-header { flex-direction: column; gap: 16px; }
        }
        @media (max-width: 600px) {
          .dash-stat-grid { grid-template-columns: 1fr !important; }
          .dash-quick-actions { grid-template-columns: repeat(2, 1fr) !important; }
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
            <h1 className="page-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#111827", letterSpacing: "-0.5px" }}>
              {getGreeting()}, {firstName}
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
              Here&apos;s your {user?.role ?? "investor"} overview for today — {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {isInvestor && (
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/predict" style={{ background: "#16A34A", color: "white", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={15} color="white" strokeWidth={2} />
                Get Signal
              </Link>
              <Link href="/portfolio" style={{ background: "white", color: "#374151", border: "1.5px solid #E5E7EB", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
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
          <motion.div
            className="dash-stat-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
            variants={cardStagger}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: "Portfolio Value", value: "PKR 2,79,500", change: "+4.3%", up: true, Icon: DollarSign, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Today's P&L", value: "+PKR 11,500", change: "+4.3%", up: true, Icon: TrendingUp, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
              { label: "Active Positions", value: "8", change: "2 new today", up: true, Icon: Briefcase, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
              { label: "Win Rate", value: "71.4%", change: "+2.1% this week", up: true, Icon: Award, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
            ].map((s) => (
              <motion.div
                key={s.label}
                variants={cardItem}
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{s.value}</p>
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

          {/* Chart + Signals */}
          <div className="dash-two-col">
            <motion.div
              className="section-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35, ease: EASE }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Portfolio Performance</h3>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Last 7 days</p>
                </div>
                <span style={{ background: "#DCFCE7", color: "#15803D", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>+4.3% ▲</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
                  <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Value"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13 }}/>
                  <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2.5} fill="url(#colorValue)"/>
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              className="section-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.45, ease: EASE }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>AI Signals</h3>
                <Link href="/predict" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
              </div>
              <motion.div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
                variants={listStagger}
                initial="hidden"
                animate="visible"
              >
                {MOCK_SIGNALS.map((s) => (
                  <motion.div key={s.symbol} variants={listItem}>
                    <Link href={`/predict/${s.symbol}`} style={{ textDecoration: "none" }}>
                      <motion.div
                        whileHover={{ backgroundColor: "#F9FAFB", x: 2, transition: { duration: 0.12 } }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, backgroundColor: "transparent" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, background: "#F0FDF4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: "#16A34A" }}>{s.symbol.slice(0, 3)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.symbol}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.price}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="chip" style={{ background: SIGNAL_COLORS[s.signal]?.bg, color: SIGNAL_COLORS[s.signal]?.color }}>{s.signal}</span>
                          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{s.confidence}% conf.</div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Recent Trades */}
          <motion.div
            className="section-card"
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.55, ease: EASE }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Recent Trades</h3>
              <Link href="/trades" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
            </div>
            <div className="table-scroll">
              <div className="table-min">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <span>Symbol</span><span>Type</span><span>Quantity</span><span>Price</span><span>Time</span><span>P&L</span>
                </div>
                <motion.div variants={rowStagger} initial="hidden" animate="visible">
                  {MOCK_TRADES.map((t, i) => (
                    <motion.div
                      key={i}
                      className="trade-row"
                      variants={rowItem}
                      whileHover={{ backgroundColor: "#F9FAFB", transition: { duration: 0.1 } }}
                      style={{ backgroundColor: "transparent", borderRadius: 8 }}
                    >
                      <span style={{ fontWeight: 700, color: "#111827" }}>{t.symbol}</span>
                      <span>
                        <span className="chip" style={{ background: t.type === "BUY" ? "#DCFCE7" : "#FEE2E2", color: t.type === "BUY" ? "#15803D" : "#991B1B" }}>{t.type}</span>
                      </span>
                      <span style={{ color: "#374151" }}>{t.qty}</span>
                      <span style={{ color: "#374151" }}>{t.price}</span>
                      <span style={{ color: "#9CA3AF" }}>{t.time}</span>
                      <span style={{ color: "#16A34A", fontWeight: 600 }}>{t.pnl}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.65, ease: EASE }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Quick Actions</h3>
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
                    style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                      <a.Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
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
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{s.change}</p>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.iconColor, flexShrink: 0 }}>
                    <s.Icon size={18} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="section-card"
            style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4, ease: EASE }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
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
                    style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                      <a.Icon size={16} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </motion.div>
        </>
      )}

      {/* ── CISO VIEW ── */}
      {isCiso && (
        <>
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
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
                style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, padding: 24 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{s.change}</p>
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
              className="section-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4, ease: EASE }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Risk Trend (7 Days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13 }}/>
                  <Bar dataKey="count" fill="#4ADE80" radius={[6, 6, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
            <motion.div
              className="section-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5, ease: EASE }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
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
                      style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: a.iconColor, flexShrink: 0 }}>
                        <a.Icon size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
