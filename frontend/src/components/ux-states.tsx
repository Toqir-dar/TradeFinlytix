"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type Tone = "light" | "dark";

const toneStyles = {
  light: {
    card: "#ffffff",
    border: "#E5E7EB",
    text: "#111827",
    muted: "#6B7280",
    track: "#EEF2F7",
    shimmer: "rgba(255,255,255,0.65)",
    errorBg: "#FEF2F2",
    errorBorder: "#FECACA",
    errorText: "#991B1B",
  },
  dark: {
    card: "#1e293b",
    border: "#334155",
    text: "#f1f5f9",
    muted: "#94a3b8",
    track: "#243244",
    shimmer: "rgba(255,255,255,0.08)",
    errorBg: "#450a0a",
    errorBorder: "#7f1d1d",
    errorText: "#fca5a5",
  },
};

export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 8,
  tone = "light",
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  tone?: Tone;
}) {
  const th = toneStyles[tone];

  return (
    <span
      aria-hidden="true"
      className="tfx-skeleton"
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${th.track} 0%, ${th.shimmer} 45%, ${th.track} 100%)`,
      }}
    />
  );
}

export function StatCardSkeleton({ tone = "light" }: { tone?: Tone }) {
  const th = toneStyles[tone];
  return (
    <div className="stat-card" aria-hidden="true" style={{ background: th.card, border: `1.5px solid ${th.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <div style={{ flex: 1 }}>
          <SkeletonBlock tone={tone} width="45%" height={12} />
          <div style={{ height: 12 }} />
          <SkeletonBlock tone={tone} width="74%" height={24} radius={10} />
          <div style={{ height: 10 }} />
          <SkeletonBlock tone={tone} width="58%" height={12} />
        </div>
        <SkeletonBlock tone={tone} width={40} height={40} radius={12} />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  tone = "light",
}: {
  rows?: number;
  columns?: number;
  tone?: Tone;
}) {
  const th = toneStyles[tone];
  return (
    <div aria-label="Loading table rows" role="status" style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(100px, 1fr))`,
            gap: 12,
            padding: "12px 0",
            borderBottom: row === rows - 1 ? "none" : `1px solid ${th.border}`,
          }}
        >
          {Array.from({ length: columns }).map((__, col) => (
            <SkeletonBlock key={col} tone={tone} height={14} width={col === 0 ? "86%" : "70%"} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this section. Please try again.",
  onRetry,
  tone = "light",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  tone?: Tone;
}) {
  const th = toneStyles[tone];
  return (
    <div
      role="alert"
      style={{
        background: th.errorBg,
        border: `1px solid ${th.errorBorder}`,
        borderRadius: 12,
        padding: 16,
        color: th.errorText,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <AlertTriangle size={18} strokeWidth={2.3} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{message}</div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${th.errorBorder}`,
            background: "transparent",
            color: th.errorText,
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={13} />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  tone = "light",
}: {
  title: string;
  message: string;
  tone?: Tone;
}) {
  const th = toneStyles[tone];
  return (
    <div style={{ textAlign: "center", padding: "44px 20px", color: th.muted }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: th.text }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 5, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}
