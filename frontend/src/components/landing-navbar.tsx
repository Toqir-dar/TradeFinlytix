"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Legal", href: "/legal" },
  { label: "FAQ", href: "/faq" },
];

export function LandingNavbar({ mono }: { mono: boolean }) {
  const [open, setOpen] = useState(false);
  const th = mono
    ? {
        text: "#f1f5f9",
        navLink: "#94a3b8",
        mobileNavBg: "#111827",
        mobileBtnBg: "#1e293b",
        mobileBtnBorder: "#334155",
        mobileBtnIcon: "#94a3b8",
        chipBg: "#0f172a",
      }
    : {
        text: "#111827",
        navLink: "#374151",
        mobileNavBg: "white",
        mobileBtnBg: "white",
        mobileBtnBorder: "#E5E7EB",
        mobileBtnIcon: "#374151",
        chipBg: "#F0FDF4",
      };

  return (
    <>
      <style>{`
        .landing-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
          background: ${mono ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)"};
          border-bottom: 1px solid ${mono ? "#334155" : "#E5E7EB"};
        }
        .landing-navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .landing-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: ${th.text};
          text-decoration: none;
          font-weight: 800;
          font-size: 18px;
        }
        .landing-desktop-nav {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .landing-nav-link {
          display: flex;
          align-items: center;
          padding: 8px 14px;
          border-radius: 10px;
          color: ${th.navLink};
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .landing-nav-link:hover {
          background: ${mono ? "#1a2e1a" : "#F0FDF4"};
          color: ${mono ? "#4ADE80" : "#16A34A"};
        }
        .landing-auth {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .landing-mobile-toggle {
          display: none;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1.5px solid ${th.mobileBtnBorder};
          background: ${th.mobileBtnBg};
          color: ${th.mobileBtnIcon};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .landing-mobile-toggle:hover {
          border-color: ${mono ? "#4ade80" : "#16A34A"};
        }
        .landing-mobile-menu {
          background: ${th.mobileNavBg};
          padding: 16px 24px 24px;
          border-top: 1px solid ${th.mobileBtnBorder};
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .landing-mobile-link {
          display: block;
          color: ${th.navLink};
          text-decoration: none;
          font-weight: 500;
          font-size: 15px;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 2px;
        }
        .landing-mobile-link:hover {
          background: ${th.chipBg};
          color: ${mono ? "#4ade80" : "#16A34A"};
        }
        @media (max-width: 900px) {
          .landing-desktop-nav,
          .landing-auth {
            display: none !important;
          }
          .landing-mobile-toggle {
            display: flex !important;
          }
        }
      `}</style>

      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <Link href="/" className="landing-brand">
            <Image src="/logo.png" alt="TradeFinlytix" width={28} height={28} />
            <span>TradeFinlytix</span>
          </Link>

          <nav className="landing-desktop-nav">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="landing-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="landing-auth">
            <ThemeToggle variant="nav" />
            <Link href="/login" className="landing-nav-link" style={{ border: `1.5px solid ${mono ? "#4ADE80" : "#16A34A"}`, padding: "10px 20px" }}>
              Login
            </Link>
            <Link href="/register" className="landing-nav-link" style={{ background: mono ? "#4ADE80" : "#16A34A", color: "white", padding: "10px 20px" }}>
              Get Started
              <ArrowRight size={15} color="white" strokeWidth={2} />
            </Link>
          </div>

          <button className="landing-mobile-toggle" onClick={() => setOpen((prev) => !prev)} aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="landing-mobile-menu">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="landing-mobile-link" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="landing-mobile-link" onClick={() => setOpen(false)}>
              Login
            </Link>
            <Link href="/register" className="landing-mobile-link" onClick={() => setOpen(false)}>
              Get Started
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
