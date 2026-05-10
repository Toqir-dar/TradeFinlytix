"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

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
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .stat-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .signal-row:hover { background: #F9FAFB; }
        .signal-row { transition: background 0.15s; border-radius: 10px; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .trade-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; font-size: 14px; }
        .trade-row:last-child { border-bottom: none; }
        .trade-row:hover { background: #F9FAFB; border-radius: 8px; }
        .quick-action { background: white; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; text-decoration: none; display: flex; align-items: center; gap: 12px; }
        .quick-action:hover { border-color: #4ADE80; box-shadow: 0 4px 12px rgba(74,222,128,0.15); transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#111827", letterSpacing: "-0.5px" }}>
              {getGreeting()}, {firstName} 👋
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
              Here's your {user?.role ?? "investor"} overview for today — {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {/* Get Signal button only for investor */}
          {isInvestor && (
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/predict" style={{ background: "#16A34A", color: "white", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 11l4-4 2 2 4-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Get Signal
              </Link>
              <Link href="/portfolio" style={{ background: "white", color: "#374151", border: "1.5px solid #E5E7EB", padding: "10px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                Portfolio
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── INVESTOR VIEW ── */}
      {isInvestor && (
        <>
          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Portfolio Value", value: "PKR 2,79,500", change: "+4.3%", up: true, icon: "💼" },
              { label: "Today's P&L", value: "+PKR 11,500", change: "+4.3%", up: true, icon: "📈" },
              { label: "Active Positions", value: "8", change: "2 new today", up: true, icon: "🎯" },
              { label: "Win Rate", value: "71.4%", change: "+2.1% this week", up: true, icon: "🏆" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: s.up ? "#16A34A" : "#DC2626", marginTop: 4, fontWeight: 500 }}>
                      {s.up ? "▲" : "▼"} {s.change}
                    </p>
                  </div>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + Signals */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 24 }}>
            <div className="section-card">
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
            </div>

            <div className="section-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>AI Signals</h3>
                <Link href="/predict" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {MOCK_SIGNALS.map((s) => (
                  <Link key={s.symbol} href={`/predict/${s.symbol}`} style={{ textDecoration: "none" }}>
                    <div className="signal-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}>
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
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="section-card" style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Recent Trades</h3>
              <Link href="/trades" style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <span>Symbol</span><span>Type</span><span>Quantity</span><span>Price</span><span>Time</span><span>P&L</span>
              </div>
              {MOCK_TRADES.map((t, i) => (
                <div key={i} className="trade-row">
                  <span style={{ fontWeight: 700, color: "#111827" }}>{t.symbol}</span>
                  <span>
                    <span className="chip" style={{ background: t.type === "BUY" ? "#DCFCE7" : "#FEE2E2", color: t.type === "BUY" ? "#15803D" : "#991B1B" }}>{t.type}</span>
                  </span>
                  <span style={{ color: "#374151" }}>{t.qty}</span>
                  <span style={{ color: "#374151" }}>{t.price}</span>
                  <span style={{ color: "#9CA3AF" }}>{t.time}</span>
                  <span style={{ color: "#16A34A", fontWeight: 600 }}>{t.pnl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { href: "/predict", icon: "📊", label: "Get AI Signal", sub: "Any PSX symbol" },
                { href: "/portfolio", icon: "💼", label: "View Portfolio", sub: "P&L overview" },
                { href: "/trades", icon: "📋", label: "Trade History", sub: "All transactions" },
                { href: "/profile", icon: "👤", label: "My Profile", sub: "Account settings" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <div style={{ fontSize: 28 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── ADMIN VIEW ── */}
      {isAdmin && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Users", value: "1,284", change: "+12 today", icon: "👥" },
              { label: "Active Users", value: "1,201", change: "93.5% active", icon: "✅" },
              { label: "Deactivated", value: "83", change: "6.5% inactive", icon: "🚫" },
              { label: "New Today", value: "12", change: "+3 from yesterday", icon: "🆕" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{s.change}</p>
                  </div>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { href: "/admin/users", icon: "👥", label: "Manage Users", sub: "View & edit all users" },
                { href: "/profile", icon: "👤", label: "My Profile", sub: "Account settings" },
                { href: "/predict", icon: "📊", label: "AI Signals", sub: "View predictions" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="quick-action">
                  <div style={{ fontSize: 28 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── CISO VIEW ── */}
      {isCiso && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Audit Events", value: "3,421", change: "+48 today", icon: "🔍" },
              { label: "Anomalies", value: "7", change: "2 high severity", icon: "⚠️" },
              { label: "Risk Score", value: "LOW", change: "All systems normal", icon: "🛡️" },
              { label: "Chain Status", value: "Verified", change: "Last checked 2m ago", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{s.change}</p>
                  </div>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div className="section-card">
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
            </div>
            <div className="section-card">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { href: "/ciso/audit", icon: "🔍", label: "Audit Explorer", sub: "View event stream" },
                  { href: "/ciso/risk", icon: "📊", label: "Risk Dashboard", sub: "Anomalies & trends" },
                  { href: "/profile", icon: "👤", label: "My Profile", sub: "Account settings" },
                ].map((a) => (
                  <Link key={a.href} href={a.href} className="quick-action">
                    <div style={{ fontSize: 24 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{a.label}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{a.sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}