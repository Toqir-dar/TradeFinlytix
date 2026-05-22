"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tfx_theme";

export function useTheme(): boolean {
  const [mono, setMono] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMono(
      document.documentElement.classList.contains("tfx-mono") ||
      localStorage.getItem(STORAGE_KEY) === "mono"
    );
    const observer = new MutationObserver(() => {
      setMono(document.documentElement.classList.contains("tfx-mono"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return mono;
}
