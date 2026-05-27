# # placeholder for Dockerfile
# # ── Build stage ───────────────────────────────────────────────────
# FROM python:3.11-slim AS builder
# WORKDIR /app
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
#     && rm -rf /var/lib/apt/lists/*
# COPY requirements.txt .
# RUN pip install --upgrade pip \
#     && pip install --no-cache-dir --prefix=/install -r requirements.txt

# # ── Runtime stage ─────────────────────────────────────────────────
# FROM python:3.11-slim AS runtime
# WORKDIR /app
# COPY --from=builder /install /usr/local
# COPY app/ ./app/

# # Non-root user
# RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
# USER appuser

# EXPOSE 8000

# HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
#     CMD python -c "import httpx; httpx.get('http://localhost:8000/health')"

# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]


# ── Build stage ───────────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Runtime stage ─────────────────────────────────────────────────
FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=builder /install /usr/local

# Install Playwright system dependencies (needs root, before user switch)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libpango-1.0-0 libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers to a fixed path (not under any user's home)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN playwright install chromium

COPY app/ ./app/

# Non-root user
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app \
    && chmod -R 755 /ms-playwright

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]