"use client";

import { useState } from "react";
import { Plus, Search, TrendingUp, TrendingDown, BarChart3, DollarSign } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { useTrades } from "@/lib/queries";

const MOCK_TRADES = [
  { _id: "1", timestamp: new Date(Date.now() - 1000*60*30).toISOString(), trade: { symbol: "OGDC", side: "buy", quantity: 500, price: 173.2 } },
  { _id: "2", timestamp: new Date(Date.now() - 1000*60*90).toISOString(), trade: { symbol: "HBL", side: "sell", quantity: 200, price: 141.5 } },
  { _id: "3", timestamp: new Date(Date.now() - 1000*60*150).toISOString(), trade: { symbol: "ENGRO", side: "buy", quantity: 100, price: 316.0 } },
  { _id: "4", timestamp: new Date(Date.now() - 1000*60*240).toISOString(), trade: { symbol: "PSO", side: "buy", quantity: 300, price: 218.5 } },
  { _id: "5", timestamp: new Date(Date.now() - 1000*60*60*5).toISOString(), trade: { symbol: "LUCK", side: "sell", quantity: 150, price: 895.0 } },
  { _id: "6", timestamp: new Date(Date.now() - 1000*60*60*8).toISOString(), trade: { symbol: "MARI", side: "buy", quantity: 80, price: 1420.0 } },
  { _id: "7", timestamp: new Date(Date.now() - 1000*60*60*24).toISOString(), trade: { symbol: "MCB", side: "buy", quantity: 400, price: 185.5 } },
  { _id: "8", timestamp: new Date(Date.now() - 1000*60*60*26).toISOString(), trade: { symbol: "OGDC", side: "sell", quantity: 200, price: 176.0 } },
];

const MOCK_CHART = [
  { day: "Mon", buy: 4, sell: 2 },
  { day: "Tue", buy: 3, sell: 1 },
  { day: "Wed", buy: 6, sell: 3 },
  { day: "Thu", buy: 2, sell: 4 },
  { day: "Fri", buy: 5, sell: 2 },
  { day: "Sat", buy: 1, sell: 0 },
  { day: "Today", buy: 3, sell: 2 },
];

export default function TradesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useTrades();
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [search, setSearch] = useState("");

  const items = data?.items?.length ? data.items : MOCK_TRADES;

  const filtered = items.filter((t: any) => {
    const matchFilter = filter === "all" || t.trade.side === filter;
    const matchSearch = !search || t.trade.symbol.includes(search.toUpperCase());
    return matchFilter && matchSearch;
  });

  const totalBuy = items.filter((t: any) => t.trade.side === "buy").length;
  const totalSell = items.filter((t: any) => t.trade.side === "sell").length;
  const totalVolume = items.reduce((sum: number, t: any) => sum + t.trade.quantity * t.trade.price, 0);

  const addTrade = useMutation({
    mutationFn: async () => api.post("/portfolio/trades", { symbol, side, quantity: Number(quantity), price: Number(price) }),
    onSuccess: () => {
      setSymbol(""); setQuantity(""); setPrice("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9CA3AF" }}>
      <div style={{ textAlign: "center" }}>
        Loading trades...
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display&display=swap');
        .stat-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 22px; transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .section-card { background: white; border: 1.5px solid #E5E7EB; border-radius: 16px; padding: 24px; }
        .input-field { padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; background: white; color: #111827; width: 100%; }
        .input-field:focus { border-color: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.1); }
        .input-field::placeholder { color: #9CA3AF; }
        .filter-btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1.5px solid #E5E7EB; background: white; color: #6B7280; font-family: inherit; transition: all 0.2s; }
        .filter-btn.active { background: #111827; color: white; border-color: #111827; }
        .filter-btn.buy.active { background: #16A34A; border-color: #16A34A; }
        .filter-btn.sell.active { background: #DC2626; border-color: #DC2626; }
        .trade-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; align-items: center; transition: background 0.15s; }
        .trade-row:hover { background: #F9FAFB; border-radius: 8px; }
        .trade-row:last-child { border-bottom: none; }
        .add-btn { background: #16A34A; color: white; border: none; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
        .add-btn:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .chip { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", marginBottom: 6 }}>Trade History</h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>All your PSX buy and sell transactions</p>
        </div>
        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} color="white" strokeWidth={2.5} />
          Log Trade
        </button>
      </div>

      {/* Add Trade Form */}
      {showForm && (
        <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#15803D" }}>Log New Trade</h3>
          <div className="responsive-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Symbol</label>
              <input className="input-field" placeholder="e.g. OGDC" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Side</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(["buy", "sell"] as const).map(s => (
                  <button key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: "11px", border: `1.5px solid ${side === s ? (s === "buy" ? "#16A34A" : "#DC2626") : "#E5E7EB"}`, borderRadius: 10, background: side === s ? (s === "buy" ? "#DCFCE7" : "#FEE2E2") : "white", color: side === s ? (s === "buy" ? "#15803D" : "#991B1B") : "#6B7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Quantity</label>
              <input className="input-field" placeholder="e.g. 500" type="number" value={quantity} onChange={e => setQuantity(e.target.value)}/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Price (PKR)</label>
              <input className="input-field" placeholder="e.g. 173.50" type="number" value={price} onChange={e => setPrice(e.target.value)}/>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="add-btn" onClick={() => addTrade.mutate()} disabled={!symbol || !quantity || !price || addTrade.isPending}>
                {addTrade.isPending ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: "white", border: "1.5px solid #E5E7EB", color: "#6B7280", padding: "11px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="responsive-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Trades", value: items.length, sub: "All time", Icon: BarChart3, iconBg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", iconColor: "#1D4ED8" },
          { label: "Buy Orders", value: totalBuy, sub: "Purchases", color: "#16A34A", Icon: TrendingUp, iconBg: "linear-gradient(135deg,#DCFCE7,#BBF7D0)", iconColor: "#15803D" },
          { label: "Sell Orders", value: totalSell, sub: "Exits", color: "#DC2626", Icon: TrendingDown, iconBg: "linear-gradient(135deg,#FEE2E2,#FECACA)", iconColor: "#991B1B" },
          { label: "Total Volume", value: `PKR ${(totalVolume/1000).toFixed(0)}K`, sub: "Traded", Icon: DollarSign, iconBg: "linear-gradient(135deg,#FEF3C7,#FDE68A)", iconColor: "#92400E" },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.color ?? "#111827" }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>{s.sub}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: s.iconColor }}>
                <s.Icon size={18} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 24 }}>
        {/* Activity Chart */}
        <div className="section-card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Trade Activity</h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Buy vs Sell (7 days)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MOCK_CHART} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}/>
              <Bar dataKey="buy" fill="#4ADE80" radius={[4, 4, 0, 0]} name="Buy"/>
              <Bar dataKey="sell" fill="#FCA5A5" radius={[4, 4, 0, 0]} name="Sell"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Trades mini */}
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Recent Activity</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "buy", "sell"] as const).map(f => (
                <button key={f} className={`filter-btn ${f} ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {filtered.slice(0, 5).map((t: any) => (
            <div key={t._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: t.trade.side === "buy" ? "#DCFCE7" : "#FEE2E2", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: t.trade.side === "buy" ? "#15803D" : "#991B1B" }}>
                  {t.trade.symbol.slice(0, 3)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.trade.symbol}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(t.timestamp).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span className="chip" style={{ background: t.trade.side === "buy" ? "#DCFCE7" : "#FEE2E2", color: t.trade.side === "buy" ? "#15803D" : "#991B1B" }}>
                  {t.trade.side}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>PKR {t.trade.price.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Qty: {t.trade.quantity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>All Trades</h3>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", display: "flex" }}>
              <Search size={14} strokeWidth={2} />
            </div>
            <input className="input-field" style={{ paddingLeft: 32, width: 200 }} placeholder="Search symbol..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>

        <div className="table-scroll">
          <div className="table-min">
            {/* Table Header */}
            <div className="trade-row" style={{ borderBottom: "2px solid #F3F4F6", padding: "8px 16px" }}>
              {["Date & Time", "Symbol", "Side", "Quantity", "Price", "Total"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
              ))}
            </div>

            {filtered.map((t: any) => {
              const total = t.trade.quantity * t.trade.price;
              return (
                <div key={t._id} className="trade-row">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{new Date(t.timestamp).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(t.timestamp).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, background: "#F0FDF4", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#16A34A" }}>
                      {t.trade.symbol.slice(0, 3)}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.trade.symbol}</span>
                  </div>
                  <span>
                    <span className="chip" style={{ background: t.trade.side === "buy" ? "#DCFCE7" : "#FEE2E2", color: t.trade.side === "buy" ? "#15803D" : "#991B1B" }}>
                      {t.trade.side}
                    </span>
                  </span>
                  <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{t.trade.quantity.toLocaleString()}</span>
                  <span style={{ fontSize: 14, color: "#374151" }}>PKR {t.trade.price.toFixed(2)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>PKR {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 24px", color: "#9CA3AF" }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>No trades found</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>Try a different filter or log a new trade</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
