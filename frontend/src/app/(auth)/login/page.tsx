"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { Eye, EyeOff, ArrowRight, Lock, Shield, UserCheck, Loader2 } from "lucide-react";

const STORAGE_KEY = "tfx_theme";

// ─── Theme tokens (CSS custom properties) ────────────────────────────────────
const DARK_TOKENS = {
  "--lp-right-bg":           "#0f172a",
  "--lp-text":               "#f1f5f9",
  "--lp-subtext":            "#94a3b8",
  "--lp-muted":              "#64748b",
  "--lp-label":              "#cbd5e1",
  "--lp-input-bg":           "#1e293b",
  "--lp-border":             "#334155",
  "--lp-divider":            "#334155",
  "--lp-social-bg":          "#1e293b",
  "--lp-social-border":      "#334155",
  "--lp-social-text":        "#cbd5e1",
  "--lp-social-hover-bg":    "#263148",
  "--lp-social-hover-border":"#475569",
  "--lp-trust-bg":           "#14532d",
  "--lp-trust-color":        "#4ade80",
  "--lp-border-top":         "#1e293b",
  "--lp-error-bg":           "#3f1515",
  "--lp-error-border":       "#7f1d1d",
  "--lp-error-text":         "#fca5a5",
} as const;

const LIGHT_TOKENS = {
  "--lp-right-bg":           "#FAFAFA",
  "--lp-text":               "#111827",
  "--lp-subtext":            "#6B7280",
  "--lp-muted":              "#9CA3AF",
  "--lp-label":              "#374151",
  "--lp-input-bg":           "white",
  "--lp-border":             "#E5E7EB",
  "--lp-divider":            "#E5E7EB",
  "--lp-social-bg":          "white",
  "--lp-social-border":      "#E5E7EB",
  "--lp-social-text":        "#374151",
  "--lp-social-hover-bg":    "#F9FAFB",
  "--lp-social-hover-border":"#D1D5DB",
  "--lp-trust-bg":           "#F0FDF4",
  "--lp-trust-color":        "#16A34A",
  "--lp-border-top":         "#F3F4F6",
  "--lp-error-bg":           "#FEF2F2",
  "--lp-error-border":       "#FECACA",
  "--lp-error-text":         "#DC2626",
} as const;

// ─── Static stylesheet — zero theme interpolation ────────────────────────────
const STATIC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Inputs ── */
.lp-input {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--lp-border);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--lp-input-bg);
  color: var(--lp-text);
}
.lp-input:focus  { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.15); }
.lp-input::placeholder { color: var(--lp-muted); }

/* ── Submit ── */
.lp-btn-submit {
  width: 100%;
  min-height: 48px;
  padding: 14px;
  background: #16A34A;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.lp-btn-submit:hover:not(:disabled) {
  background: #15803D;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(22,163,74,0.3);
}
.lp-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Social button ── */
.lp-btn-social {
  width: 100%;
  min-height: 48px;
  padding: 12px;
  background: var(--lp-social-bg);
  border: 1.5px solid var(--lp-social-border);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--lp-social-text);
}
.lp-btn-social:hover:not(:disabled) {
  background: var(--lp-social-hover-bg);
  border-color: var(--lp-social-hover-border);
}
.lp-btn-social:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Eye toggle ── */
.lp-eye-btn {
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  cursor: pointer;
  color: var(--lp-muted);
  min-height: 44px; min-width: 44px;
  display: flex; align-items: center; justify-content: center;
  padding: 4px;
  transition: color 0.15s;
}
.lp-eye-btn:hover { color: var(--lp-subtext); }

/* ── Alerts ── */
.lp-alert-error {
  background: var(--lp-error-bg);
  border: 1px solid var(--lp-error-border);
  color: var(--lp-error-text);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 20px;
}

/* ── Animations ── */
.lp-fade-in { animation: lp-fadeUp 0.6s ease both; }
@keyframes lp-fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lp-float { animation: lp-float 5s ease-in-out infinite; }
@keyframes lp-float {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}
.lp-ticker { display: flex; gap: 28px; animation: lp-ticker 18s linear infinite; white-space: nowrap; }
@keyframes lp-ticker {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes lp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.lp-spinner { animation: lp-spin 1s linear infinite; }

/* ── Layout ── */
.lp-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}

.lp-left {
  width: 50%;
  flex-shrink: 0;
  background: linear-gradient(145deg, #052e16 0%, #14532d 50%, #166534 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 48px;
  position: relative;
  overflow: hidden;
}

.lp-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 64px;
  background: var(--lp-right-bg);
  transition: background 0.2s;
  overflow-y: auto;
}

.lp-right-inner {
  width: 100%;
  max-width: 400px;
}

/* ── Mobile brand banner (hidden on desktop) ── */
.lp-mobile-banner {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
}

/* ── Trust badges row ── */
.lp-trust-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--lp-border-top);
}

/* ════════════════════════════
   TABLET  ≤ 900px
════════════════════════════ */
@media (max-width: 900px) {
  .lp-left  { padding: 32px; }
  .lp-right { padding: 40px; }
}

/* ════════════════════════════
   MOBILE  ≤ 768px
════════════════════════════ */
@media (max-width: 768px) {
  .lp-left { display: none !important; }

  .lp-right {
    width: 100%;
    padding: 32px 20px 48px;
    justify-content: flex-start;
    min-height: 100vh;
  }

  .lp-right-inner { max-width: 100%; }

  /* show mobile logo */
  .lp-mobile-banner { display: flex; }

  .lp-page-title { font-size: 28px !important; letter-spacing: -0.3px !important; }

  /* trust badges: wrap on mobile */
  .lp-trust-row { gap: 16px; flex-wrap: wrap; }
}

/* ════════════════════════════
   SMALL MOBILE  ≤ 390px
════════════════════════════ */
@media (max-width: 390px) {
  .lp-right      { padding: 24px 16px 40px; }
  .lp-page-title { font-size: 24px !important; }
  /* prevent iOS auto-zoom */
  .lp-input { font-size: 16px !important; }
}
`;

export default function LoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]           = useState("");

  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  // ── Apply CSS variables whenever theme changes (client-only) ──────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyTheme = () => {
      const isMono =
        document.documentElement.classList.contains("tfx-mono") ||
        localStorage.getItem(STORAGE_KEY) === "mono";
      const tokens = isMono ? DARK_TOKENS : LIGHT_TOKENS;
      Object.entries(tokens).forEach(([k, v]) =>
        document.documentElement.style.setProperty(k, v)
      );
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const googleError = new URLSearchParams(window.location.search).get("error");
    if (googleError?.startsWith("google_")) {
      setError("Google sign-in failed. Please try again.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError("");
    window.location.href = `${API_BASE}/api/v1/auth/google/login?next=${encodeURIComponent("/dashboard")}`;
  };

  return (
    <>
      <style>{STATIC_CSS}</style>

      <div className="lp-wrapper">
        {/* ── Left panel ── */}
        <div className="lp-left">
          {/* grid bg */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none" }}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="lp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lp-grid)"/>
            </svg>
          </div>
          <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(74,222,128,0.1)", pointerEvents: "none" }}/>
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(74,222,128,0.08)", pointerEvents: "none" }}/>

          {/* logo */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <Image src="/logo.png" alt="TradeFinlytix" width={44} height={44} style={{ objectFit: "contain" }}/>
              <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>TradeFinlytix</span>
            </Link>
          </div>

          {/* hero */}
          <div style={{ position: "relative", zIndex: 1 }} className="lp-fade-in">
            <div style={{ display: "inline-block", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ADE80", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, marginBottom: 24 }}>
              Pakistan Stock Exchange
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
              Your edge in<br/>PSX markets
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>
              AI-powered signals, portfolio intelligence, and institutional security — all in one platform.
            </p>

            <div style={{ display: "flex", gap: 32 }}>
              {[["10K+", "Investors"], ["550+", "PSX Symbols"], ["99.9%", "Uptime"]].map(([val, label]) => (
                <div key={label}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ADE80" }}>{val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="lp-float" style={{ marginTop: 48, background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: 20, maxWidth: 320 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>OGDC</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Oil & Gas Dev. Corp</div>
                </div>
                <div style={{ background: "#4ADE80", color: "#14532D", padding: "5px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12 }}>BUY</div>
              </div>
              <svg viewBox="0 0 280 60" style={{ width: "100%", height: 50 }}>
                <defs>
                  <linearGradient id="lp-lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#4ADE80" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,50 L0,42 C20,38 35,44 55,32 C75,20 90,28 110,18 C130,8 145,14 165,6 C185,0 200,8 220,4 L280,0 L280,60 L0,60 Z" fill="url(#lp-lg)"/>
                <path d="M0,42 C20,38 35,44 55,32 C75,20 90,28 110,18 C130,8 145,14 165,6 C185,0 200,8 220,4 L280,0" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {[["Confidence", "81.4%"], ["Target", "PKR 127.5"], ["Risk", "Medium"]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ticker */}
          <div style={{ position: "relative", zIndex: 1, overflow: "hidden" }}>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              <div className="lp-ticker" style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
                {["OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%",
                  "OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%",
                ].map((t, i) => <span key={i} style={{ marginRight: 32 }}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="lp-right">
          <div className="lp-right-inner lp-fade-in">

            {/* Mobile logo */}
            <div className="lp-mobile-banner">
              <Image src="/logo.png" alt="TradeFinlytix" width={30} height={30} style={{ objectFit: "contain" }}/>
              <span style={{ color: "var(--lp-text)", fontWeight: 700, fontSize: 16 }}>TradeFinlytix</span>
            </div>

            <h1
              className="lp-page-title"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "var(--lp-text)", marginBottom: 8, letterSpacing: "-0.5px" }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 15, color: "var(--lp-subtext)", marginBottom: 36 }}>
              Sign in to your account or{" "}
              <Link href="/register" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>
                create one
              </Link>
            </p>

            {error && <div className="lp-alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--lp-label)", marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  className="lp-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--lp-label)", marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className="lp-input"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: 52 }}
                  />
                  <button type="button" className="lp-eye-btn" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={18} strokeWidth={2}/> : <Eye size={18} strokeWidth={2}/>}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "right", marginBottom: 24 }}>
                <Link href="/forgot-password" style={{ fontSize: 13, color: "#16A34A", fontWeight: 500, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="lp-btn-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={18} strokeWidth={2} className="lp-spinner"/>Signing in...</>
                  : <>Login to Dashboard <ArrowRight size={16} strokeWidth={2}/></>}
              </button>
            </form>

            {/* divider */}
            <div style={{ display: "flex", gap: 12, margin: "24px 0", alignItems: "center" }}>
              <div style={{ flex: 1, height: 1, background: "var(--lp-divider)" }}/>
              <span style={{ fontSize: 13, color: "var(--lp-muted)", whiteSpace: "nowrap" }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "var(--lp-divider)" }}/>
            </div>

            <div style={{ marginBottom: 32 }}>
              <button type="button" className="lp-btn-social" onClick={handleGoogleLogin} disabled={googleLoading}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Opening Google…" : "Continue with Google"}
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: 14, color: "var(--lp-subtext)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>
                Register now →
              </Link>
            </p>

            {/* Trust badges */}
            <div className="lp-trust-row">
              {[
                { label: "SSL Secure",     Icon: Lock },
                { label: "RBAC Protected", Icon: Shield },
                { label: "ISO Aligned",    Icon: UserCheck },
              ].map(({ label, Icon }) => (
                <div key={label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--lp-trust-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--lp-trust-color)" }}>
                    <Icon size={14} strokeWidth={2}/>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--lp-muted)", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}