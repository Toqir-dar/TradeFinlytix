"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAdminUser, useAdminUserActivity } from "@/lib/queries";
import { ChevronLeft, UserCheck, UserX, KeyRound, User, Mail, Shield, CalendarDays, Hash, LogIn, LogOut, TrendingUp, Briefcase, BarChart3, Activity, Copy, Check } from "lucide-react";

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

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useAdminUser(userId);
  const { data: activityRaw } = useAdminUserActivity(userId);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const activityItems: any[] = activityRaw?.items ?? [];

  const roleConfig = ROLE_CONFIG[data?.role ?? "investor"] ?? ROLE_CONFIG.investor;
  const initials = data?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??";

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
        .chip { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .action-btn { padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1.5px solid; display: inline-flex; align-items: center; gap: 6px; }
        .action-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
        .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 0; border-bottom: 1px solid #F3F4F6; }
        .info-row:last-child { border-bottom: none; }
        .activity-row { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #F3F4F6; align-items: flex-start; }
        .activity-row:last-child { border-bottom: none; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; color: #6B7280; font-size: 14px; font-weight: 500; text-decoration: none; padding: 8px 14px; border: 1.5px solid #E5E7EB; border-radius: 8px; background: white; transition: all 0.2s; margin-bottom: 24px; }
        .back-btn:hover { border-color: #4ADE80; color: #16A34A; }
      `}</style>

      {/* Back */}
      <Link href="/admin/users" className="back-btn">
        <ChevronLeft size={16} strokeWidth={2} />
        Back to Users
      </Link>

      {/* Profile Hero */}
      <div className="section-card" style={{ background: "linear-gradient(135deg, #F0FDF4, white)", border: "1.5px solid #BBF7D0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 72, height: 72, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white", boxShadow: "0 8px 20px rgba(74,222,128,0.3)", flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, letterSpacing: "-0.5px", color: "#111827" }}>
                  {data?.full_name ?? "User"}
                </h1>
                <span className="chip" style={{ background: roleConfig.bg, color: roleConfig.color }}>
                  {data?.role ?? "investor"}
                </span>
                <span className="chip" style={{ background: data?.is_active ? "#DCFCE7" : "#FEE2E2", color: data?.is_active ? "#15803D" : "#991B1B" }}>
                  {data?.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "#6B7280" }}>{data?.email}</p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
                Member since {data?.created_at ? new Date(data.created_at).toLocaleDateString("en-PK", { month: "long", day: "numeric", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="action-btn"
              style={{ background: "#F0FDF4", color: "#16A34A", borderColor: "#BBF7D0" }}
              onClick={() => action.mutate(`/admin/users/${userId}/activate`)}
              disabled={action.isPending || data?.is_active}>
              <UserCheck size={15} strokeWidth={2} /> Activate
            </button>
            <button className="action-btn"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" }}
              onClick={() => action.mutate(`/admin/users/${userId}/deactivate`)}
              disabled={action.isPending || !data?.is_active}>
              <UserX size={15} strokeWidth={2} /> Deactivate
            </button>
            <button className="action-btn"
              style={{ background: "#FFFBEB", color: "#92400E", borderColor: "#FDE68A" }}
              onClick={() => action.mutate(`/admin/users/${userId}/reset-password`)}
              disabled={action.isPending}>
              <KeyRound size={15} strokeWidth={2} /> Reset Password
            </button>
          </div>
        </div>
      </div>

      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16 }}>
        {/* Account Info */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Account Details</h3>
          {[
            { label: "Full Name", value: data?.full_name ?? "—", Icon: User },
            { label: "Email", value: data?.email ?? "—", Icon: Mail },
            { label: "Role", value: data?.role ?? "—", Icon: Shield },
            { label: "Status", value: data?.is_active ? "Active" : "Inactive", Icon: UserCheck },
            { label: "User ID", value: userId?.slice(0, 12) + "...", Icon: Hash },
            { label: "Joined", value: data?.created_at ? new Date(data.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" }) : "—", Icon: CalendarDays },
          ].map(item => (
            <div key={item.label} className="info-row">
              <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
                <item.Icon size={13} strokeWidth={2} color="#9CA3AF" />
                {item.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Activity Log</h3>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{activityItems.length} events</span>
          </div>

          {activityItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
              <div>No activity recorded</div>
            </div>
          ) : (
            activityItems.map((item: any) => {
              const cfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.default;
              return (
                <div key={item._id} className="activity-row">
                  <div style={{ width: 36, height: 36, background: cfg.bg, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                    {(() => { const Icon = ACTION_ICONS[item.action] ?? Activity; return <Icon size={16} strokeWidth={2} />; })()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span className="chip" style={{ background: cfg.bg, color: cfg.color, marginBottom: 4, display: "inline-block" }}>
                          {item.action.replace(/_/g, " ")}
                        </span>
                        <p style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{item.details}</p>
                        {item.ip && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>IP: {item.ip}</p>}
                      </div>
                      <span style={{ fontSize: 11, color: "#9CA3AF", whiteSpace: "nowrap", marginLeft: 8 }}>
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

      {/* Password reset modal */}
      {resetResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", border: "1px solid #E5E7EB", borderRadius: 20, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, textAlign: "center", marginBottom: 6, color: "#111827" }}>Password Reset</h3>
            <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 }}>
              New password for <strong>{resetResult.email}</strong>. Copy it now — it won&apos;t be shown again.
            </p>
            <div style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <code style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: "#16A34A", wordBreak: "break-all" }}>
                {resetResult.password}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(resetResult.password); setCopied(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#16A34A" : "#9CA3AF", flexShrink: 0 }}>
                {copied ? <Check size={18} strokeWidth={2.5} /> : <Copy size={18} strokeWidth={2} />}
              </button>
            </div>
            <button
              onClick={() => setResetResult(null)}
              style={{ width: "100%", background: "#16A34A", color: "white", border: "none", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
