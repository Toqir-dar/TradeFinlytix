"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Shield, Lock, UserCheck, Loader2 } from "lucide-react";

const STORAGE_KEY = "tfx_theme";

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const DARK_TOKENS = {
  "--rp-right-bg":        "#0f172a",
  "--rp-text":            "#f1f5f9",
  "--rp-subtext":         "#94a3b8",
  "--rp-muted":           "#64748b",
  "--rp-label":           "#cbd5e1",
  "--rp-input-bg":        "#1e293b",
  "--rp-border":          "#334155",
  "--rp-trust-bg":        "#14532d",
  "--rp-trust-color":     "#4ade80",
  "--rp-border-top":      "#1e293b",
  "--rp-error-bg":        "#3f1515",
  "--rp-error-border":    "#7f1d1d",
  "--rp-error-text":      "#fca5a5",
  "--rp-strength-empty":  "#334155",
} as const;

const LIGHT_TOKENS = {
  "--rp-right-bg":        "#FAFAFA",
  "--rp-text":            "#111827",
  "--rp-subtext":         "#6B7280",
  "--rp-muted":           "#9CA3AF",
  "--rp-label":           "#374151",
  "--rp-input-bg":        "white",
  "--rp-border":          "#E5E7EB",
  "--rp-trust-bg":        "#F0FDF4",
  "--rp-trust-color":     "#16A34A",
  "--rp-border-top":      "#F3F4F6",
  "--rp-error-bg":        "#FEF2F2",
  "--rp-error-border":    "#FECACA",
  "--rp-error-text":      "#DC2626",
  "--rp-strength-empty":  "#E5E7EB",
} as const;

// ─── Static stylesheet — zero theme interpolation ─────────────────────────────
const STATIC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Inputs ── */
.rp-input {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--rp-border);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--rp-input-bg);
  color: var(--rp-text);
}
.rp-input:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.15); }
.rp-input::placeholder { color: var(--rp-muted); }

/* ── Submit button ── */
.rp-btn-submit {
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
.rp-btn-submit:hover:not(:disabled) {
  background: #15803D;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(22,163,74,0.3);
}
.rp-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Eye toggle ── */
.rp-eye-btn {
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  cursor: pointer;
  color: var(--rp-muted);
  min-height: 44px; min-width: 44px;
  display: flex; align-items: center; justify-content: center;
  padding: 4px;
  transition: color 0.15s;
}
.rp-eye-btn:hover { color: var(--rp-subtext); }

/* ── Alert ── */
.rp-alert-error {
  background: var(--rp-error-bg);
  border: 1px solid var(--rp-error-border);
  color: var(--rp-error-text);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 20px;
}

/* ── Trust badges ── */
.rp-trust-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--rp-border-top);
}

/* ── Animations ── */
.rp-fade-in { animation: rp-fadeUp 0.6s ease both; }
@keyframes rp-fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes rp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.rp-spinner { animation: rp-spin 1s linear infinite; }

/* ── Layout ── */
.rp-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}

.rp-left {
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

.rp-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 64px;
  background: var(--rp-right-bg);
  transition: background 0.2s;
  overflow-y: auto;
}

.rp-right-inner {
  width: 100%;
  max-width: 400px;
}

/* ── Mobile logo banner (hidden on desktop) ── */
.rp-mobile-banner {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
}

/* ════════════════════════════
   TABLET  ≤ 900px
════════════════════════════ */
@media (max-width: 900px) {
  .rp-left  { padding: 32px; }
  .rp-right { padding: 40px; }
}

/* ════════════════════════════
   MOBILE  ≤ 768px
════════════════════════════ */
@media (max-width: 768px) {
  .rp-left { display: none !important; }

  .rp-right {
    width: 100%;
    padding: 32px 20px 48px;
    justify-content: flex-start;
    min-height: 100vh;
  }

  .rp-right-inner { max-width: 100%; }

  .rp-mobile-banner { display: flex; }

  .rp-page-title { font-size: 28px !important; letter-spacing: -0.3px !important; }

  /* trust badges wrap karo mobile par */
  .rp-trust-row { gap: 16px; flex-wrap: wrap; }
}

/* ════════════════════════════
   SMALL MOBILE  ≤ 390px
════════════════════════════ */
@media (max-width: 390px) {
  .rp-right      { padding: 24px 16px 40px; }
  .rp-page-title { font-size: 24px !important; }
  /* iOS auto-zoom rok'na */
  .rp-input { font-size: 16px !important; }
}
`;

export default function RegisterPage() {
  const [form, setForm]         = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();

  // ── CSS variables — client-only, hydration-safe ───────────────────────────
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

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match!"); return; }
    setLoading(true); setError("");
    try {
      await register(form.email, form.password, form.name);
      router.push("/login");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength      = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = ["#E5E7EB", "#EF4444", "#F59E0B", "#16A34A"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];

  return (
    <>
      <style>{STATIC_CSS}</style>

      <div className="rp-wrapper">
        {/* ── Left panel ── */}
        <div className="rp-left">
          {/* grid bg */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none" }}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="rp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#rp-grid)"/>
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
          <div style={{ position: "relative", zIndex: 1 }} className="rp-fade-in">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
              Join thousands of<br/>smart PSX traders
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>
              Create a free account and access AI-powered PSX signals, portfolio tracking, and security tools.
            </p>

            {[
              "AI buy/hold/trim/sell signals for any PSX symbol",
              "Real-time portfolio P&L tracking",
              "Institutional-grade security & audit logs",
              "Role-based access for investor, admin & CISO",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#4ADE80", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, color: "#14532D" }}>
                  <CheckCircle2 size={14} strokeWidth={2.5}/>
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* testimonial */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#4ADE80", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#14532D", flexShrink: 0 }}>AK</div>
              <div>
                <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Amir Khan</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 }}>&quot;TradeFinlytix completely changed how I trade!&quot;</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="rp-right">
          <div className="rp-right-inner rp-fade-in">

            {/* Mobile logo */}
            <div className="rp-mobile-banner">
              <Image src="/logo.png" alt="TradeFinlytix" width={30} height={30} style={{ objectFit: "contain" }}/>
              <span style={{ color: "var(--rp-text)", fontWeight: 700, fontSize: 16 }}>TradeFinlytix</span>
            </div>

            <h1
              className="rp-page-title"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: "var(--rp-text)", marginBottom: 8, letterSpacing: "-0.5px" }}
            >
              Create your account
            </h1>
            <p style={{ fontSize: 15, color: "var(--rp-subtext)", marginBottom: 32 }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>

            {error && <div className="rp-alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--rp-label)", marginBottom: 6 }}>Full Name</label>
                <input
                  className="rp-input"
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => update("name", e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--rp-label)", marginBottom: 6 }}>Email Address</label>
                <input
                  className="rp-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => update("email", e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--rp-label)", marginBottom: 6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="rp-input"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => update("password", e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 52 }}
                  />
                  <button type="button" className="rp-eye-btn" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={18} strokeWidth={2}/> : <Eye size={18} strokeWidth={2}/>}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor : "var(--rp-strength-empty)", transition: "background 0.3s" }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--rp-label)", marginBottom: 6 }}>Confirm Password</label>
                <input
                  className="rp-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={e => update("confirm", e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ borderColor: form.confirm && form.confirm !== form.password ? "#EF4444" : undefined }}
                />
                {form.confirm && form.confirm !== form.password && (
                  <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>

              <button type="submit" className="rp-btn-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={18} strokeWidth={2} className="rp-spinner"/>Creating account...</>
                  : <>Create Account <ArrowRight size={16} strokeWidth={2}/></>}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 12, color: "var(--rp-muted)", marginTop: 20, lineHeight: 1.6 }}>
              By registering, you agree to our{" "}
              <Link href="/legal#terms-of-service" style={{ color: "#16A34A", textDecoration: "none" }}>Terms of Service</Link>{" "}
              and{" "}
              <Link href="/legal#privacy-policy" style={{ color: "#16A34A", textDecoration: "none" }}>Privacy Policy</Link>.
            </p>

            {/* Trust badges */}
            <div className="rp-trust-row">
              {[
                { label: "SSL Secure",     Icon: Lock },
                { label: "RBAC Protected", Icon: Shield },
                { label: "ISO Aligned",    Icon: UserCheck },
              ].map(({ label, Icon }) => (
                <div key={label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--rp-trust-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rp-trust-color)" }}>
                    <Icon size={14} strokeWidth={2}/>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--rp-muted)", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}