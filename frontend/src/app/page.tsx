"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);
  return { value, ref };
}

const NAV_LINKS = ["Features", "How it Works"];

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#4ADE80" fillOpacity="0.15"/>
        <path d="M7 18l5-5 3 3 6-7" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="21" cy="9" r="2" fill="#4ADE80"/>
      </svg>
    ),
    title: "AI-Driven Predictions",
    desc: "Get symbol-level buy/hold/trim/sell signals powered by XGBoost and transformer models with SHAP-backed rationale.",
    badge: "Investor"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#4ADE80" fillOpacity="0.15"/>
        <rect x="7" y="14" width="4" height="7" rx="1" fill="#4ADE80"/>
        <rect x="12" y="10" width="4" height="11" rx="1" fill="#16A34A"/>
        <rect x="17" y="7" width="4" height="14" rx="1" fill="#4ADE80"/>
      </svg>
    ),
    title: "Portfolio Intelligence",
    desc: "Real-time P&L tracking, allocation views, and trade history with full position management.",
    badge: "Investor"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#4ADE80" fillOpacity="0.15"/>
        <path d="M14 7l5 2.5v4c0 3-2.5 5.5-5 6.5-2.5-1-5-3.5-5-6.5v-4L14 7z" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" fill="#4ADE80" fillOpacity="0.2"/>
        <path d="M11.5 14l2 2 3.5-3.5" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Security & Audit",
    desc: "HMAC-verified audit chains, AES-GCM field encryption, anomaly detection, and RBAC role enforcement.",
    badge: "CISO"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" fill="#4ADE80" fillOpacity="0.15"/>
        <circle cx="14" cy="14" r="5" stroke="#16A34A" strokeWidth="2"/>
        <path d="M14 9V7M14 21v-2M9 14H7M21 14h-2" stroke="#4ADE80" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="14" cy="14" r="2" fill="#4ADE80"/>
      </svg>
    ),
    title: "Risk Analytics",
    desc: "Live risk snapshots, trend analysis, and anomaly stats for institutional-grade operational visibility.",
    badge: "Admin"
  }
];

const STEPS = [
  { num: "01", title: "Register & Get Verified", desc: "Create your account and get assigned your role — investor, admin, or CISO — with secure JWT sessions." },
  { num: "02", title: "Analyze PSX Signals", desc: "Search any PSX symbol to get AI-predicted signals with confidence scores, target prices, and risk levels." },
  { num: "03", title: "Execute & Track", desc: "Log trades, monitor your portfolio P&L, and let CISO dashboards keep operations auditable and secure." }
];

const TESTIMONIALS = [
  { quote: "TradeFinlytix changed how our desk approaches PSX — structured, signal-driven execution every session.", name: "Amir K.", role: "Head of Research, Karachi Capital" },
  { quote: "The audit chain and anomaly detection gave our security team the visibility we needed without friction.", name: "Sara M.", role: "CISO, FinEdge Securities" },
  { quote: "Having prediction detail and portfolio in one place is exactly what our analysts needed.", name: "Usman T.", role: "Portfolio Lead, Alpha Horizon" }
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const investors = useCountUp(10000);
  const symbols = useCountUp(550);
  const uptime = useCountUp(99);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#111827", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .fade-in { animation: fadeUp 0.7s ease both; }
        .fade-in-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-in-3 { animation: fadeUp 0.7s 0.3s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .float { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .feature-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(74,222,128,0.15); }
        .feature-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .btn-primary { background: #16A34A; color: white; border: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .btn-primary:hover { background: #15803D; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .btn-outline { background: transparent; color: #16A34A; border: 1.5px solid #16A34A; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .btn-outline:hover { background: #F0FDF4; transform: translateY(-1px); }
        .chip { display: inline-block; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
        .ticker-line { display: flex; gap: 32px; animation: ticker 20s linear infinite; white-space: nowrap; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .step-num { font-family: 'DM Serif Display', serif; font-size: 56px; color: #BBF7D0; line-height: 1; }
        .nav-link { color: #374151; text-decoration: none; font-weight: 500; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: #16A34A; }
        .testi-card:hover { box-shadow: 0 12px 32px rgba(74,222,128,0.12); transform: translateY(-3px); }
        .testi-card { transition: all 0.3s ease; }
        a { text-decoration: none; }
      `}</style>

      {/* Navbar */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #E5E7EB" : "none",
        transition: "all 0.3s ease"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="TradeFinlytix Logo" width={40} height={40} style={{ objectFit: "contain" }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#111827", letterSpacing: "-0.3px" }}>TradeFinlytix</span>
          </Link>

          <nav style={{ display: "flex", gap: 32, alignItems: "center" }}>
            {NAV_LINKS.map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`} className="nav-link">{link}</a>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/login" className="btn-outline" style={{ padding: "10px 20px", fontSize: 14 }}>Login</Link>
            <Link href="/register" className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Ticker */}
      <div style={{ position: "fixed", top: 68, left: 0, right: 0, zIndex: 99, background: "#F0FDF4", borderBottom: "1px solid #BBF7D0", overflow: "hidden", height: 36, display: "flex", alignItems: "center" }}>
        <div className="ticker-line" style={{ fontSize: 12, fontWeight: 600, color: "#15803D" }}>
          {["OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%", "HUBC ▲ 0.9%",
            "OGDC ▲ 2.3%", "HBL ▲ 1.1%", "LUCK ▼ 0.5%", "PSO ▲ 3.2%", "ENGRO ▲ 0.8%", "MCB ▼ 1.4%", "MARI ▲ 4.1%", "HUBC ▲ 0.9%"
          ].map((t, i) => <span key={i} style={{ marginRight: 40 }}>{t}</span>)}
        </div>
      </div>

      <main style={{ paddingTop: 104 }}>
        {/* Hero */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div className="fade-in">
            <span className="chip">🇵🇰 Built for Pakistan Stock Exchange</span>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 58, lineHeight: 1.1, letterSpacing: "-1px", color: "#111827", marginTop: 20 }}>
              Trade Smarter<br />
              <span style={{ color: "#16A34A" }}>with AI-Backed</span><br />
              Intelligence
            </h1>
            <p style={{ fontSize: 17, color: "#6B7280", lineHeight: 1.7, marginTop: 20, maxWidth: 460 }}>
              TradeFinlytix gives PSX investors predictive signals, portfolio control, and institutional security — all in one platform.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/register" className="btn-primary">
                Start for Free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link href="/login" className="btn-outline">Login to Dashboard</Link>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
              {[
                { label: "Trusted by", value: "500+", sub: "investors" },
                { label: "Covers", value: "550+", sub: "PSX symbols" },
                { label: "Uptime", value: "99.9%", sub: "guaranteed" }
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{s.label} {s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Card */}
          <div className="fade-in-2 float" style={{ background: "#FAFFF7", border: "1.5px solid #BBF7D0", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 60px rgba(74,222,128,0.15)" }}>
            <div style={{ background: "#F0FDF4", padding: "14px 20px", borderBottom: "1px solid #BBF7D0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#15803D" }}>📊 Live Signal Panel</span>
              <span style={{ background: "#4ADE80", color: "#14532D", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>LIVE</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ background: "white", borderRadius: 14, border: "1px solid #E5E7EB", padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>OGDC</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>Oil & Gas Dev. Corp</div>
                  </div>
                  <div style={{ background: "#DCFCE7", color: "#15803D", padding: "6px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>BUY</div>
                </div>
                <svg viewBox="0 0 340 100" style={{ width: "100%", height: 80 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#4ADE80" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,80 L0,70 C20,65 30,72 50,60 C70,48 80,55 100,42 C120,30 130,38 150,25 C170,14 185,20 200,12 C215,5 230,15 250,8 C270,2 290,10 310,5 L340,2 L340,100 L0,100 Z" fill="url(#g1)"/>
                  <path d="M0,70 C20,65 30,72 50,60 C70,48 80,55 100,42 C120,30 130,38 150,25 C170,14 185,20 200,12 C215,5 230,15 250,8 C270,2 290,10 310,5 L340,2" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  {[["Confidence", "81.4%"], ["Target", "PKR 127.5"], ["Risk", "Medium"]].map(([k, v]) => (
                    <div key={k} style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", border: "1px solid #F3F4F6" }}>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mini signal list */}
              {[["HBL", "+1.1%", "HOLD", "#FEF3C7", "#92400E"], ["ENGRO", "+0.8%", "BUY", "#DCFCE7", "#15803D"]].map(([sym, chg, sig, bg, col]) => (
                <div key={sym} style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{sym}</div>
                  <div style={{ fontSize: 13, color: "#16A34A", fontWeight: 500 }}>{chg}</div>
                  <div style={{ background: bg, color: col, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}>{sig}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ background: "#F0FDF4", borderTop: "1px solid #BBF7D0", borderBottom: "1px solid #BBF7D0", padding: "48px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, textAlign: "center" }}>
            {[
              { ref: investors.ref, value: investors.value, suffix: "+", label: "Active Investors", sub: "on the platform" },
              { ref: symbols.ref, value: symbols.value, suffix: "+", label: "PSX Symbols", sub: "covered by AI" },
              { ref: uptime.ref, value: uptime.value, suffix: ".9%", label: "Platform Uptime", sub: "SLA guaranteed" }
            ].map((s, i) => (
              <div key={i} ref={s.ref} style={{ padding: "0 32px", borderRight: i < 2 ? "1px solid #BBF7D0" : "none" }}>
                <div style={{ fontSize: 44, fontWeight: 800, color: "#15803D", fontFamily: "'DM Serif Display', serif" }}>
                  {s.value.toLocaleString()}{s.suffix}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="chip">Platform Features</span>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16, letterSpacing: "-0.5px" }}>Everything you need to trade intelligently</h2>
            <p style={{ fontSize: 16, color: "#6B7280", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Built for investors, admins, and security teams — all in one unified platform.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card" style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: 28 }}>
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <span className="chip" style={{ marginBottom: 12, display: "inline-block" }}>{f.badge}</span>
                <h3 style={{ fontWeight: 700, fontSize: 17, color: "#111827", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" style={{ background: "#F9FAFB", padding: "100px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span className="chip">Simple Process</span>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16 }}>How TradeFinlytix works</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48, position: "relative" }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div className="step-num">{s.num}</div>
                  <div style={{ width: 56, height: 56, background: "#4ADE80", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "12px auto 16px", boxShadow: "0 8px 20px rgba(74,222,128,0.3)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      {i === 0 && <><path d="M12 4l7 4v5c0 4-3 7.5-7 8.5C8 20.5 5 17 5 13V8l7-4z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round"/></>}
                      {i === 1 && <><path d="M5 12l5-5 3 3 6-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="19" cy="6" r="2" fill="white"/></>}
                      {i === 2 && <><rect x="4" y="10" width="3" height="10" rx="1" fill="white"/><rect x="10.5" y="6" width="3" height="14" rx="1" fill="white"/><rect x="17" y="3" width="3" height="17" rx="1" fill="white"/></>}
                    </svg>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="chip">Testimonials</span>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16 }}>Trusted by trading teams across Pakistan</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testi-card" style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: 28 }}>
                <div style={{ fontSize: 36, color: "#4ADE80", lineHeight: 1, marginBottom: 16, fontFamily: "serif" }}>"</div>
                <p style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.7, marginBottom: 20 }}>{t.quote}</p>
                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="pricing" style={{ padding: "0 24px 100px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", borderRadius: 28, padding: "64px 48px", textAlign: "center", boxShadow: "0 32px 80px rgba(22,163,74,0.3)" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, color: "white", letterSpacing: "-0.5px", marginBottom: 16 }}>Start trading smarter today</h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 36 }}>Join hundreds of PSX investors using AI-backed signals and institutional-grade security.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ background: "white", color: "#16A34A", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
                Create Free Account
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <Link href="/login" style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "14px 32px", borderRadius: 10, fontWeight: 600, fontSize: 15, border: "1.5px solid rgba(255,255,255,0.4)" }}>
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: "#111827", color: "white", padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Image src="/logo.png" alt="TradeFinlytix Logo" width={40} height={40} style={{ objectFit: "contain" }} />
                <span style={{ fontWeight: 700, fontSize: 18 }}>TradeFinlytix</span>
              </div>
              <p style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.6, maxWidth: 260 }}>Smart trading intelligence for Pakistan Stock Exchange investors and teams.</p>
            </div>
            {[
              { title: "Platform", links: ["Features", "How it Works", "Pricing"] },
              { title: "Account", links: ["Login", "Register", "Dashboard"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Use", "Security"] }
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "white" }}>{col.title}</div>
                {col.links.map(l => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <a href="#" style={{ fontSize: 14, color: "#9CA3AF", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#4ADE80")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}>{l}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #374151", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>© {new Date().getFullYear()} TradeFinlytix. All rights reserved.</span>
            <span style={{ fontSize: 13, color: "#6B7280" }}>Built for PSX 🇵🇰</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
