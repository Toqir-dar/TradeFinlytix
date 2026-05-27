"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/use-theme";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, CheckCircle2 } from "lucide-react";

type Step = "email" | "otp" | "password" | "done";

function getApiError(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

// ─── Theme tokens ────────────────────────────────────────────────────────────
const DARK_TOKENS = {
  "--fp-right-bg":        "#0f172a",
  "--fp-text":            "#f1f5f9",
  "--fp-subtext":         "#94a3b8",
  "--fp-muted":           "#64748b",
  "--fp-label":           "#cbd5e1",
  "--fp-input-bg":        "#1e293b",
  "--fp-input-disabled":  "#111827",
  "--fp-border":          "#334155",
  "--fp-strength-empty":  "#334155",
  "--fp-error-bg":        "#450a0a",
  "--fp-error-border":    "#991b1b",
  "--fp-error-text":      "#fca5a5",
  "--fp-success-bg":      "#052e16",
  "--fp-success-border":  "#166534",
  "--fp-success-text":    "#4ade80",
  "--fp-ghost":           "#4ade80",
  "--fp-ghost-disabled":  "#64748b",
  "--fp-eye":             "#64748b",
  "--fp-link":            "#4ade80",
  "--fp-bottom-text":     "#94a3b8",
  "--fp-mismatch":        "#f87171",
  "--fp-banner-bg":       "rgba(74,222,128,0.08)",
  "--fp-banner-border":   "rgba(74,222,128,0.2)",
} as const;

const LIGHT_TOKENS = {
  "--fp-right-bg":        "#FAFAFA",
  "--fp-text":            "#111827",
  "--fp-subtext":         "#6B7280",
  "--fp-muted":           "#9CA3AF",
  "--fp-label":           "#374151",
  "--fp-input-bg":        "white",
  "--fp-input-disabled":  "#F3F4F6",
  "--fp-border":          "#E5E7EB",
  "--fp-strength-empty":  "#E5E7EB",
  "--fp-error-bg":        "#FEF2F2",
  "--fp-error-border":    "#FECACA",
  "--fp-error-text":      "#DC2626",
  "--fp-success-bg":      "#F0FDF4",
  "--fp-success-border":  "#BBF7D0",
  "--fp-success-text":    "#15803D",
  "--fp-ghost":           "#16A34A",
  "--fp-ghost-disabled":  "#9CA3AF",
  "--fp-eye":             "#9CA3AF",
  "--fp-link":            "#16A34A",
  "--fp-bottom-text":     "#6B7280",
  "--fp-mismatch":        "#EF4444",
  "--fp-banner-bg":       "rgba(22,163,74,0.06)",
  "--fp-banner-border":   "rgba(22,163,74,0.2)",
} as const;

// ─── Static stylesheet (no theme interpolation) ──────────────────────────────
const STATIC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Inputs ── */
.fp-input {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--fp-border);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  background: var(--fp-input-bg);
  color: var(--fp-text);
}
.fp-input:focus {
  border-color: #4ADE80;
  box-shadow: 0 0 0 3px rgba(74,222,128,0.15);
}
.fp-input:disabled {
  background: var(--fp-input-disabled);
  color: var(--fp-muted);
  cursor: not-allowed;
}
.fp-input::placeholder { color: var(--fp-muted); }

/* ── Submit button ── */
.fp-btn-submit {
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
.fp-btn-submit:hover:not(:disabled) {
  background: #15803D;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(22,163,74,0.3);
}
.fp-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Ghost button ── */
.fp-btn-ghost {
  border: none;
  background: transparent;
  color: var(--fp-ghost);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
  min-height: 44px;
  padding: 8px 4px;
}
.fp-btn-ghost:disabled { color: var(--fp-ghost-disabled); cursor: not-allowed; }

/* ── Eye toggle ── */
.fp-eye-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fp-eye);
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

/* ── Alerts ── */
.fp-alert-error {
  background: var(--fp-error-bg);
  border: 1px solid var(--fp-error-border);
  color: var(--fp-error-text);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 18px;
}
.fp-alert-success {
  background: var(--fp-success-bg);
  border: 1px solid var(--fp-success-border);
  color: var(--fp-success-text);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Animations ── */
.fp-fade-in { animation: fp-fadeUp 0.5s ease both; }
@keyframes fp-fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.fp-spinner { animation: fp-spin 1s linear infinite; }

/* ── Layout ── */
.fp-wrapper {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}

.fp-left {
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

.fp-right {
  flex: 1;
  background: var(--fp-right-bg);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60px 64px;
  overflow-y: auto;
  transition: background 0.2s;
}

.fp-right-inner {
  width: 100%;
  max-width: 420px;
}

/* ── Mobile brand banner (hidden on desktop) ── */
.fp-mobile-banner {
  display: none;
  align-items: center;
  justify-content: space-between;
  background: var(--fp-banner-bg);
  border: 1px solid var(--fp-banner-border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 28px;
}
.fp-mobile-banner-left { display: flex; align-items: center; gap: 8px; }
.fp-step-dots { display: flex; align-items: center; gap: 6px; }
.fp-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 0.3s;
}

/* ── OTP actions row ── */
.fp-otp-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  gap: 8px;
}

/* ════════════════════════════
   TABLET  ≤ 900px
════════════════════════════ */
@media (max-width: 900px) {
  .fp-left  { padding: 32px; }
  .fp-right { padding: 40px; }
}

/* ════════════════════════════
   MOBILE  ≤ 768px
════════════════════════════ */
@media (max-width: 768px) {
  .fp-left { display: none !important; }

  .fp-right {
    width: 100%;
    padding: 32px 20px 48px;
    justify-content: flex-start;
    min-height: 100vh;
  }

  .fp-right-inner { max-width: 100%; }

  .fp-mobile-banner { display: flex; }

  .fp-page-title { font-size: 28px !important; letter-spacing: -0.3px !important; }

  .fp-otp-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

/* ════════════════════════════
   SMALL MOBILE  ≤ 390px
════════════════════════════ */
@media (max-width: 390px) {
  .fp-right { padding: 24px 16px 40px; }
  .fp-page-title { font-size: 24px !important; }
  /* prevent iOS auto-zoom on input focus */
  .fp-input { font-size: 16px !important; }
}
`;

export default function ForgotPasswordPage() {
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");

  const router = useRouter();
  const mono   = useTheme();
  const {
    user,
    loading: authLoading,
    requestPasswordReset,
    resendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
  } = useAuth();

  // ── Apply CSS variables whenever theme changes (client-only) ──────────────
  useEffect(() => {
    const tokens = mono ? DARK_TOKENS : LIGHT_TOKENS;
    const root   = document.documentElement;
    Object.entries(tokens).forEach(([key, val]) => root.style.setProperty(key, val));
  }, [mono]);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  // ── Derived UI text ───────────────────────────────────────────────────────
  const title = useMemo(() => {
    if (step === "email")    return "Reset your password";
    if (step === "otp")      return "Check your email";
    if (step === "password") return "Create new password";
    return "Password updated";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "email")    return "Enter the email linked to your TradeFinlytix account.";
    if (step === "otp")      return "Enter the 6-digit OTP sent to your registered email.";
    if (step === "password") return "Choose a strong password to secure your account.";
    return "You can now sign in with your new password.";
  }, [step]);

  const resetStatus = () => { setError(""); setMessage(""); };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); resetStatus();
    try   { setMessage(await requestPasswordReset(email)); setStep("otp"); }
    catch (err) { setError(getApiError(err, "Could not request a reset OTP. Please try again.")); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); resetStatus();
    try   { setMessage(await verifyPasswordResetOtp(email, otp)); setStep("password"); }
    catch (err) { setError(getApiError(err, "Invalid or expired OTP.")); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); resetStatus();
    try {
      setMessage(await resetPasswordWithOtp(email, otp, password));
      setPassword(""); setConfirm(""); setStep("done");
    } catch (err) { setError(getApiError(err, "Could not reset password. Please try again.")); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); resetStatus();
    try   { setMessage(await resendPasswordResetOtp(email)); setOtp(""); }
    catch (err) { setError(getApiError(err, "Please wait before requesting another OTP.")); }
    finally { setResending(false); }
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const strength      = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColor = ["#E5E7EB", "#EF4444", "#F59E0B", "#16A34A"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];

  // ── Step dots helper ──────────────────────────────────────────────────────
  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : step === "password" ? 2 : 3;

  return (
    <>
      {/* Static stylesheet injected once — no theme interpolation */}
      <style>{STATIC_CSS}</style>

      <div className="fp-wrapper">
        {/* ── Left panel ── */}
        <div className="fp-left">
          {/* grid bg */}
          <div style={{ position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none" }}>
            <svg width="100%" height="100%">
              <defs>
                <pattern id="fp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#fp-grid)"/>
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
          <div style={{ position: "relative", zIndex: 1 }} className="fp-fade-in">
            <div style={{ display: "inline-block", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ADE80", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, marginBottom: 24 }}>
              Secure recovery
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
              OTP-protected<br/>account access
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, maxWidth: 360 }}>
              Password resets use a short-lived email OTP, retry limits, and automatic session invalidation after a successful update.
            </p>
          </div>

          {/* step tracker */}
          <div style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: 20 }}>
            {["Request OTP", "Verify code", "Set password"].map((label, i) => {
              const active = i <= stepIndex || step === "done";
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i === 2 ? 0 : 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: active ? "#4ADE80" : "rgba(255,255,255,0.14)", color: active ? "#14532D" : "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  <span style={{ color: active ? "white" : "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="fp-right">
          <div className="fp-right-inner fp-fade-in">

            {/* Mobile brand banner */}
            <div className="fp-mobile-banner">
              <div className="fp-mobile-banner-left">
                <Image src="/logo.png" alt="TradeFinlytix" width={28} height={28} style={{ objectFit: "contain" }}/>
                <span style={{ color: "var(--fp-text)", fontWeight: 700, fontSize: 15 }}>TradeFinlytix</span>
              </div>
              <div className="fp-step-dots">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="fp-step-dot"
                    style={{ background: i <= stepIndex ? "#16A34A" : "var(--fp-border)" }}
                  />
                ))}
              </div>
            </div>

            {/* Heading */}
            <h1
              className="fp-page-title"
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "var(--fp-text)", marginBottom: 8, letterSpacing: "-0.5px" }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 15, color: "var(--fp-subtext)", marginBottom: 28, lineHeight: 1.6 }}>
              {subtitle}
            </p>

            {/* Alerts */}
            {error   && <div className="fp-alert-error">{error}</div>}
            {message && (
              <div className="fp-alert-success">
                <CheckCircle2 size={15} strokeWidth={2.5}/> {message}
              </div>
            )}

            {/* ── email step ── */}
            {step === "email" && (
              <form onSubmit={handleEmailSubmit}>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "flex", fontSize: 14, fontWeight: 600, color: "var(--fp-label)", marginBottom: 6, alignItems: "center", gap: 6 }}>
                    <Mail size={13} strokeWidth={2} color="var(--fp-muted)"/> Email Address
                  </label>
                  <input className="fp-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
                </div>
                <button type="submit" className="fp-btn-submit" disabled={loading}>
                  {loading
                    ? <><Loader2 size={16} strokeWidth={2} className="fp-spinner"/>Sending OTP...</>
                    : <>Send Reset OTP <ArrowRight size={15} strokeWidth={2}/></>}
                </button>
              </form>
            )}

            {/* ── otp step ── */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fp-label)", marginBottom: 6 }}>Email Address</label>
                  <input className="fp-input" type="email" value={email} disabled/>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fp-label)", marginBottom: 6 }}>6-digit OTP</label>
                  <input
                    className="fp-input"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    autoComplete="one-time-code"
                    style={{ fontSize: 20, letterSpacing: "0.25em", textAlign: "center" }}
                  />
                </div>
                <div className="fp-otp-actions">
                  <button type="button" className="fp-btn-ghost" onClick={() => setStep("email")}>Change email</button>
                  <button type="button" className="fp-btn-ghost" onClick={handleResend} disabled={resending}>
                    {resending ? "Resending…" : "Resend OTP"}
                  </button>
                </div>
                <button type="submit" className="fp-btn-submit" disabled={loading || otp.length !== 6}>
                  {loading
                    ? <><Loader2 size={16} strokeWidth={2} className="fp-spinner"/>Verifying...</>
                    : <>Verify OTP <ArrowRight size={15} strokeWidth={2}/></>}
                </button>
              </form>
            )}

            {/* ── password step ── */}
            {step === "password" && (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fp-label)", marginBottom: 6 }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="fp-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{ paddingRight: 52 }}
                    />
                    <button type="button" className="fp-eye-btn" onClick={() => setShowPassword(v => !v)}>
                      {showPassword ? <EyeOff size={18} strokeWidth={2}/> : <Eye size={18} strokeWidth={2}/>}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3].map(i => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor : "var(--fp-strength-empty)", transition: "background 0.3s" }}/>
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--fp-label)", marginBottom: 6 }}>Confirm New Password</label>
                  <input
                    className="fp-input"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ borderColor: confirm && confirm !== password ? "var(--fp-mismatch)" : undefined }}
                  />
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: 12, color: "var(--fp-mismatch)", marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>
                <button type="submit" className="fp-btn-submit" disabled={loading || !password || password !== confirm}>
                  {loading
                    ? <><Loader2 size={16} strokeWidth={2} className="fp-spinner"/>Updating...</>
                    : <>Update Password <ArrowRight size={15} strokeWidth={2}/></>}
                </button>
              </form>
            )}

            {/* ── done step ── */}
            {step === "done" && (
              <button type="button" className="fp-btn-submit" onClick={() => router.push("/login")}>
                Back to Login
              </button>
            )}

            <p style={{ textAlign: "center", fontSize: 14, color: "var(--fp-bottom-text)", marginTop: 24 }}>
              Remember your password?{" "}
              <Link href="/login" style={{ color: "var(--fp-link)", fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}