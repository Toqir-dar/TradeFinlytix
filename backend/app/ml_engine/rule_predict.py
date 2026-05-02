"""
Deterministic rule-based predictor used until persisted ML artifacts are wired.
Outputs a structured stub compatible with `/predict` response envelope.
"""


def predict_symbol_rules(symbol: str) -> dict:
    sym = (symbol or "").strip().upper()[:32] or "UNKNOWN"
    # Lightweight heuristics — replace with calibrated model inference later.
    span = sum(ord(c) for c in sym) % 100
    volatility_hint = span / 100.0
    if volatility_hint >= 0.72:
        signal = "sell"
    elif volatility_hint >= 0.45:
        signal = "trim"
    else:
        signal = "buy" if volatility_hint <= 0.22 else "hold"
    rationale = [
        f"checksum_mod={volatility_hint:.2f}",
        "rule_engine_v1_symbol_char_heuristic",
    ]
    return {
        "signal": signal,
        "confidence": round(0.2 + volatility_hint * 0.65, 2),
        "engine": "rule_v1",
        "rationale": rationale,
        "tier": ("watchlist" if len(sym) > 5 else "core"),
    }
