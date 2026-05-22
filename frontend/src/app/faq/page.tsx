"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LandingNavbar } from "@/components/landing-navbar";

const faqSections = [
  {
    title: "Section 1: General Information",
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
    title: "Section 2: Platform Features & AI Capabilities",
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
    title: "Section 3: Data, Privacy & Security",
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
    title: "Section 4: Subscription, Access & Support",
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

export default function FaqPage() {
  const [mono, setMono] = useState(false);

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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="faq-page">
      <LandingNavbar mono={mono} />
      <div style={{ height: 84 }} />
      <style>{`
        .faq-page { min-height: 100vh; background: #ffffff; color: #111827; font-family: 'DM Sans', 'Segoe UI', sans-serif; }
        .faq-page, .faq-header, .faq-card, .faq-note, .faq-toc { transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
        .faq-header { background: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 28px 24px 64px; }
        .faq-nav { max-width: 1120px; margin: 0 auto 56px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .faq-brand { display: flex; align-items: center; gap: 10px; color: #111827; text-decoration: none; font-weight: 800; }
        .faq-links { display: flex; gap: 10px; flex-wrap: wrap; }
        .faq-links a { color: #374151; font-size: 14px; font-weight: 700; text-decoration: none; padding: 8px 12px; border-radius: 8px; }
        .faq-links a:hover { background: #dcfce7; color: #15803d; }
        .faq-hero { max-width: 1120px; margin: 0 auto; }
        .faq-kicker { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: #dcfce7; border: 1px solid #bbf7d0; color: #15803d; font-size: 12px; font-weight: 800; }
        .faq-hero h1 { font-family: 'DM Serif Display', serif; font-size: clamp(38px, 6vw, 62px); line-height: 1.05; margin: 18px 0 14px; letter-spacing: -0.8px; }
        .faq-meta { color: #4b5563; line-height: 1.7; font-size: 15px; max-width: 760px; }
        .faq-wrap { max-width: 1120px; margin: 0 auto; padding: 56px 24px 84px; }
        .faq-grid { display: grid; grid-template-columns: 260px 1fr; gap: 28px; align-items: start; }
        .faq-toc { position: sticky; top: 24px; background: #ffffff; border: 1.5px solid #e5e7eb; border-radius: 14px; padding: 18px; }
        .faq-toc h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 12px; }
        .faq-toc a { display: block; color: #111827; text-decoration: none; font-size: 13px; font-weight: 700; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .faq-toc a:hover { color: #16a34a; }
        .faq-doc { display: flex; flex-direction: column; gap: 28px; }
        .faq-section h2 { font-size: 24px; color: #0f172a; margin-bottom: 14px; }
        .faq-card { border: 1.5px solid #e5e7eb; border-radius: 14px; padding: 20px; margin-bottom: 12px; background: #ffffff; }
        .faq-card h3 { font-size: 16px; color: #166534; margin-bottom: 8px; }
        .faq-card p { color: #4b5563; line-height: 1.75; font-size: 14.5px; }
        .faq-note { margin-top: 28px; background: #f8fafc; border: 1.5px solid #e5e7eb; border-radius: 14px; padding: 20px; color: #4b5563; line-height: 1.7; }
        html.tfx-mono .faq-page { background: #0f172a; color: #f1f5f9; }
        html.tfx-mono .faq-header { background: #0a1f0a; border-bottom-color: #166534; }
        html.tfx-mono .faq-brand { color: #f1f5f9 !important; }
        html.tfx-mono .faq-links a { color: #cbd5e1 !important; }
        html.tfx-mono .faq-links a:hover { background: #1a2e1a; color: #4ade80 !important; }
        html.tfx-mono .faq-kicker { background: #14532d; border-color: #166534; color: #4ade80; }
        html.tfx-mono .faq-meta { color: #cbd5e1; }
        html.tfx-mono .faq-toc,
        html.tfx-mono .faq-card,
        html.tfx-mono .faq-note { background: #1e293b; border-color: #334155; }
        html.tfx-mono .faq-toc { background: #111827; }
        html.tfx-mono .faq-toc a { color: #cbd5e1 !important; border-bottom-color: #334155; }
        html.tfx-mono .faq-toc a:hover { color: #4ade80 !important; }
        html.tfx-mono .faq-section h2 { color: #f1f5f9; }
        html.tfx-mono .faq-card h3 { color: #4ade80; }
        html.tfx-mono .faq-card p,
        html.tfx-mono .faq-note { color: #cbd5e1; }
        @media (max-width: 860px) { .faq-grid { grid-template-columns: 1fr; } .faq-toc { position: static; } }
        @media (max-width: 560px) { .faq-nav { align-items: flex-start; flex-direction: column; } }
      `}</style>

      <header className="faq-header">
        <section className="faq-hero">
          <span className="faq-kicker">Pakistan Stock Exchange AI Platform</span>
          <h1>Frequently Asked Questions</h1>
          <p className="faq-meta">
            Version 1.0 | 2025<br />
            Founders: Aleena Ahmed, Toqir Dar, Seerat Fatima, Ayan Ahmed
          </p>
        </section>
      </header>

      <div className="faq-wrap">
        <div className="faq-grid">
          <aside className="faq-toc">
            <h2>FAQ Sections</h2>
            {faqSections.map((section, index) => (
              <a key={section.title} href={`#section-${index + 1}`}>{section.title.replace("Section ", "")}</a>
            ))}
          </aside>

          <div className="faq-doc">
            {faqSections.map((section, index) => (
              <section className="faq-section" id={`section-${index + 1}`} key={section.title}>
                <h2>{section.title}</h2>
                {section.items.map((item, itemIndex) => (
                  <article className="faq-card" key={item.q}>
                    <h3>Q{faqSections.slice(0, index).reduce((sum, s) => sum + s.items.length, 0) + itemIndex + 1}. {item.q}</h3>
                    <p>{item.a}</p>
                  </article>
                ))}
              </section>
            ))}

            <div className="faq-note">
              This document is maintained by the TradeFinlytix founding team and is subject to revision.
              Last updated: 2025 | (c) TradeFinlytix. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
