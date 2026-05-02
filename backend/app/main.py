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

from app.api.routes import auth as auth_routes
from app.core.bootstrap import bootstrap_privileged_users
from app.core.config import settings
from app.core.database import close_db, connect_db
from app.core.logging import setup_logging
from app.security.rate_limiter import close_redis

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    await connect_db()
    await bootstrap_privileged_users()
    logger.info("TradeFinlytix backend ready.")
    yield
    await close_db()
    await close_redis()
    logger.info("Shutdown complete.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered PSX stock prediction platform",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
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
            exc_info=True,
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
        exc_info=True,
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

