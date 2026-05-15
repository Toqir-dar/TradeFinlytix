"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { PsxLiveChartCard } from "@/components/psx-live-chart";
import { TrendingUp, BarChart2, Shield, Activity, ArrowRight, UserCheck, Search, BarChart3, Menu, X } from "lucide-react";

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
  { Icon: TrendingUp, gradient: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D", title: "AI-Driven Predictions", desc: "Get symbol-level buy/hold/trim/sell signals powered by XGBoost and transformer models with SHAP-backed rationale.", badge: "Investor" },
  { Icon: BarChart2, gradient: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8", title: "Portfolio Intelligence", desc: "Real-time P&L tracking, allocation views, and trade history with full position management.", badge: "Investor" },
  { Icon: Shield, gradient: "linear-gradient(135deg,#F0FDF4,#DCFCE7)", iconColor: "#15803D", title: "Security & Audit", desc: "HMAC-verified audit chains, AES-GCM field encryption, anomaly detection, and RBAC role enforcement.", badge: "CISO" },
  { Icon: Activity, gradient: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E", title: "Risk Analytics", desc: "Live risk snapshots, trend analysis, and anomaly stats for institutional-grade operational visibility.", badge: "Admin" },
];

const STEPS = [
  { num: "01", Icon: UserCheck, title: "Register & Get Verified", desc: "Create your account and get assigned your role — investor, admin, or CISO — with secure JWT sessions." },
  { num: "02", Icon: Search, title: "Analyze PSX Signals", desc: "Search any PSX symbol to get AI-predicted signals with confidence scores, target prices, and risk levels." },
  { num: "03", Icon: BarChart3, title: "Execute & Track", desc: "Log trades, monitor your portfolio P&L, and let CISO dashboards keep operations auditable and secure." },
];

const TESTIMONIALS = [
  { quote: "TradeFinlytix changed how our desk approaches PSX — structured, signal-driven execution every session.", name: "Amir K.", role: "Head of Research, Karachi Capital" },
  { quote: "The audit chain and anomaly detection gave our security team the visibility we needed without friction.", name: "Sara M.", role: "CISO, FinEdge Securities" },
  { quote: "Having prediction detail and portfolio in one place is exactly what our analysts needed.", name: "Usman T.", role: "Portfolio Lead, Alpha Horizon" }
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } }
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
};

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
        .btn-primary { background: #16A34A; color: white; border: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .btn-primary:hover { background: #15803D; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .btn-outline { background: transparent; color: #16A34A; border: 1.5px solid #16A34A; padding: 13px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
        .btn-outline:hover { background: #F0FDF4; transform: translateY(-1px); }
        .chip { display: inline-block; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
        .ticker-line { display: flex; gap: 32px; animation: ticker 20s linear infinite; white-space: nowrap; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .market-section { background: radial-gradient(circle at top, #F0FDF4 0%, #FFFFFF 60%); border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; }
        .market-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; align-items: center; }
        .market-bullets { display: grid; gap: 10px; margin-top: 24px; }
        .market-bullet { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #374151; }
        .market-dot { width: 10px; height: 10px; border-radius: 999px; background: #16A34A; box-shadow: 0 0 0 3px #DCFCE7; }
        .step-num { font-family: 'DM Serif Display', serif; font-size: 56px; color: #BBF7D0; line-height: 1; }
        .nav-link { color: #374151; text-decoration: none; font-weight: 500; font-size: 14px; transition: color 0.2s; }
        .nav-link:hover { color: #16A34A; }
        a { text-decoration: none; }
        .desktop-nav { display: flex; gap: 32px; align-items: center; }
        .desktop-auth { display: flex; gap: 10px; align-items: center; }
        .mobile-menu-btn { display: none; background: white; border: 1.5px solid #E5E7EB; border-radius: 8px; width: 40px; height: 40px; cursor: pointer; align-items: center; justify-content: center; }
        .mobile-nav { background: white; padding: 16px 24px 24px; border-top: 1px solid #E5E7EB; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .mobile-nav-link { display: block; color: #374151; text-decoration: none; font-weight: 500; font-size: 15px; padding: 10px 12px; border-radius: 8px; transition: all 0.15s; margin-bottom: 2px; }
        .mobile-nav-link:hover { background: #F0FDF4; color: #16A34A; }
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .desktop-auth { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-card-col { display: none !important; }
          .hero-h1 { font-size: 44px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .stats-grid-item { border-right: none !important; padding: 24px 0 !important; border-bottom: 1px solid #BBF7D0; }
          .stats-grid-item:last-child { border-bottom: none !important; }
          .features-grid { grid-template-columns: repeat(2,1fr) !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .cta-box { padding: 48px 28px !important; border-radius: 20px !important; }
          .cta-h2 { font-size: 34px !important; }
          .market-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .hero-h1 { font-size: 36px !important; }
          .cta-h2 { font-size: 28px !important; }
        }
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

          <nav className="desktop-nav">
            {NAV_LINKS.map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`} className="nav-link">{link}</a>
            ))}
          </nav>

          <div className="desktop-auth">
            <Link href="/login" className="btn-outline" style={{ padding: "10px 20px", fontSize: 14 }}>Login</Link>
            <Link href="/register" className="btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
              Get Started
              <ArrowRight size={15} color="white" strokeWidth={2} />
            </Link>
          </div>

          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X size={20} color="#374151" strokeWidth={1.8} /> : <Menu size={20} color="#374151" strokeWidth={1.8} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="mobile-nav">
            {NAV_LINKS.map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>{link}</a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #E5E7EB" }}>
              <Link href="/login" className="btn-outline" onClick={() => setMobileOpen(false)} style={{ justifyContent: "center" }}>Login</Link>
              <Link href="/register" className="btn-primary" onClick={() => setMobileOpen(false)} style={{ justifyContent: "center" }}>Get Started</Link>
            </div>
          </div>
        )}
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
        <section className="hero-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <span className="chip">Built for Pakistan Stock Exchange</span>
            <h1 className="hero-h1" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 58, lineHeight: 1.1, letterSpacing: "-1px", color: "#111827", marginTop: 20 }}>
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
                <ArrowRight size={15} color="white" strokeWidth={2} />
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
          </motion.div>

          {/* Hero Card */}
          <motion.div
            className="hero-card-col"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
              style={{ background: "#FAFFF7", border: "1.5px solid #BBF7D0", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 60px rgba(74,222,128,0.15)" }}
            >
              <div style={{ background: "#F0FDF4", padding: "14px 20px", borderBottom: "1px solid #BBF7D0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#15803D" }}>Live Signal Panel</span>
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
                {[["HBL", "+1.1%", "HOLD", "#FEF3C7", "#92400E"], ["ENGRO", "+0.8%", "BUY", "#DCFCE7", "#15803D"]].map(([sym, chg, sig, bg, col]) => (
                  <div key={sym} style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{sym}</div>
                    <div style={{ fontSize: 13, color: "#16A34A", fontWeight: 500 }}>{chg}</div>
                    <div style={{ background: bg, color: col, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}>{sig}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Live Market */}
        <section id="live-market" className="market-section" style={{ padding: "90px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="market-grid">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                <span className="chip">Live market</span>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "#111827", marginTop: 16, letterSpacing: "-0.4px" }}>
                  PSX prices updated every minute
                </h2>
                <p style={{ fontSize: 16, color: "#6B7280", marginTop: 12, maxWidth: 520, lineHeight: 1.7 }}>
                  Track five liquid PSX names in a single glance. Powered by YFinance intraday data and refreshed every minute.
                </p>
                <div className="market-bullets">
                  {[
                    "Five PSX tickers side by side",
                    "Auto refresh every minute",
                    "Built on YFinance price feeds",
                  ].map((item) => (
                    <div key={item} className="market-bullet">
                      <span className="market-dot" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
              >
                <PsxLiveChartCard
                  title="Live PSX Prices"
                  subtitle="OGDC, HBL, ENGRO, LUCK, PSO"
                  badge="1m refresh"
                  style={{
                    borderRadius: 22,
                    padding: 28,
                    boxShadow: "0 22px 60px rgba(22,163,74,0.15)",
                  }}
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ background: "#F0FDF4", borderTop: "1px solid #BBF7D0", borderBottom: "1px solid #BBF7D0", padding: "48px 24px" }}>
          <motion.div
            className="stats-grid"
            style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, textAlign: "center" }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {[
              { ref: investors.ref, value: investors.value, suffix: "+", label: "Active Investors", sub: "on the platform" },
              { ref: symbols.ref, value: symbols.value, suffix: "+", label: "PSX Symbols", sub: "covered by AI" },
              { ref: uptime.ref, value: uptime.value, suffix: ".9%", label: "Platform Uptime", sub: "SLA guaranteed" }
            ].map((s, i) => (
              <motion.div
                key={i}
                ref={s.ref}
                variants={fadeUp}
                className="stats-grid-item"
                style={{ padding: "0 32px", borderRight: i < 2 ? "1px solid #BBF7D0" : "none" }}
              >
                <div style={{ fontSize: 44, fontWeight: 800, color: "#15803D", fontFamily: "'DM Serif Display', serif" }}>
                  {s.value.toLocaleString()}{s.suffix}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{s.sub}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
          <motion.div
            style={{ textAlign: "center", marginBottom: 60 }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="chip">Platform Features</span>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16, letterSpacing: "-0.5px" }}>Everything you need to trade intelligently</h2>
            <p style={{ fontSize: 16, color: "#6B7280", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>Built for investors, admins, and security teams — all in one unified platform.</p>
          </motion.div>
          <motion.div
            className="features-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(74,222,128,0.18)", transition: { duration: 0.2 } }}
                style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: 28, cursor: "default" }}
              >
                <motion.div whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.4 }}
                  style={{ width: 52, height: 52, borderRadius: 14, background: f.gradient, display: "flex", alignItems: "center", justifyContent: "center", color: f.iconColor, marginBottom: 16 }}>
                  <f.Icon size={24} strokeWidth={2} />
                </motion.div>
                <span className="chip" style={{ marginBottom: 12, display: "inline-block" }}>{f.badge}</span>
                <h3 style={{ fontWeight: 700, fontSize: 17, color: "#111827", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* How it works */}
        <section id="how-it-works" style={{ background: "#F9FAFB", padding: "100px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <motion.div
              style={{ textAlign: "center", marginBottom: 64 }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <span className="chip">Simple Process</span>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16 }}>How TradeFinlytix works</h2>
            </motion.div>
            <motion.div
              className="steps-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48, position: "relative" }}
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  style={{ textAlign: "center" }}
                >
                  <div className="step-num">{s.num}</div>
                  <motion.div whileHover={{ scale: 1.12, rotate: 8 }} transition={{ duration: 0.3 }}
                    style={{ width: 56, height: 56, background: "linear-gradient(135deg, #4ADE80, #16A34A)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "12px auto 16px", boxShadow: "0 8px 20px rgba(74,222,128,0.3)" }}>
                    <s.Icon size={24} color="white" strokeWidth={2.2} />
                  </motion.div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.65 }}>{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
          <motion.div
            style={{ textAlign: "center", marginBottom: 60 }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="chip">Testimonials</span>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: "#111827", marginTop: 16 }}>Trusted by trading teams across Pakistan</h2>
          </motion.div>
          <motion.div
            className="testimonials-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(74,222,128,0.14)", transition: { duration: 0.2 } }}
                style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 18, padding: 28 }}
              >
                <div style={{ fontSize: 36, color: "#4ADE80", lineHeight: 1, marginBottom: 16, fontFamily: "serif" }}>"</div>
                <p style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.7, marginBottom: 20 }}>{t.quote}</p>
                <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section id="pricing" style={{ padding: "0 24px 100px" }}>
          <motion.div
            className="cta-box"
            style={{ maxWidth: 900, margin: "0 auto", background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", borderRadius: 28, padding: "64px 48px", textAlign: "center", boxShadow: "0 32px 80px rgba(22,163,74,0.3)" }}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <h2 className="cta-h2" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, color: "white", letterSpacing: "-0.5px", marginBottom: 16 }}>Start trading smarter today</h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginBottom: 36 }}>Join hundreds of PSX investors using AI-backed signals and institutional-grade security.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{ background: "white", color: "#16A34A", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
                Create Free Account
                <ArrowRight size={15} color="#16A34A" strokeWidth={2} />
              </Link>
              <Link href="/login" style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "14px 32px", borderRadius: 10, fontWeight: 600, fontSize: 15, border: "1.5px solid rgba(255,255,255,0.4)" }}>
                Login
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        style={{ background: "#111827", color: "white", padding: "64px 24px 32px" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
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
            <span style={{ fontSize: 13, color: "#6B7280" }}>Built for PSX</span>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
