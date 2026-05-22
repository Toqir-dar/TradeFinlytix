"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useAdminUsers } from "@/lib/queries";
import { useTheme } from "@/lib/use-theme";
import { api } from "@/lib/api";
import { Users, UserCheck, UserX, Shield, Search, Copy, Check } from "lucide-react";


const ROLE_CONFIG: Record<string, { bg: string; color: string }> = {
  investor: { bg: "#DCFCE7", color: "#15803D" },
  admin:    { bg: "#EFF6FF", color: "#1D4ED8" },
  ciso:     { bg: "#FEF3C7", color: "#92400E" },
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const mono = useTheme();
  const { data, isLoading } = useAdminUsers();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    inputBg: "#111827",
    inputBorder: "#334155",
    filterBtnBg: "#111827",
    filterBtnBorder: "#334155",
    filterBtnColor: "#94a3b8",
    filterBtnActiveBg: "#f1f5f9",
    filterBtnActiveColor: "#111827",
    filterBtnActiveBorder: "#f1f5f9",
    rowHoverBg: "#111827",
    userLinkColor: "#f1f5f9",
    viewBtnBg: "#111827",
    viewBtnColor: "#94a3b8",
    viewBtnBorder: "#334155",
    footerBorder: "#334155",
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
    inputBg: "white",
    inputBorder: "#E5E7EB",
    filterBtnBg: "white",
    filterBtnBorder: "#E5E7EB",
    filterBtnColor: "#6B7280",
    filterBtnActiveBg: "#111827",
    filterBtnActiveColor: "white",
    filterBtnActiveBorder: "#111827",
    rowHoverBg: "#F9FAFB",
    userLinkColor: "#111827",
    viewBtnBg: "#F9FAFB",
    viewBtnColor: "#374151",
    viewBtnBorder: "#E5E7EB",
    footerBorder: "#F3F4F6",
  };

  const items: any[] = data?.items ?? [];

  const filtered = items.filter((u: any) => {
    if (u._id === user?._id || u.email === user?.email) return false;
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const totalActive = items.filter((u: any) => u.is_active).length;
  const totalInactive = items.filter((u: any) => !u.is_active).length;

  const toggleUser = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      api.post(`/admin/users/${id}/${active ? "deactivate" : "activate"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const resetPassword = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/users/${id}/reset-password`)).data,
    onSuccess: (result: any) => {
      setResetResult({ email: result.email, password: result.new_password });
      setCopied(false);
    },
  });

  if (user?.role !== "admin") return (
    <div style={{ textAlign: "center", padding: 48, color: th.muted }}>
      <div style={{ fontWeight: 600, fontSize: 18, color: th.text }}>Admin Access Required</div>
    </div>
  );

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: th.muted }}>
      <div style={{ textAlign: "center" }}>Loading users...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: th.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 16px; padding: 24px; transition: background 0.2s ease, border-color 0.2s ease; }
        .stat-card { background: ${th.card}; border: 1.5px solid ${th.border}; border-radius: 16px; padding: 22px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: ${mono ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.08)"}; transform: translateY(-2px); }
        .input-field { padding: 10px 14px; border: 1.5px solid ${th.inputBorder}; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: ${th.inputBg}; color: ${th.text}; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: ${th.muted}; }
        .filter-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid ${th.filterBtnBorder}; background: ${th.filterBtnBg}; color: ${th.filterBtnColor}; font-family: inherit; transition: all 0.2s; }
        .filter-btn.active { background: ${th.filterBtnActiveBg}; color: ${th.filterBtnActiveColor}; border-color: ${th.filterBtnActiveBorder}; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .user-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1.5fr; gap: 8px; padding: 14px 16px; border-bottom: 1px solid ${th.borderSubtle}; align-items: center; transition: background 0.15s; }
        .user-row:hover { background: ${th.rowHoverBg}; border-radius: 8px; }
        .user-row:last-child { border-bottom: none; }
        .action-btn { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1.5px solid; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6, color: th.heading }}>User Management</h1>
          <p style={{ fontSize: 14, color: th.bgSubtext }}>Manage all platform users and their access</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Users", value: items.length, sub: "Registered", Icon: Users, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
          { label: "Active Users", value: totalActive, sub: "Currently active", color: "#16A34A", Icon: UserCheck, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
          { label: "Deactivated", value: totalInactive, sub: "Inactive accounts", color: "#DC2626", Icon: UserX, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
          { label: "Admins", value: items.filter((u: any) => u.role === "admin").length, sub: "Admin role", color: "#1D4ED8", Icon: Shield, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: th.muted, fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.color ?? th.text }}>{s.value}</p>
                <p style={{ fontSize: 12, color: th.muted, marginTop: 4 }}>{s.sub}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: s.iconColor }}>
                <s.Icon size={18} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="section-card">
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.muted, display: "flex" }}>
              <Search size={14} strokeWidth={2} />
            </div>
            <input className="input-field" style={{ paddingLeft: 32, width: "100%" }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "investor", "admin", "ciso"].map(r => (
              <button key={r} className={`filter-btn ${roleFilter === r ? "active" : ""}`} onClick={() => setRoleFilter(r)}>
                {r === "all" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "active", "inactive"].map(s => (
              <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-scroll">
          <div className="table-min">
            {/* Table Header */}
            <div className="user-row" style={{ borderBottom: `2px solid ${th.borderSubtle}`, padding: "8px 16px" }}>
              {["User", "Email", "Role", "Status", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: th.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
              ))}
            </div>

            {filtered.map((u: any) => (
              <div key={u._id} className="user-row">
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                    {u.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/admin/users/${u._id}`} style={{ fontWeight: 700, fontSize: 14, color: th.userLinkColor, textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#16A34A"}
                      onMouseLeave={e => e.currentTarget.style.color = th.userLinkColor}>
                      {u.full_name}
                    </Link>
                    <div style={{ fontSize: 11, color: th.muted }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <span style={{ fontSize: 13, color: th.subtext }}>{u.email}</span>

                {/* Role */}
                <span className="chip" style={{ background: ROLE_CONFIG[u.role]?.bg ?? "#F3F4F6", color: ROLE_CONFIG[u.role]?.color ?? "#374151" }}>
                  {u.role}
                </span>

                {/* Status */}
                <span className="chip" style={{ background: u.is_active ? "#DCFCE7" : "#FEE2E2", color: u.is_active ? "#15803D" : "#991B1B" }}>
                  {u.is_active ? "Active" : "Inactive"}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Link href={`/admin/users/${u._id}`}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: th.viewBtnBg, color: th.viewBtnColor, border: `1.5px solid ${th.viewBtnBorder}`, textDecoration: "none", transition: "all 0.2s" }}>
                    View
                  </Link>
                  <button className="action-btn"
                    style={{ background: u.is_active ? "#FEF2F2" : "#F0FDF4", color: u.is_active ? "#DC2626" : "#16A34A", borderColor: u.is_active ? "#FECACA" : "#BBF7D0" }}
                    onClick={() => toggleUser.mutate({ id: u._id, active: u.is_active })}
                    disabled={toggleUser.isPending}>
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button className="action-btn"
                    style={{ background: "#FFFBEB", color: "#92400E", borderColor: "#FDE68A" }}
                    onClick={() => resetPassword.mutate(u._id)}
                    disabled={resetPassword.isPending}>
                    Reset PW
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 24px", color: th.muted }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: th.text }}>No users found</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>Try a different search or filter</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${th.footerBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: th.muted }}>Showing {filtered.length} of {items.length} users</span>
        </div>
      </div>

      {/* Password reset modal */}
      {resetResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: mono ? "#1e293b" : "white", border: `1px solid ${mono ? "#334155" : "#E5E7EB"}`, borderRadius: 20, padding: 32, maxWidth: 440, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, textAlign: "center", marginBottom: 6, color: mono ? "#f1f5f9" : "#111827" }}>Password Reset</h3>
            <p style={{ fontSize: 14, color: mono ? "#94a3b8" : "#6B7280", textAlign: "center", marginBottom: 20 }}>
              New password for <strong>{resetResult.email}</strong>. Copy it now — it won&apos;t be shown again.
            </p>
            <div style={{ background: mono ? "#111827" : "#F9FAFB", border: `1.5px solid ${mono ? "#334155" : "#E5E7EB"}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <code style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: mono ? "#4ade80" : "#16A34A", wordBreak: "break-all" }}>
                {resetResult.password}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(resetResult.password); setCopied(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#16A34A" : (mono ? "#64748b" : "#9CA3AF"), flexShrink: 0 }}>
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
