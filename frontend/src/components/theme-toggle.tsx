"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "tfx_theme";

interface ThemeToggleProps {
  variant?: "floating" | "nav";
}

export function ThemeToggle({ variant = "floating" }: ThemeToggleProps) {
  const [mono, setMono] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const enabled = stored === "mono";
    setMono(enabled);
    document.documentElement.classList.toggle("tfx-mono", enabled);
    document.body.classList.toggle("tfx-mono", enabled);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("tfx-mono", mono);
    document.body.classList.toggle("tfx-mono", mono);
    localStorage.setItem(STORAGE_KEY, mono ? "mono" : "default");
  }, [mono]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setMono(event.newValue === "mono");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={() => setMono((prev) => !prev)}
        aria-label={mono ? "Switch to color mode" : "Switch to dark mode"}
        title={mono ? "Switch to color mode" : "Switch to dark mode"}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: `1.5px solid ${mono ? "#374151" : "#E5E7EB"}`,
          background: mono ? "#111827" : "white",
          color: mono ? "#e7f9e7" : "#374151",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s ease",
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#4ADE80";
          e.currentTarget.style.background = mono ? "#1a2e1a" : "#F0FDF4";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = mono ? "#374151" : "#E5E7EB";
          e.currentTarget.style.background = mono ? "#111827" : "white";
        }}
      >
        {mono ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
      </button>
    );
  }

  return (
    <div className="tfx-theme-toggle">
      <style>{`
        .tfx-theme-toggle {
          position: fixed;
          right: 24px;
          top: 18px;
          z-index: 1200;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
        }
        .tfx-theme-toggle button {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          border: 1px solid #111827;
          background: #111827;
          color: #ffffff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.2);
          transition: all 0.18s ease;
        }
        .tfx-theme-toggle button:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.28);
        }
        .tfx-theme-toggle button[data-active="true"] {
          background: #ffffff;
          color: #111827;
          border-color: #D1D5DB;
        }
        .tfx-theme-ring {
          position: absolute;
          inset: -6px;
          border-radius: 20px;
          border: 1.5px solid rgba(15, 23, 42, 0.15);
          opacity: 0.6;
          pointer-events: none;
        }
        @media (max-width: 720px) {
          .tfx-theme-toggle { right: 16px; top: 12px; }
          .tfx-theme-toggle button { width: 42px; height: 42px; border-radius: 14px; }
        }
      `}</style>
      <span className="tfx-theme-ring" aria-hidden />
      <button
        type="button"
        data-active={mono}
        onClick={() => setMono((prev) => !prev)}
        aria-label={mono ? "Switch to color mode" : "Switch to dark mode"}
        title={mono ? "Switch to color mode" : "Switch to dark mode"}
      >
        {mono ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
      </button>
    </div>
  );
}
