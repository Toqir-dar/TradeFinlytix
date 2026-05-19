"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ChatRole = "user" | "assistant" | "system";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ReportMetric = {
  label: string;
  value: string;
};

type ReportSection = {
  title: string;
  items: string[];
};

type ParsedReport = {
  title: string;
  subtitle?: string;
  metrics: ReportMetric[];
  sections: ReportSection[];
  footer?: string;
};

type KeyValuePair = {
  label: string;
  value: string;
};

type PrettyBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "kv"; items: KeyValuePair[] }
  | { type: "code"; code: string; language?: string };

const INTRO_MESSAGE =
  "Hi, I am TradeFinlytix AI. Ask me about PSX, predictions, or platform features.";

const STARTER_PROMPTS = [
  "What is the prediction for OGDC today?",
  "Summarize TradeFinlytix in two sentences.",
  "What are the latest PSX market signals?",
];

const REPORT_SECTION_TITLES = [
  "Price Targets",
  "Top Driving Factors",
  "Model Rationale",
  "Risk Assessment",
];

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const BULLET_PATTERN = /^\s*(?:-|\*|\u2022|\u00B7)\s+/;
const NUMBERED_PATTERN = /^\s*\d+[\.)]\s+/;

const stripMarkdownBold = (text: string) => text.replace(/\*\*/g, "");
const stripMarkdownHeading = (text: string) => text.replace(/^#{1,6}\s*/, "");
const stripLeadingSymbols = (text: string) => text.replace(/^[^A-Za-z0-9]+/, "");

const isSeparatorLine = (line: string) => (
  /^[\s\-_=*~.]+$/.test(line) || /^[\s\u2500-\u257F]+$/.test(line)
);

const isBulletLine = (line: string) => BULLET_PATTERN.test(line);
const isNumberedLine = (line: string) => NUMBERED_PATTERN.test(line);

const stripBulletPrefix = (line: string) => line.replace(BULLET_PATTERN, "");
const stripNumberedPrefix = (line: string) => line.replace(NUMBERED_PATTERN, "");

const getNextMeaningfulLine = (lines: string[], index: number) => {
  for (let i = index + 1; i < lines.length; i += 1) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    if (isSeparatorLine(candidate)) continue;
    return candidate;
  }
  return null;
};

const parseKeyValueLine = (line: string): KeyValuePair | null => {
  const candidate = stripNumberedPrefix(stripBulletPrefix(line)).trim();
  const index = candidate.indexOf(":");
  if (index === -1) return null;
  const label = candidate.slice(0, index).trim();
  const value = candidate.slice(index + 1).trim();
  if (!label || !value) return null;
  if (!/[A-Za-z]/.test(label)) return null;
  if (label.length > 48) return null;
  return { label, value };
};

const isHeadingLine = (raw: string, nextLine: string | null) => {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^\*\*.+\*\*$/.test(trimmed)) return true;
  if (/:\s*$/.test(trimmed) && !/:\s+\S/.test(trimmed)) return true;

  const cleaned = stripLeadingSymbols(stripMarkdownHeading(stripMarkdownBold(trimmed)))
    .replace(/:$/, "")
    .trim();
  if (cleaned.length < 4 || cleaned.length > 50) return false;
  if (/[.!?]$/.test(cleaned)) return false;

  if (!nextLine) return false;
  const nextTrimmed = nextLine.trim();
  return (
    isBulletLine(nextTrimmed) ||
    isNumberedLine(nextTrimmed) ||
    !!parseKeyValueLine(nextTrimmed)
  );
};

const parsePrettyBlocks = (content: string): PrettyBlock[] => {
  const lines = content.split(/\r?\n/);
  const blocks: PrettyBlock[] = [];
  let paragraphParts: string[] = [];
  let listType: "bullets" | "numbered" | null = null;
  let listItems: string[] = [];
  let kvItems: KeyValuePair[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang: string | undefined;

  const flushParagraph = () => {
    if (!paragraphParts.length) return;
    blocks.push({ type: "paragraph", text: paragraphParts.join(" ").trim() });
    paragraphParts = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  const flushKv = () => {
    if (!kvItems.length) return;
    blocks.push({ type: "kv", items: kvItems });
    kvItems = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushKv();
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", code: codeLines.join("\n"), language: codeLang });
        inCodeBlock = false;
        codeLines = [];
        codeLang = undefined;
      } else {
        flushAll();
        inCodeBlock = true;
        codeLang = trimmed.replace(/```/, "").trim() || undefined;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(raw);
      continue;
    }

    if (!trimmed || isSeparatorLine(trimmed)) {
      flushAll();
      continue;
    }

    const nextLine = getNextMeaningfulLine(lines, i);
    if (isHeadingLine(trimmed, nextLine)) {
      flushAll();
      const headingText = stripLeadingSymbols(stripMarkdownHeading(stripMarkdownBold(trimmed)))
        .replace(/:$/, "")
        .trim();
      if (headingText) blocks.push({ type: "heading", text: headingText });
      continue;
    }

    if (isBulletLine(trimmed)) {
      flushParagraph();
      flushKv();
      const item = stripBulletPrefix(trimmed);
      if (listType !== "bullets") {
        flushList();
        listType = "bullets";
      }
      listItems.push(item);
      continue;
    }

    if (isNumberedLine(trimmed)) {
      flushParagraph();
      flushKv();
      const item = stripNumberedPrefix(trimmed);
      if (listType !== "numbered") {
        flushList();
        listType = "numbered";
      }
      listItems.push(item);
      continue;
    }

    const kv = parseKeyValueLine(trimmed);
    if (kv) {
      flushParagraph();
      flushList();
      kvItems.push(kv);
      continue;
    }

    flushList();
    flushKv();
    paragraphParts.push(trimmed);
  }

  if (inCodeBlock) {
    blocks.push({ type: "code", code: codeLines.join("\n"), language: codeLang });
  }

  flushAll();
  return blocks;
};

const normalizeLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const withoutStars = trimmed.replace(/\*\*/g, "");
  const withoutPrefix = withoutStars.replace(/^[^A-Za-z0-9]+/, "");
  return withoutPrefix.trim();
};

const parsePredictionReport = (content: string): ParsedReport | null => {
  if (!/stock prediction report/i.test(content)) return null;

  const metrics: ReportMetric[] = [];
  const sections: ReportSection[] = [];
  let title = "Stock Prediction Report";
  let subtitle: string | undefined;
  let footer: string | undefined;
  let currentSection: ReportSection | null = null;

  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (!/[A-Za-z0-9]/.test(trimmed)) continue;

    const cleaned = normalizeLine(rawLine);
    if (!cleaned) continue;

    const normalized = cleaned.replace(/[\u2013\u2014]/g, "-");
    const lower = normalized.toLowerCase();

    if (lower.includes("stock prediction report")) {
      const parts = normalized.split(/\s*-\s*/);
      if (parts.length > 1) {
        title = parts[0].trim() || title;
        subtitle = parts.slice(1).join(" - ").trim();
      } else {
        title = normalized.trim() || title;
      }
      continue;
    }

    if (lower.includes("ai-generated signal")) {
      footer = normalized.trim();
      continue;
    }

    const sectionTitle = REPORT_SECTION_TITLES.find((label) =>
      lower.startsWith(label.toLowerCase())
    );
    if (sectionTitle) {
      currentSection = { title: sectionTitle, items: [] };
      sections.push(currentSection);
      continue;
    }

    if (normalized.includes(":")) {
      const [label, ...rest] = normalized.split(":");
      const value = rest.join(":").trim();
      if (currentSection) {
        currentSection.items.push(`${label.trim()}: ${value}`);
      } else {
        metrics.push({ label: label.trim(), value });
      }
      continue;
    }

    if (currentSection) {
      currentSection.items.push(normalized);
    }
  }

  return {
    title,
    subtitle,
    metrics,
    sections,
    footer,
  };
};

const splitKeyValue = (text: string) => {
  const index = text.indexOf(":");
  if (index === -1) {
    return { label: "", value: text.trim(), hasLabel: false };
  }
  return {
    label: text.slice(0, index).trim(),
    value: text.slice(index + 1).trim(),
    hasLabel: true,
  };
};

const renderInlineContent = (text: string) => {
  const nodes: Array<string | JSX.Element> = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`strong-${key += 1}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <code key={`code-${key += 1}`} className="tfx-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (!nodes.length) return text;
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

const renderPrettyMessage = (content: string) => {
  const blocks = parsePrettyBlocks(content);
  if (!blocks.length) return content;

  return (
    <div className="tfx-pretty-card">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <div key={`heading-${index}`} className="tfx-pretty-heading">
              {renderInlineContent(block.text)}
            </div>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={`para-${index}`} className="tfx-pretty-paragraph">
              {renderInlineContent(block.text)}
            </p>
          );
        }

        if (block.type === "bullets") {
          return (
            <ul key={`bullets-${index}`} className="tfx-pretty-list">
              {block.items.map((item, itemIndex) => (
                <li key={`bullet-${index}-${itemIndex}`}>
                  {renderInlineContent(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "numbered") {
          return (
            <ol key={`numbered-${index}`} className="tfx-pretty-ordered">
              {block.items.map((item, itemIndex) => (
                <li key={`num-${index}-${itemIndex}`}>
                  {renderInlineContent(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "kv") {
          return (
            <div key={`kv-${index}`} className="tfx-pretty-kv">
              {block.items.map((item, itemIndex) => (
                <div key={`kv-${index}-${itemIndex}`} className="tfx-pretty-kv-row">
                  <span className="tfx-pretty-kv-label">{renderInlineContent(item.label)}</span>
                  <span className="tfx-pretty-kv-value">{renderInlineContent(item.value)}</span>
                </div>
              ))}
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={`code-${index}`} className="tfx-pretty-code" data-lang={block.language}>
              <code>{block.code}</code>
            </pre>
          );
        }

        return null;
      })}
    </div>
  );
};

export function RagChatWidget() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: buildId(), role: "assistant", content: INTRO_MESSAGE },
  ]);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, sending]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = async (override?: string) => {
    const question = (override ?? input).trim();
    if (!question || sending) return;

    if (!user) {
      appendMessage({
        id: buildId(),
        role: "system",
        content: "Please sign in to use the assistant.",
      });
      return;
    }

    setInput("");
    setSending(true);
    appendMessage({ id: buildId(), role: "user", content: question });

    try {
      const { data } = await api.post("/rag/query", { question });
      const answer = typeof data?.answer === "string" && data.answer.trim()
        ? data.answer
        : "No answer returned. Please try again.";
      appendMessage({ id: buildId(), role: "assistant", content: answer });
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      const fallback = status === 401
        ? "Your session expired. Please sign in again."
        : "RAG request failed. Please try again.";
      appendMessage({
        id: buildId(),
        role: "assistant",
        content: detail || fallback,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tfx-chat-theme">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .tfx-chat-theme {
          --tfx-accent: #16A34A;
          --tfx-accent-contrast: #FFFFFF;
          --tfx-accent-strong: #111827;
          --tfx-accent-soft: rgba(34, 197, 94, 0.3);
          --tfx-accent-shadow: rgba(22, 163, 74, 0.35);
          --tfx-accent-shadow-hover: rgba(22, 163, 74, 0.4);
          --tfx-surface: #FFFFFF;
          --tfx-surface-muted: #F8FAFC;
          --tfx-surface-subtle: #F0FDF4;
          --tfx-border: #E2E8F0;
          --tfx-border-strong: #E5E7EB;
          --tfx-text: #111827;
          --tfx-heading: #0F172A;
          --tfx-muted: #6B7280;
          --tfx-muted-strong: #475569;
          --tfx-auth-bg: #FFFBEB;
          --tfx-auth-border: #FDE68A;
          --tfx-auth-text: #92400E;
          --tfx-system-bg: #FEF3C7;
          --tfx-system-border: #FDE68A;
          --tfx-system-text: #92400E;
          --tfx-user-bg: linear-gradient(135deg, #111827, #1F2937);
          --tfx-user-text: #FFFFFF;
          --tfx-assistant-bg: #FFFFFF;
          --tfx-assistant-border: #E2E8F0;
          --tfx-report-card-bg: #F8FAFC;
          --tfx-kv-bg: #FFFFFF;
          --tfx-code-bg: #0F172A;
          --tfx-code-text: #F8FAFC;
          --tfx-inline-code-bg: #E2E8F0;
          --tfx-inline-code-text: #0F172A;
          --tfx-scroll-thumb: #D1D5DB;
          --tfx-scroll-track: transparent;
          --tfx-header-bg: linear-gradient(135deg, #ECFDF3, #FFFFFF);
          --tfx-badge-bg: linear-gradient(135deg, #DCFCE7, #BBF7D0);
          --tfx-body-bg: linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 55%);
          --tfx-fab-bg: linear-gradient(135deg, #16A34A, #22C55E);
          --tfx-fab-open-bg: linear-gradient(135deg, #111827, #16A34A);
          --tfx-close-bg: #F3F4F6;
          --tfx-close-hover-bg: #E5E7EB;
          --tfx-prompt-bg: #F0FDF4;
          --tfx-prompt-hover-bg: #DCFCE7;
          --tfx-prompt-border: #BBF7D0;
          --tfx-prompt-text: #15803D;
          --tfx-input-bg: #F9FAFB;
          --tfx-input-border: #E5E7EB;
          --tfx-focus-border: #4ADE80;
          --tfx-focus-ring: rgba(74, 222, 128, 0.18);
          --tfx-send-bg: #16A34A;
        }
        html.tfx-mono .tfx-chat-theme,
        body.tfx-mono .tfx-chat-theme {
          --tfx-accent: #22C55E;
          --tfx-accent-contrast: #0B0F0B;
          --tfx-accent-strong: #0B0F0B;
          --tfx-accent-soft: rgba(34, 197, 94, 0.25);
          --tfx-accent-shadow: rgba(22, 163, 74, 0.35);
          --tfx-accent-shadow-hover: rgba(22, 163, 74, 0.45);
          --tfx-surface: #0B0F0B;
          --tfx-surface-muted: #0F1C0F;
          --tfx-surface-subtle: #0F1C0F;
          --tfx-border: #1F2A1F;
          --tfx-border-strong: #1F2A1F;
          --tfx-text: #E7F9E7;
          --tfx-heading: #F1FFF1;
          --tfx-muted: #9EDCA3;
          --tfx-muted-strong: #B9E8BD;
          --tfx-auth-bg: #0F1C0F;
          --tfx-auth-border: #1F2A1F;
          --tfx-auth-text: #B9E8BD;
          --tfx-system-bg: #0F1C0F;
          --tfx-system-border: #1F2A1F;
          --tfx-system-text: #B9E8BD;
          --tfx-user-bg: linear-gradient(135deg, #22C55E, #16A34A);
          --tfx-user-text: #0B0F0B;
          --tfx-assistant-bg: #0B0F0B;
          --tfx-assistant-border: #1F2A1F;
          --tfx-report-card-bg: #0F1C0F;
          --tfx-kv-bg: #0B0F0B;
          --tfx-code-bg: #050805;
          --tfx-code-text: #D9F7DA;
          --tfx-inline-code-bg: #1A2E1A;
          --tfx-inline-code-text: #D9F7DA;
          --tfx-scroll-thumb: #22C55E;
          --tfx-scroll-track: transparent;
          --tfx-header-bg: linear-gradient(135deg, #0F1C0F, #0B0F0B);
          --tfx-badge-bg: linear-gradient(135deg, #1A2E1A, #0F1C0F);
          --tfx-body-bg: linear-gradient(180deg, #0B0F0B 0%, #0F1C0F 55%);
          --tfx-fab-bg: linear-gradient(135deg, #22C55E, #16A34A);
          --tfx-fab-open-bg: linear-gradient(135deg, #0B0F0B, #16A34A);
          --tfx-close-bg: #1A2E1A;
          --tfx-close-hover-bg: #223B22;
          --tfx-prompt-bg: #0F1C0F;
          --tfx-prompt-hover-bg: #1A2E1A;
          --tfx-prompt-border: #1F2A1F;
          --tfx-prompt-text: #9EF3A8;
          --tfx-input-bg: #0F1C0F;
          --tfx-input-border: #1F2A1F;
          --tfx-focus-border: #22C55E;
          --tfx-focus-ring: rgba(34, 197, 94, 0.25);
          --tfx-send-bg: #22C55E;
        }
        .tfx-chat-fab {
          position: fixed;
          right: 22px;
          bottom: 22px;
          width: 56px;
          height: 56px;
          border-radius: 18px;
          border: none;
          background: var(--tfx-fab-bg);
          color: var(--tfx-accent-contrast);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 18px 40px var(--tfx-accent-shadow);
          cursor: pointer;
          z-index: 1200;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .tfx-chat-fab:hover { transform: translateY(-2px); box-shadow: 0 22px 46px var(--tfx-accent-shadow-hover); }
        .tfx-chat-fab.open { background: var(--tfx-fab-open-bg); }
        .tfx-chat-pulse {
          position: absolute;
          inset: -6px;
          border-radius: 22px;
          border: 2px solid var(--tfx-accent-soft);
          animation: tfxPulse 2.4s ease-in-out infinite;
        }
        .tfx-chat-panel {
          position: fixed;
          right: 22px;
          bottom: 90px;
          width: 360px;
          height: min(560px, 70vh);
          border-radius: 20px;
          border: 1px solid var(--tfx-border);
          background: var(--tfx-surface);
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.18), 0 8px 20px rgba(15, 23, 42, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          opacity: 0;
          transform: translateY(12px) scale(0.98);
          pointer-events: none;
          transition: all 0.22s ease;
          z-index: 1200;
        }
        .tfx-chat-panel.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .tfx-chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--tfx-header-bg);
          border-bottom: 1px solid var(--tfx-border-strong);
        }
        .tfx-chat-badge {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: var(--tfx-badge-bg);
          color: var(--tfx-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tfx-chat-title { font-size: 14px; font-weight: 700; color: var(--tfx-text); }
        .tfx-chat-subtitle { font-size: 12px; color: var(--tfx-muted); margin-top: 2px; }
        .tfx-chat-close {
          margin-left: auto;
          border: none;
          background: var(--tfx-close-bg);
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--tfx-muted);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tfx-chat-close:hover { background: var(--tfx-close-hover-bg); color: var(--tfx-text); }
        .tfx-chat-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--tfx-body-bg);
          min-height: 0;
        }
        .tfx-chat-auth {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: var(--tfx-auth-bg);
          border-bottom: 1px solid var(--tfx-auth-border);
          font-size: 12px;
          color: var(--tfx-auth-text);
        }
        .tfx-chat-auth a {
          background: var(--tfx-send-bg);
          color: var(--tfx-accent-contrast);
          padding: 6px 10px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
        }
        .tfx-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 0;
        }
        .tfx-chat-messages::-webkit-scrollbar { width: 8px; }
        .tfx-chat-messages::-webkit-scrollbar-thumb { background: var(--tfx-scroll-thumb); border-radius: 999px; }
        .tfx-chat-messages::-webkit-scrollbar-track { background: var(--tfx-scroll-track); }
        .tfx-chat-row {
          display: flex;
        }
        .tfx-chat-row.user { justify-content: flex-end; }
        .tfx-chat-row.assistant { justify-content: flex-start; }
        .tfx-chat-row.system { justify-content: flex-start; }
        .tfx-chat-bubble {
          max-width: 80%;
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .tfx-chat-row.user .tfx-chat-bubble {
          background: var(--tfx-user-bg);
          color: var(--tfx-user-text);
          border-top-right-radius: 6px;
        }
        .tfx-chat-row.assistant .tfx-chat-bubble {
          background: var(--tfx-assistant-bg);
          border: 1px solid var(--tfx-assistant-border);
          color: var(--tfx-text);
          border-top-left-radius: 6px;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
        }
        .tfx-chat-bubble-pretty {
          max-width: 92%;
          padding: 0;
          background: var(--tfx-report-card-bg);
          border: 1px solid var(--tfx-border);
          white-space: normal;
        }
        .tfx-pretty-card {
          display: grid;
          gap: 10px;
          padding: 12px;
        }
        .tfx-pretty-heading {
          font-size: 12px;
          font-weight: 700;
          color: var(--tfx-heading);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .tfx-pretty-paragraph {
          margin: 0;
          font-size: 12px;
          color: var(--tfx-muted-strong);
          line-height: 1.6;
        }
        .tfx-pretty-list,
        .tfx-pretty-ordered {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 4px;
          font-size: 12px;
          color: var(--tfx-muted-strong);
        }
        .tfx-pretty-kv {
          display: grid;
          gap: 6px;
        }
        .tfx-pretty-kv-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 8px;
          border-radius: 8px;
          background: var(--tfx-kv-bg);
          border: 1px solid var(--tfx-border);
        }
        .tfx-pretty-kv-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--tfx-muted-strong);
          min-width: 0;
        }
        .tfx-pretty-kv-value {
          font-size: 12px;
          font-weight: 700;
          color: var(--tfx-heading);
          text-align: right;
          min-width: 0;
        }
        .tfx-pretty-code {
          margin: 0;
          padding: 10px 12px;
          border-radius: 10px;
          background: var(--tfx-code-bg);
          color: var(--tfx-code-text);
          font-size: 11px;
          overflow-x: auto;
          line-height: 1.5;
        }
        .tfx-inline-code {
          background: var(--tfx-inline-code-bg);
          border-radius: 6px;
          padding: 1px 5px;
          font-family: "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace;
          font-size: 11px;
          color: var(--tfx-inline-code-text);
        }
        .tfx-chat-bubble-report {
          max-width: 92%;
          padding: 0;
          background: var(--tfx-report-card-bg);
          border: 1px solid var(--tfx-border);
        }
        .tfx-report-card {
          display: grid;
          gap: 12px;
          padding: 14px;
        }
        .tfx-report-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }
        .tfx-report-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--tfx-heading);
        }
        .tfx-report-subtitle {
          font-size: 12px;
          font-weight: 600;
          color: var(--tfx-muted);
        }
        .tfx-report-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .tfx-report-metric {
          background: var(--tfx-surface);
          border: 1px solid var(--tfx-border);
          border-radius: 10px;
          padding: 8px 10px;
        }
        .tfx-report-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--tfx-muted);
          font-weight: 700;
        }
        .tfx-report-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--tfx-heading);
          margin-top: 4px;
        }
        .tfx-report-section {
          background: var(--tfx-surface);
          border: 1px solid var(--tfx-border);
          border-radius: 10px;
          padding: 10px 12px;
          display: grid;
          gap: 6px;
        }
        .tfx-report-section-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--tfx-text);
        }
        .tfx-report-item {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          color: var(--tfx-muted-strong);
        }
        .tfx-report-item-label {
          font-weight: 600;
          color: var(--tfx-muted-strong);
          min-width: 0;
        }
        .tfx-report-item-value {
          color: var(--tfx-heading);
          text-align: right;
          min-width: 0;
        }
        .tfx-report-footer {
          font-size: 11px;
          color: var(--tfx-muted);
          border-top: 1px dashed var(--tfx-border);
          padding-top: 8px;
        }
        .tfx-chat-row.system .tfx-chat-bubble {
          background: var(--tfx-system-bg);
          color: var(--tfx-system-text);
          border: 1px solid var(--tfx-system-border);
        }
        .tfx-chat-typing {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--tfx-muted);
          padding: 0 16px 8px;
        }
        .tfx-chat-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--tfx-accent);
          display: inline-block;
          animation: tfxBlink 1.2s ease-in-out infinite;
        }
        .tfx-chat-dot:nth-child(2) { animation-delay: 0.2s; }
        .tfx-chat-dot:nth-child(3) { animation-delay: 0.4s; }
        .tfx-chat-typing-text { color: var(--tfx-muted); font-size: 12px; }
        .tfx-chat-prompts {
          padding: 0 16px 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tfx-chat-prompt {
          border: 1px solid var(--tfx-prompt-border);
          background: var(--tfx-prompt-bg);
          color: var(--tfx-prompt-text);
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tfx-chat-prompt:hover { background: var(--tfx-prompt-hover-bg); }
        .tfx-chat-input {
          padding: 12px 16px;
          border-top: 1px solid var(--tfx-border-strong);
          background: var(--tfx-surface);
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .tfx-chat-input input {
          flex: 1;
          border: 1px solid var(--tfx-input-border);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: all 0.15s ease;
          background: var(--tfx-input-bg);
          color: var(--tfx-text);
        }
        .tfx-chat-input input:focus { border-color: var(--tfx-focus-border); box-shadow: 0 0 0 3px var(--tfx-focus-ring); }
        .tfx-chat-send {
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          background: var(--tfx-send-bg);
          color: var(--tfx-accent-contrast);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .tfx-chat-send:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes tfxBlink { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes tfxPulse { 0%, 100% { transform: scale(0.96); opacity: 0.2; } 50% { transform: scale(1); opacity: 0.45; } }
        @media (max-width: 640px) {
          .tfx-report-metrics { grid-template-columns: 1fr; }
          .tfx-chat-panel {
            right: 12px;
            left: 12px;
            width: auto;
            height: min(70vh, 520px);
            bottom: 86px;
          }
          .tfx-chat-fab { right: 14px; bottom: 14px; }
        }
      `}</style>

      <button
        type="button"
        className={`tfx-chat-fab ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle AI chat"
        aria-expanded={open}
      >
        <span className="tfx-chat-pulse" aria-hidden />
        <Bot size={24} strokeWidth={2} />
      </button>

      <div className={`tfx-chat-panel ${open ? "open" : ""}`} role="dialog" aria-hidden={!open}>
        <div className="tfx-chat-header">
          <div className="tfx-chat-badge">
            <Sparkles size={18} strokeWidth={2} />
          </div>
          <div>
            <div className="tfx-chat-title">TradeFinlytix AI</div>
            <div className="tfx-chat-subtitle">RAG assistant for market and platform questions</div>
          </div>
          <button
            type="button"
            className="tfx-chat-close"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="tfx-chat-body">
          {!loading && !user && (
            <div className="tfx-chat-auth">
              <span>Sign in to use the assistant.</span>
              <Link href="/login">Login</Link>
            </div>
          )}

          <div className="tfx-chat-messages" ref={listRef}>
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const report = isAssistant ? parsePredictionReport(message.content) : null;
              const pretty = isAssistant && !report ? renderPrettyMessage(message.content) : null;
              const bubbleClass = report
                ? "tfx-chat-bubble-report"
                : pretty
                  ? "tfx-chat-bubble-pretty"
                  : "";

              return (
                <div key={message.id} className={`tfx-chat-row ${message.role}`}>
                  <div className={`tfx-chat-bubble ${bubbleClass}`}>
                    {report ? (
                      <div className="tfx-report-card">
                        <div className="tfx-report-header">
                          <div className="tfx-report-title">{report.title}</div>
                          {report.subtitle && (
                            <div className="tfx-report-subtitle">{report.subtitle}</div>
                          )}
                        </div>

                        {report.metrics.length > 0 && (
                          <div className="tfx-report-metrics">
                            {report.metrics.map((metric) => (
                              <div key={metric.label} className="tfx-report-metric">
                                <div className="tfx-report-label">{metric.label}</div>
                                <div className="tfx-report-value">{metric.value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {report.sections.map((section) => (
                          <div key={section.title} className="tfx-report-section">
                            <div className="tfx-report-section-title">{section.title}</div>
                            {section.items.map((item, index) => {
                              const split = splitKeyValue(item);
                              return (
                                <div key={`${section.title}-${index}`} className="tfx-report-item">
                                  {split.hasLabel ? (
                                    <>
                                      <span className="tfx-report-item-label">{split.label}</span>
                                      <span className="tfx-report-item-value">{split.value}</span>
                                    </>
                                  ) : (
                                    <span className="tfx-report-item-value">{split.value}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}

                        {report.footer && (
                          <div className="tfx-report-footer">{report.footer}</div>
                        )}
                      </div>
                    ) : pretty ? (
                      pretty
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {sending && (
            <div className="tfx-chat-typing">
              <span className="tfx-chat-dot" />
              <span className="tfx-chat-dot" />
              <span className="tfx-chat-dot" />
              <span className="tfx-chat-typing-text">Thinking...</span>
            </div>
          )}

          {messages.length <= 2 && (
            <div className="tfx-chat-prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="tfx-chat-prompt"
                  onClick={() => sendMessage(prompt)}
                  disabled={sending || loading || !user}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="tfx-chat-input"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={user ? "Ask a question..." : "Login to start chatting"}
            disabled={sending || loading || !user}
          />
          <button
            type="submit"
            className="tfx-chat-send"
            disabled={sending || loading || !user || !input.trim()}
            aria-label="Send message"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
