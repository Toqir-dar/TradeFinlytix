"use client";

import React, { useEffect, useState } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "", style, ...props }: CardProps) => {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect the app theme. Do not use prefers-color-scheme here: the app has
    // an explicit light mode, so OS dark preference should not darken cards.
    const STORAGE_KEY = "tfx_theme";
    const check = () => {
      if (typeof document === "undefined") return setIsDark(false);
      const doc = document.documentElement;
      const body = document.body;
      const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "mono";
      const docMono = doc.classList.contains("tfx-mono") || body.classList.contains("tfx-mono");
      const docDark = doc.classList.contains("dark") || body.classList.contains("dark");
      if (stored || docMono) return setIsDark(true);
      if (docDark) return setIsDark(true);
      setIsDark(false);
    };
    check();

    // Observe documentElement and body class changes (e.g., theme toggles like tfx-mono)
    let obs: MutationObserver | null = null;
    try {
      obs = new MutationObserver(() => check());
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    } catch {
      /* ignore */
    }

    return () => {
      if (obs) obs.disconnect();
    };
  }, []);

  const bg = isDark ? "#0f1724" : "#ffffff"; // dark: slate-ish, light: white
  const border = isDark ? "1px solid #273244" : "1px solid #E5E7EB";

  const mergedStyle = { backgroundColor: style?.backgroundColor ?? bg, border: style?.border ?? border, borderRadius: style?.borderRadius ?? 12, padding: style?.padding ?? 16, boxShadow: style?.boxShadow ?? "0 1px 2px rgba(16,24,40,0.04)", ...style } as React.CSSProperties;

  return (
    <div className={className} style={mergedStyle} {...props}>
      {children}
    </div>
  );
};

export default Card;
