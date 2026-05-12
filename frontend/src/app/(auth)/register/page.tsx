"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();

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

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = ["#E5E7EB", "#EF4444", "#F59E0B", "#16A34A"][strength];
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];

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
        .fade-in { animation: fadeUp 0.6s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Left Panel */}
      <div style={{ width: "50%", background: "linear-gradient(145deg, #052e16 0%, #14532d 50%, #166534 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.07 }}>
          <svg width="100%" height="100%">
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
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
            "Role-based access for investor, admin & CISO"
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#4ADE80", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#14532D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#4ADE80", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#14532D", flexShrink: 0 }}>AK</div>
            <div>
              <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>Amir Khan</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 }}>"TradeFinlytix completely changed how I trade!"</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", background: "#FAFAFA", overflowY: "auto" }}>
        <div style={{ maxWidth: 400, width: "100%" }} className="fade-in">
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: "#111827", marginBottom: 8, letterSpacing: "-0.5px" }}>
            Create your account
          </h1>
          <p style={{ fontSize: 15, color: "#6B7280", marginBottom: 32 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#16A34A", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Full Name</label>
              <input className="input-field" type="text" placeholder="Your full name" value={form.name} onChange={e => update("name", e.target.value)} required/>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email Address</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} required/>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input className="input-field" type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => update("password", e.target.value)} required style={{ paddingRight: 44 }}/>
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {form.password.length > 0 && (
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
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Confirm Password</label>
              <input className="input-field" type="password" placeholder="••••••••" value={form.confirm} onChange={e => update("confirm", e.target.value)} required
                style={{ borderColor: form.confirm && form.confirm !== form.password ? "#EF4444" : undefined }}/>
              {form.confirm && form.confirm !== form.password && (
                <p style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  Creating account...
                </>
              ) : (
                <>Create Account <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></>
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 20, lineHeight: 1.6 }}>
            By registering, you agree to our{" "}
            <a href="#" style={{ color: "#16A34A", textDecoration: "none" }}>Terms of Service</a>{" "}
            and{" "}
            <a href="#" style={{ color: "#16A34A", textDecoration: "none" }}>Privacy Policy</a>.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28, paddingTop: 24, borderTop: "1px solid #F3F4F6" }}>
            {[[ "SSL Secure"], ["RBAC Protected"], [ "ISO Aligned"]].map(([label]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}