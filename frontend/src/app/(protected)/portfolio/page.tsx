"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { usePortfolio } from "@/lib/queries";
import Link from "next/link";

const COLORS = ["#4ADE80", "#16A34A", "#86EFAC", "#15803D", "#BBF7D0", "#166534", "#22C55E", "#14532D"];

const MOCK_POSITIONS = [
  { symbol: "OGDC", quantity: 500, avg_price: 173.2, current_price: 175.5, sector: "Energy" },
  { symbol: "HBL", quantity: 200, avg_price: 141.5, current_price: 142.0, sector: "Banking" },
  { symbol: "ENGRO", quantity: 100, avg_price: 316.0, current_price: 318.5, sector: "Chemicals" },
  { symbol: "PSO", quantity: 300, avg_price: 218.5, current_price: 221.0, sector: "Energy" },
];

const MOCK_CHART = [
  { day: "Mon", value: 245000 }, { day: "Tue", value: 251000 },
  { day: "Wed", value: 248000 }, { day: "Thu", value: 263000 },
  { day: "Fri", value: 271000 }, { day: "Sat", value: 268000 },
  { day: "Today", value: 279000 },
];

export default function PortfolioPage() {
  const { data, isLoading } = usePortfolio();
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"positions" | "chart">("positions");

  const rows = data?.positions?.length ? data.positions : MOCK_POSITIONS;

  const totalValue = useMemo(() =>
    rows.reduce((sum: number, p: any) => sum + p.quantity * (p.current_price ?? p.avg_price), 0), [rows]);

  const totalCost = useMemo(() =>
    rows.reduce((sum: number, p: any) => sum + p.quantity * p.avg_price, 0), [rows]);

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = ((totalPnL / totalCost) * 100).toFixed(2);

  const pieData = rows.map((p: any) => ({
    name: p.symbol,
    value: p.quantity * (p.current_price ?? p.avg_price),
  }));

  const savePortfolio = useMutation({
    mutationFn: async () =>
      api.put("/portfolio", {
        positions: [...rows, { symbol, quantity: Number(quantity), avg_price: Number(avgPrice) }],
        metadata: data?.metadata ?? {},
      }),
    onSuccess: () => {
      setSymbol(""); setQuantity(""); setAvgPrice("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9CA3AF", fontSize: 15 }}>
      <div style={{ textAlign: "center" }}>
        Loading portfolio...
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .stat-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .input-field { padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; width: 100%; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: #9CA3AF; }
        .tab-btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.2s; }
        .position-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; transition: background 0.15s; }
        .position-row:hover { background: #F9FAFB; border-radius: 8px; }
        .position-row:last-child { border-bottom: none; }
        .add-btn { background: #16A34A; color: white; border: none; padding: 11px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .add-btn:hover { background: #15803D; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .add-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>
            My Portfolio
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>Track your PSX positions, P&L, and allocation</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/trades" style={{ background: "white", color: "#374151", border: "1.5px solid #E5E7EB", padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Trade History
          </Link>
          <button className="add-btn" onClick={() => setShowForm(!showForm)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            Add Position
          </button>
        </div>
      </div>

      {/* Add Position Form */}
      {showForm && (
        <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#15803D" }}>Add New Position</h3>
          <div className="responsive-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Symbol</label>
              <input className="input-field" placeholder="e.g. OGDC" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Quantity</label>
              <input className="input-field" placeholder="e.g. 500" type="number" value={quantity} onChange={e => setQuantity(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Avg Buy Price (PKR)</label>
              <input className="input-field" placeholder="e.g. 173.50" type="number" value={avgPrice} onChange={e => setAvgPrice(e.target.value)}/>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button className="add-btn" onClick={() => savePortfolio.mutate()} disabled={!symbol || !quantity || !avgPrice || savePortfolio.isPending}>
                {savePortfolio.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: "white", border: "1.5px solid #E5E7EB", color: "#6B7280", padding: "11px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Value", value: `PKR ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${Number(totalPnLPct) >= 0 ? "▲" : "▼"} ${Math.abs(Number(totalPnLPct))}%`, up: Number(totalPnLPct) >= 0 },
          { label: "Total P&L", value: `${totalPnL >= 0 ? "+" : ""}PKR ${Math.abs(totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${totalPnL >= 0 ? "Profit" : "Loss"} overall`, up: totalPnL >= 0 },
          { label: "Positions", value: `${rows.length}`, change: "Active holdings", up: true },
          { label: "Cost Basis", value: `PKR ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: "Total invested", up: true },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div>
              <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{s.value}</p>
              <p style={{ fontSize: 12, color: s.up ? "#16A34A" : "#DC2626", marginTop: 4, fontWeight: 500 }}>{s.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Pie */}
      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Performance Chart */}
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Portfolio Performance</h3>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Last 7 days</p>
            </div>
            <span style={{ background: "#DCFCE7", color: "#15803D", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
              +{totalPnLPct}% ▲
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_CHART}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`}/>
              <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Value"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 13 }}/>
              <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2.5} fill="url(#grad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Allocation</h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>By position value</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v: number) => [`PKR ${v.toLocaleString()}`, "Value"]} contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {pieData.map((p: any, i: number) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }}/>
                <span style={{ color: "#374151", fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Positions</h3>
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{rows.length} holdings</span>
        </div>

        <div className="table-scroll">
          <div className="table-min">
            {/* Table Header */}
            <div className="position-row" style={{ borderBottom: "2px solid #F3F4F6", padding: "8px 16px" }}>
              {["Symbol", "Quantity", "Avg Price", "Current", "Value", "P&L"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
              ))}
            </div>

            {rows.map((p: any, i: number) => {
              const current = p.current_price ?? p.avg_price;
              const value = p.quantity * current;
              const pnl = (current - p.avg_price) * p.quantity;
              const pnlPct = (((current - p.avg_price) / p.avg_price) * 100).toFixed(1);
              return (
                <div key={p.symbol} className="position-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: "#F0FDF4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: "#16A34A" }}>
                      {p.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.symbol}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{p.sector ?? "PSX"}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{p.quantity.toLocaleString()}</span>
                  <span style={{ fontSize: 14, color: "#374151" }}>PKR {p.avg_price.toFixed(2)}</span>
                  <span style={{ fontSize: 14, color: "#374151" }}>PKR {current.toFixed(2)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>PKR {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: pnl >= 0 ? "#16A34A" : "#DC2626" }}>
                      {pnl >= 0 ? "+" : ""}PKR {Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: 11, color: pnl >= 0 ? "#16A34A" : "#DC2626" }}>
                      {pnl >= 0 ? "▲" : "▼"} {Math.abs(Number(pnlPct))}%
                    </div>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>No positions yet</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>Click "Add Position" to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
