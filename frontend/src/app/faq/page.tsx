"use client";

import { useEffect, useState, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { LandingNavbar } from "@/components/landing-navbar";
import { ChevronDown, HelpCircle, Shield, CreditCard, Cpu } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const faqSections = [
  {
    title: "General Information",
    shortTitle: "General",
    Icon: HelpCircle,
    accent: "#16A34A",
    darkAccent: "#4ade80",
    lightBg: "#f0fdf4",
    darkBg: "#0a1f0a",
    items: [
      {
        q: "What is TradeFinlytix?",
        a: "TradeFinlytix is an AI-powered financial analytics platform built specifically for the Pakistan Stock Exchange. It combines Retrieval-Augmented Generation, deep learning forecasting, agentic AI, and real-time web scraping to provide stock predictions, live market news, and automated buy/sell signals.",
      },
      {
        q: "Who founded TradeFinlytix?",
        a: "TradeFinlytix was co-founded by Aleena Ahmed, Toqir Dar, Seerat Fatima, and Ayan Ahmed. The founding team brings expertise in data science, machine learning, financial engineering, and full-stack software development.",
      },
      {
        q: "What markets does TradeFinlytix cover?",
        a: "The platform currently focuses on the Pakistan Stock Exchange, covering major indices and individual stocks with sufficient historical OHLCV data. Future roadmap items include expansion to additional South Asian and Gulf markets.",
      },
      {
        q: "Is TradeFinlytix a licensed brokerage or investment advisor?",
        a: "No. TradeFinlytix is a financial analytics and AI intelligence platform only. It is not a registered brokerage firm, investment advisor, asset manager, or portfolio manager. Outputs are for informational and research purposes.",
      },
    ],
  },
  {
    title: "Platform Features & AI",
    shortTitle: "Features & AI",
    Icon: Cpu,
    accent: "#1D4ED8",
    darkAccent: "#60a5fa",
    lightBg: "#eff6ff",
    darkBg: "#0d1a2e",
    items: [
      {
        q: "What does the 10-day stock price prediction feature do?",
        a: "The prediction module uses a deep learning regression pipeline trained on historical OHLCV data from PSX stocks, augmented with technical indicators such as RSI, MACD, Bollinger Bands, ATR, OBV, and macro features such as PKR/USD and KIBOR.",
      },
      {
        q: "How accurate are the predictions?",
        a: "Prediction accuracy varies by stock liquidity, market conditions, and data availability. No prediction system can guarantee accuracy in financial markets, so forecasts should be treated as one input among many.",
      },
      {
        q: "What is the RAG system used for?",
        a: "The RAG module grounds AI assistant responses in company data, earnings reports, PSX filings, and a curated financial knowledge base so responses are more contextual than static model answers.",
      },
      {
        q: "What is Agentic RAG and how does it power news delivery?",
        a: "Agentic RAG gives the AI agent the ability to fetch fresh PSX announcements, financial news, and regulatory information, process that content, and deliver relevant summaries for monitored stocks or topics.",
      },
      {
        q: "What graphs and visualizations does the platform provide?",
        a: "TradeFinlytix provides candlestick OHLCV charts, predicted versus actual overlays, technical indicator plots, volume analysis, portfolio performance charts, sector views, and model confidence or uncertainty visuals.",
      },
      {
        q: "How do AI-generated buy/sell signals work?",
        a: "Signals evaluate predicted price direction, technical indicators, recent news sentiment, and user-defined risk parameters. When confidence passes a threshold, the platform flags a BUY or SELL recommendation for review.",
      },
      {
        q: "Does TradeFinlytix execute trades automatically?",
        a: "No. TradeFinlytix does not execute trades, connect to brokerage accounts, or access user funds. Users must manually act through their own broker or trading account.",
      },
    ],
  },
  {
    title: "Data, Privacy & Security",
    shortTitle: "Privacy & Security",
    Icon: Shield,
    accent: "#15803D",
    darkAccent: "#4ade80",
    lightBg: "#f0fdf4",
    darkBg: "#0a1f0a",
    items: [
      {
        q: "What data sources does TradeFinlytix use?",
        a: "Primary sources include PSX official data feeds, Yahoo Finance API through yfinance, PSX data libraries, State Bank of Pakistan macro data, and publicly available financial news websites used by the Agentic RAG module.",
      },
      {
        q: "What personal data does TradeFinlytix collect from users?",
        a: "During registration, TradeFinlytix collects name, email address, and a hashed password. Optional profile data may include investment preferences and risk settings. The platform does not collect CNIC, bank account, or brokerage credentials.",
      },
      {
        q: "Does TradeFinlytix share user data with third parties?",
        a: "TradeFinlytix does not sell user data. Data may be shared only with infrastructure providers under data processing agreements, when required by Pakistani law, or with explicit user consent.",
      },
      {
        q: "How is my account data secured?",
        a: "The platform uses bcrypt password hashing, encrypted transport, restricted database access, audit logging, and regular security reviews. Users should still use strong, unique passwords.",
      },
    ],
  },
  {
    title: "Subscription & Support",
    shortTitle: "Subscription",
    Icon: CreditCard,
    accent: "#92400E",
    darkAccent: "#fb923c",
    lightBg: "#fffbeb",
    darkBg: "#1c0f00",
    items: [
      {
        q: "What subscription tiers does TradeFinlytix offer?",
        a: "TradeFinlytix offers Free, Pro, and Enterprise tiers. Free includes limited coverage and demo access. Pro includes broader PSX coverage, news intelligence, predictions, signals, and advanced charts. Enterprise adds API access, custom models, dedicated support, and team accounts.",
      },
      {
        q: "Can I use the platform without creating an account?",
        a: "A limited demo mode may be available without account creation. Full features such as personalized watchlists, live Agentic RAG news, and buy/sell signals require a registered account.",
      },
      {
        q: "How do I contact TradeFinlytix support?",
        a: "Support is available by email at support@tradefinlytix.com, through the in-platform AI assistant, and through enterprise support channels. Typical response time is within 24 business hours.",
      },
      {
        q: "What happens if the AI provides wrong information or a bad signal?",
        a: "TradeFinlytix is a decision-support tool, not a guarantee of outcomes. Users are responsible for investment decisions, and the platform disclaims liability for losses from reliance on model outputs.",
      },
      {
        q: "Will TradeFinlytix expand beyond PSX?",
        a: "Expansion is on the roadmap, including possible coverage for Tadawul, Dhaka Stock Exchange, and NSE India. Announcements will be made through official channels.",
      },
    ],
  },
];

function AccordionItem({
  q,
  a,
  index,
  accent,
  darkAccent,
  mono,
}: {
  q: string;
  a: string;
  index: number;
  accent: string;
  darkAccent: string;
  mono: boolean;
}) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const color = mono ? darkAccent : accent;

  return (
    <div
      style={{
        border: `1.5px solid ${open ? color : mono ? "#334155" : "#e5e7eb"}`,
        borderRadius: 14,
        marginBottom: 10,
        background: mono ? "#1e293b" : "#ffffff",
        overflow: "hidden",
        transition: "border-color 0.2s ease, background 0.2s ease",
        boxShadow: open
          ? mono
            ? `0 4px 20px rgba(0,0,0,0.3)`
            : `0 4px 20px rgba(22,163,74,0.08)`
          : "none",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              minWidth: 28,
              height: 28,
              borderRadius: 8,
              background: open ? color : mono ? "#334155" : "#f1f5f9",
              color: open ? "#fff" : mono ? "#94a3b8" : "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              transition: "background 0.2s ease, color 0.2s ease",
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: mono ? "#f1f5f9" : "#111827",
              lineHeight: 1.4,
            }}
          >
            {q}
          </span>
        </div>
        <span
          style={{
            color: open ? color : mono ? "#64748b" : "#9ca3af",
            transition: "transform 0.25s ease, color 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <ChevronDown size={18} strokeWidth={2.5} />
        </span>
      </button>

      <div
        ref={bodyRef}
        style={{
          maxHeight: open ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <p
          style={{
            padding: "0 20px 20px 60px",
            fontSize: 14.5,
            color: mono ? "#94a3b8" : "#4b5563",
            lineHeight: 1.75,
            margin: 0,
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [mono, setMono] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateMono = () => {
      setMono(
        document.documentElement.classList.contains("tfx-mono") ||
          localStorage.getItem("tfx_theme") === "mono"
      );
    };
    updateMono();
    const observer = new MutationObserver(updateMono);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Count total questions before a section
  const questionOffset = (sectionIdx: number) =>
    faqSections.slice(0, sectionIdx).reduce((sum, s) => sum + s.items.length, 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: mono ? "#0f172a" : "#ffffff",
        color: mono ? "#f1f5f9" : "#111827",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      <LandingNavbar mono={mono} />
      <div style={{ height: 84 }} />

      {/* ── Hero ── */}
      <header
        style={{
          background: mono
            ? "linear-gradient(135deg, #0a1f0a 0%, #0f172a 100%)"
            : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%)",
          borderBottom: `1px solid ${mono ? "#166534" : "#bbf7d0"}`,
          padding: "72px 24px 80px",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.2s ease",
        }}
      >
        {/* decorative blobs */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 420, height: 420, borderRadius: "50%", background: mono ? "radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)" : "radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "20%", width: 300, height: 300, borderRadius: "50%", background: mono ? "radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 70%)" : "radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="hero-two-col" style={{ maxWidth: 1120, margin: "0 auto", position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

          {/* LEFT — text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: mono ? "#14532d" : "#dcfce7", border: `1px solid ${mono ? "#166534" : "#bbf7d0"}`, color: mono ? "#4ade80" : "#15803d", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 22 }}
            >
              Pakistan Stock Exchange AI Platform
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.15 }}
              style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(42px, 5vw, 72px)", lineHeight: 1.04, letterSpacing: "-1.5px", margin: "0 0 20px", color: mono ? "#f1f5f9" : "#0f172a", fontWeight: 700 }}
            >
              Frequently Asked
              <br />
              <span style={{ color: "#16A34A", fontWeight: 700 }}>Questions</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
              style={{ fontSize: 16, color: mono ? "#94a3b8" : "#4b5563", lineHeight: 1.75, maxWidth: 480, margin: "0 0 36px" }}
            >
              Everything you need to know about TradeFinlytix — our AI platform, data practices, and how to get started investing on PSX.
            </motion.p>

            {/* stats */}
            <motion.div
              style={{ display: "flex", gap: 36, flexWrap: "wrap" as const }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
            >
              {[
                { label: "Sections", value: "4" },
                { label: "Questions", value: `${faqSections.reduce((s, sec) => s + sec.items.length, 0)}` },
                { label: "Version", value: "1.0" },
              ].map((stat, i) => (
                <div key={stat.label} style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
                  <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#16A34A", lineHeight: 1, fontWeight: 700 }}>{stat.value}</span>
                  <span style={{ fontSize: 12, color: mono ? "#64748b" : "#6b7280", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — decorative FAQ preview cards */}
          <motion.div
            className="hero-right-cards"
            style={{ display: "flex", flexDirection: "column" as const, gap: 12, position: "relative" as const }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          >
            {/* floating label */}
            <div style={{ position: "absolute" as const, top: -18, right: 0, background: mono ? "#14532d" : "#16A34A", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, letterSpacing: "0.06em" }}>
              QUICK PREVIEW
            </div>

            {[
              { q: "What is TradeFinlytix?", section: "General", color: "#16A34A" },
              { q: "How do AI buy/sell signals work?", section: "Features & AI", color: "#1D4ED8" },
              { q: "Does TradeFinlytix share my data?", section: "Privacy", color: "#15803D" },
              { q: "What subscription tiers are available?", section: "Subscription", color: "#92400E" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: i % 2 === 1 ? 16 : 0 }}
                transition={{ duration: 0.55, ease: EASE, delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.02, boxShadow: mono ? "0 8px 28px rgba(0,0,0,0.4)" : "0 8px 28px rgba(22,163,74,0.15)", transition: { duration: 0.2 } }}
                style={{
                  background: mono ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(8px)",
                  border: `1.5px solid ${mono ? "#334155" : "#e5e7eb"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: mono ? "0 4px 16px rgba(0,0,0,0.25)" : "0 4px 16px rgba(0,0,0,0.06)",
                  cursor: "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: mono ? "#e2e8f0" : "#111827", lineHeight: 1.3 }}>{item.q}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.color, background: mono ? "rgba(255,255,255,0.05)" : `${item.color}15`, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                  {item.section}
                </span>
              </motion.div>
            ))}

            {/* bottom decoration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              style={{ textAlign: "center" as const, marginTop: 4 }}
            >
              <span style={{ fontSize: 12, color: mono ? "#475569" : "#9ca3af", fontWeight: 600 }}>
                + {faqSections.reduce((s, sec) => s + sec.items.length, 0) - 4} more questions below ↓
              </span>
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* ── Tab nav ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: mono ? "#0f172a" : "#ffffff",
          borderBottom: `1px solid ${mono ? "#1e293b" : "#f1f5f9"}`,
          boxShadow: mono
            ? "0 2px 12px rgba(0,0,0,0.4)"
            : "0 2px 12px rgba(0,0,0,0.06)",
          transition: "background 0.2s ease",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            gap: 4,
            overflowX: "auto",
          }}
        >
          {faqSections.map((section, i) => {
            const active = activeSection === i;
            const color = mono ? section.darkAccent : section.accent;
            return (
              <button
                key={section.title}
                onClick={() => {
                  setActiveSection(i);
                  document
                    .getElementById(`section-${i}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 13.5,
                  fontWeight: active ? 800 : 600,
                  color: active ? color : mono ? "#64748b" : "#6b7280",
                  borderBottom: `2.5px solid ${active ? color : "transparent"}`,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease, border-color 0.2s ease",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <section.Icon size={15} strokeWidth={2.2} />
                {section.shortTitle}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        className="faq-grid-outer"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "64px 24px 100px",
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 40,
          alignItems: "start",
        }}
      >
        {/* Sidebar TOC */}
        <aside
          style={{
            position: "sticky",
            top: 60,
            background: mono ? "#111827" : "#ffffff",
            border: `1.5px solid ${mono ? "#334155" : "#e5e7eb"}`,
            borderRadius: 16,
            padding: "20px",
            transition: "background 0.2s ease",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: mono ? "#64748b" : "#9ca3af",
              marginBottom: 16,
            }}
          >
            Contents
          </p>
          {faqSections.map((section, i) => {
            const active = activeSection === i;
            const color = mono ? section.darkAccent : section.accent;
            return (
              <a
                key={section.title}
                href={`#section-${i}`}
                onClick={() => setActiveSection(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? color : mono ? "#94a3b8" : "#374151",
                  background: active
                    ? mono
                      ? `${section.darkBg}`
                      : `${section.lightBg}`
                    : "transparent",
                  marginBottom: 4,
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <section.Icon
                  size={14}
                  strokeWidth={2.2}
                  color={active ? color : undefined}
                />
                <span style={{ lineHeight: 1.3 }}>
                  {section.shortTitle}
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: mono ? "#475569" : "#9ca3af",
                      fontWeight: 400,
                    }}
                  >
                    {section.items.length} questions
                  </span>
                </span>
              </a>
            );
          })}

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${mono ? "#1e293b" : "#f1f5f9"}`,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: mono ? "#475569" : "#9ca3af",
                lineHeight: 1.6,
              }}
            >
              Can't find what you need?{" "}
              <a
                href="mailto:support@tradefinlytix.com"
                style={{
                  color: "#16A34A",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Email support →
              </a>
            </p>
          </div>
        </aside>

        {/* FAQ sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          {faqSections.map((section, sIdx) => {
            const color = mono ? section.darkAccent : section.accent;
            return (
              <motion.section
                key={section.title}
                id={`section-${sIdx}`}
                style={{ scrollMarginTop: 80 }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                {/* Section header */}
                <motion.div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 24,
                    paddingBottom: 18,
                    borderBottom: `1.5px solid ${mono ? "#1e293b" : "#f1f5f9"}`,
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
                >
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: mono ? section.darkBg : section.lightBg,
                      border: `1.5px solid ${
                        mono ? section.darkAccent + "33" : section.accent + "33"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <section.Icon size={20} strokeWidth={2} />
                  </motion.div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color,
                        marginBottom: 3,
                      }}
                    >
                      Section {sIdx + 1}
                    </div>
                    <h2
                      style={{
                        fontFamily: "'DM Serif Display', serif",
                        fontSize: 26,
                        fontWeight: 700,
                        color: mono ? "#f1f5f9" : "#0f172a",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {section.title}
                    </h2>
                  </div>
                </motion.div>

                {/* Accordion items — staggered */}
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                >
                  {section.items.map((item, iIdx) => (
                    <motion.div key={item.q} variants={fadeUp}>
                      <AccordionItem
                        key={item.q}
                        q={item.q}
                        a={item.a}
                        index={questionOffset(sIdx) + iIdx}
                        accent={section.accent}
                        darkAccent={section.darkAccent}
                        mono={mono}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            );
          })}

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{
              background: mono ? "#111827" : "#f8fafc",
              border: `1.5px solid ${mono ? "#334155" : "#e5e7eb"}`,
              borderRadius: 16,
              padding: "24px 28px",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Shield size={17} color="#16A34A" strokeWidth={2.2} />
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: mono ? "#f1f5f9" : "#111827",
                  margin: "0 0 4px",
                }}
              >
                Document Notice
              </p>
              <p
                style={{
                  fontSize: 13.5,
                  color: mono ? "#94a3b8" : "#4b5563",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                This document is maintained by the TradeFinlytix founding team
                and is subject to revision. Last updated: 2025 &nbsp;·&nbsp; ©
                TradeFinlytix. All rights reserved.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .faq-grid-outer { grid-template-columns: 1fr !important; }
          aside { position: static !important; top: auto !important; }
        }
        @media (max-width: 768px) {
          .hero-two-col { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-right-cards { display: none !important; }
        }
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #16A34A; outline-offset: 2px; }
        a:focus-visible { outline: 2px solid #16A34A; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>
    </main>
  );
}
