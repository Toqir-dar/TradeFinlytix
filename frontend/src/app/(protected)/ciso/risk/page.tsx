"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useAnomalies, useAudit, useAuditVerify } from "@/lib/queries";
import { api } from "@/lib/api";

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

export default function CisoAuditPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"events" | "anomalies">("events");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const { data: auditRaw, isLoading } = useAudit();
  const { data: anomalyRaw } = useAnomalies();

  const audit = auditRaw ?? MOCK_AUDIT;
  const anomalies = anomalyRaw ?? MOCK_ANOMALIES;

  const auditItems = audit?.items ?? [];
  const anomalyItems = anomalies?.items ?? [];

  const EVENT_TYPES: string[] = [
    "all",
    ...Array.from(new Set<string>(auditItems.map((i: any) => String(i.event_type))))
  ];

  const filteredAudit = auditItems.filter((i: any) => {
    const matchFilter = eventFilter === "all" || i.event_type === eventFilter;
    const matchSearch = !search || i.event_type.includes(search) || i.user_id?.includes(search) || i.path?.includes(search);
    return matchFilter && matchSearch;
  });

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
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>Audit Explorer</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Monitor audit trail, verify chain integrity, and investigate anomalies</p>
        </div>
        <button onClick={handleVerify} disabled={verifying}
          style={{ background: verifyResult?.ok ? "#16A34A" : "#111827", color: "white", border: "none", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: verifying ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, opacity: verifying ? 0.7 : 1, transition: "all 0.2s" }}>
          {verifying ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>Verifying...</>
          ) : verifyResult?.ok ? "Chain Verified" : "Verify Chain"}
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
          { label: "Total Events", value: audit?.total?.toLocaleString() ?? "3,421", sub: "All time" },
          { label: "Anomalies", value: anomalies?.total ?? 7, sub: "Detected", color: "#DC2626" },
          { label: "Chain Status", value: verifyResult ? (verifyResult.ok ? "Verified" : "Failed") : "Pending", sub: "HMAC integrity", color: verifyResult?.ok === false ? "#DC2626" : "#16A34A" },
          { label: "Event Types", value: EVENT_TYPES.length - 1, sub: "Distinct types" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div>
              <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color ?? "#111827" }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["events", "anomalies"] as const).map(tab => (
          <button key={tab} className="tab-btn"
            onClick={() => setActiveTab(tab)}
            style={{ background: activeTab === tab ? "#111827" : "white", color: activeTab === tab ? "white" : "#374151", border: activeTab === tab ? "none" : "1.5px solid #E5E7EB" }}>
            {tab === "events" ? `Audit Events (${auditItems.length})` : `Anomalies (${anomalyItems.length})`}
          </button>
        ))}
      </div>

      {/* Audit Events Tab */}
      {activeTab === "events" && (
        <div className="section-card">
          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#9CA3AF" strokeWidth="1.5"/>
                <path d="M10 10l2 2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input className="input-field" style={{ paddingLeft: 32, width: "100%" }} placeholder="Search event type, user, path..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EVENT_TYPES.slice(0, 6).map(t => (
                <button key={t} className={`filter-btn ${eventFilter === t ? "active" : ""}`} onClick={() => setEventFilter(t)}>
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
                        <div style={{ width: 34, height: 34, background: cfg.bg, borderRadius: 8, flexShrink: 0 }}/>
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

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F3F4F6", fontSize: 13, color: "#9CA3AF" }}>
            Showing {filteredAudit.length} of {audit?.total?.toLocaleString() ?? 0} total events
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
                      <div style={{ width: 40, height: 40, background: cfg.bg, borderRadius: 10, flexShrink: 0 }}/>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
