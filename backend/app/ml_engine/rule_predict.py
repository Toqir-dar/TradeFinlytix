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

    if volatility_hint >= 0.72:
        signal = "sell"
        expected_gain_pct = -3.5 - (volatility_hint - 0.72) * 8.0
        target_price = round(current_price * (1 - 0.04 - (volatility_hint - 0.72) * 0.15), 2)
        stop_loss = round(current_price * (1 + 0.015 + (volatility_hint - 0.72) * 0.05), 2)
        time_horizon_days = 1
    elif volatility_hint >= 0.45:
        signal = "trim"
        expected_gain_pct = 1.5 + (0.72 - volatility_hint) * 4.0
        target_price = round(current_price * (1 + 0.02 + (0.72 - volatility_hint) * 0.02), 2)
        stop_loss = round(current_price * (1 - 0.015), 2)
        time_horizon_days = 3
    elif volatility_hint <= 0.22:
        signal = "buy"
        expected_gain_pct = 4.0 + (0.22 - volatility_hint) * 8.0
        target_price = round(current_price * (1 + 0.05 + (0.22 - volatility_hint) * 0.08), 2)
        stop_loss = round(current_price * (1 - 0.025 - (0.22 - volatility_hint) * 0.015), 2)
        time_horizon_days = 5
    else:
        signal = "hold"
        expected_gain_pct = 0.0
        target_price = None
        stop_loss = None
        time_horizon_days = 2

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
