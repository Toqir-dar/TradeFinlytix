"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useAnomalies, useAudit } from "@/lib/queries";
import { api } from "@/lib/api";
import { FileSearch, AlertTriangle, CheckCircle2, Search, Loader2, Activity, Shield, BarChart3, LogIn, LogOut, TrendingUp, Briefcase, UserX, Sparkles, Bot, ArrowRight } from "lucide-react";

const MOCK_AUDIT = {
  items: [
    { _id: "1", event_type: "login_success", user_id: "user123", path: "/api/v1/auth/login", created_at: new Date(Date.now() - 1000*60*5).toISOString(), payload: { role: "investor" } },
    { _id: "2", event_type: "predict_request", user_id: "user123", path: "/api/v1/predict/OGDC", created_at: new Date(Date.now() - 1000*60*15).toISOString(), payload: { symbol: "OGDC" } },
    { _id: "3", event_type: "portfolio_update", user_id: "user456", path: "/api/v1/portfolio", created_at: new Date(Date.now() - 1000*60*30).toISOString(), payload: {} },
    { _id: "4", event_type: "login_failed", user_id: "user789", path: "/api/v1/auth/login", created_at: new Date(Date.now() - 1000*60*45).toISOString(), payload: { reason: "invalid_password" } },
    { _id: "5", event_type: "admin_deactivate", user_id: "admin001", path: "/api/v1/admin/users/xyz/deactivate", created_at: new Date(Date.now() - 1000*60*60).toISOString(), payload: {} },
    { _id: "6", event_type: "login_success", user_id: "user999", path: "/api/v1/auth/login", created_at: new Date(Date.now() - 1000*60*90).toISOString(), payload: { role: "ciso" } },
  ],
  total: 3421, skip: 0, limit: 50
};

const MOCK_ANOMALIES = {
  items: [
    { _id: "a1", subject: "user123", anomaly_type: "rapid_requests", score: 0.87, created_at: new Date(Date.now() - 1000*60*10).toISOString(), details: "15 requests in 2 minutes" },
    { _id: "a2", subject: "anon:192.168.1.5", anomaly_type: "auth_brute_force", score: 0.94, created_at: new Date(Date.now() - 1000*60*25).toISOString(), details: "8 failed login attempts" },
    { _id: "a3", subject: "user456", anomaly_type: "off_hours_access", score: 0.65, created_at: new Date(Date.now() - 1000*60*120).toISOString(), details: "Access at 3:42 AM" },
  ],
  total: 7, skip: 0, limit: 50
};

const EVENT_CONFIG: Record<string, { bg: string; color: string }> = {
  login_success:    { bg: "#DCFCE7", color: "#15803D" },
  login_failed:     { bg: "#FEE2E2", color: "#991B1B" },
  predict_request:  { bg: "#EFF6FF", color: "#1D4ED8" },
  portfolio_update: { bg: "#F0FDF4", color: "#16A34A" },
  admin_deactivate: { bg: "#FEF3C7", color: "#92400E" },
  admin_activate:   { bg: "#DCFCE7", color: "#15803D" },
  logout:           { bg: "#F3F4F6", color: "#374151" },
  default:          { bg: "#F3F4F6", color: "#374151" },
};

const ANOMALY_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  rapid_requests:   { bg: "#FEF3C7", color: "#92400E", label: "HIGH" },
  auth_brute_force: { bg: "#FEE2E2", color: "#991B1B", label: "CRITICAL" },
  off_hours_access: { bg: "#FFEDD5", color: "#9A3412", label: "MEDIUM" },
  default:          { bg: "#F3F4F6", color: "#374151", label: "LOW" },
};

const EVENT_ICONS: Record<string, any> = {
  login_success:    LogIn,
  login_failed:     UserX,
  predict_request:  TrendingUp,
  portfolio_update: Briefcase,
  admin_deactivate: UserX,
  admin_activate:   CheckCircle2,
  logout:           LogOut,
};

const ANOMALY_ICONS: Record<string, any> = {
  rapid_requests:   BarChart3,
  auth_brute_force: Shield,
  off_hours_access: AlertTriangle,
};

export default function CisoAuditPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"events" | "anomalies" | "ai">("events");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [ragQuestion, setRagQuestion] = useState("");
  const [ragResult, setRagResult] = useState<{ answer: string; sources: any[] } | null>(null);
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);

  const ragMutation = useMutation({
    mutationFn: async (question: string) =>
      (await api.post("/ciso/audit/search", { question })).data,
    onSuccess: (data) => setRagResult(data),
  });

  const { data: auditRaw, isLoading } = useAudit({
    event_type: eventFilter !== "all" ? eventFilter : undefined,
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  });
  const { data: anomalyRaw } = useAnomalies();

  const audit = auditRaw ?? MOCK_AUDIT;
  const anomalies = anomalyRaw ?? MOCK_ANOMALIES;

  const auditItems = audit?.items ?? [];
  const anomalyItems = anomalies?.items ?? [];

  const EVENT_TYPES: string[] = [
    "all",
    ...Array.from(new Set<string>(auditItems.map((i: any) => String(i.event_type))))
  ];

  const filteredAudit = auditItems.filter((i: any) =>
    !search || i.event_type.includes(search) || i.user_id?.includes(search) || i.path?.includes(search)
  );
  const totalPages = Math.max(1, Math.ceil((audit?.total ?? 0) / PAGE_SIZE));

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data } = await api.get("/ciso/audit/verify");
      setVerifyResult(data);
    } catch {
      setVerifyResult({ ok: false, checked: 0 });
    } finally {
      setVerifying(false);
    }
  };

  if (user?.role !== "ciso") return (
    <div style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontWeight: 600, fontSize: 18, color: "#374151" }}>CISO Access Required</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .stat-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 22px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .input-field { padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: #9CA3AF; }
        .filter-btn { padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid #E5E7EB; background: white; color: #6B7280; font-family: inherit; transition: all 0.2s; white-space: nowrap; }
        .filter-btn.active { background: #111827; color: white; border-color: #111827; }
        .tab-btn { padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.2s; }
        .audit-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; transition: background 0.15s; }
        .audit-row:hover { background: #F9FAFB; border-radius: 8px; }
        .audit-row:last-child { border-bottom: none; }
        .anomaly-row { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; transition: background 0.15s; }
        .anomaly-row:hover { background: #F9FAFB; }
        .anomaly-row:last-child { border-bottom: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>Audit Explorer</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Monitor audit trail, verify chain integrity, and investigate anomalies</p>
        </div>
        <button onClick={handleVerify} disabled={verifying}
          style={{ background: verifyResult?.ok ? "#16A34A" : "#111827", color: "white", border: "none", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: verifying ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, opacity: verifying ? 0.7 : 1, transition: "all 0.2s" }}>
          {verifying ? (
            <><Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Verifying...</>
          ) : verifyResult?.ok ? (
            <><CheckCircle2 size={16} strokeWidth={2} />Chain Verified</>
          ) : (
            <><FileSearch size={16} strokeWidth={2} />Verify Chain</>
          )}
        </button>
      </div>

      {/* Chain Verify Result */}
      {verifyResult && (
        <div style={{ background: verifyResult.ok ? "#F0FDF4" : "#FEF2F2", border: `1.5px solid ${verifyResult.ok ? "#BBF7D0" : "#FECACA"}`, borderRadius: 14, padding: 20, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: verifyResult.ok ? "#15803D" : "#991B1B" }}>
              {verifyResult.ok ? "Audit Chain Verified — Tamper-Free" : "Chain Verification Failed!"}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
              {verifyResult.checked} documents checked
              {verifyResult.broken_at && ` — Broken at: ${verifyResult.broken_at}`}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Events", value: audit?.total?.toLocaleString() ?? "3,421", sub: "All time", Icon: FileSearch, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
          { label: "Anomalies", value: anomalies?.total ?? 7, sub: "Detected", color: "#DC2626", Icon: AlertTriangle, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
          { label: "Chain Status", value: verifyResult ? (verifyResult.ok ? "Verified" : "Failed") : "Pending", sub: "HMAC integrity", color: verifyResult?.ok === false ? "#DC2626" : "#16A34A", Icon: CheckCircle2, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
          { label: "Event Types", value: EVENT_TYPES.length - 1, sub: "Distinct types", Icon: BarChart3, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color ?? "#111827" }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.sub}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: s.iconColor, flexShrink: 0 }}>
                <s.Icon size={18} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button className="tab-btn" onClick={() => setActiveTab("events")}
          style={{ background: activeTab === "events" ? "#111827" : "white", color: activeTab === "events" ? "white" : "#374151", border: activeTab === "events" ? "none" : "1.5px solid #E5E7EB" }}>
          Audit Events ({auditItems.length})
        </button>
        <button className="tab-btn" onClick={() => setActiveTab("anomalies")}
          style={{ background: activeTab === "anomalies" ? "#111827" : "white", color: activeTab === "anomalies" ? "white" : "#374151", border: activeTab === "anomalies" ? "none" : "1.5px solid #E5E7EB" }}>
          Anomalies ({anomalyItems.length})
        </button>
        <button className="tab-btn" onClick={() => setActiveTab("ai")}
          style={{ background: activeTab === "ai" ? "#16A34A" : "white", color: activeTab === "ai" ? "white" : "#374151", border: activeTab === "ai" ? "none" : "1.5px solid #E5E7EB", display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} strokeWidth={2} />AI Search
        </button>
      </div>

      {/* Audit Events Tab */}
      {activeTab === "events" && (
        <div className="section-card">
          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", display: "flex" }}>
                <Search size={14} strokeWidth={2} />
              </div>
              <input className="input-field" style={{ paddingLeft: 32, width: "100%" }} placeholder="Search event type, user, path..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EVENT_TYPES.slice(0, 6).map(t => (
                <button key={t} className={`filter-btn ${eventFilter === t ? "active" : ""}`} onClick={() => { setEventFilter(t); setPage(0); }}>
                  {t === "all" ? "All" : t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="table-scroll">
            <div className="table-min">
              {/* Table Header */}
              <div className="audit-row" style={{ borderBottom: "2px solid #F3F4F6", padding: "8px 16px" }}>
                {["Event Type", "User / Path", "Time", "Details"].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
                ))}
              </div>

              {isLoading ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#9CA3AF" }}>Loading audit events...</div>
              ) : filteredAudit.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px", color: "#9CA3AF" }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>No events found</div>
                </div>
              ) : (
                filteredAudit.map((item: any) => {
                  const cfg = EVENT_CONFIG[item.event_type] ?? EVENT_CONFIG.default;
                  return (
                    <div key={item._id} className="audit-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, background: cfg.bg, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                          {(() => { const Icon = EVENT_ICONS[item.event_type] ?? Activity; return <Icon size={15} strokeWidth={2} />; })()}
                        </div>
                        <span className="chip" style={{ background: cfg.bg, color: cfg.color }}>
                          {item.event_type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{item.user_id?.slice(0, 16) ?? "—"}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{item.path}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "#374151" }}>{new Date(item.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(item.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace" }}>
                        {Object.keys(item.payload ?? {}).length > 0 ? JSON.stringify(item.payload).slice(0, 40) + "..." : "—"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, audit?.total ?? 0)} of {audit?.total?.toLocaleString() ?? 0} total events
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", background: page === 0 ? "#F9FAFB" : "white", color: page === 0 ? "#D1D5DB" : "#374151", fontSize: 13, fontWeight: 600, cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                Previous
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i;
                  else if (page < 3) pageNum = i;
                  else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid", borderColor: pageNum === page ? "#111827" : "#E5E7EB", background: pageNum === page ? "#111827" : "white", color: pageNum === page ? "white" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid #E5E7EB", background: page >= totalPages - 1 ? "#F9FAFB" : "white", color: page >= totalPages - 1 ? "#D1D5DB" : "#374151", fontSize: 13, fontWeight: 600, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies Tab */}
      {activeTab === "anomalies" && (
        <div className="section-card">
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Detected Anomalies</h3>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>{anomalyItems.length} anomalies</span>
          </div>

          {anomalyItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px", color: "#9CA3AF" }}>
              <div style={{ fontWeight: 600, color: "#374151" }}>No anomalies detected</div>
            </div>
          ) : (
            anomalyItems.map((a: any) => {
              const cfg = ANOMALY_CONFIG[a.anomaly_type] ?? ANOMALY_CONFIG.default;
              return (
                <div key={a._id} className="anomaly-row">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 40, height: 40, background: cfg.bg, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                        {(() => { const Icon = ANOMALY_ICONS[a.anomaly_type] ?? AlertTriangle; return <Icon size={18} strokeWidth={2} />; })()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                            {a.anomaly_type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                          <span className="chip" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#6B7280" }}>{a.details ?? "Suspicious activity detected"}</div>
                        <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Subject: {a.subject}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>{(a.score * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>risk score</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                        {new Date(a.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {/* AI Search Tab */}
      {activeTab === "ai" && (
        <div className="section-card">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803D", flexShrink: 0 }}>
              <Bot size={22} strokeWidth={2} />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>AI Audit Search</h3>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Ask a natural-language question — the AI searches embedded audit logs and answers with sources.</p>
            </div>
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); if (ragQuestion.trim()) ragMutation.mutate(ragQuestion.trim()); }}
            style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", display: "flex" }}>
                <Sparkles size={16} strokeWidth={2} />
              </div>
              <input className="input-field" style={{ paddingLeft: 40, width: "100%", fontSize: 15 }}
                placeholder='e.g. "Who logged in after midnight?" or "Any brute force attempts today?"'
                value={ragQuestion} onChange={e => setRagQuestion(e.target.value)} disabled={ragMutation.isPending} />
            </div>
            <button type="submit" disabled={ragMutation.isPending || !ragQuestion.trim()}
              style={{ padding: "10px 22px", background: "#16A34A", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: ragMutation.isPending || !ragQuestion.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, opacity: ragMutation.isPending || !ragQuestion.trim() ? 0.6 : 1, transition: "all 0.2s", whiteSpace: "nowrap" }}>
              {ragMutation.isPending ? (
                <><Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />Searching...</>
              ) : (
                <><ArrowRight size={16} strokeWidth={2} />Search</>
              )}
            </button>
          </form>

          {/* Error */}
          {ragMutation.isError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
              Search failed — check that the backend RAG service is running.
            </div>
          )}

          {/* Answer */}
          {ragResult && (
            <div>
              <div style={{ background: "linear-gradient(135deg,#F0FDF4,#DCFCE7)", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Bot size={16} strokeWidth={2} color="#15803D" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#15803D" }}>AI Answer</span>
                </div>
                <p style={{ fontSize: 15, color: "#111827", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ragResult.answer}</p>
              </div>

              {/* Sources */}
              {ragResult.sources?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    {ragResult.sources.length} Source{ragResult.sources.length !== 1 ? "s" : ""} Retrieved
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ragResult.sources.map((src: any, i: number) => {
                      const cfg = EVENT_CONFIG[src.event_type] ?? EVENT_CONFIG.default;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 10 }}>
                          <div style={{ width: 32, height: 32, background: cfg.bg, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                            {(() => { const Icon = EVENT_ICONS[src.event_type] ?? Activity; return <Icon size={14} strokeWidth={2} />; })()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span className="chip" style={{ background: cfg.bg, color: cfg.color }}>{src.event_type?.replace(/_/g, " ")}</span>
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{src.user_id?.slice(0, 20)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.path}</div>
                            {src.created_at && (
                              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                                {new Date(src.created_at).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!ragResult && !ragMutation.isPending && !ragMutation.isError && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", display: "flex", alignItems: "center", justifyContent: "center", color: "#15803D", margin: "0 auto 16px" }}>
                <Bot size={26} strokeWidth={1.8} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#374151", marginBottom: 6 }}>Ask anything about your audit logs</div>
              <div style={{ fontSize: 13, maxWidth: 340, margin: "0 auto", lineHeight: 1.6 }}>
                The AI uses semantic search over embedded audit logs and a language model to answer your question in plain English.
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
