"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/use-theme";
import { api } from "@/lib/api";
import {
  Shield, Lock, LogOut, CheckCircle2, KeyRound,
  MonitorSmartphone, User, Mail, CalendarDays, AlertTriangle
} from "lucide-react";
import { ErrorState } from "@/components/ux-states";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const mono = useTheme();
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
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  });

  const ROLE_CONFIG: Record<string, { bg: string; color: string; label: string; darkBg: string; darkColor: string }> = {
    investor: { bg: "#DCFCE7", color: "#15803D", label: "Investor",  darkBg: "#14532d", darkColor: "#4ade80" },
    admin:    { bg: "#EFF6FF", color: "#1D4ED8", label: "Admin",     darkBg: "#1e3a8a", darkColor: "#93c5fd" },
    ciso:     { bg: "#FEF3C7", color: "#92400E", label: "CISO",      darkBg: "#451a03", darkColor: "#fcd34d" },
  };

  const tone = mono ? "dark" : "light";
  const roleConfig = ROLE_CONFIG[user?.role ?? "investor"] ?? ROLE_CONFIG.investor;
  const initials = user?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "TF";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-PK", { month: "long", year: "numeric" })
    : "May 2026";

  const th = mono ? {
    pageBg: "#080f1a",
    heroBg: "linear-gradient(135deg, #0f1f12 0%, #0a1628 50%, #0f1a0f 100%)",
    heroOverlay: "rgba(0,0,0,0.3)",
    heading: "#f1f5f9",
    text: "#e2e8f0",
    subtext: "#94a3b8",
    muted: "#64748b",
    labelColor: "#cbd5e1",
    card: "#111c2d",
    border: "#1e3048",
    borderSubtle: "#162033",
    innerCard: "#0c1524",
    infoRowBorder: "#162033",
    dangerCardBorder: "#7f1d1d",
    dangerTitle: "#f87171",
    modalBg: "#111c2d",
    modalBorder: "#1e3048",
    modalOverlay: "rgba(0,0,0,0.7)",
    outlineBtnBg: "transparent",
    outlineBtnBorder: "#1e3048",
    outlineBtnColor: "#94a3b8",
    dangerBtnBg: "transparent",
    dangerBtnBorder: "#7f1d1d",
    dangerBtnColor: "#f87171",
    successBg: "#052e16",
    successBorder: "#166534",
    successColor: "#4ade80",
    avatarShadow: "0 0 0 4px rgba(74,222,128,0.2), 0 0 40px rgba(74,222,128,0.15)",
    glowLine: "rgba(74,222,128,0.15)",
    roleBg: "#14532d",
    roleColor: "#4ade80",
    statBg: "rgba(255,255,255,0.04)",
    statBorder: "rgba(255,255,255,0.07)",
    inputBg: "#0c1524",
    sectionIconBg: "rgba(22,163,74,0.12)",
    sectionIconBorder: "rgba(22,163,74,0.2)",
  } : {
    pageBg: "#f0f4f8",
    heroBg: "linear-gradient(135deg, #064e18 0%, #15803D 40%, #166534 100%)",
    heroOverlay: "rgba(0,0,0,0.15)",
    heading: "#0f172a",
    text: "#111827",
    subtext: "#6B7280",
    muted: "#9CA3AF",
    labelColor: "#374151",
    card: "#ffffff",
    border: "#e2e8f0",
    borderSubtle: "#f1f5f9",
    innerCard: "#f8fafc",
    infoRowBorder: "#f1f5f9",
    dangerCardBorder: "#fecaca",
    dangerTitle: "#DC2626",
    modalBg: "#ffffff",
    modalBorder: "#e2e8f0",
    modalOverlay: "rgba(15,23,42,0.5)",
    outlineBtnBg: "#ffffff",
    outlineBtnBorder: "#e2e8f0",
    outlineBtnColor: "#374151",
    dangerBtnBg: "#ffffff",
    dangerBtnBorder: "#fecaca",
    dangerBtnColor: "#DC2626",
    successBg: "#f0fdf4",
    successBorder: "#bbf7d0",
    successColor: "#15803D",
    avatarShadow: "0 0 0 4px rgba(255,255,255,0.6), 0 8px 32px rgba(22,163,74,0.3)",
    glowLine: "rgba(22,163,74,0.2)",
    roleBg: "rgba(255,255,255,0.2)",
    roleColor: "#ffffff",
    statBg: "rgba(255,255,255,0.15)",
    statBorder: "rgba(255,255,255,0.25)",
    inputBg: "#ffffff",
    sectionIconBg: "#f0fdf4",
    sectionIconBorder: "#bbf7d0",
  };

  const infoItems = [
    { label: "Full Name",      value: user?.full_name ?? "—",                              Icon: User },
    { label: "Email Address",  value: user?.email ?? "—",                                  Icon: Mail },
    { label: "Role",           value: roleConfig.label,                                     Icon: Shield },
    { label: "Account Status", value: user?.is_active !== false ? "Active" : "Inactive",   Icon: CheckCircle2 },
    { label: "Member Since",   value: memberSince,                                          Icon: CalendarDays },
  ];

  return (
    <div suppressHydrationWarning style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: th.text,
      background: th.pageBg,
      minHeight: "100vh",
      width: "100%",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Page wrapper ── */
        .prof-wrap {
          width: 100%;
          padding: 0 0 60px;
        }

        /* ── Staggered entrance ── */
        .anim-in { opacity: 0; transform: translateY(18px); animation: slideUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.19s; }
        .delay-4 { animation-delay: 0.26s; }

        /* ── Hero banner ── */
        .hero-banner {
          background: ${th.heroBg};
          border-radius: 20px;
          padding: 48px 40px 36px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }
        .hero-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 90% -10%, rgba(74,222,128,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-banner::after {
          content: '';
          position: absolute;
          bottom: -60px; right: -60px;
          width: 220px; height: 220px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .hero-dots {
          position: absolute;
          top: 20px; right: 30px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          opacity: 0.15;
        }
        .hero-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: white;
        }
        .hero-inner {
          display: flex;
          align-items: center;
          gap: 28px;
          position: relative;
          z-index: 1;
        }

        /* ── Avatar ── */
        .avatar {
          width: 96px; height: 96px;
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 800;
          color: white;
          flex-shrink: 0;
          box-shadow: ${th.avatarShadow};
          letter-spacing: -1px;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .avatar:hover { transform: scale(1.06) rotate(-2deg); }

        /* ── Hero text ── */
        .hero-name {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          color: white;
          letter-spacing: -0.3px;
          line-height: 1.1;
          margin-bottom: 6px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }
        .hero-email {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin-bottom: 3px;
        }
        .hero-since {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
        }
        .hero-badges {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 12px;
        }
        .badge {
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .badge-role {
          background: ${th.roleBg};
          color: ${th.roleColor};
          border: 1px solid rgba(255,255,255,0.2);
        }
        .badge-active {
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* ── Stats strip ── */
        .stats-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          position: relative; z-index: 1;
        }
        .stat-box {
          background: ${th.statBg};
          border: 1px solid ${th.statBorder};
          border-radius: 14px;
          padding: 14px 18px;
          backdrop-filter: blur(4px);
          transition: background 0.2s;
        }
        .stat-box:hover { background: rgba(255,255,255,0.1); }
        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 15px;
          color: rgba(255,255,255,0.9);
          font-weight: 700;
        }

        /* ── Cards ── */
        .card {
          background: ${th.card};
          border: 1px solid ${th.border};
          border-radius: 20px;
          padding: 28px 32px;
          margin-bottom: 14px;
          transition: border-color 0.25s, box-shadow 0.25s;
          width: 100%;
        }
        .card:hover {
          border-color: ${mono ? "#2a4a3a" : "#b8e6cc"};
          box-shadow: 0 4px 24px ${th.glowLine};
        }
        .card-danger {
          border-color: ${th.dangerCardBorder} !important;
        }
        .card-danger:hover {
          border-color: ${mono ? "#ef4444" : "#fca5a5"} !important;
          box-shadow: 0 4px 24px rgba(220,38,38,0.08) !important;
        }

        /* ── Card header ── */
        .card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 6px;
        }
        .card-icon {
          width: 38px; height: 38px;
          border-radius: 11px;
          background: ${th.sectionIconBg};
          border: 1px solid ${th.sectionIconBorder};
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .card:hover .card-icon { transform: scale(1.08); }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: ${th.text};
        }
        .card-desc {
          font-size: 13px;
          color: ${th.muted};
          margin-bottom: 22px;
          padding-left: 52px;
          line-height: 1.5;
        }

        /* ── Info grid ── */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .info-tile {
          background: ${th.innerCard};
          border: 1px solid ${th.border};
          border-radius: 14px;
          padding: 16px 18px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .info-tile:hover { border-color: ${mono ? "#2a4a3a" : "#bbf7d0"}; transform: translateY(-1px); }
        .info-tile-label {
          font-size: 11px;
          color: ${th.muted};
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .info-tile-value {
          font-size: 14px;
          font-weight: 600;
          color: ${th.text};
        }
        @media (max-width: 560px) {
          .info-grid { grid-template-columns: 1fr; }
          .hero-inner { flex-direction: column; align-items: flex-start; }
          .stats-strip { grid-template-columns: 1fr 1fr; }
          .hero-banner { padding: 32px 24px 28px; }
          .card { padding: 20px 18px; }
        }

        /* ── Inner security blocks ── */
        .sec-block {
          background: ${th.innerCard};
          border: 1px solid ${th.border};
          border-radius: 16px;
          padding: 20px 22px;
          transition: border-color 0.2s;
        }
        .sec-block + .sec-block { margin-top: 10px; }
        .sec-block:hover { border-color: ${mono ? "#2a4a3a" : "#bbf7d0"}; }
        .sec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sec-row-title {
          font-size: 14px;
          font-weight: 600;
          color: ${th.text};
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 3px;
        }
        .sec-row-sub { font-size: 12px; color: ${th.muted}; }

        /* ── Inputs ── */
        .input-field {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid ${th.border};
          border-radius: 11px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: all 0.2s;
          background: ${th.inputBg};
          color: ${th.text};
        }
        .input-field:focus {
          border-color: #4ADE80;
          box-shadow: 0 0 0 3px rgba(74,222,128,0.12);
        }
        .input-field::placeholder { color: ${th.muted}; }
        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: ${th.labelColor};
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .pw-form {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid ${th.border};
          display: flex;
          flex-direction: column;
          gap: 14px;
          animation: slideUp 0.25s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* ── Buttons ── */
        .btn-primary {
          background: linear-gradient(135deg, #16A34A, #15803D);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 2px 10px rgba(22,163,74,0.25);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(22,163,74,0.4);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-outline {
          background: ${th.outlineBtnBg};
          color: ${th.outlineBtnColor};
          border: 1.5px solid ${th.outlineBtnBorder};
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .btn-outline:hover {
          border-color: #4ADE80;
          color: #16A34A;
          background: ${mono ? "rgba(22,163,74,0.08)" : "rgba(22,163,74,0.04)"};
        }

        .btn-danger {
          background: ${th.dangerBtnBg};
          color: ${th.dangerBtnColor};
          border: 1.5px solid ${th.dangerBtnBorder};
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .btn-danger:hover {
          background: ${mono ? "rgba(239,68,68,0.1)" : "#fff5f5"};
          border-color: ${mono ? "#ef4444" : "#fca5a5"};
        }
        .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Success toast ── */
        .success-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          background: ${th.successBg};
          border: 1px solid ${th.successBorder};
          border-radius: 14px;
          padding: 14px 18px;
          font-size: 14px;
          color: ${th.successColor};
          margin-bottom: 16px;
          animation: slideUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: ${th.modalOverlay};
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 24px;
          animation: fadeIn 0.18s ease forwards;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box {
          background: ${th.modalBg};
          border: 1px solid ${th.modalBorder};
          border-radius: 26px;
          padding: 40px 36px;
          max-width: 400px; width: 100%;
          box-shadow: 0 40px 100px rgba(0,0,0,0.3);
          animation: popIn 0.25s cubic-bezier(0.34,1.5,0.64,1) forwards;
        }
        @keyframes popIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-icon {
          width: 60px; height: 60px;
          background: ${mono ? "rgba(239,68,68,0.12)" : "#fff5f5"};
          border: 1px solid ${mono ? "#7f1d1d" : "#fecaca"};
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 22px;
        }
        .modal-title {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          text-align: center;
          color: ${th.text};
          margin-bottom: 10px;
        }
        .modal-desc {
          font-size: 14px;
          color: ${th.subtext};
          text-align: center;
          line-height: 1.7;
          margin-bottom: 28px;
        }
        .modal-actions {
          display: flex; gap: 10px;
        }
        @media (max-width: 420px) {
          .modal-actions { flex-direction: column; }
          .modal-box { padding: 30px 22px; }
        }
      `}</style>

      <div className="prof-wrap">

        {/* ── Success toast ── */}
        {successMsg && (
          <div className="success-toast">
            <CheckCircle2 size={17} strokeWidth={2.5} />
            {successMsg}
          </div>
        )}

        {/* ══ HERO BANNER ══ */}
        <div className="hero-banner anim-in">
          {/* Decorative dots */}
          <div className="hero-dots">
            {Array.from({ length: 25 }).map((_, i) => <div key={i} className="hero-dot" />)}
          </div>

          <div className="hero-inner">
            <div className="avatar">{initials}</div>
            <div>
              <h1 className="hero-name">{user?.full_name ?? "TradeFinlytix User"}</h1>
              <p className="hero-email">{user?.email ?? "user@tradefinlytix.com"}</p>
              <p className="hero-since">Member since {memberSince}</p>
              <div className="hero-badges">
                <span className="badge badge-role">{roleConfig.label}</span>
                {user?.is_active !== false && (
                  <span className="badge badge-active">
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="stats-strip">
            <div className="stat-box">
              <div className="stat-label">Role</div>
              <div className="stat-value">{roleConfig.label}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ color: "#4ade80" }}>
                {user?.is_active !== false ? "Active" : "Inactive"}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Since</div>
              <div className="stat-value">{memberSince}</div>
            </div>
          </div>
        </div>

        {/* ══ ACCOUNT INFO ══ */}
        <div className="card anim-in delay-1">
          <div className="card-header">
            <div className="card-icon">
              <User size={16} color="#16A34A" strokeWidth={2} />
            </div>
            <span className="card-title">Account Information</span>
          </div>
          <p className="card-desc">Your personal account details</p>

          <div className="info-grid">
            {infoItems.map((item, i) => (
              <div
                key={item.label}
                className="info-tile"
                style={{ gridColumn: i === infoItems.length - 1 && infoItems.length % 2 !== 0 ? "1 / -1" : undefined }}
              >
                <div className="info-tile-label">
                  <item.Icon size={11} color={th.muted} strokeWidth={2} />
                  {item.label}
                </div>
                <div className="info-tile-value">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ SECURITY ══ */}
        <div className="card anim-in delay-2">
          <div className="card-header">
            <div className="card-icon">
              <Lock size={16} color="#16A34A" strokeWidth={2} />
            </div>
            <span className="card-title">Security Settings</span>
          </div>
          <p className="card-desc">Manage your password and active sessions</p>

          {/* Password block */}
          <div className="sec-block">
            <div className="sec-row">
              <div>
                <div className="sec-row-title">
                  <KeyRound size={14} color={th.muted} strokeWidth={2} />
                  Password
                </div>
                <div className="sec-row-sub">Last changed recently</div>
              </div>
              <button className="btn-outline" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {showPasswordForm && (
              <div className="pw-form">
                {[
                  { id: "cur-pw",  label: "Current Password",     key: "current", auto: "current-password" },
                  { id: "new-pw",  label: "New Password",         key: "newPass", auto: "new-password" },
                  { id: "con-pw",  label: "Confirm New Password", key: "confirm", auto: "new-password" },
                ].map(f => (
                  <div key={f.id}>
                    <label className="form-label" htmlFor={f.id}>{f.label}</label>
                    <input
                      id={f.id}
                      className="input-field"
                      type="password"
                      autoComplete={f.auto}
                      placeholder="••••••••"
                      value={passwords[f.key as keyof typeof passwords]}
                      onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                    {f.key === "confirm" && passwords.confirm && passwords.confirm !== passwords.newPass && (
                      <p role="alert" style={{ fontSize: 12, color: "#ef4444", marginTop: 5 }}>
                        Passwords do not match
                      </p>
                    )}
                  </div>
                ))}
                <button
                  className="btn-primary"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => changePassword.mutate()}
                  disabled={!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm || changePassword.isPending}
                  aria-busy={changePassword.isPending}
                >
                  {changePassword.isPending ? "Saving…" : "Update Password"}
                </button>
                {changePassword.isError && (
                  <ErrorState tone={tone} title="Password update failed" message="Check your current password and try again." onRetry={() => changePassword.mutate()} />
                )}
              </div>
            )}
          </div>

          {/* Sessions block */}
          <div className="sec-block">
            <div className="sec-row">
              <div>
                <div className="sec-row-title">
                  <MonitorSmartphone size={14} color={th.muted} strokeWidth={2} />
                  Active Sessions
                </div>
                <div className="sec-row-sub">Sign out from all your devices remotely</div>
              </div>
              <button className="btn-danger" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut size={14} strokeWidth={2} />
                Logout All Devices
              </button>
            </div>
          </div>
        </div>

        {/* ══ SESSION MANAGEMENT ══ */}
        <div className="card card-danger anim-in delay-3">
          <div className="card-header">
            <div className="card-icon" style={{ background: mono ? "rgba(239,68,68,0.1)" : "#fff5f5", border: `1px solid ${mono ? "#7f1d1d" : "#fecaca"}` }}>
              <AlertTriangle size={16} color={th.dangerTitle} strokeWidth={2} />
            </div>
            <span className="card-title" style={{ color: th.dangerTitle }}>Session Management</span>
          </div>
          <p className="card-desc">Manage your current login session</p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn-outline" onClick={() => logout()}>
              <LogOut size={14} strokeWidth={2} />
              Logout This Device
            </button>
            <button
              className="btn-danger"
              onClick={() => setShowLogoutConfirm(true)}
              disabled={logoutAll.isPending}
              aria-busy={logoutAll.isPending}
            >
              <MonitorSmartphone size={14} strokeWidth={2} />
              {logoutAll.isPending ? "Logging out…" : "Logout All Devices"}
            </button>
          </div>
        </div>

      </div>{/* /prof-wrap */}

      {/* ══ MODAL ══ */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">
              <LogOut size={26} color={th.dangerTitle} strokeWidth={2} />
            </div>
            <h3 className="modal-title">Logout All Sessions?</h3>
            <p className="modal-desc">
              You will be signed out from all devices, including this one. You&apos;ll need to log in again.
            </p>
            <div className="modal-actions">
              <button className="btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button
                style={{
                  flex: 1, justifyContent: "center",
                  background: "linear-gradient(135deg, #DC2626, #b91c1c)",
                  color: "white", border: "none",
                  padding: "10px 20px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex", alignItems: "center", gap: 7,
                  transition: "all 0.2s",
                  boxShadow: "0 2px 10px rgba(220,38,38,0.3)",
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(220,38,38,0.45)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(220,38,38,0.3)")}
                onClick={() => { logoutAll.mutate(); setShowLogoutConfirm(false); }}
              >
                <LogOut size={14} strokeWidth={2} />
                Yes, Logout All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}