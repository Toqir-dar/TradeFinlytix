"""
NewsRAG route — PSX company-announcement intelligence via Self-RAG.

Exposes a single natural-language query endpoint that:
  1. Parses the user's question to extract ticker + result count.
  2. Runs the full PSX Self-RAG pipeline  (scrape → IsRel → IsSup → IsUse →
     briefing → report).
  3. Streams the generated .txt report back as a file download.

Endpoints
---------
POST /news-rag/query
    Accept a plain-English question such as
        "tell me latest news of ABL stock with 16 docs"
    and download the resulting report as a .txt file.

GET  /news-rag/health
    Lightweight sanity check.

Authentication
--------------
Requires `Authorization: Bearer <access_token>` (any active account).

Design notes
------------
- The Self-RAG pipeline is synchronous (Playwright + OpenAI calls).
  It runs in a thread-pool via run_in_threadpool so the async event-loop
  is never blocked.
- Response is a FileResponse served directly from the temp file.
  FastAPI deletes the file after the response is sent via a background task.
- Typical latency: 45–180 s depending on page count and OpenAI throughput.
"""

from __future__ import annotations

import logging
import os
import time
import traceback
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/news-rag", tags=["NewsRAG"])


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class NewsRAGQueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description=(
            "Natural-language news query. "
            "Include the PSX ticker and optionally the number of docs. "
            "Examples: "
            "'tell me latest news of ABL stock with 16 docs', "
            "'fetch 20 recent announcements for HBL', "
            "'show me dividend news for ENGRO with 10 results'."
        ),
        examples=[
            "tell me latest news of ABL stock with 16 docs",
            "fetch 20 recent PSX announcements for HBL",
            "show me dividend news for ENGRO with 10 results",
        ],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "tell me latest news of ABL stock with 16 docs"
            }
        }
    }


class NewsRAGHealthResponse(BaseModel):
    status: str
    message: str


class NewsRAGParsePreview(BaseModel):
    """What the parser extracted from the question (informational)."""
    ticker: str | None
    max_results: int
    focus_query: str
    raw_question: str


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _delete_file(path: str) -> None:
    """Background task: remove the temp report file after download."""
    try:
        os.unlink(path)
        logger.debug("news_rag: deleted temp file %s", path)
    except Exception as exc:
        logger.warning("news_rag: could not delete %s: %s", path, exc)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/query",
    summary="Ask for PSX news — download .txt report",
    description=(
        "Send a natural-language question such as "
        "**'tell me latest news of ABL stock with 16 docs'**. "
        "The API parses the ticker and result count, runs the PSX Self-RAG "
        "pipeline (IsRel → IsSup → IsUse evaluators + market briefing), "
        "and returns the full report as a downloadable `.txt` file. "
        "\n\n"
        "⚠️ This endpoint can take **45–180 seconds** because it drives a "
        "real browser (Playwright) and calls OpenAI for each announcement."
    ),
    response_class=FileResponse,
    responses={
        200: {
            "content": {"text/plain": {}},
            "description": "PSX Self-RAG report as a downloadable .txt file.",
        },
        400: {"description": "Could not parse a valid PSX ticker from the question."},
        503: {"description": "NewsRAG pipeline module unavailable."},
        500: {"description": "Pipeline error — check server logs."},
    },
)
async def news_rag_query(
    body: NewsRAGQueryRequest,
    _current_user: dict = Depends(get_current_user),
) -> FileResponse:
    """
    Main NewsRAG endpoint.

    - **question**: Free-text news query (5–500 chars).
    - Returns a `.txt` report file as a download.
    """
    # ── Lazy imports (keeps startup fast) ─────────────────────────────────────
    try:
        from app.NewsX.news_rag_service import parse_news_query, run_news_rag
    except Exception as exc:
        logger.error("news_rag import failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="NewsRAG pipeline is unavailable. Check server logs.",
        )

    # ── Parse query ────────────────────────────────────────────────────────────
    parsed = parse_news_query(body.question)
    logger.info(
        "news_rag_query user=%s parsed=%s",
        str(_current_user.get("_id", "unknown")),
        parsed,
    )

    if not parsed["ticker"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not find a valid PSX ticker symbol in your question. "
                "Please include the ticker, e.g. 'ABL', 'HBL', 'ENGRO'."
            ),
        )

    ticker      = parsed["ticker"]
    max_results = parsed["max_results"]
    focus       = parsed["query"]

    logger.info(
        "news_rag_start ticker=%s max_results=%d focus=%r",
        ticker, max_results, focus,
    )

    # ── Run pipeline in thread-pool ────────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        report_path: str = await run_in_threadpool(
            run_news_rag,
            ticker,
            max_results,
            focus,
            None,          # output_path=None → auto-generated temp file
        )
    except Exception as exc:
        tb = traceback.format_exc(limit=8)
        err_type = type(exc).__name__
        err_msg  = str(exc) or repr(exc)
        logger.error(
            "news_rag_pipeline_error type=%s msg=%s\n%s",
            err_type, err_msg, tb,
        )
        raise HTTPException(
            status_code=500,
            detail=(
                f"Pipeline error [{err_type}]: {err_msg or '(no message)'}"
                f"\n\nTraceback (last 8 frames):\n{tb}"
            ),
        )

    latency_s = round(time.perf_counter() - t0, 1)
    logger.info(
        "news_rag_done ticker=%s latency_s=%.1f report=%s",
        ticker, latency_s, report_path,
    )

    # ── Stream file back, then delete temp file ────────────────────────────────
    filename = Path(report_path).name  # e.g. ABL_news_20260515_123456.txt
    return FileResponse(
        path=report_path,
        media_type="text/plain; charset=utf-8",
        filename=filename,
        background=BackgroundTask(_delete_file, report_path),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-NewsRAG-Ticker":       ticker,
            "X-NewsRAG-MaxResults":   str(max_results),
            "X-NewsRAG-LatencyS":     str(latency_s),
        },
    )


@router.post(
    "/parse-preview",
    response_model=NewsRAGParsePreview,
    summary="Preview how your question will be parsed",
    description=(
        "Dry-run the NLP parser without running the full pipeline. "
        "Use this to verify that your question yields the correct ticker "
        "and result count before calling `/news-rag/query`."
    ),
)
async def news_rag_parse_preview(
    body: NewsRAGQueryRequest,
    _current_user: dict = Depends(get_current_user),
) -> NewsRAGParsePreview:
    """
    Parse-only endpoint — no scraping, no LLM calls, instant response.
    Returns what ticker and doc count the pipeline would use for the query.
    """
    try:
        from app.NewsX.news_rag_service import parse_news_query
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {exc}")

    parsed = parse_news_query(body.question)
    return NewsRAGParsePreview(
        ticker=parsed["ticker"],
        max_results=parsed["max_results"],
        focus_query=parsed["query"],
        raw_question=parsed["raw"],
    )


@router.get(
    "/health",
    response_model=NewsRAGHealthResponse,
    summary="NewsRAG health check",
    description="Verifies the NewsRAG service module can be imported.",
)
async def news_rag_health(
    _current_user: dict = Depends(get_current_user),
) -> NewsRAGHealthResponse:
    """Check whether the NewsRAG service is importable and ready."""
    try:
        from app.NewsX.news_rag_service import parse_news_query  # noqa: F401
        return NewsRAGHealthResponse(
            status="ok",
            message="NewsRAG service is ready.",
        )
    except Exception as exc:
        logger.warning("news_rag_health check failed: %s", exc)
        return NewsRAGHealthResponse(
            status="degraded",
            message=f"NewsRAG service not available: {exc}",
        )
