"""
Deterministic rule-based predictor used until persisted ML artifacts are wired.
Outputs a structured stub compatible with `/predict` response envelope.
"""


def predict_symbol_rules(symbol: str) -> dict:
    sym = (symbol or "").strip().upper()[:32]
    if not sym:
        raise ValueError("Symbol must be non-empty.")
    # Lightweight heuristics — replace with calibrated model inference later.
    span = sum(ord(c) for c in sym) % 100
    volatility_hint = span / 100.0
    current_price = round(10.0 + span * 0.85 + (len(sym) * 0.12), 2)

    if volatility_hint >= 0.50:
        signal = "sell"
        expected_gain_pct = -1.0 - (volatility_hint - 0.50) * 10.0
        target_price = round(current_price * (1 - 0.02 - (volatility_hint - 0.50) * 0.10), 2)
        stop_loss = round(current_price * (1 + 0.015), 2)
        time_horizon_days = 1
    else:
        signal = "buy"
        expected_gain_pct = 1.0 + (0.50 - volatility_hint) * 10.0
        target_price = round(current_price * (1 + 0.02 + (0.50 - volatility_hint) * 0.08), 2)
        stop_loss = round(current_price * (1 - 0.025), 2)
        time_horizon_days = 5

    confidence = round(0.35 + (0.55 * abs(0.5 - volatility_hint)), 2)
    confidence = min(max(confidence, 0.25), 0.95)
    rationale = [
        f"checksum_mod={volatility_hint:.2f}",
        "rule_engine_v1_symbol_char_heuristic",
    ]

    return {
        "signal": signal,
        "confidence": confidence,
        "engine": "rule_v1",
        "rationale": rationale,
        "tier": ("watchlist" if len(sym) > 5 else "core"),
        "entry_price": current_price,
        "target_price": target_price,
        "stop_loss": stop_loss,
        "expected_gain_pct": round(expected_gain_pct, 2),
        "time_horizon_days": time_horizon_days,
    }
