# TradeFinlytix

> **AI-Powered PSX Trading Intelligence Platform**  
> Stacking ensemble of XGBoost · LightGBM · LSTM with SHAP explainability, adaptive security, and RBAC — purpose-built for the Pakistan Stock Exchange.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Highlights](#solution-highlights)
- [AI Pipeline](#ai-pipeline)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Model Validation](#model-validation)
- [Security Architecture](#security-architecture)
- [Roles & Permissions](#roles--permissions)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

---

## Overview

TradeFinlytix is a production-grade AI trading platform built specifically for the **Pakistan Stock Exchange (PSX)**. It generates actionable trading signals — **BUY / HOLD / TRIM / SELL** — by combining a calibrated stacking ensemble with live market data, adaptive security scoring, RAG-powered audit log search, and an immutable audit chain.

---

## Problem Statement

Existing PSX analytics tools suffer from critical gaps:

| Gap | Impact |
|-----|--------|
| No AI-based prediction | Traders rely on manual TA only |
| No actionable signals | Missing entry, target, stop-loss |
| No sentiment integration | News and social data ignored |
| Black-box models | Zero explainability for decisions |
| Insecure pipelines | No audit trail or model integrity checks |

---

## Solution Highlights

- **AI trading signals** with calibrated confidence scores
- **Adaptive security engine** — per-request risk scoring that dynamically tightens rate limits
- **Immutable audit chain** — tamper-evident, hash-linked prediction and event log
- **RAG-powered audit search** — natural language queries over audit logs via semantic retrieval + LLM (Groq / LLaMA)
- **RBAC** — investor, admin, and CISO roles with distinct permission scopes
- **59-feature technical pipeline** — RSI, MACD, Bollinger Bands, ATR, OBV, cross-sectional ranks, and more computed live from yfinance

---

## AI Pipeline

```
yfinance OHLCV → 59 Technical Features → Feature Engineering
                                                    │
                                              Base Models
                                        ┌─────────────────┐
                                        │ XGBoost (tabular)│
                                        │ LightGBM (tabular│
                                        │ LSTM (time-seq)  │
                                        └────────┬────────┘
                                          Meta-Learner (LR)
                                                 │
                                      Final Signal + ATR levels
```

### 1 · Data Ingestion

| Source | Provider | Status |
|--------|----------|--------|
| Price & OHLCV | `yfinance` — any ticker | ✅ Implemented |
| SPY market-wide features | `yfinance` | ✅ Implemented |
| Financial News / Social Sentiment | Google News, Reddit | ❌ Not implemented |

---

### 2 · Sentiment Processing

> **Not implemented.** `sentiment.py` is a placeholder. FinBERT sentiment features are not included in the live prediction pipeline. The 59-feature set is purely technical.

---

### 3 · Event Detection

> **Not implemented.** `event_detection.py` is a placeholder. Event flags are not computed at inference time.

---

### 4 · Feature Engineering

59 features computed live from OHLCV data:

| Category | Features |
|----------|----------|
| Price Structure | close/open ratio, high-low range, upper/lower wick, body size |
| Returns | 1d/5d/10d/20d/60d/120d returns, log return |
| MA Ratios | price-to-SMA20, price-to-EMA26, SMA5 cross SMA20 |
| Momentum | RSI(14), ROC(10), Williams %R, Stochastic K/D |
| Volatility | Bollinger width/pct, ATR%, volatility 5d/10d/20d |
| Volume | volume ratio, OBV z-score |
| Lag Returns | lag 1d–5d |
| Time | day of week, month, quarter, month-end, quarter-end |
| V2 | overnight gap, direction streak, Sharpe 5d/20d |
| Cross-Sectional Ranks | 10 rolling percentile rank features |
| Market-Wide | SPY return, breadth, volatility |
| MACD | MACD%, signal%, histogram% (normalised) |

---

### 5 · Base Models (Parallel Ensemble)

Each model independently outputs an up/down probability pair:

| Model | Framework | Status |
|-------|-----------|--------|
| **XGBoost** | `xgboost` | ✅ Trained, loaded at startup |
| **LightGBM** | `lightgbm` | ✅ Trained, loaded at startup |
| **LSTM** | TensorFlow / Keras | ✅ Trained, loaded at startup |

---

### 6 · Meta-Learner (Stacking)

- **Model:** Logistic Regression (`scikit-learn`)
- **Input:** 6 stacked base-model probabilities `[lgb_0, lgb_1, xgb_0, xgb_1, lstm_0, lstm_1]`
- **Scaler:** StandardScaler applied before meta-learner
- **Output:** Final calibrated probability in `[0, 1]` — used directly as confidence

---

### 7 · Signal Generation

```
confidence ≥ 0.65  →  BUY
confidence ≥ 0.55  →  HOLD
confidence ≥ 0.45  →  TRIM
confidence <  0.45 →  SELL
```

Each signal carries `entry_price`, `target_price`, `stop_loss`, `expected_gain_pct`, and `time_horizon_days`.

---

### 8 · Explainability (SHAP)

> **Not implemented.** `shap_explainer.py` is a placeholder. SHAP values are not computed in the current prediction response.

---

### 9 · Risk Management (ATR-Based)

| Parameter | Calculation |
|-----------|-------------|
| **Entry** | Current price at signal time |
| **Target** | Entry × (1 + expected_gain_pct / 100) |
| **Stop-Loss** | Entry × 0.975 (2.5% fixed floor) |

---

### 10 · RAG Audit Search *(New)*

Natural language search over the security audit log using semantic retrieval and an LLM.

```
CISO question (natural language)
        │
        ▼
  Embed query (all-MiniLM-L6-v2)
        │
        ▼
  Cosine similarity search over stored audit log embeddings (MongoDB)
        │
        ▼
  Top-K relevant logs → LLM prompt (Groq / LLaMA 3.3 70B)
        │
        ▼
  Grounded natural language answer + source logs
```

- Embeddings stored automatically on every new audit log write
- Model: `all-MiniLM-L6-v2` (reused from anomaly detection — no extra memory)
- LLM: Groq API (`llama-3.3-70b-versatile`)
- Endpoint: `POST /api/v1/ciso/audit/search`

---

## Tech Stack

### AI / ML
- **XGBoost** + **LightGBM** — tabular base models (trained, loaded at startup)
- **TensorFlow / Keras** — LSTM model (trained, loaded at startup)
- **scikit-learn** — meta-learner (Logistic Regression), StandardScaler, walk-forward validation
- **sentence-transformers** (`all-MiniLM-L6-v2`) — behavioral anomaly detection + RAG embeddings
- **Groq API** (`llama-3.3-70b-versatile`) — LLM for RAG audit search
- **yfinance** — live OHLCV data fetch with 5-minute TTL cache

### Backend
- **FastAPI 0.111** — async REST API
- **Pydantic v2** — strict request/response validation
- **Motor + PyMongo** — async MongoDB driver
- **Redis** — rate limiting and adaptive security counters
- **python-jose + passlib** — JWT auth and bcrypt password hashing
- **cryptography (AES)** — portfolio data encrypted at rest
- **HMAC-SHA256** — prediction response signing
- **httpx** — async HTTP client (Groq API calls)

### Database & Infrastructure
- **MongoDB 7.0** — predictions, audit logs (with embeddings), users, portfolios
- **Redis 7.2** — rate limiting, anomaly feature store
- **Docker / Docker Compose** — fully containerized (backend + MongoDB + Redis)

---

## Project Structure

```
tradefinlytix/
└── backend/
    ├── app/
    │   ├── main.py                  # FastAPI entry point, middleware, lifespan
    │   ├── core/
    │   │   ├── config.py            # Pydantic Settings — all env vars
    │   │   ├── database.py          # MongoDB connect/disconnect + index setup
    │   │   ├── bootstrap.py         # Seed admin/CISO accounts on startup
    │   │   ├── logging.py           # JSON structured logging
    │   │   └── roles.py             # RBAC role definitions
    │   ├── api/
    │   │   ├── dependencies.py      # CurrentUser, DB injection, require_permission
    │   │   └── routes/
    │   │       ├── auth.py          # Register, login, refresh, logout
    │   │       ├── prediction.py    # GET /predict/{symbol}
    │   │       ├── portfolio.py     # Portfolio + trade history
    │   │       ├── alerts.py        # User alerts
    │   │       ├── screener.py      # Stock screener
    │   │       ├── admin.py         # User lifecycle (admin only)
    │   │       └── ciso.py          # Audit chain, anomaly dashboard, RAG search (CISO only)
    │   ├── ml_engine/
    │   │   ├── ensemble_predict.py  # Top-level ensemble inference
    │   │   ├── models/
    │   │   │   ├── ensemble_model.py  # EnsembleModel class (XGB + LGB + LSTM + meta)
    │   │   │   ├── xgb_model.pkl      # Trained XGBoost model
    │   │   │   ├── lgb_model.pkl      # Trained LightGBM model
    │   │   │   ├── lstm_model.keras   # Trained LSTM model
    │   │   │   ├── meta_learner.pkl   # Trained meta-learner (LR)
    │   │   │   ├── lstm_scaler.pkl    # LSTM input scaler
    │   │   │   └── meta_scaler.pkl    # Meta-learner input scaler
    │   │   ├── features/
    │   │   │   ├── feature_engineering.py  # 59-feature extraction + LSTM sequences
    │   │   │   ├── event_detection.py      # placeholder
    │   │   │   └── preprocessing.py
    │   │   ├── data/
    │   │   │   ├── market_data.py   # yfinance live OHLCV + 59-feature computation
    │   │   │   ├── ingestion.py
    │   │   │   ├── sentiment.py     # placeholder
    │   │   │   └── aggregation.py
    │   │   ├── evaluation/
    │   │   │   ├── backtesting.py
    │   │   │   └── metrics.py
    │   │   ├── explainability/
    │   │   │   └── shap_explainer.py  # placeholder
    │   │   └── utils/
    │   │       └── atr_levels.py
    │   ├── rag/                          # RAG audit search (new)
    │   │   ├── embedder.py              # log dict → 384-dim vector (all-MiniLM-L6-v2)
    │   │   ├── retriever.py             # store embeddings + cosine similarity search
    │   │   └── rag_service.py           # retrieval + Groq LLM answer generation
    │   ├── security/
    │   │   ├── security_orchestrator.py  # Adaptive risk scoring engine
    │   │   ├── anomaly_detection.py      # IsolationForest + sentence-transformer vectors
    │   │   ├── zscore_detection.py       # Rolling z-score request-rate check
    │   │   ├── hmac_signing.py           # HMAC-SHA256 prediction signing
    │   │   ├── rate_limiter.py           # Redis-backed sliding window rate limiting
    │   │   ├── csrf.py                   # CSRF middleware (disabled by default)
    │   │   ├── security_alerts.py        # Structured log + optional webhook alerts
    │   │   └── input_validator.py
    │   ├── repositories/
    │   │   ├── audit_repo.py             # Append-only hash-chained audit log + embedding trigger
    │   │   ├── audit_chain_state.py      # In-process chain trust flag
    │   │   ├── prediction_repo.py
    │   │   ├── portfolio_repo.py
    │   │   ├── trade_repo.py
    │   │   ├── risk_history_repo.py
    │   │   ├── user_repo.py
    │   │   ├── stock_repo.py
    │   │   └── alert_repo.py
    │   ├── services/
    │   │   ├── prediction_service.py
    │   │   ├── auth_service.py
    │   │   ├── portfolio_service.py
    │   │   ├── alert_service.py
    │   │   ├── screener_service.py
    │   │   ├── admin_service.py
    │   │   └── ciso_service.py
    │   ├── schemas/                  # Pydantic v2 request/response models
    │   ├── workers/                  # placeholders (scheduler, alert_worker, data_collector)
    │   └── utils/
    ├── scripts/
    │   ├── train_model.py
    │   ├── seed_db.py
    │   └── migrate.py
    ├── docker-compose.yml
    ├── Dockerfile
    └── requirements.txt
```

---

## Getting Started

> **Recommended: Run locally without Docker.** Docker Compose is available for production deployments but adds overhead during development. Follow the local setup steps below to get started quickly.

---

### Option A — Run Locally (Recommended for Development)

#### Prerequisites

- Python 3.10+
- MongoDB 7.0 — [Download](https://www.mongodb.com/try/download/community)
- Redis 7.2 — [Download for Windows](https://github.com/tporadowski/redis/releases) · [macOS](https://formulae.brew.sh/formula/redis) · [Linux](https://redis.io/docs/install/install-redis/)

#### Step 1 · Clone the repo

```bash
git clone https://github.com/Toqir-dar/TradeFinlytix.git
cd TradeFinlytix/backend
```

#### Step 2 · Create and activate a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

#### Step 3 · Install dependencies

```bash
pip install -r requirements.txt
```

#### Step 4 · Start MongoDB and Redis

Make sure both services are running **before** starting the backend.

```bash
# MongoDB (runs on port 27017 by default)
mongod

# Redis (runs on port 6379 by default)
redis-server
```

> On Windows you can also start them from Services if installed as a Windows service.

#### Step 5 · Configure environment variables

Copy the example env file and fill in the required values:

```bash
cp .env.example .env   # or manually create backend/.env
```

Minimum required variables:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=tradefinlytix_db

# Must be a strong random string — app will refuse to start with the default placeholder
JWT_SECRET_KEY=your-strong-random-secret-here

# Must be exactly 32 bytes (characters)
AES_SECRET_KEY=your-exactly-32-byte-key-here!!

HMAC_SECRET_KEY=your-hmac-secret-here
REDIS_URL=redis://localhost:6379/0

# Seed admin and CISO accounts on first startup
ENABLE_BOOTSTRAP=true
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=AdminPass123
BOOTSTRAP_CISO_EMAIL=ciso@example.com
BOOTSTRAP_CISO_PASSWORD=CisoPass123
```

#### Step 6 · Start the backend

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs (Swagger UI) at `http://localhost:8000/docs`.

#### Step 7 · Train models (first time only)

The trained model files (`.pkl`, `.keras`) are included in the repo under `app/ml_engine/models/`. If you need to retrain from scratch:

```bash
python scripts/train_model.py --symbol OGDC --start 2020-01-01 --end 2025-01-01
```

---

### Option B — Run with Docker Compose (Production / CI)

> Requires Docker and Docker Compose installed. This spins up the backend, MongoDB, and Redis together in containers.

#### Prerequisites

- Docker & Docker Compose

#### Step 1 · Clone and configure

```bash
git clone https://github.com/Toqir-dar/TradeFinlytix.git
cd TradeFinlytix/backend
cp .env.example .env   # fill in JWT_SECRET_KEY, AES_SECRET_KEY, HMAC_SECRET_KEY
```

#### Step 2 · Start all services

```bash
# Backend + MongoDB + Redis
docker-compose up --build

# Add Mongo Express browser UI (development only)
docker-compose --profile dev up --build
```

#### Services and ports

| Service | Port |
|---------|------|
| FastAPI backend | `8000` |
| MongoDB | `27017` |
| Redis | `6379` |
| Mongo Express (dev profile) | `8081` |

---

## API Reference

Interactive docs are available at `http://localhost:8000/docs` when `EXPOSE_OPENAPI=true` (default in development).

### Authentication

All prediction, portfolio, admin, and CISO routes require:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `POST /api/v1/auth/login`.

---

### Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register new investor account |
| `POST` | `/api/v1/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Exchange refresh token for new access token |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | Current user profile |

---

### Prediction Routes

#### `GET /api/v1/predict/{symbol}`

Requires: any active authenticated user.

**Response:**
```json
{
  "symbol": "OGDC",
  "signal": "buy",
  "confidence": 0.72,
  "model_version": "stacked_ensemble_v1",
  "engine": "ensemble_v1",
  "entry_price": 175.00,
  "target_price": 187.25,
  "stop_loss": 170.63,
  "expected_gain_pct": 7.0,
  "time_horizon_days": 5,
  "base_scores": {
    "xgb": [...],
    "lgb": [...],
    "lstm": [...]
  },
  "signature": "hmac-sha256:a3f9...",
  "risk_level": "LOW"
}
```

If `event_detected = true`, confidence is downward-adjusted and a `HIGH UNCERTAINTY — MARKET EVENT DETECTED` tag is appended.

#### `POST /api/v1/predict/verify-integrity`

Verify the HMAC signature of a previously returned prediction payload.

```json
{ "payload": "...", "signature": "hmac-sha256:..." }
```

---

### Portfolio Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/portfolio` | Portfolio snapshot |
| `POST` | `/api/v1/portfolio/trade` | Record a trade |
| `GET` | `/api/v1/portfolio/history` | Trade history |

---

### Admin Routes *(role: admin)*

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/admin/users` | Paginated user list |
| `PATCH` | `/api/v1/admin/users/{id}` | Update user (activate/deactivate) |
| `GET` | `/api/v1/admin/audit` | Paginated audit log |

---

### CISO Routes *(role: ciso)*

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/ciso/audit` | Paginated audit log |
| `GET` | `/api/v1/ciso/audit/logs` | Alias of above |
| `GET` | `/api/v1/ciso/audit/verify` | Verify audit chain integrity |
| `POST` | `/api/v1/ciso/audit/search` | Natural language search over audit logs (RAG) |
| `GET` | `/api/v1/ciso/anomalies` | Behavioral anomaly events |
| `GET` | `/api/v1/ciso/anomalies/stats` | Anomaly frequency by day |
| `GET` | `/api/v1/ciso/risk/snapshots` | Adaptive risk snapshot history |
| `GET` | `/api/v1/ciso/risk/trend` | Daily risk score trend |
| `GET` | `/api/v1/ciso/risk/top` | Top risky subjects |
| `GET` | `/api/v1/ciso/risk/recent` | Recent critical block events |

#### `POST /api/v1/ciso/audit/search`

Requires: role `ciso`.

```json
{ "question": "show me suspicious login attempts from unusual IPs" }
```

**Response:**
```json
{
  "answer": "Two login attempts from IP 1.2.3.4 at unusual hours...",
  "sources": [
    { "event_type": "login_success", "ip": "1.2.3.4", "_score": 0.87, ... }
  ]
}
```

---

### System Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check — no DB hit |
| `GET` | `/health/db` | Deep check — pings MongoDB |

## Environment Variables

Key variables required in `backend/.env`:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name |
| `JWT_SECRET_KEY` | Strong random string for JWT signing |
| `AES_SECRET_KEY` | Exactly 32 bytes for portfolio encryption |
| `HMAC_SECRET_KEY` | Secret for prediction response signing |
| `REDIS_URL` | Redis connection URL |
| `GROQ_API_KEY` | Groq API key for RAG audit search |
| `ENABLE_BOOTSTRAP` | `true` to seed admin/CISO on first startup |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin account email |
| `BOOTSTRAP_ADMIN_PASSWORD` | Admin account password |
| `BOOTSTRAP_CISO_EMAIL` | CISO account email |
| `BOOTSTRAP_CISO_PASSWORD` | CISO account password |

---



All models are validated using **walk-forward time-series cross-validation** (`TimeSeriesSplit`) to prevent look-ahead bias.

| Metric | Description |
|--------|-------------|
| Accuracy | Overall classification accuracy |
| F1-Score (macro) | Balanced across BUY / HOLD / TRIM / SELL |
| Directional Accuracy | % of correct up/down calls (most financially relevant) |
| Calibration Error (ECE) | Measures how well confidence matches actual outcome rate |

---

## Security Architecture

| Layer | Implementation |
|-------|----------------|
| **Input validation** | Pydantic v2 strict schemas on all endpoints |
| **Authentication** | JWT (HS256) access tokens + refresh token rotation |
| **Authorization** | RBAC: investor / admin / ciso |
| **Account lockout** | Configurable failed-attempt threshold + lockout window |
| **Rate limiting** | Redis-backed sliding window; limits tighten per risk level |
| **Adaptive risk scoring** | Per-request cumulative score (LOW → MEDIUM → HIGH → CRITICAL) |
| **Behavioral anomaly detection** | IsolationForest on request feature vectors |
| **Z-score request monitoring** | Rolling z-score over per-user request rates |
| **Prediction signing** | HMAC-SHA256 per prediction response |
| **Portfolio encryption** | AES-256 at-rest encryption for portfolio data |
| **Audit chain** | Append-only, hash-linked tamper-evident log |
| **Audit chain guard** | Startup verification; optionally blocks sensitive endpoints if chain is broken |
| **CSRF protection** | Configurable middleware (disabled by default for bearer-token APIs) |
| **Security alerts** | Structured log emission + optional outbound JSON webhook |

### Audit Chain Safety Mode

When `AUDIT_REJECT_NEW_EVENTS_WHEN_CHAIN_UNTRUSTED=true` and the chain is found broken, the following endpoints return **503** until the chain is re-verified:

- `POST /api/v1/admin/*`
- `POST /api/v1/ciso/*`
- `GET /api/v1/predict/*`

---

## Roles & Permissions

| Permission | investor | admin | ciso |
|-----------|----------|-------|------|
| `predict:read` | ✓ | ✓ | ✓ |
| `portfolio:read/write` | ✓ | ✓ | — |
| `alerts:read/write` | ✓ | ✓ | — |
| `screener:read` | ✓ | ✓ | — |
| `admin:read/write` | — | ✓ | ✓ (read) |
| `users:read/write` | — | ✓ | ✓ (read) |
| `audit:read/write` | — | ✓ (read) | ✓ |
| `anomaly:read` | — | — | ✓ |

Privileged accounts (admin / CISO) cannot be deactivated or password-reset via the admin API (returns 403).

---

## Roadmap

- [ ] FinBERT sentiment pipeline (`sentiment.py` — currently placeholder)
- [ ] SHAP explainability per prediction (`shap_explainer.py` — currently placeholder)
- [ ] Event detection at inference time (`event_detection.py` — currently placeholder)
- [ ] APScheduler background jobs — scheduled retraining, data collection, alert worker
- [ ] Real-time streaming signals via WebSockets
- [ ] Frontend React dashboard with TradingView chart overlay
- [ ] PSX-fine-tuned FinBERT (Urdu + English financial corpus)
- [ ] Reinforcement learning for dynamic position sizing
- [ ] Multi-market support (KSE derivatives, commodity futures)
- [ ] MLflow experiment tracking integration

---

## Team

| Name | Roll No |
|------|---------|
| Aleena Ahmed | DS-09 |
| Seerat Fatima | DS-32 |
| Toqir Dar | DS-34 |
| Ayan Ahmed | DS-40 |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*TradeFinlytix — bringing institutional-grade AI to the Pakistan Stock Exchange.*
