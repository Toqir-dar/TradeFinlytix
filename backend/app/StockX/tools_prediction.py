"""
Prediction Tool for the StockX RAG pipeline.

Flow:
  1. is_prediction_query()  — keyword heuristic to detect intent
  2. extract_symbol()       — LLM extracts PSX ticker from natural language
  3. _get_service_token()   — authenticates with bootstrap admin (cached, auto-refreshed)
  4. fetch_prediction()     — calls GET /predict/{symbol} with Bearer token
  5. format_prediction_response() — returns a structured, human-readable report

Only changes in StockX/. No FastAPI internals modified.
"""

from __future__ import annotations

import logging
import os
import re
import threading
import time
from typing import Optional

import requests
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

load_dotenv()

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Config  (all overridable via .env)
# ─────────────────────────────────────────────────────────────────────────────

_BASE_URL        = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
_API_PREFIX      = os.getenv("BACKEND_API_PREFIX", "/api/v1")
_SERVICE_EMAIL   = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@tradefinlytix.com")
_SERVICE_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "StrongPass123!")
_REQUEST_TIMEOUT = int(os.getenv("PREDICTION_TOOL_TIMEOUT", "15"))
_TOKEN_TTL_MIN   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ─────────────────────────────────────────────────────────────────────────────
# LLM (reuses the same cheap model used by query.py)
# ─────────────────────────────────────────────────────────────────────────────

_cheap_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.0)

# ─────────────────────────────────────────────────────────────────────────────
# Token Cache  (thread-safe, in-process)
# ─────────────────────────────────────────────────────────────────────────────

_token_lock: threading.Lock = threading.Lock()
_cached_token: Optional[str] = None
_token_expires_at: float = 0.0


def _get_service_token() -> str:
    """Return a cached Bearer token, refreshing automatically before expiry."""
    global _cached_token, _token_expires_at

    with _token_lock:
        # Treat token as stale 60 s before actual expiry
        if _cached_token and time.time() < _token_expires_at - 60:
            return _cached_token

        url = f"{_BASE_URL}{_API_PREFIX}/auth/login"
        try:
            resp = requests.post(
                url,
                json={"email": _SERVICE_EMAIL, "password": _SERVICE_PASSWORD},
                timeout=_REQUEST_TIMEOUT,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise RuntimeError(
                f"[PredictionTool] Cannot authenticate with backend at {url}: {exc}"
            ) from exc

        tokens = resp.json().get("tokens", {})
        access_token = tokens.get("access_token")
        if not access_token:
            raise RuntimeError(
                "[PredictionTool] Login response missing access_token."
            )

        _cached_token = access_token
        _token_expires_at = time.time() + _TOKEN_TTL_MIN * 60
        logger.info(
            "[PredictionTool] Service token refreshed, valid for %d min.", _TOKEN_TTL_MIN
        )
        return _cached_token


# ─────────────────────────────────────────────────────────────────────────────
# Complete PSX Ticker Universe  (used for validation + intent detection)
# ─────────────────────────────────────────────────────────────────────────────

_PSX_TICKERS: frozenset[str] = frozenset({
    "786", "AABS", "AATM", "ABL", "ABOT", "ACIETF", "ACPL", "ADAMS", "ADMM",
    "ADOS", "AEL", "AGHA", "AGIC", "AGIL", "AGL", "AGP", "AGSML", "AGTL",
    "AHCL", "AHL", "AHTM", "AICL", "AIRLINK", "AKBL", "AKDCL", "AKDHL",
    "AKDSL", "AKGL", "AKZO", "ALAC", "ALIFE", "ALNRS", "ALTN", "AMBL",
    "AMTEX", "ANL", "ANSM", "ANTM", "APL", "ARCTM", "ARM", "ARPAK", "ARPL",
    "ARUJ", "ASC", "ASHT", "ASIC", "ASL", "ASLCPS", "ASLPS", "ASTL", "ASTM",
    "ATBA", "ATIL", "ATLH", "ATRL", "AVN", "BAFL", "BAFS", "BAHL", "BAPL",
    "BATA", "BBFL", "BCL", "BECO", "BELA", "BERG", "BFAGRO", "BFBIO",
    "BFMOD", "BGL", "BHAT", "BIFO", "BILF", "BIPL", "BIPLS", "BML", "BNL",
    "BNWM", "BOK", "BOP", "BPL", "BRR", "BRRG", "BTL", "BUXL", "BWCL",
    "BWHL", "BYCO", "CASH", "CCM", "CENI", "CEPB", "CFL", "CHAS", "CHBL",
    "CHCC", "CJPL", "CLCPS", "CLOUD", "CLOV", "CLVL", "CNERGY", "COLG",
    "CPHL", "CPPL", "CRTM", "CSAP", "CSIL", "CTM", "CWSM", "CYAN", "DAAG",
    "DADX", "DAWH", "DBCI", "DCL", "DCR", "DEL", "DFML", "DFSM", "DGKC",
    "DHPL", "DIIL", "DINT", "DKL", "DLL", "DMC", "DMTM", "DNCC", "DOL",
    "DSIL", "DSL", "DSML", "DWAE", "DWSM", "DWTM", "DYNO", "ECOP", "EFERT",
    "EFGH", "EFUG", "EFUL", "ELCM", "ELSM", "EMCO", "ENGRO", "ENGROH",
    "EPCL", "EPCLPS", "EPQL", "ESBL", "EWIC", "EXIDE", "FABL", "FANM",
    "FASM", "FATIMA", "FCCL", "FCEL", "FCEPL", "FCIBL", "FCL", "FCSC",
    "FDIBL", "FDPL", "FECM", "FECTC", "FEM", "FEROZ", "FFBL", "FFC", "FFL",
    "FFLM", "FHAM", "FIBLM", "FIL", "FIMM", "FLYNG", "FML", "FNEL", "FPJM",
    "FPRM", "FRCL", "FRSM", "FSWL", "FTMM", "FTSM", "FUDLM", "FZCM",
    "GADT", "GAIL", "GAL", "GAMON", "GATI", "GATM", "GCIL", "GCWL",
    "GEMBCEM", "GEMBLUEX", "GEMMEL", "GEMNETS", "GEMPACRA", "GEMPAPL",
    "GEMSPNL", "GEMUNSL", "GFIL", "GGGL", "GGL", "GHGL", "GHNI", "GHNL",
    "GLAXO", "GLPL", "GOC", "GRR", "GRYL", "GSKCH", "GSPM", "GTECH",
    "GTYR", "GUSM", "GVGL", "GWLC", "HABSM", "HAEL", "HAFL", "HALEON",
    "HASCOL", "HBL", "HBLTETF", "HCAR", "HCL", "HGFA", "HICL", "HIFA",
    "HINO", "HINOON", "HIRAT", "HMB", "HMM", "HPL", "HRPL", "HSM", "HSPI",
    "HTL", "HUBC", "HUMNL", "HUSI", "HWQS", "IBFL", "IBLHL", "ICCI", "ICI",
    "ICIBL", "ICL", "IDRT", "IDSM", "IDYM", "IGIHL", "IGIL", "ILP", "IMAGE",
    "IML", "IMS", "IMSL", "INDU", "INIL", "INKL", "IPAK", "ISIL", "ISL",
    "ITTEFAQ", "JATM", "JDMT", "JDWS", "JGICL", "JKSM", "JLICL", "JOPP",
    "JSBL", "JSCL", "JSGBETF", "JSGCL", "JSIL", "JSMFETF", "JSML", "JUBS",
    "JVDC", "KAPCO", "KASBM", "KCL", "KEL", "KHSM", "KHTC", "KHYT", "KML",
    "KOHC", "KOHE", "KOHP", "KOHTM", "KOIL", "KOSM", "KPUS", "KSBP",
    "KSTM", "KTML", "LCI", "LEUL", "LIVEN", "LMSM", "LOADS", "LOTCHEM",
    "LPGL", "LPL", "LSECL", "LSEFSL", "LSEPL", "LSEVL", "LUCK", "MACFL",
    "MACTER", "MARI", "MCB", "MCBAH", "MCBIM", "MDTL", "MEBL", "MEHT",
    "MERIT", "META", "MFFL", "MFL", "MIIETF", "MIRKS", "MLCF", "MODAM",
    "MQTM", "MRNS", "MSCL", "MSOT", "MTIL", "MTL", "MUGHAL", "MUGHALC",
    "MUREB", "MWMP", "MZNPETF", "NAGC", "NATF", "NBP", "NBPGETF", "NCL",
    "NCML", "NCPL", "NESTLE", "NETSOL", "NEXT", "NICL", "NITGETF", "NML",
    "NONS", "NPL", "NRL", "NRSL", "NSRM", "OBOY", "OCTOPUS", "OGDC", "OLPL",
    "OLPM", "OML", "ORIXM", "ORM", "OTSU", "P01GIS290526", "PABC", "PACE",
    "PAEL", "PAKD", "PAKL", "PAKMI", "PAKOXY", "PAKRI", "PAKT", "PASL",
    "PASM", "PCAL", "PECO", "PGLC", "PHDL", "PIAA", "PIAHCLA", "PIAHCLB",
    "PIBTL", "PICT", "PIL", "PIM", "PINL", "PIOC", "PKGI", "PKGP", "PKGS",
    "PMI", "PMPK", "PMRS", "PNSC", "POL", "POML", "POWER", "POWERPS", "PPL",
    "PPP", "PPVC", "PREMA", "PRET", "PRL", "PRWM", "PSEL", "PSMC", "PSO",
    "PSX", "PSYL", "PTC", "PTL", "QTECH", "QUET", "QUICE", "RAVT", "RCML",
    "REDCO", "REWM", "RICL", "RMPL", "RPL", "RUBY", "RUPL", "SAIF", "SANSM",
    "SAPL", "SAPT", "SARC", "SASML", "SAZEW", "SBL", "SCBPL", "SCL",
    "SEARL", "SEL", "SEPL", "SERF", "SERT", "SFL", "SGF", "SGPL", "SHCM",
    "SHDT", "SHEL", "SHEZ", "SHFA", "SHJS", "SHNI", "SHSML", "SIBL", "SIEM",
    "SILK", "SINDM", "SITC", "SKRS", "SLGL", "SLL", "SLYT", "SMBL", "SMCPL",
    "SML", "SMTM", "SNAI", "SNBL", "SNGP", "SPCL", "SPEL", "SPL", "SPLC",
    "SPWL", "SRVI", "SSGC", "SSML", "SSOM", "STCL", "STJT", "STL", "STML",
    "STPL", "STYLERS", "SUHJ", "SURC", "SUTM", "SYM", "SYS", "SZTM",
    "TATM", "TBL", "TCORP", "TCORPCPS", "TELE", "TGL", "THALL", "THCCL",
    "TICL", "TOMCL", "TOWL", "TPL", "TPLI", "TPLL", "TPLP", "TPLRF1",
    "TPLT", "TREET", "TRG", "TRIPF", "TRPOL", "TRSM", "TSBL", "TSMF",
    "TSML", "TSPL", "UBDL", "UBL", "UBLPETF", "UCAPM", "UDLI", "UDPL",
    "UNIC", "UNITY", "UPFL", "UVIC", "WAFI", "WAHN", "WASL", "WAVES",
    "WAVESAPP", "WHALE", "WTL", "WYETH", "YOUW", "ZAHID", "ZAL", "ZIL",
    "ZTL",
})

# ─────────────────────────────────────────────────────────────────────────────
# Intent Detection
# ─────────────────────────────────────────────────────────────────────────────

_PREDICTION_KEYWORDS = {
    # Direct intent words
    "predict", "prediction", "forecast", "signal", "outlook", "analysis",
    "recommendation", "recommend", "stance", "view", "opinion",
    # Trade actions
    "buy", "sell", "hold", "purchase", "invest", "trade", "exit", "enter",
    "long", "short", "position",
    # Price-level terms
    "price target", "target price", "stop loss", "entry price", "entry point",
    "support", "resistance", "upside", "downside",
    # Time references that imply forward-looking query
    "tomorrow", "next week", "next month", "this week", "today",
    "short term", "short-term", "near term", "near-term",
    # Directional / technical words
    "bullish", "bearish", "momentum", "trend", "rally", "dip", "correction",
    "breakout", "breakdown", "overbought", "oversold",
    # Confidence / risk words
    "confidence", "risk", "expected gain", "expected loss",
}

# Words that confirm the user is talking about a stock/security
_STOCK_VOCAB = {
    "stock", "share", "shares", "ticker", "scrip", "symbol", "equity",
    "security", "securities", "listed", "psx", "karachi stock", "kse",
    "market", "exchange",
}


def is_prediction_query(query: str) -> bool:
    """
    Returns True when the query is asking for a stock prediction.

    Detection logic (any one sufficient):
      A) A prediction keyword AND (a stock-vocab word OR an uppercase token
         that is a known PSX ticker).
      B) A known PSX ticker appears directly in the query tokens — even
         without any keyword (e.g. bare "ABL prediction?" still fires).
    """
    lower = query.lower()
    tokens = query.split()

    # Check if any token is a known PSX ticker
    ticker_in_query = any(tok.upper() in _PSX_TICKERS for tok in tokens)

    has_keyword = any(kw in lower for kw in _PREDICTION_KEYWORDS)
    has_stock_vocab = any(w in lower for w in _STOCK_VOCAB)

    # Rule A: keyword + stock reference (ticker OR stock vocab)
    if has_keyword and (has_stock_vocab or ticker_in_query):
        return True

    # Rule B: a ticker is present AND any prediction keyword exists
    # (catches "ABL forecast" without the word "stock")
    if ticker_in_query and has_keyword:
        return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Symbol Extraction via LLM
# ─────────────────────────────────────────────────────────────────────────────

_SYMBOL_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a financial assistant specialised in Pakistan Stock Exchange (PSX) tickers.

Your ONLY job is to extract stock ticker symbols that are EXPLICITLY mentioned in the user query.

STRICT RULES:
1. ONLY extract symbols/companies that the user has DIRECTLY named. Never infer, suggest, or add related stocks.
2. If the user says "ABL" or "Allied Bank", return ABL — do NOT add HBL or any other bank.
3. If multiple stocks are explicitly named (e.g. "ABL and HBL"), return all of them: ABL,HBL
4. Return uppercase tickers separated by commas ONLY, e.g.: ABL  or  ABL,HBL  or  OGDC,PPL
5. If NO stock is explicitly named, return exactly: UNKNOWN
6. Output nothing else — no explanation, no extra words, no punctuation beyond commas.

Company name → PSX ticker mapping (use ONLY when company is explicitly mentioned):
  Allied Bank → ABL
  Habib Bank, HBL → HBL
  Oil & Gas Development → OGDC
  Pakistan Petroleum → PPL
  Lucky Cement → LUCK
  Engro Corporation → ENGRO
  MCB Bank → MCB
  United Bank, UBL → UBL
  Meezan Bank → MEBL
  Pak Oilfields → POL
  Hub Power → HUBC
  Systems Limited → SYS
  TRG Pakistan → TRG
  Bank Al-Falah → BAFL
  Fauji Fertilizer → FFC
  Nishat Mills → NML""",
    ),
    ("human", "Query: {query}"),
])

_symbol_chain = _SYMBOL_PROMPT | _cheap_llm | StrOutputParser()


def extract_symbols(query: str) -> list[str]:
    """
    Use LLM to extract one or more PSX ticker symbols from a natural-language query.
    Returns a deduplicated list, e.g. ['ABL', 'HBL'].
    Falls back to ['UNKNOWN'] if nothing valid is found.
    """
    raw = _symbol_chain.invoke({"query": query}).strip().upper()
    # Split on comma/space, sanitise each token
    tokens = re.split(r"[,\s]+", raw)
    symbols = [
        re.sub(r"[^A-Z0-9._\-]", "", tok)
        for tok in tokens
        if re.sub(r"[^A-Z0-9._\-]", "", tok)
    ]
    # Deduplicate while preserving order
    seen: set[str] = set()
    unique = [s for s in symbols if not (s in seen or seen.add(s))]  # type: ignore[func-returns-value]
    return unique if unique else ["UNKNOWN"]


# ─────────────────────────────────────────────────────────────────────────────
# Prediction API Caller
# ─────────────────────────────────────────────────────────────────────────────

def fetch_prediction(symbol: str) -> dict:
    """
    Call GET /predict/{symbol} and return the parsed JSON dict.
    Handles token expiry with one automatic retry.
    Raises RuntimeError with a user-friendly message on any failure.
    """
    def _call(token: str) -> requests.Response:
        return requests.get(
            f"{_BASE_URL}{_API_PREFIX}/predict/{symbol}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=_REQUEST_TIMEOUT,
        )

    try:
        resp = _call(_get_service_token())
    except requests.RequestException as exc:
        raise RuntimeError(
            f"[PredictionTool] Network error calling {_API_PREFIX}/predict/{symbol}: {exc}"
        ) from exc

    # Token just expired — force refresh and retry once
    if resp.status_code == 401:
        global _token_expires_at
        with _token_lock:
            _token_expires_at = 0.0
        try:
            resp = _call(_get_service_token())
        except requests.RequestException as exc:
            raise RuntimeError(
                f"[PredictionTool] Network error on retry: {exc}"
            ) from exc

    if resp.status_code == 502:
        raise RuntimeError(
            f"Market data is unavailable for '{symbol}'. "
            "The symbol may not trade on PSX or the data feed is temporarily down."
        )
    if resp.status_code == 422:
        raise RuntimeError(
            f"'{symbol}' is not a valid PSX ticker. "
            "Please check the symbol and try again (e.g. ABL, OGDC, PPL)."
        )
    if not resp.ok:
        raise RuntimeError(
            f"[PredictionTool] Unexpected HTTP {resp.status_code} for '{symbol}': "
            f"{resp.text[:200]}"
        )

    return resp.json()


# ─────────────────────────────────────────────────────────────────────────────
# Response Formatter
# ─────────────────────────────────────────────────────────────────────────────

def _signal_icon(signal: str) -> str:
    return {"buy": "🟢 BUY", "sell": "🔴 SELL", "hold": "🟡 HOLD"}.get(
        signal.lower(), f"⚪ {signal.upper()}"
    )


def _risk_icon(level: str) -> str:
    icons = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}
    return f"{icons.get(level.upper(), '⚪')} {level.upper()}"


def format_prediction_response(data: dict, symbol: str) -> str:
    """Convert the raw /predict JSON into a clean, human-readable report."""
    pred           = data.get("prediction", {})
    risk           = data.get("risk", {})
    predicted_at   = data.get("predicted_at", "N/A")

    signal         = pred.get("signal", "N/A")
    confidence     = pred.get("confidence", 0.0)
    engine         = pred.get("engine", "N/A")
    model_version  = pred.get("model_version", "N/A")
    tier           = pred.get("tier", "N/A")
    time_horizon   = pred.get("time_horizon_days")
    entry_price    = pred.get("entry_price")
    target_price   = pred.get("target_price")
    stop_loss      = pred.get("stop_loss")
    expected_gain  = pred.get("expected_gain_pct")
    rationale      = pred.get("rationale", [])
    explanation    = pred.get("explanation")

    risk_level     = risk.get("level", "N/A")
    risk_score     = risk.get("score", 0)
    dynamic_score  = risk.get("dynamic_score", 0)

    # ── Price targets section ──────────────────────────────────────────────
    price_lines = []
    if entry_price  is not None: price_lines.append(f"  • Entry Price   : PKR {entry_price:,.2f}")
    if target_price is not None: price_lines.append(f"  • Target Price  : PKR {target_price:,.2f}")
    if stop_loss    is not None: price_lines.append(f"  • Stop Loss     : PKR {stop_loss:,.2f}")
    if expected_gain is not None:
        label = "Expected Gain" if expected_gain >= 0 else "Expected Loss"
        price_lines.append(f"  • {label}  : {expected_gain:+.1f}%")
    price_section = (
        "\n💰 **Price Targets**\n" + "\n".join(price_lines)
    ) if price_lines else ""

    # ── SHAP top features ──────────────────────────────────────────────────
    shap_section = ""
    if explanation and explanation.get("top_features"):
        lines = []
        for f in explanation["top_features"][:4]:
            icon = "↑" if f.get("direction") == "bullish" else "↓"
            lines.append(
                f"  • {f['feature']}: {icon} (SHAP {f.get('shap_value', 0):+.4f})"
            )
        shap_section = "\n📊 **Top Driving Factors (SHAP)**\n" + "\n".join(lines)

    # ── Rationale ──────────────────────────────────────────────────────────
    rationale_section = (
        "\n📋 **Model Rationale**\n" + "\n".join(f"  • {r}" for r in rationale)
    ) if rationale else ""

    horizon_txt = f"{time_horizon} day(s)" if time_horizon else "N/A"
    sep = "━" * 52

    return (
        f"\n{sep}\n"
        f"📈  Stock Prediction Report — {symbol}\n"
        f"{sep}\n\n"
        f"🎯  Signal         : {_signal_icon(signal)}\n"
        f"📊  Confidence     : {confidence * 100:.1f}%\n"
        f"⏱️   Time Horizon  : {horizon_txt}\n"
        f"🔧  Engine         : {engine}  ({model_version})\n"
        f"🏷️   Tier           : {tier.upper()}\n"
        f"🕐  Predicted At   : {predicted_at}"
        f"{price_section}"
        f"{shap_section}"
        f"{rationale_section}\n\n"
        f"⚠️  Risk Assessment\n"
        f"  • Risk Level    : {_risk_icon(risk_level)}\n"
        f"  • Risk Score    : {risk_score:.1f} / 100\n"
        f"  • Dynamic Score : {dynamic_score:.1f} / 100\n\n"
        f"{sep}\n"
        f"⚖️  AI-generated signal — informational only, not financial advice.\n"
        f"{sep}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Public Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def handle_prediction_query(query: str) -> str:
    """
    Full pipeline entry point called by query.py.

    Supports multiple symbols in one query, e.g.
    "Compare ABL and HBL prediction for tomorrow" → hits API twice,
    returns combined formatted report.

    Args:
        query: Raw natural-language question from the user.

    Returns:
        Formatted prediction report(s) as a string, or a user-friendly error.
    """
    print(f"\n[PredictionTool] Query: {query!r}")

    symbols = extract_symbols(query)
    print(f"[PredictionTool] Extracted symbols: {symbols}")

    if symbols == ["UNKNOWN"]:
        return (
            "⚠️ I couldn't identify any valid PSX stock symbols in your query.\n\n"
            "Please include the ticker explicitly, for example:\n"
            "  • 'What is the prediction for ABL stock?'\n"
            "  • 'Should I buy OGDC tomorrow?'\n"
            "  • 'Compare HBL and MCB predictions.'"
        )

    results: list[str] = []
    for symbol in symbols:
        print(f"[PredictionTool] Fetching prediction for: {symbol}")
        try:
            data = fetch_prediction(symbol)
            results.append(format_prediction_response(data, symbol))
        except RuntimeError as exc:
            logger.warning("[PredictionTool] %s", exc)
            results.append(f"⚠️ Prediction unavailable for {symbol}:\n{exc}")

    separator = "\n\n" + "═" * 52 + "\n\n"
    return separator.join(results)
