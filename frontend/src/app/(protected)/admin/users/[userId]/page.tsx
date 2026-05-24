"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdminUser, useAdminUserActivity } from "@/lib/queries";
import {
  ChevronLeft, UserCheck, UserX, KeyRound, User, Mail, Shield,
  CalendarDays, Hash, LogIn, LogOut, TrendingUp, Briefcase,
  BarChart3, Activity, Copy, Check,
} from "lucide-react";

const ROLE_CONFIG: Record<string, { bg: string; color: string }> = {
  investor: { bg: "#DCFCE7", color: "#15803D" },
  admin:    { bg: "#EFF6FF", color: "#1D4ED8" },
  ciso:     { bg: "#FEF3C7", color: "#92400E" },
};

const ACTION_CONFIG: Record<string, { bg: string; color: string }> = {
  login:            { bg: "#DCFCE7", color: "#15803D" },
  predict:          { bg: "#EFF6FF", color: "#1D4ED8" },
  portfolio_update: { bg: "#F0FDF4", color: "#16A34A" },
  trade_log:        { bg: "#FEF9C3", color: "#854D0E" },
  logout:           { bg: "#FEE2E2", color: "#991B1B" },
  default:          { bg: "#F3F4F6", color: "#374151" },
};

const ACTION_ICONS: Record<string, any> = {
  login:            LogIn,
  predict:          TrendingUp,
  portfolio_update: Briefcase,
  trade_log:        BarChart3,
  logout:           LogOut,
};

const STATIC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; }

.aud-section-card {
  background: white;
  border: 1.5px solid #E5E7EB;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
}

.aud-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
}

/* action buttons */
.aud-action-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1.5px solid;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  white-space: nowrap;
}
.aud-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.1);
}
.aud-action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* action buttons group */
.aud-actions-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.aud-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid #F3F4F6;
  gap: 12px;
}
.aud-info-row:last-child { border-bottom: none; }
.aud-info-label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.aud-info-value {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  text-align: right;
  word-break: break-all;
}

.aud-activity-row {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #F3F4F6;
  align-items: flex-start;
}
.aud-activity-row:last-child { border-bottom: none; }

.aud-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6B7280;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 14px;
  border: 1.5px solid #E5E7EB;
  border-radius: 8px;
  background: white;
  transition: border-color 0.2s, color 0.2s;
  margin-bottom: 24px;
  min-height: 44px;
}
.aud-back-btn:hover { border-color: #4ADE80; color: #16A34A; }

/* hero layout */
.aud-hero-inner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
}

.aud-hero-profile {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-width: 0;
}

/* two-column grid for info + activity */
.aud-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
}

/* ════════════════════════════
   TABLET  ≤ 900px
════════════════════════════ */
@media (max-width: 900px) {
  .aud-detail-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* ════════════════════════════
   MOBILE  ≤ 768px
════════════════════════════ */
@media (max-width: 768px) {
  .aud-section-card { padding: 16px; }

  /* hero stacks vertically */
  .aud-hero-inner { flex-direction: column; }

  /* profile avatar + text stay row */
  .aud-hero-profile { align-items: flex-start; }

  /* action buttons full width on mobile */
  .aud-actions-group { width: 100%; }
  .aud-action-btn    { flex: 1; }

  /* single column layout */
  .aud-detail-grid { grid-template-columns: 1fr; }

  .aud-page-title { font-size: 22px !important; }
}

/* ════════════════════════════
   SMALL MOBILE  ≤ 480px
════════════════════════════ */
@media (max-width: 480px) {
  .aud-hero-profile { gap: 14px; }

  .aud-avatar {
    width: 56px !important;
    height: 56px !important;
    font-size: 20px !important;
    border-radius: 14px !important;
  }

  /* activity timestamp below content instead of beside */
  .aud-activity-meta {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 4px;
  }
  .aud-activity-time { margin-left: 0 !important; }
}
`;

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const qc = useQueryClient();
  const { data, isLoading }     = useAdminUser(userId);
  const { data: activityRaw }   = useAdminUserActivity(userId);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied]     = useState(false);

  const activityItems: any[] = activityRaw?.items ?? [];

  const roleConfig = ROLE_CONFIG[data?.role ?? "investor"] ?? ROLE_CONFIG.investor;
  const initials   = data?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??";

  const action = useMutation({
    mutationFn: async (path: string) => (await api.post(path)).data,
    onSuccess: (result: any, path: string) => {
      qc.invalidateQueries({ queryKey: ["admin-user", userId] });
      qc.invalidateQueries({ queryKey: ["admin-user-activity", userId] });
      if (path.endsWith("/reset-password") && result?.new_password) {
        setResetResult({ email: result.email, password: result.new_password });
        setCopied(false);
      }
    },
  });

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9CA3AF" }}>
      <div style={{ textAlign: "center" }}>Loading user...</div>
    </div>
  );

  if (!data) return (
    <div style={{ textAlign: "center", padding: 48 }}>
      <Link href="/admin/users" style={{ color: "#16A34A", fontSize: 14 }}>← Back to Users</Link>
      <div style={{ fontWeight: 600, fontSize: 18, color: "#111827", marginTop: 16 }}>User not found</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{STATIC_CSS}</style>

      {/* Back */}
      <Link href="/admin/users" className="aud-back-btn">
        <ChevronLeft size={16} strokeWidth={2}/>
        Back to Users
      </Link>

      {/* ── Profile Hero ── */}
      <div
        className="aud-section-card"
        style={{ background: "linear-gradient(135deg, #F0FDF4, white)", border: "1.5px solid #BBF7D0" }}
      >
        <div className="aud-hero-inner">
          {/* Avatar + name */}
          <div className="aud-hero-profile">
            <div
              className="aud-avatar"
              style={{ width: 72, height: 72, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white", boxShadow: "0 8px 20px rgba(74,222,128,0.3)", flexShrink: 0 }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h1
                  className="aud-page-title"
                  style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.5px", color: "#111827" }}
                >
                  {data?.full_name ?? "User"}
                </h1>
                <span className="aud-chip" style={{ background: roleConfig.bg, color: roleConfig.color }}>
                  {data?.role ?? "investor"}
                </span>
                <span className="aud-chip" style={{ background: data?.is_active ? "#DCFCE7" : "#FEE2E2", color: data?.is_active ? "#15803D" : "#991B1B" }}>
                  {data?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "#6B7280", wordBreak: "break-all" }}>{data?.email}</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
                Member since{" "}
                {data?.created_at
                  ? new Date(data.created_at).toLocaleDateString("en-PK", { month: "long", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="aud-actions-group">
            <button
              className="aud-action-btn"
              style={{ background: "#F0FDF4", color: "#16A34A", borderColor: "#BBF7D0" }}
              onClick={() => action.mutate(`/admin/users/${userId}/activate`)}
              disabled={action.isPending || data?.is_active}
            >
              <UserCheck size={15} strokeWidth={2}/> Activate
            </button>
            <button
              className="aud-action-btn"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" }}
              onClick={() => action.mutate(`/admin/users/${userId}/deactivate`)}
              disabled={action.isPending || !data?.is_active}
            >
              <UserX size={15} strokeWidth={2}/> Deactivate
            </button>
            <button
              className="aud-action-btn"
              style={{ background: "#FFFBEB", color: "#92400E", borderColor: "#FDE68A" }}
              onClick={() => action.mutate(`/admin/users/${userId}/reset-password`)}
              disabled={action.isPending}
            >
              <KeyRound size={15} strokeWidth={2}/> Reset Password
            </button>
          </div>
        </div>
      </div>

      {/* ── Account Info + Activity Grid ── */}
      <div className="aud-detail-grid">
        {/* Account Details */}
        <div className="aud-section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Account Details</h3>
          {[
            { label: "Full Name", value: data?.full_name ?? "—",          Icon: User },
            { label: "Email",     value: data?.email ?? "—",              Icon: Mail },
            { label: "Role",      value: data?.role ?? "—",               Icon: Shield },
            { label: "Status",    value: data?.is_active ? "Active" : "Inactive", Icon: UserCheck },
            { label: "User ID",   value: (userId?.slice(0, 12) ?? "") + "…", Icon: Hash },
            { label: "Joined",    value: data?.created_at ? new Date(data.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" }) : "—", Icon: CalendarDays },
          ].map(item => (
            <div key={item.label} className="aud-info-row">
              <span className="aud-info-label">
                <item.Icon size={13} strokeWidth={2} color="#9CA3AF"/>
                {item.label}
              </span>
              <span className="aud-info-value">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div className="aud-section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Activity Log</h3>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{activityItems.length} events</span>
          </div>

          {activityItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
              No activity recorded
            </div>
          ) : (
            activityItems.map((item: any) => {
              const cfg  = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.default;
              const Icon = ACTION_ICONS[item.action] ?? Activity;
              return (
                <div key={item._id} className="aud-activity-row">
                  <div style={{ width: 36, height: 36, background: cfg.bg, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                    <Icon size={16} strokeWidth={2}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="aud-activity-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="aud-chip" style={{ background: cfg.bg, color: cfg.color, marginBottom: 4, display: "inline-block" }}>
                          {item.action.replace(/_/g, " ")}
                        </span>
                        <p style={{ fontSize: 13, color: "#374151", marginTop: 2, wordBreak: "break-word" }}>{item.details}</p>
                        {item.ip && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>IP: {item.ip}</p>}
                      </div>
                      <span className="aud-activity-time" style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", marginLeft: 8, flexShrink: 0 }}>
                        {new Date(item.timestamp).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Password Reset Modal ── */}
      {resetResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, textAlign: "center", marginBottom: 6, color: "#111827" }}>
              Password Reset
            </h3>
            <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 }}>
              New password for <strong>{resetResult.email}</strong>. Copy it now — it won&apos;t be shown again.
            </p>
            <div style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <code style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: "#16A34A", wordBreak: "break-all" }}>
                {resetResult.password}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(resetResult.password); setCopied(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#16A34A" : "#9CA3AF", flexShrink: 0, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {copied ? <Check size={18} strokeWidth={2.5}/> : <Copy size={18} strokeWidth={2}/>}
              </button>
            </div>
            <button
              onClick={() => setResetResult(null)}
              style={{ width: "100%", background: "#16A34A", color: "white", border: "none", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", minHeight: 44 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}