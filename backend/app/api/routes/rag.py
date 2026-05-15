"""
RAG (Retrieval-Augmented Generation) route.

Exposes the StockX smart_pipeline so it can be tested directly
from the FastAPI /docs interface.

Endpoints
---------
POST /rag/query   — Ask any question; prediction queries are auto-routed to the
                    ML prediction API, everything else goes through the full RAG
                    pipeline (router → retrieval → compression → GPT-4o-mini).
GET  /rag/health  — Lightweight sanity check; confirms the FAISS index loaded.

Authentication
--------------
Requires `Authorization: Bearer <access_token>` (any active account).
Obtain a token from POST /api/v1/auth/login.

Design notes
------------
- smart_pipeline() is synchronous (LangChain / FAISS / requests calls).
  It is executed in a thread-pool via run_in_threadpool so the event-loop is
  never blocked.
- The route streams nothing; the full answer is returned as a single JSON body.
  Typical latency is 3–15 s depending on pipeline branch selected.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class RAGQueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description=(
            "Natural-language question to send to the RAG pipeline. "
            "Stock prediction questions (e.g. 'What is the prediction for ABL?') "
            "are automatically routed to the ML prediction engine."
        ),
        examples=["What is the prediction for ABL stock tomorrow?",
                  "Who are the founders of TradeFinlytix?"],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "What is the prediction for ABL stock tomorrow?"
            }
        }
    }


class RAGQueryResponse(BaseModel):
    question: str = Field(..., description="The original question as received.")
    answer: str = Field(..., description="Full answer from the RAG pipeline or prediction tool.")
    pipeline: str = Field(
        ...,
        description=(
            "Which pipeline handled this request: "
            "'prediction_tool' if the ML engine was called, "
            "'rag_pipeline' if the full RAG flow ran."
        ),
    )
    latency_ms: float = Field(..., description="Wall-clock time in milliseconds for the full answer.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "question": "What is the prediction for ABL stock tomorrow?",
                "answer": "━━━ Stock Prediction Report — ABL ━━━\n🎯 Signal: 🟢 BUY ...",
                "pipeline": "prediction_tool",
                "latency_ms": 1420.3,
            }
        }
    }


class RAGHealthResponse(BaseModel):
    status: str
    faiss_loaded: bool
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/query",
    response_model=RAGQueryResponse,
    summary="Ask the RAG pipeline a question",
    description=(
        "Send any natural-language question. "
        "Stock prediction questions are automatically intercepted and answered "
        "by the ML prediction engine (no RAG retrieval). "
        "All other questions go through the full RAG pipeline: "
        "router → query transformation → retrieval → contextual compression → GPT-4o-mini generation."
    ),
)
async def rag_query(
    body: RAGQueryRequest,
    _current_user: dict = Depends(get_current_user),
) -> RAGQueryResponse:
    """
    Main RAG query endpoint.

    - **question**: Natural-language question (3–1000 chars).
    - Returns a structured answer plus metadata about which pipeline handled it.
    """
    # Lazy import keeps startup fast and avoids loading FAISS/models at import time
    try:
        from app.StockX.query import smart_pipeline
        from app.StockX.tools_prediction import is_prediction_query
    except Exception as exc:
        logger.error("RAG pipeline import failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail="RAG pipeline is unavailable. Check server logs for details.",
        )

    pipeline_label = (
        "prediction_tool" if is_prediction_query(body.question) else "rag_pipeline"
    )

    logger.info(
        "rag_query user=%s pipeline=%s question=%r",
        str(_current_user.get("_id", "unknown")),
        pipeline_label,
        body.question[:120],
    )

    t0 = time.perf_counter()
    try:
        answer: str = await run_in_threadpool(smart_pipeline, body.question)
    except Exception as exc:
        logger.error("rag_pipeline_error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error: {exc}",
        )
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    logger.info(
        "rag_query_done pipeline=%s latency_ms=%.1f", pipeline_label, latency_ms
    )

    return RAGQueryResponse(
        question=body.question,
        answer=answer,
        pipeline=pipeline_label,
        latency_ms=latency_ms,
    )


@router.get(
    "/health",
    response_model=RAGHealthResponse,
    summary="RAG pipeline health check",
    description="Verifies that the FAISS vector store loaded successfully at startup.",
)
async def rag_health(
    _current_user: dict = Depends(get_current_user),
) -> RAGHealthResponse:
    """Check whether the FAISS index is loaded and the pipeline is ready."""
    try:
        from app.StockX.query import vectorstore  # noqa: F401
        faiss_loaded = True
        message = "FAISS index loaded. RAG pipeline is ready."
    except Exception as exc:
        faiss_loaded = False
        message = f"FAISS index NOT loaded: {exc}"
        logger.warning("rag_health check failed: %s", exc)

    return RAGHealthResponse(
        status="ok" if faiss_loaded else "degraded",
        faiss_loaded=faiss_loaded,
        message=message,
    )
