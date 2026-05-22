"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, BarChart3, Database, FileSearch, Loader2, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAnomalyStats, useAuditLogs, useRiskRecent, useRiskSnapshots, useRiskTrend, useTopRisk } from "@/lib/queries";

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  LOW: { bg: "#DCFCE7", color: "#15803D" },
  MEDIUM: { bg: "#FEF3C7", color: "#92400E" },
  HIGH: { bg: "#FEE2E2", color: "#991B1B" },
  CRITICAL: { bg: "#7F1D1D", color: "white" },
};

function levelStyle(level?: string) {
  return LEVEL_STYLE[(level ?? "LOW").toUpperCase()] ?? LEVEL_STYLE.LOW;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CisoRiskPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "events" | "snapshots">("overview");
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();
  const { data: anomalyStats, isLoading: anomalyStatsLoading } = useAnomalyStats(14);
  const { data: riskTrend, isLoading: trendLoading } = useRiskTrend(14);
  const { data: topRisk, isLoading: topRiskLoading } = useTopRisk();
  const { data: recentRisk, isLoading: recentLoading } = useRiskRecent();
  const { data: snapshots, isLoading: snapshotsLoading } = useRiskSnapshots();

  const trendItems = riskTrend?.items ?? [];
  const anomalyItems = anomalyStats?.items ?? [];
  const topSubjects = topRisk?.items ?? [];
  const recentItems = recentRisk?.items ?? [];
  const snapshotItems = snapshots?.items ?? [];
  const auditItems = auditLogs?.items ?? [];

  const highRecent = recentItems.filter((item: any) =>
    ["HIGH", "CRITICAL"].includes(String(item.level ?? item.risk_level ?? "").toUpperCase())
  ).length;

  const avgRiskScore = useMemo(() => {
    if (!trendItems.length) return 0;
    const total = trendItems.reduce((sum: number, item: any) => sum + Number(item.avg_score ?? 0), 0);
    return total / trendItems.length;
  }, [trendItems]);

  if (user?.role !== "ciso") {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#374151" }}>CISO Access Required</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .stat-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 22px; }
        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .tab-btn { padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: 1.5px solid #E5E7EB; background: white; color: #374151; font-family: inherit; }
        .tab-btn.active { background: #111827; color: white; border-color: #111827; }
        .risk-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
        .risk-row:last-child { border-bottom: none; }
        .subject-row { display: grid; grid-template-columns: 1.8fr 1fr 1fr 1fr; gap: 12px; align-items: center; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
        .subject-row:last-child { border-bottom: none; }
        @media (max-width: 860px) {
          .risk-grid { grid-template-columns: 1fr !important; }
          .risk-row, .subject-row { grid-template-columns: 1fr 1fr; }
          .table-head { display: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 6 }}>Risk Dashboard</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Live risk trend, anomaly frequency, ranked subjects, and stored snapshots.</p>
        </div>
        {(trendLoading || anomalyStatsLoading || topRiskLoading || recentLoading || snapshotsLoading || auditLoading) && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#16A34A", fontSize: 13, fontWeight: 700 }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Syncing
          </span>
        )}
      </div>

      <div className="risk-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Risk Buckets", value: riskTrend?.total ?? trendItems.length, sub: "Trend days", Icon: TrendingUp, color: "#16A34A", bg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)" },
          { label: "Avg Risk", value: avgRiskScore.toFixed(1), sub: "Across loaded buckets", Icon: ShieldAlert, color: avgRiskScore >= 70 ? "#991B1B" : "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
          { label: "High Recent", value: highRecent, sub: "Recent high risk events", Icon: AlertTriangle, color: "#DC2626", bg: "linear-gradient(135deg,#FEE2E2,#FECACA)" },
          { label: "Audit Log Items", value: auditLogs?.total ?? auditItems.length, sub: "Via /audit/logs", Icon: FileSearch, color: "#92400E", bg: "linear-gradient(135deg,#FEF3C7,#FDE68A)" },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 700, marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 24, fontWeight: 900, color: item.color }}>{item.value}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{item.sub}</p>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <item.Icon size={19} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          ["overview", "Overview"],
          ["subjects", "Top Subjects"],
          ["events", "Recent Events"],
          ["snapshots", "Snapshots"],
        ].map(([key, label]) => (
          <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key as typeof activeTab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="risk-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <div className="section-card">
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Risk Trend</h2>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 18 }}>Average score and high risk count by day</p>
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={trendItems}>
                <defs>
                  <linearGradient id="riskScoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Area type="monotone" dataKey="avg_score" name="Avg score" stroke="#16A34A" strokeWidth={2.5} fill="url(#riskScoreFill)" />
                <Area type="monotone" dataKey="high_risk_count" name="High risk" stroke="#DC2626" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="section-card">
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Anomaly Frequency</h2>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 18 }}>Daily anomaly count</p>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={anomalyItems}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Bar dataKey="count" fill="#F59E0B" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "subjects" && (
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Users size={18} color="#16A34A" />
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Top Risky Subjects</h2>
          </div>
          <div className="table-scroll">
            <div className="table-min">
              <div className="subject-row table-head" style={{ padding: "8px 16px", borderBottom: "2px solid #F3F4F6" }}>
                {["Subject", "Events", "Avg Score", "High Count"].map((head) => (
                  <span key={head} style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" }}>{head}</span>
                ))}
              </div>
              {topSubjects.length === 0 ? (
                <div style={{ textAlign: "center", padding: 42, color: "#9CA3AF" }}>No ranked subjects returned.</div>
              ) : topSubjects.map((item: any) => (
                <div key={item.subject} className="subject-row">
                  <span style={{ fontFamily: "monospace", fontSize: 13, color: "#374151" }}>{item.subject}</span>
                  <span style={{ fontWeight: 800 }}>{item.count}</span>
                  <span style={{ fontWeight: 900, color: item.avg_score >= 70 ? "#991B1B" : "#15803D" }}>{Number(item.avg_score ?? 0).toFixed(1)}</span>
                  <span className="chip" style={{ background: item.high_count > 0 ? "#FEE2E2" : "#DCFCE7", color: item.high_count > 0 ? "#991B1B" : "#15803D", width: "fit-content" }}>
                    {item.high_count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "events" && (
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Activity size={18} color="#16A34A" />
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Recent Risk Events</h2>
          </div>
          <div className="table-scroll">
            <div className="table-min">
              <div className="risk-row table-head" style={{ padding: "8px 16px", borderBottom: "2px solid #F3F4F6" }}>
                {["Subject", "Level", "Score", "Time"].map((head) => (
                  <span key={head} style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" }}>{head}</span>
                ))}
              </div>
              {recentItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: 42, color: "#9CA3AF" }}>No recent risk events returned.</div>
              ) : recentItems.map((item: any, index: number) => {
                const style = levelStyle(item.level ?? item.risk_level);
                return (
                  <div key={item._id ?? index} className="risk-row">
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: "#374151" }}>{item.subject ?? item.user_id ?? "-"}</span>
                    <span className="chip" style={{ background: style.bg, color: style.color, width: "fit-content" }}>{item.level ?? item.risk_level ?? "LOW"}</span>
                    <span style={{ fontWeight: 900 }}>{Number(item.score ?? item.dynamic_score ?? 0).toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{formatDate(item.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "snapshots" && (
        <div className="section-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Database size={18} color="#16A34A" />
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>Risk Snapshots</h2>
          </div>
          <div className="table-scroll">
            <div className="table-min">
              <div className="risk-row table-head" style={{ padding: "8px 16px", borderBottom: "2px solid #F3F4F6" }}>
                {["Subject", "Level", "Score", "Time"].map((head) => (
                  <span key={head} style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" }}>{head}</span>
                ))}
              </div>
              {snapshotItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: 42, color: "#9CA3AF" }}>No snapshots returned.</div>
              ) : snapshotItems.map((item: any, index: number) => {
                const style = levelStyle(item.level);
                return (
                  <div key={item._id ?? index} className="risk-row">
                    <span style={{ fontFamily: "monospace", fontSize: 13, color: "#374151" }}>{item.subject ?? "-"}</span>
                    <span className="chip" style={{ background: style.bg, color: style.color, width: "fit-content" }}>{item.level ?? "LOW"}</span>
                    <span style={{ fontWeight: 900 }}>{Number(item.score ?? item.dynamic_score ?? 0).toFixed(1)}</span>
                    <span style={{ fontSize: 13, color: "#6B7280" }}>{formatDate(item.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
