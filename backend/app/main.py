"""
TradeFinlytix - FastAPI entry point.
Startup:
  1. Structured logging
  2. MongoDB connect + indexes
  3. CORS middleware
  4. Request logging middleware
  5. Route mounting
Shutdown:
  1. Close MongoDB
"""
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import admin as admin_routes
from app.api.routes import alerts as alerts_routes
from app.api.routes import auth as auth_routes
from app.api.routes import ciso as ciso_routes
from app.api.routes import market as market_routes
from app.api.routes import portfolio as portfolio_routes
from app.api.routes import prediction as prediction_routes
from app.api.routes import news_rag as news_rag_routes
from app.api.routes import rag as rag_routes
from app.api.routes import screener as screener_routes
from app.core.bootstrap import bootstrap_privileged_users
from app.core.config import settings
from app.core.database import close_db, connect_db, get_db
from app.core.logging import setup_logging
from app.repositories.audit_chain_state import (
    audit_chain_append_allowed,
    reset_audit_chain_trusted,
    set_audit_chain_trusted,
)
from app.repositories.audit_repo import AuditRepository
from app.security.csrf import request_needs_csrf, validate_csrf
from app.security.rate_limiter import close_redis
from app.security.security_alerts import emit_security_alert, redact_security_log_payload

setup_logging()
logger = logging.getLogger(__name__)

SHOW_DOCS = settings.expose_openapi

OPENAPI_TAGS = [
    {
        "name": "Auth",
        "description": "Register, login, refresh tokens. Responses include `Bearer` "
        "access tokens for `Authorization` headers on protected routes.",
    },
    {
        "name": "Prediction",
        "description": "Authenticated investors: adaptive risk envelope + ensemble "
        "model prediction output (`engine: ensemble_v1`).",
    },
    {
        "name": "Portfolio",
        "description": "Authenticated portfolio snapshots and trades with encrypted-at-rest "
        "storage in `portfolio` / `transactions` collections.",
    },
    {
        "name": "Alerts",
        "description": "Authenticated user alerts: get alerts, mark as read, unread count.",
    },
    {
        "name": "Screener",
        "description": "Authenticated investors/admins: filter stocks by price, volume, trend, growth, and risk rules.",
    },
    {
        "name": "Market",
        "description": "Public intraday price snapshots for dashboard and landing page visuals.",
    },
    {
        "name": "Admin",
        "description": "Role **admin** only: user lifecycle, pagination, audits. "
        "Privileged accounts (admin/CISO) cannot be deactivated / password-reset "
        "via these endpoints (403).",
    },
    {
        "name": "CISO",
        "description": "Role **ciso** only: audit chain verification, anomalies, "
        "risk dashboards. Responses use `{items, total, skip, limit}` pagination "
        "(hard caps per query parameter).",
    },
    {
        "name": "RAG",
        "description": "Ask any natural-language question against the TradeFinlytix knowledge base. "
        "Stock prediction queries are automatically intercepted and routed to the "
        "ML prediction engine. All other queries run through the full RAG pipeline "
        "(router → retrieval → contextual compression → GPT-4o-mini).",
    },
    {
        "name": "NewsRAG",
        "description": "Natural-language PSX company-announcement retrieval via Self-RAG. "
        "Ask e.g. 'tell me latest news of ABL stock with 16 docs' and receive a "
        "downloadable .txt report (IsRel → IsSup → IsUse evaluators + market briefing). "
        "Use /news-rag/parse-preview to dry-run the NLP parser before the full pipeline.",
    },
    {"name": "System", "description": "Health checks (no JWT)."},
]

API_DESCRIPTION = """TradeFinlytix REST API.

## Authentication

- Most business routes require `Authorization: Bearer <access_token>`.
- Obtain tokens via `POST /api/v1/auth/login` or `POST /api/v1/auth/register`.
- **admin** routes require role `admin`. **ciso** routes require role `ciso`.
- If `AUDIT_REJECT_NEW_EVENTS_WHEN_CHAIN_UNTRUSTED=true` and the audit chain is marked broken,
  **`/api/v1/admin/*`**, **`/api/v1/ciso/*`**, and **`/api/v1/predict/*`** respond with **503**
  until the chain is verified healthy again.

## Errors

- Structured JSON `{detail: ...}`; production responses omit exception stack traces
  (`DEBUG=false` disables `exc_info` in server logs for unhandled errors).

## Transport / Browser Security Notes

- HTTPS/TLS and RSA key exchange are deployment concerns (reverse proxy / ingress),
  not enabled by FastAPI app code itself.
- CSRF middleware is available behind `CSRF_PROTECTION_ENABLED`; bearer-token APIs
  usually keep it disabled.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    await connect_db()
    reset_audit_chain_trusted()
    if settings.audit_startup_verify_chain:
        db = await get_db()
        res = await AuditRepository(db).verify_chain(
            limit=settings.audit_startup_verify_limit,
        )
        ok = bool(res.get("ok"))
        set_audit_chain_trusted(ok)
        if ok:
            logger.info(
                "Startup audit chain verify OK (%s docs checked)",
                res.get("checked"),
            )
        else:
            logger.critical(
                "audit_chain_startup_verification_failed",
                extra=redact_security_log_payload(dict(res)),
            )
            await emit_security_alert(
                "audit_chain_startup_verify_failed",
                {
                    "checked": res.get("checked"),
                    "broken_at": res.get("broken_at"),
                    "expected_prev": str(res.get("expected_prev")),
                    "stored_prev": str(res.get("stored_prev")),
                },
            )
            if settings.audit_abort_startup_when_chain_broken:
                raise RuntimeError(
                    "audit_abort_startup_when_chain_broken=true and chain incomplete"
                )
    else:
        set_audit_chain_trusted(True)

    await bootstrap_privileged_users()

    # Pre-load ensemble models so failures surface at startup, not first request.
    try:
        from app.ml_engine.models import get_ensemble
        ensemble = get_ensemble()
        if ensemble.is_loaded:
            logger.info("Ensemble models pre-loaded: is_loaded=True")
        else:
            logger.warning("Ensemble models FAILED to load; predictions will use fallback")
    except Exception as _exc:
        logger.error("Ensemble pre-load raised: %s", _exc, exc_info=True)

    logger.info("TradeFinlytix backend ready.")
    yield
    await close_db()
    await close_redis()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=API_DESCRIPTION,
    docs_url="/docs" if SHOW_DOCS else None,
    redoc_url="/redoc" if SHOW_DOCS else None,
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(prediction_routes.router, prefix="/api/v1")
app.include_router(rag_routes.router, prefix="/api/v1")
app.include_router(news_rag_routes.router, prefix="/api/v1")
app.include_router(portfolio_routes.router, prefix="/api/v1")
app.include_router(alerts_routes.router, prefix="/api/v1")
app.include_router(screener_routes.router, prefix="/api/v1")
app.include_router(market_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")
app.include_router(ciso_routes.router, prefix="/api/v1")


@app.middleware("http")
async def csrf_guard_middleware(request: Request, call_next) -> Response:
    if settings.csrf_protection_enabled and request_needs_csrf(
        request, protected_prefixes=("/api/v1",)
    ):
        if not validate_csrf(request):
            return JSONResponse(status_code=403, content={"detail": "CSRF token invalid."})
    return await call_next(request)


@app.middleware("http")
async def audit_chain_safety_middleware(request: Request, call_next) -> Response:
    """
    If audit chain is known broken, protect high-impact surfaces.
    """
    if (
        settings.audit_reject_new_events_when_chain_untrusted
        and not audit_chain_append_allowed()
    ):
        blocked_prefixes = ("/api/v1/admin", "/api/v1/ciso", "/api/v1/predict")
        if request.url.path.startswith(blocked_prefixes):
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "Security hold: audit chain integrity check failed. "
                    "Sensitive endpoints are temporarily blocked."
                },
            )
    return await call_next(request)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next) -> Response:
    """
    Log request metadata with request_id.
    To reduce overhead in production, log only server errors and slow requests.
    """
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response: Response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.error(
            "request_failed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
            },
            exc_info=settings.debug,
        )
        raise

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    is_slow = duration_ms > 300
    is_error = response.status_code >= 500
    if is_slow or is_error:
        logger.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else "unknown",
                "slow_request": is_slow,
            },
        )

    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "unhandled_exception",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "error": str(exc),
            "error_type": type(exc).__name__,
        },
        exc_info=settings.debug,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
    )


@app.get("/health", tags=["System"])
async def health_check():
    """Quick health check - no DB hit."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
    }


@app.get("/health/db", tags=["System"])
async def health_check_db():
    """Deep health check - verifies MongoDB is reachable."""
    from app.core.database import get_db

    try:
        db = await get_db()
        await db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error("DB health check failed: %s", e)
        return JSONResponse(
            status_code=503,
            content={"status": "error", "database": "unreachable"},
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        timeout_keep_alive=5,
        log_config=None,
    )

