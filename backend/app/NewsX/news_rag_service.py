"""
NewsX — Natural-Language Query Parser + Pipeline Wrapper
=========================================================
Parses a free-text query such as
    "tell me latest news of ABL stock with 16 docs"
into structured parameters and delegates to the self_rag.py CLI via
a subprocess so Playwright's sync API has a clean event-loop context.

WHY SUBPROCESS?
---------------
Playwright's sync_playwright() internally creates its own asyncio event loop.
When called from inside anyio's thread-pool executor (used by FastAPI's
run_in_threadpool), anyio has already overridden the asyncio event-loop policy,
which causes sync_playwright() to raise NotImplementedError.

Running self_rag.py as a child process gives Playwright a completely
fresh Python interpreter with no asyncio context — exactly the
environment it was designed for (CLI usage).

Public surface
--------------
parse_news_query(question: str) -> dict
    Returns {"ticker": str, "max_results": int, "query": str, "raw": str}

run_news_rag(ticker, max_results, query, output_path) -> str
    Runs self_rag.py as a subprocess; returns the output .txt path.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


# ──────────────────────────────────────────────────────────────────────────────
# Known PSX tickers (extend as needed; used for reliable symbol extraction)
# ──────────────────────────────────────────────────────────────────────────────
_KNOWN_TICKERS: set[str] = {
    "ABL", "ACPL", "ADMM", "AGP", "AGTL", "AHCL", "AHL", "AICL", "AIICO",
    "AITM", "AKBL", "AKGL", "AKSM", "ALTN", "AMTEX", "ANL", "ANZX", "APL",
    "ARPL", "ARWL", "ASC", "ASTM", "ATBA", "ATRL", "AVN", "AWWAL", "BAHL",
    "BAFL", "BANKM", "BIFO", "BNWM", "BPCL", "BSRM", "BYCO", "CEAT", "CEL",
    "CHCC", "CHEZ", "CHNIGAS", "CNERGY", "COLG", "CPHL", "CSAP", "CSFL",
    "DAAG", "DCH", "DGKC", "DIBP", "DINT", "DMTM", "DNH", "DSFL", "DUPONT",
    "DYNO", "ECOP", "EFERT", "EFG", "EFOODS", "EGFL", "ELET", "EMCO", "EMPL",
    "ENGRO", "ENGROH", "ENLM", "ENNL", "EPQL", "ESBL", "FABL", "FCCL",
    "FCSC", "FHAM", "FNEL", "FNHL", "FRCL", "FRSL", "FTSM", "FUDLM", "GATM",
    "GGL", "GHPL", "GLAXO", "GNCL", "GNIV", "GOLDSM", "GRAYS", "GTYR",
    "GULF", "HABSM", "HASCOL", "HCAR", "HBL", "HGFA", "HMB", "HMIM", "HPHL",
    "HPL", "HSBC", "HUBC", "HUMNL", "HUNT", "ICL", "ICI", "IDYM", "IGIHL",
    "IGIL", "ILP", "IMC", "INCI", "INDU", "INFM", "INQL", "INIL", "IPAK",
    "IPLM", "ISPL", "JDMT", "JGICL", "JKSM", "JLICL", "JMEL", "JSCL",
    "JSIL", "JSLM", "JVDC", "KAPCO", "KCL", "KCTL", "KEL", "KESCL", "KFCH",
    "KGGC", "KIAC", "KIBL", "KITL", "KML", "KOHC", "KOHAT", "KTML", "LINDE",
    "LIPL", "LOTCHEM", "LPGL", "LPL", "LUCK", "LUPS", "MASM", "MATW",
    "MCBAH", "MCB", "MCCL", "MCHT", "MCOLM", "MDSFL", "MEBL", "MEPCO",
    "MERIT", "MESM", "MEZZAN", "MFFL", "MGCL", "MGFL", "MHFL", "MIPL",
    "MLCF", "MMTM", "MNSMPL", "MODAM", "MRNS", "MTL", "MUREB", "NETSOL",
    "NICL", "NITM", "NML", "NMTM", "NPCL", "NPFL", "NSRM", "NUBM", "OLL",
    "PACE", "PAEL", "PAKOXY", "PAKRI", "PAKT", "PAKSM", "PAL", "PALL",
    "PASL", "PATO", "PCC", "PECO", "PGLM", "PHAM", "PIAA", "PIBTL", "PICL",
    "PIOC", "PKGS", "PNL", "PNSC", "POML", "POWER", "PPL", "PRMD", "PSMC",
    "PSOL", "PSO", "PTCL", "QUET", "RBS", "RDSM", "REDCO", "REMY", "REPL",
    "RMPML", "RMPL", "ROMCL", "RPHM", "RPIL", "RPL", "RUPF", "SAAN", "SAIF",
    "SAPL", "SAZEW", "SBCAS", "SBL", "SCHT", "SCIL", "SCL", "SEFL", "SEHPL",
    "SEL", "SFBL", "SGAML", "SGFL", "SHEL", "SHFA", "SILK", "SKRS", "SLL",
    "SLML", "SLPR", "SMBL", "SNAI", "SNBL", "SNGP", "SNGL", "SOC", "SPCL",
    "SPLC", "SPWL", "SRBL", "SRVI", "SSL", "STCL", "STPL", "STML", "SURAJ",
    "SWAT", "SWYML", "SYST", "TBLM", "TDL", "TEKL", "TELECAR", "TELE",
    "THAL", "THALL", "TIBL", "TICE", "TIFT", "TLM", "TMPA", "TNEWS", "TPLP",
    "TPPL", "TRBL", "TRIBL", "TSBL", "TRG", "TSRM", "TTBL", "TUSDEC",
    "UBANK", "UBL", "UMBL", "UNBL", "UNITY", "UPFL", "UPL", "UPLC", "USPL",
    "VOLT", "WAVV", "WCPL", "WHAL", "WNTM", "XDTM", "YOUW", "ZAHIR", "ZEAL",
    "ZEBL", "ZIL",
}

# ──────────────────────────────────────────────────────────────────────────────
# Regex helpers
# ──────────────────────────────────────────────────────────────────────────────

_NUMBER_WORDS: dict[str, int] = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "thirty": 30, "fifty": 50,
}

# Patterns for explicit counts: "16 docs", "20 results", "10 news"
_COUNT_RE = re.compile(
    r"\b(\d{1,3})\s*(?:docs?|documents?|results?|news|articles?|items?)\b",
    re.IGNORECASE,
)
# Word-number count: "ten docs"
_WORD_COUNT_RE = re.compile(
    r"\b(" + "|".join(_NUMBER_WORDS.keys()) + r")\s*(?:docs?|documents?|results?|news|articles?|items?)\b",
    re.IGNORECASE,
)
# Ticker immediately before/after keywords
_TICKER_KEYWORD_RE = re.compile(
    r"\b(?:for|of|about|on|ticker|symbol)\s+([A-Z]{2,6})\b",
    re.IGNORECASE,
)
# Standalone ALL-CAPS word 2-6 letters (last resort)
_CAPS_RE = re.compile(r"\b([A-Z]{2,6})\b")

# Stop-words that look like tickers but aren't
_STOP = {"PSX", "KSE", "URL", "PDF", "API", "RAG", "AI", "ML", "NLP",
         "LLM", "GPT", "JSON", "HTTP", "GET", "POST", "UI", "UX", "DB",
         "NEWS", "DOCS", "TOP", "ALL", "NEW", "OLD", "BUY", "SELL",
         "AND", "OR", "NOT", "THE", "FOR", "OF", "TO", "IN", "AT",
         "IS", "IT", "DO", "ME", "MY", "I", "A"}


def _extract_ticker(text: str) -> str | None:
    """
    Extract ticker from the query.

    Priority:
      1. Known ticker list (whole-word match, case-insensitive)
      2. Keyword-preceded ALL-CAPS token: "of ABL", "for HBL"
      3. Standalone ALL-CAPS 2-6-letter word not in stop-list
    """
    upper = text.upper()

    # Priority 1 — known tickers
    for tok in _KNOWN_TICKERS:
        if re.search(rf"\b{re.escape(tok)}\b", upper):
            return tok

    # Priority 2 — keyword-preceded
    m = _TICKER_KEYWORD_RE.search(text)
    if m:
        candidate = m.group(1).upper()
        if candidate not in _STOP:
            return candidate

    # Priority 3 — standalone ALL-CAPS
    for m in _CAPS_RE.finditer(text):
        candidate = m.group(1).upper()
        if candidate not in _STOP:
            return candidate

    return None


def _extract_count(text: str) -> int:
    """Extract the requested number of results from the query. Falls back to 15."""
    m = _COUNT_RE.search(text)
    if m:
        return max(1, min(int(m.group(1)), 100))

    m = _WORD_COUNT_RE.search(text)
    if m:
        return max(1, min(_NUMBER_WORDS.get(m.group(1).lower(), 15), 100))

    # Bare digit near news-related words
    bare = re.search(
        r"\b(\d{1,3})\b.*?(?:news|latest|recent|announcements?)\b"
        r"|(?:news|latest|recent|announcements?)\b.*?\b(\d{1,3})\b",
        text, re.IGNORECASE
    )
    if bare:
        return max(1, min(int(bare.group(1) or bare.group(2)), 100))

    return 15  # default


def _extract_focus_query(text: str, ticker: str | None) -> str:
    """
    Strip housekeeping words; return a cleaner sub-query for IsRel scoring.
    Returns "" when no meaningful topic keyword is found.
    """
    clean = text.lower()

    if ticker:
        clean = re.sub(rf"\b{re.escape(ticker.lower())}\b", "", clean)

    for phrase in [
        "tell me", "show me", "give me",
        "latest news", "recent news", "latest announcements",
        "recent announcements", "news", "announcements",
        "fetch", "get", "find", "retrieve", "search",
        "stock", "psx", "kse", "scrip", "company",
        "with", "for", "about", "of", "by", "from",
        "docs", "documents", "results", "items", "articles",
        "please", "can you", "could you",
    ]:
        clean = re.sub(rf"\b{re.escape(phrase)}\b", " ", clean)

    # Strip bare numbers and single-char tokens
    clean = re.sub(r"\b\d+\b", " ", clean)
    clean = re.sub(r"\b\w\b", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    return clean if len(clean) > 3 else ""


# ──────────────────────────────────────────────────────────────────────────────
# Public parse function
# ──────────────────────────────────────────────────────────────────────────────

def parse_news_query(question: str) -> dict:
    """
    Parse a natural-language news query into structured parameters.

    Returns
    -------
    {
        "ticker":      str | None,
        "max_results": int,
        "query":       str,   # optional focus keyword for IsRel
        "raw":         str,   # original question
    }
    """
    ticker = _extract_ticker(question)
    max_results = _extract_count(question)
    focus = _extract_focus_query(question, ticker)
    return {"ticker": ticker, "max_results": max_results, "query": focus, "raw": question}


# ──────────────────────────────────────────────────────────────────────────────
# Pipeline runner  (subprocess — avoids Playwright/anyio event-loop conflict)
# ──────────────────────────────────────────────────────────────────────────────

def run_news_rag(
    ticker: str,
    max_results: int = 15,
    query: str = "",
    output_path: str | None = None,
) -> str:
    """
    Run the PSX Self-RAG pipeline in a *subprocess*.

    WHY SUBPROCESS?
    ---------------
    Playwright's sync_playwright() internally creates its own asyncio event
    loop. When called from inside anyio's thread-pool executor (used by
    FastAPI's run_in_threadpool), anyio has already overridden the asyncio
    event-loop policy, which causes sync_playwright() to raise
    NotImplementedError.

    Running self_rag.py as a child process gives Playwright a completely
    fresh Python interpreter with no asyncio context — exactly the
    environment it was designed for (CLI usage).

    Parameters
    ----------
    ticker      : PSX symbol, e.g. "ABL"
    max_results : number of announcements to fetch
    query       : optional focus keyword (passed to IsRel evaluator)
    output_path : where to write the .txt report; auto-generated if None

    Returns
    -------
    Absolute path to the generated .txt report file.
    """
    if output_path is None:
        fd, output_path = tempfile.mkstemp(
            prefix=f"{ticker.upper()}_news_",
            suffix=".txt",
        )
        os.close(fd)

    self_rag_script = str(Path(__file__).parent / "self_rag.py")

    cmd = [
        sys.executable,        # same Python interpreter as the server
        self_rag_script,
        "--ticker",      ticker.upper(),
        "--max-results", str(max_results),
        "--output",      output_path,
        "--download",    "0",   # no PDF download via API — URLs in report
    ]
    if query:
        cmd.extend(["--query", query])

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"   # fix UnicodeEncodeError on Windows (cp1252 → utf-8)
    env["PYTHONUTF8"]       = "1"       # Python 3.7+ UTF-8 mode flag

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=360,            # 6-minute hard limit
        env=env,
    )

    if result.returncode != 0:
        stderr_tail = (result.stderr or "(no stderr)")[-2000:]
        raise RuntimeError(
            f"self_rag.py exited with code {result.returncode}.\n\n"
            f"STDERR (last 2000 chars):\n{stderr_tail}"
        )

    if not os.path.isfile(output_path):
        raise RuntimeError(
            f"self_rag.py exited OK but output file not found: {output_path}\n"
            f"STDOUT: {(result.stdout or '')[-1000:]}"
        )

    return output_path
