"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Dashboard", roles: ["investor", "admin", "ciso"] as Role[] },
  { href: "/predict", label: "Predictions", roles: ["investor", "admin", "ciso"] as Role[] },
  { href: "/portfolio", label: "Portfolio", roles: ["investor"] as Role[] },
  { href: "/trades", label: "Trades", roles: ["investor"] as Role[] },
  { href: "/admin/users", label: "Users", roles: ["admin"] as Role[] },
  { href: "/ciso/audit", label: "Audit", roles: ["ciso"] as Role[] },
  { href: "/ciso/risk", label: "Risk", roles: ["ciso"] as Role[] },
  { href: "/profile", label: "Profile", roles: ["investor", "admin", "ciso"] as Role[] },
] as const;

const ROLE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  investor: { bg: "#DCFCE7", color: "#15803D", label: "Investor" },
  admin:    { bg: "#EFF6FF", color: "#1D4ED8", label: "Admin" },
  ciso:     { bg: "#FEF3C7", color: "#92400E", label: "CISO" },
};

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [showAlerts, setShowAlerts] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fetch unread alert count
  const { data: unreadData } = useQuery({
    queryKey: ["alerts-unread"],
    queryFn: async () => {
      try {
        return (await api.get("/alerts/unread-count")).data;
      } catch (error: any) {
        // Backward-compatible fallback for backend instances that don't expose /unread-count yet.
        if (error?.response?.status === 404) {
          const items = (await api.get("/alerts?limit=100")).data ?? [];
          const unread = Array.isArray(items)
            ? items.filter((a: any) => !a.is_read).length
            : 0;
          return { unread_count: unread };
        }
        throw error;
      }
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  // Fetch alerts list
  const { data: alertsData } = useQuery({
    queryKey: ["alerts-list"],
    queryFn: async () => {
      try {
        return (await api.get("/alerts?limit=10")).data;
      } catch (error: any) {
        if (error?.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: !!user && showAlerts,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user) {
      const match = links.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
      if (match && !match.roles.includes(user.role)) router.replace("/dashboard");
    }
  }, [loading, pathname, router, user]);

  // Close alerts on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#alerts-panel") && !target.closest("#alerts-btn")) {
        setShowAlerts(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch("/alerts/read-all");
    } catch {}
  };

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FDF4", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, border: "3px solid #4ADE80", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
        <p style={{ color: "#16A34A", fontWeight: 600, fontSize: 15 }}>Loading secure workspace...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const roleConfig = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.investor;
  const unreadCount = unreadData?.unread_count ?? 0;
  const alerts = alertsData ?? [];
  const visibleLinks = links.filter((l) => l.roles.includes(user.role));
  const initials = user.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "TF";

  const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
    low:      { color: "#15803D", bg: "#DCFCE7" },
    medium:   { color: "#92400E", bg: "#FEF3C7" },
    high:     { color: "#DC2626", bg: "#FEE2E2" },
    critical: { color: "white",   bg: "#7F1D1D" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .nav-link { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 14px; font-weight: 500; color: #374151; text-decoration: none; transition: all 0.15s; white-space: nowrap; }
        .nav-link:hover { background: #F0FDF4; color: #16A34A; }
        .nav-link.active { background: #DCFCE7; color: #15803D; font-weight: 600; }
        .alert-item { padding: 12px 16px; border-bottom: 1px solid #F3F4F6; transition: background 0.15s; cursor: pointer; }
        .alert-item:hover { background: #F9FAFB; }
        .alert-item:last-child { border-bottom: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .alerts-panel { animation: slideDown 0.2s ease; }
        .mobile-menu { animation: slideDown 0.2s ease; }
      `}</style>

      {/* Navbar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)"
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <Image src="/logo.png" alt="TradeFinlytix" width={36} height={36} style={{ objectFit: "contain" }}/>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#111827", letterSpacing: "-0.3px" }}>TradeFinlytix</span>
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center", flexWrap: "nowrap", overflow: "hidden" }}>
            {visibleLinks.map((l) => {
              const isActive = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link key={l.href} href={l.href} className={`nav-link ${isActive ? "active" : ""}`}>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

            {/* Alerts Bell */}
            <div style={{ position: "relative" }}>
              <button id="alerts-btn"
                onClick={() => { setShowAlerts(!showAlerts); if (!showAlerts) markAllRead(); }}
                style={{ position: "relative", width: 40, height: 40, borderRadius: 10, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4ADE80"; e.currentTarget.style.background = "#F0FDF4"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#DC2626", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Alerts Dropdown */}
              {showAlerts && (
                <div id="alerts-panel" className="alerts-panel" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 360, background: "white", border: "1.5px solid #E5E7EB", borderRadius: 16, boxShadow: "0 16px 40px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 100 }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{unreadCount} unread</span>
                  </div>

                  {alerts.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", color: "#9CA3AF" }}>
                      <div style={{ fontSize: 14 }}>No notifications yet</div>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {alerts.map((alert: any, i: number) => {
                        const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
                        return (
                          <div key={alert._id ?? i} className="alert-item">
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ background: sev.bg, color: sev.color, padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700, textTransform: "uppercase", flexShrink: 0, marginTop: 2 }}>
                                {alert.severity}
                              </span>
                              <div>
                                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{alert.message}</p>
                                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                                  {alert.created_at ? new Date(alert.created_at).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" }) : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ padding: "10px 16px", borderTop: "1px solid #F3F4F6", textAlign: "center" }}>
                    <button onClick={() => { markAllRead(); setShowAlerts(false); }}
                      style={{ fontSize: 13, color: "#16A34A", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Badge */}
            <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px", border: "1.5px solid #E5E7EB", borderRadius: 12, background: "white", textDecoration: "none", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4ADE80"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.2 }}>
                  {user.full_name?.split(" ")[0] ?? "User"}
                </div>
                <span style={{ background: roleConfig.bg, color: roleConfig.color, padding: "1px 6px", borderRadius: 100, fontSize: 10, fontWeight: 700 }}>
                  {roleConfig.label}
                </span>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={async () => { await logout(); router.push("/login"); }}
              style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#FECACA"; e.currentTarget.style.background = "#FEF2F2"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "white"; }}
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        <main>{children}</main>
      </div>
    </div>
  );
}
