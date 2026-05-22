"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/use-theme";
import { useCompanyProfile, useOhlc } from "@/lib/queries";
import { CompanyProfilePanel } from "@/components/analytics/CompanyProfilePanel";
import { OHLCChart } from "@/components/analytics/OHLCChart";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const POPULAR = ["OGDC", "HBL", "ENGRO", "LUCK", "PSO", "MCB", "UBL", "PPL", "SYS", "EFERT"];

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const mono = useTheme();

  const rawSymbol = typeof params?.symbol === "string" ? params.symbol.toUpperCase().trim() : "OGDC";
  const [inputValue, setInputValue] = useState(rawSymbol);
  const [ohlcInterval, setOhlcInterval] = useState("1mo");

  const { data: profile, isLoading: profileLoading, isError: profileError } = useCompanyProfile(rawSymbol);
  const { data: ohlcData, isLoading: ohlcLoading, isError: ohlcError } = useOhlc(rawSymbol, ohlcInterval);

  const card = mono
    ? { bg: "#1e293b", border: "#334155", text: "#f1f5f9", muted: "#64748b", inputBg: "#0f172a" }
    : { bg: "white", border: "#E5E7EB", text: "#111827", muted: "#6B7280", inputBg: "#F9FAFB" };

  const handleSearch = () => {
    const s = inputValue.toUpperCase().trim();
    if (s) router.push(`/analytics/company-profile/${s}`);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Link href="/analytics" style={{ display: "flex", alignItems: "center", gap: 6, color: card.muted, fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
            <ArrowLeft size={14} /> Analytics
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, background: "linear-gradient(135deg,#A78BFA,#7C3AED)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={22} color="white" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: card.text, margin: 0 }}>
              {profile?.name ?? rawSymbol}
            </h1>
            <p style={{ fontSize: 13, color: card.muted, margin: 0 }}>Company profile · PSX listed</p>
          </div>
        </div>
      </motion.div>

      {/* Symbol search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06, ease: EASE }} style={{ marginBottom: 20 }}>
        <div style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 14, padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Enter PSX symbol e.g. HBL"
              style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${card.border}`, background: card.inputBg, color: card.text, fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit" }}
            />
            <button
              onClick={handleSearch}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#7C3AED", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Search size={14} /> Go
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {POPULAR.map(s => (
              <Link key={s} href={`/analytics/company-profile/${s}`}
                style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none",
                  border: `1px solid ${rawSymbol === s ? "#A78BFA" : card.border}`,
                  background: rawSymbol === s ? "#EDE9FE" : "transparent",
                  color: rawSymbol === s ? "#7C3AED" : card.muted,
                }}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Profile panel */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: EASE }} style={{ marginBottom: 20 }}>
        <CompanyProfilePanel data={profile} loading={profileLoading} error={profileError} />
      </motion.div>

      {/* OHLC chart for this symbol */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: EASE }}>
        <OHLCChart
          data={ohlcData}
          loading={ohlcLoading}
          error={ohlcError}
          interval={ohlcInterval}
          onIntervalChange={setOhlcInterval}
        />
      </motion.div>
    </div>
  );
}
