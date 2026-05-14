"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useAdminUsers } from "@/lib/queries";
import { api } from "@/lib/api";
import { Users, UserCheck, UserX, Shield, Search } from "lucide-react";

const MOCK_USERS = [
  { _id: "1", full_name: "Ahmed Khan", email: "ahmed@example.com", role: "investor", is_active: true, created_at: "2026-01-15T10:00:00Z" },
  { _id: "2", full_name: "Sara Malik", email: "sara@example.com", role: "investor", is_active: true, created_at: "2026-02-20T10:00:00Z" },
  { _id: "3", full_name: "Usman Ali", email: "usman@example.com", role: "admin", is_active: true, created_at: "2026-01-01T10:00:00Z" },
  { _id: "4", full_name: "Fatima Zahra", email: "fatima@example.com", role: "investor", is_active: false, created_at: "2026-03-10T10:00:00Z" },
  { _id: "5", full_name: "Bilal Hassan", email: "bilal@example.com", role: "ciso", is_active: true, created_at: "2026-01-05T10:00:00Z" },
  { _id: "6", full_name: "Ayesha Siddiqi", email: "ayesha@example.com", role: "investor", is_active: true, created_at: "2026-04-01T10:00:00Z" },
  { _id: "7", full_name: "Zain Raza", email: "zain@example.com", role: "investor", is_active: false, created_at: "2026-02-14T10:00:00Z" },
  { _id: "8", full_name: "Hina Baig", email: "hina@example.com", role: "investor", is_active: true, created_at: "2026-05-01T10:00:00Z" },
];

const ROLE_CONFIG: Record<string, { bg: string; color: string }> = {
  investor: { bg: "#DCFCE7", color: "#15803D" },
  admin:    { bg: "#EFF6FF", color: "#1D4ED8" },
  ciso:     { bg: "#FEF3C7", color: "#92400E" },
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { data, isLoading } = useAdminUsers();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const items = data?.items?.length ? data.items : MOCK_USERS;

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
    mutationFn: async (id: string) => api.post(`/admin/users/${id}/reset-password`),
  });

  if (user?.role !== "admin") return (
    <div style={{ textAlign: "center", padding: 48, color: "#9CA3AF" }}>
      <div style={{ fontWeight: 600, fontSize: 18, color: "#374151" }}>Admin Access Required</div>
    </div>
  );

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9CA3AF" }}>
      <div style={{ textAlign: "center" }}>
        Loading users...
      </div>
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
        .input-field { padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: #9CA3AF; }
        .filter-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid #E5E7EB; background: white; color: #6B7280; font-family: inherit; transition: all 0.2s; }
        .filter-btn.active { background: #111827; color: white; border-color: #111827; }
        .chip { display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .user-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1.5fr; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; transition: background 0.15s; }
        .user-row:hover { background: #F9FAFB; border-radius: 8px; }
        .user-row:last-child { border-bottom: none; }
        .action-btn { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; border: 1.5px solid; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>User Management</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Manage all platform users and their access</p>
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
                <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.color ?? "#111827" }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.sub}</p>
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
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", display: "flex" }}>
              <Search size={14} strokeWidth={2} />
            </div>
            <input className="input-field" style={{ paddingLeft: 32, width: "100%" }} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}/>
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
            <div className="user-row" style={{ borderBottom: "2px solid #F3F4F6", padding: "8px 16px" }}>
              {["User", "Email", "Role", "Status", "Actions"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
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
                    <Link href={`/admin/users/${u._id}`} style={{ fontWeight: 700, fontSize: 14, color: "#111827", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#16A34A"}
                      onMouseLeave={e => e.currentTarget.style.color = "#111827"}>
                      {u.full_name}
                    </Link>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <span style={{ fontSize: 13, color: "#6B7280" }}>{u.email}</span>

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
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#F9FAFB", color: "#374151", border: "1.5px solid #E5E7EB", textDecoration: "none", transition: "all 0.2s" }}>
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
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>No users found</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>Try a different search or filter</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>Showing {filtered.length} of {items.length} users</span>
        </div>
      </div>
    </div>
  );
}
