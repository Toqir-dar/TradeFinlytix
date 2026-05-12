"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { useAuth } from "@/lib/auth";

type Step = "email" | "otp" | "password" | "done";

function getApiError(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    requestPasswordReset,
    resendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp
  } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  const title = useMemo(() => {
    if (step === "email") return "Reset your password";
    if (step === "otp") return "Check your email";
    if (step === "password") return "Create new password";
    return "Password updated";
  }, [step]);

  const subtitle = useMemo(() => {
    if (step === "email") return "Enter the email linked to your TradeFinlytix account.";
    if (step === "otp") return "Enter the 6-digit OTP sent to your registered email.";
    if (step === "password") return "Choose a strong password to secure your account.";
    return "You can now sign in with your new password.";
  }, [step]);

  const resetStatus = () => {
    setError("");
    setMessage("");
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    resetStatus();
    try {
      const result = await requestPasswordReset(email);
      setMessage(result);
      setStep("otp");
    } catch (err) {
      setError(getApiError(err, "Could not request a reset OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    resetStatus();
    try {
      const result = await verifyPasswordResetOtp(email, otp);
      setMessage(result);
      setStep("password");
    } catch (err) {
      setError(getApiError(err, "Invalid or expired OTP."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    resetStatus();
    try {
      const result = await resetPasswordWithOtp(email, otp, password);
      setMessage(result);
      setPassword("");
      setConfirm("");
      setStep("done");
    } catch (err) {
      setError(getApiError(err, "Could not reset password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    resetStatus();
    try {
      const result = await resendPasswordResetOtp(email);
      setMessage(result);
      setOtp("");
    } catch (err) {
      setError(getApiError(err, "Please wait before requesting another OTP."));
    } finally {
      setResending(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColor = ["#E5E7EB", "#EF4444", "#F59E0B", "#16A34A"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 15px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.15); }
        .input-field:disabled { background: #F3F4F6; color: #6B7280; }
        .input-field::placeholder { color: #9CA3AF; }
        .btn-submit { width: 100%; padding: 14px; background: #16A34A; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-submit:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-ghost { border: none; background: transparent; color: #16A34A; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn-ghost:disabled { color: #9CA3AF; cursor: not-allowed; }
        .fade-in { animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .auth-left { width: 50%; }
        .auth-right { width: 50%; }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { width: 100% !important; padding: 40px 24px !important; }
        }
        @media (max-width: 480px) {
          .auth-right { padding: 32px 16px !important; }
        }
      `}</style>

      <div className="auth-left" style={{ width: "50%", background: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #166534 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.07 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="reset-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#reset-grid)"/>
          </svg>
        </div>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(74,222,128,0.1)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(74,222,128,0.08)", pointerEvents: "none" }}/>

        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Image src="/logo.png" alt="TradeFinlytix" width={44} height={44} style={{ objectFit: "contain" }}/>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>TradeFinlytix</span>
          </Link>
        </div>

        <div style={{ position: "relative", zIndex: 1 }} className="fade-in">
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

        <div style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: 20 }}>
          {["Request OTP", "Verify code", "Set password"].map((label, index) => {
            const currentIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;
            const active = index <= currentIndex || step === "done";
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: index === 2 ? 0 : 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: active ? "#4ADE80" : "rgba(255,255,255,0.14)", color: active ? "#14532D" : "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                  {index + 1}
                </div>
                <span style={{ color: active ? "white" : "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600 }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="auth-right" style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", background: "#FAFAFA" }}>
        <div style={{ maxWidth: 420, width: "100%" }} className="fade-in">
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#111827", marginBottom: 8, letterSpacing: "-0.5px" }}>
            {title}
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 28, lineHeight: 1.6 }}>
            {subtitle}
          </p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 18 }}>
              {message}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/>
              </div>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? "Sending OTP..." : "Send Reset OTP"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
                <input className="input-field" type="email" value={email} disabled/>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>6-digit OTP</label>
                <input className="input-field" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} required/>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <button type="button" className="btn-ghost" onClick={() => setStep("email")}>Change email</button>
                <button type="button" className="btn-ghost" onClick={handleResend} disabled={resending}>
                  {resending ? "Resending..." : "Resend OTP"}
                </button>
              </div>
              <button type="submit" className="btn-submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input className="input-field" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }}/>
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor : "#E5E7EB", transition: "background 0.3s" }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Confirm New Password</label>
                <input className="input-field" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ borderColor: confirm && confirm !== password ? "#EF4444" : undefined }}/>
                {confirm && confirm !== password && (
                  <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
              <button type="submit" className="btn-submit" disabled={loading || !password || password !== confirm}>
                {loading ? "Updating password..." : "Update Password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div>
              <button type="button" className="btn-submit" onClick={() => router.push("/login")}>
                Back to Login
              </button>
            </div>
          )}

          <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280", marginTop: 24 }}>
            Remember your password?{" "}
            <Link href="/login" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
