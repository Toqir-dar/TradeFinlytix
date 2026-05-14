"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Shield, Lock, LogOut, CheckCircle2, KeyRound, MonitorSmartphone, User, Mail, CalendarDays } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [successMsg, setSuccessMsg] = useState("");

  const logoutAll = useMutation({
    mutationFn: async () => api.post("/auth/logout-all"),
    onSuccess: () => { logout(); }
  });

  const changePassword = useMutation({
    mutationFn: async () => api.post("/auth/change-password", {
      current_password: passwords.current,
      new_password: passwords.newPass,
    }),
    onSuccess: () => {
      setSuccessMsg("Password changed successfully!");
      setPasswords({ current: "", newPass: "", confirm: "" });
      setShowPasswordForm(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  });

  const ROLE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
    investor: { bg: "#DCFCE7", color: "#15803D", label: "Investor" },
    admin:    { bg: "#EFF6FF", color: "#1D4ED8", label: "Admin" },
    ciso:     { bg: "#FEF3C7", color: "#92400E", label: "CISO" },
  };
  const roleConfig = ROLE_CONFIG[user?.role ?? "investor"] ?? ROLE_CONFIG.investor;
  const initials = user?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "TF";
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-PK", { month: "long", year: "numeric" }) : "May 2026";

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827", maxWidth: 800 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
        .input-field { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: #9CA3AF; }
        .btn-primary { background: #16A34A; color: white; border: none; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-outline { background: white; color: #374151; border: 1.5px solid #E5E7EB; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-outline:hover { border-color: #D1D5DB; background: #F9FAFB; }
        .btn-danger { background: white; color: #DC2626; border: 1.5px solid #FECACA; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-danger:hover { background: #FEF2F2; border-color: #FCA5A5; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #F3F4F6; }
        .info-row:last-child { border-bottom: none; }
        @media (max-width: 640px) {
          .profile-header { flex-direction: column; align-items: flex-start; }
          .info-row { flex-direction: column; align-items: flex-start; gap: 6px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>
          My Profile
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Manage your account and security settings</p>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#15803D", display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} strokeWidth={2.5} />
          {successMsg}
        </div>
      )}

      {/* Profile Card */}
      <div className="section-card">
        <div className="profile-header" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 8px 20px rgba(74,222,128,0.3)" }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#111827" }}>
                {user?.full_name ?? "TradeFinlytix User"}
              </h2>
              <span style={{ background: roleConfig.bg, color: roleConfig.color, padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                {roleConfig.label}
              </span>
              {user?.is_active !== false && (
                <span style={{ background: "#DCFCE7", color: "#15803D", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                  ✓ Active
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>{user?.email ?? "user@tradefinlytix.com"}</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Member since {memberSince}</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="section-card">
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Account Information</h3>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Your account details</p>

        {[
          { label: "Full Name", value: user?.full_name ?? "—", Icon: User },
          { label: "Email Address", value: user?.email ?? "—", Icon: Mail },
          { label: "Role", value: roleConfig.label, Icon: Shield },
          { label: "Account Status", value: user?.is_active !== false ? "Active" : "Inactive", Icon: CheckCircle2 },
          { label: "Member Since", value: memberSince, Icon: CalendarDays },
        ].map(item => (
          <div key={item.label} className="info-row">
            <span style={{ fontSize: 14, color: "#6B7280", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <item.Icon size={14} color="#9CA3AF" strokeWidth={2} />
              {item.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="section-card">
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={16} color="#16A34A" strokeWidth={2} />
          Security Settings
        </h3>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Manage your password and sessions</p>

        {/* Change Password */}
        <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
                <KeyRound size={15} color="#374151" strokeWidth={2} /> Password
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Last changed recently</p>
            </div>
            <button className="btn-outline" onClick={() => setShowPasswordForm(!showPasswordForm)}>
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>

          {showPasswordForm && (
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Current Password</label>
                <input className="input-field" type="password" placeholder="••••••••"
                  value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>New Password</label>
                <input className="input-field" type="password" placeholder="••••••••"
                  value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}/>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Confirm New Password</label>
                <input className="input-field" type="password" placeholder="••••••••"
                  value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}/>
                {passwords.confirm && passwords.confirm !== passwords.newPass && (
                  <p style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
              <button className="btn-primary" style={{ alignSelf: "flex-start" }}
                onClick={() => changePassword.mutate()}
                disabled={!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm || changePassword.isPending}>
                {changePassword.isPending ? "Saving..." : "Update Password"}
              </button>
            </div>
          )}
        </div>

        {/* Sessions */}
        <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
                <MonitorSmartphone size={15} color="#374151" strokeWidth={2} /> Active Sessions
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Logout from all devices</p>
            </div>
            <button className="btn-danger" onClick={() => setShowLogoutConfirm(true)}>
              Logout All Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="section-card" style={{ border: "1.5px solid #FECACA" }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: "#DC2626", marginBottom: 4 }}>Session Management</h3>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 20 }}>Manage your current login session</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-outline" onClick={() => logout()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <LogOut size={15} strokeWidth={2} />
            Logout Current Session
          </button>
          <button className="btn-danger" onClick={() => setShowLogoutConfirm(true)}
            disabled={logoutAll.isPending}>
            {logoutAll.isPending ? "Logging out..." : "Logout All Devices"}
          </button>
        </div>
      </div>

      {/* Logout All Confirm Modal */}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, textAlign: "center", marginBottom: 8 }}>Logout All Sessions?</h3>
            <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
              You will be logged out from all devices including this one. You'll need to login again.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" style={{ flex: 1, justifyContent: "center", background: "#DC2626", color: "white", borderColor: "#DC2626" }}
                onClick={() => { logoutAll.mutate(); setShowLogoutConfirm(false); }}>
                Yes, Logout All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
