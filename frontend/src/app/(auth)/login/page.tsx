"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, ArrowRight, Lock, Shield, UserCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .input-field { width: 100%; padding: 13px 16px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 15px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.15); }
        .input-field::placeholder { color: #9CA3AF; }
        .btn-submit { width: 100%; padding: 14px; background: #16A34A; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-submit:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .social-btn { width: 100%; padding: 12px; background: white; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 10px; color: #374151; }
        .social-btn:hover { background: #F9FAFB; border-color: #D1D5DB; }
        .fade-in { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .float { animation: float 5s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .ticker { display: flex; gap: 28px; animation: ticker 18s linear infinite; white-space: nowrap; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 0; }
        .eye-btn:hover { color: #6B7280; }
        .auth-left { width: 50%; background: linear-gradient(145deg, #052e16 0%, #14532d 50%, #166534 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 40px 48px; position: relative; overflow: hidden; }
        .auth-right { width: 50%; display: flex; flex-direction: column; justify-content: center; padding: 60px 64px; background: #FAFAFA; }
        @media (max-width: 768px) {
          .auth-left { display: none !important; }
          .auth-right { width: 100% !important; padding: 40px 24px !important; }
        }
        @media (max-width: 480px) {
          .auth-right { padding: 32px 16px !important; }
        }
      `}</style>

      {/* Left Panel */}
      <div className="auth-left">
        {/* Background pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.07 }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(74,222,128,0.1)", pointerEvents: "none" }}/>
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(74,222,128,0.08)", pointerEvents: "none" }}/>

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <Image src="/logo.png" alt="TradeFinlytix" width={44} height={44} style={{ objectFit: "contain" }}/>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>TradeFinlytix</span>
          </Link>
        </div>

        {/* Center Content */}
        <div style={{ position: "relative", zIndex: 1 }} className="fade-in">
          <div style={{ display: "inline-block", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ADE80", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, marginBottom: 24 }}>
            Pakistan Stock Exchange
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "white", lineHeight: 1.2, marginBottom: 16 }}>
            Your edge in<br/>PSX markets
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 340 }}>
            AI-powered signals, portfolio intelligence, and institutional security — all in one platform.
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 32 }}>
            {[["10K+", "Investors"], ["550+", "PSX Symbols"], ["99.9%", "Uptime"]].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#4ADE80" }}>{val}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Floating card */}
          <div className="float" style={{ marginTop: 48, background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: 20, maxWidth: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>OGDC</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Oil & Gas Dev. Corp</div>
              </div>
              <div style={{ background: "#4ADE80", color: "#14532D", padding: "5px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12 }}>BUY</div>
            </div>
            <svg viewBox="0 0 280 60" style={{ width: "100%", height: 50 }}>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#4ADE80" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,50 L0,42 C20,38 35,44 55,32 C75,20 90,28 110,18 C130,8 145,14 165,6 C185,0 200,8 220,4 L280,0 L280,60 L0,60 Z" fill="url(#lg)"/>
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

        {/* Ticker */}
        <div style={{ position: "relative", zIndex: 1, overflow: "hidden" }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
            <div className="ticker" style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>
              {["OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%",
                "OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%"
              ].map((t, i) => <span key={i} style={{ marginRight: 32 }}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="auth-right">
        <div style={{ maxWidth: 400, width: "100%" }} className="fade-in">
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#111827", marginBottom: 8, letterSpacing: "-0.5px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            Sign in to your account or{" "}
            <Link href="/register" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>
              create one
            </Link>
          </p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
              <input
                className="input-field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-field"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: "#16A34A", fontWeight: 500, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                <>Login to Dashboard <ArrowRight size={16} color="white" strokeWidth={2} /></>
              )}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }}/>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }}/>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </button>
            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 14, color: "#6B7280" }}>
            Don't have an account?{" "}
            <Link href="/register" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>
              Register now →
            </Link>
          </p>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 36, paddingTop: 24, borderTop: "1px solid #F3F4F6" }}>
            {[
              { label: "SSL Secure", Icon: Lock },
              { label: "RBAC Protected", Icon: Shield },
              { label: "ISO Aligned", Icon: UserCheck },
            ].map(({ label, Icon }) => (
              <div key={label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}>
                  <Icon size={14} strokeWidth={2} />
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
