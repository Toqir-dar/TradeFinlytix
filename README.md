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

TradeFinlytix is a full-stack, production-grade AI trading platform built specifically for the **Pakistan Stock Exchange (PSX)**. It generates actionable trading signals — **BUY / HOLD / TRIM / SELL** — by combining a calibrated stacking ensemble with real-time sentiment analysis, market event detection, adaptive security scoring, and SHAP-based explainability.

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
- **SHAP explainability** — every prediction is interpretable
- **Event-aware intelligence** — uncertainty adjusts when market anomalies are detected
- **Adaptive security engine** — per-request risk scoring that dynamically tightens rate limits
- **Immutable audit chain** — tamper-evident, hash-linked prediction and event log
- **RBAC** — investor, admin, and CISO roles with distinct permission scopes
- **PSX-specific modeling** — trained on `.KA` tickers with local news sources

---

## AI Pipeline

```
Raw Data → Sentiment → Event Detection → Feature Engineering
    └──────────────────────────────────────────────────────┐
                                                    Base Models
                                              ┌─────────────────┐
                                              │ XGBoost (tabular)│
                                              │ LightGBM (tabular│
                                              │ LSTM (time-seq)  │
                                              └────────┬────────┘
                                                Meta-Learner (LR)
                                                       │
                                            Final Signal + SHAP + ATR
```

### 1 · Data Ingestion

| Source | Provider |
|--------|----------|
| Price & OHLCV | `yfinance` — `.KA` tickers |
| Financial News | Google News, Dawn, Tribune |
| Social Sentiment | Reddit — `r/PakistanStocks`, `r/investing` |

---

### 2 · Sentiment Processing (FinBERT)

- **Model:** FinBERT via `sentence-transformers` (finance-domain BERT)
- **Outputs per `(date, symbol)`:**
  - `finbert_score ∈ [-1, 1]` — directional sentiment
  - `finbert_conf ∈ [0, 1]` — model confidence
- Aggregated and aligned to trading days before feature merge

---

### 3 · Event Detection *(Key Innovation)*

Detects anomalous market conditions using three independent signals:

| Signal | Method |
|--------|--------|
| Volume spike | Z-score vs. rolling window |
| Price shock | ATR-normalized daily move |
| Sentiment surge | Sudden shift in `finbert_score` |

**Outputs:**
- `event_flag ∈ {0, 1}` — binary anomaly indicator
- `event_score ∈ [0, 1]` — magnitude of the anomaly

> **Data leakage prevention:** All event features are shifted T → T+1 before training.

---

### 4 · Feature Engineering

| Category | Features |
|----------|----------|
| Technical | RSI, MACD, EMA (9/21/50), SMA (50/200), ATR |
| Momentum | Lag-1/3/5 returns, price momentum |
| Sentiment | `finbert_score`, `finbert_conf`, sentiment-strength agreement |
| Event | `event_flag`, `event_score`, rolling event frequency |

---

### 5 · Base Models (Parallel Ensemble)

Each model independently outputs an up/down probability pair:

| Model | Framework | Specialty |
|-------|-----------|-----------|
| **XGBoost** | `xgboost` | Tabular feature importance |
| **LightGBM** | `lightgbm` | Fast gradient-boosted trees |
| **LSTM** | TensorFlow / Keras | Sequential price dependencies |

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

Each signal carries an `entry_price`, `target_price`, `stop_loss`, `expected_gain_pct`, and `time_horizon_days`.

---

### 8 · Explainability (SHAP)

Every prediction includes a SHAP breakdown, computed per model type:

```
Feature Contributions (example — OGDC):
  LSTM Signal        +31%  ████████████████████████████████
  FinBERT Sentiment  +28%  ████████████████████████████
  Event Score        +15%  ███████████████
  RSI (Overbought)   -10%  ██████████  ←  negative contribution
```

---

### 9 · Risk Management (ATR-Based)

| Parameter | Calculation |
|-----------|-------------|
| **Entry** | Current price at signal time |
| **Target** | Entry + `k₁ × ATR(14)` |
| **Stop-Loss** | Entry − `k₂ × ATR(14)` |

---

## Tech Stack

### AI / ML
- **XGBoost** + **LightGBM** — tabular base models
- **TensorFlow / Keras** — LSTM model
- **sentence-transformers** — FinBERT sentiment
- **SHAP** — prediction explainability
- **scikit-learn** — meta-learner, scalers, walk-forward validation

### Backend
- **FastAPI 0.111** — async REST API
- **Pydantic v2** — strict request/response validation
- **Motor + PyMongo** — async MongoDB driver
- **APScheduler** — scheduled retraining and data pulls
- **Redis** — rate limiting and adaptive security counters
- **python-jose + passlib** — JWT auth and bcrypt password hashing
- **cryptography (AES)** — portfolio data encrypted at rest
- **HMAC-SHA256** — prediction response signing

### Database & Infrastructure
- **MongoDB 7.0** — predictions, audit logs, users, portfolios
- **Redis 7.2** — rate limiting
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
    │   │   ├── database.py          # MongoDB connect/disconnect
    │   │   ├── bootstrap.py         # Seed admin/CISO accounts on startup
    │   │   ├── logging.py           # JSON structured logging
    │   │   └── roles.py             # RBAC role definitions
    │   ├── api/
    │   │   ├── dependencies.py      # CurrentUser, DB injection
    │   │   └── routes/
    │   │       ├── auth.py          # Register, login, refresh, logout
    │   │       ├── prediction.py    # GET /predict/{symbol}
    │   │       ├── portfolio.py     # Portfolio + trade history
    │   │       ├── admin.py         # User lifecycle (admin only)
    │   │       └── ciso.py          # Audit chain, anomaly dashboard (CISO only)
    │   ├── ml_engine/
    │   │   ├── ensemble_predict.py  # Top-level ensemble inference
    │   │   ├── models/
    │   │   │   ├── ensemble_model.py  # EnsembleModel class (XGB + LGB + LSTM)
    │   │   │   ├── xgb_model.py
    │   │   │   ├── lgb_model.py
    │   │   │   └── lstm_model.py
    │   │   ├── features/
    │   │   │   ├── feature_engineering.py
    │   │   │   ├── event_detection.py
    │   │   │   └── preprocessing.py
    │   │   ├── data/
    │   │   │   ├── market_data.py   # yfinance live feature payload
    │   │   │   ├── ingestion.py
    │   │   │   ├── sentiment.py     # FinBERT pipeline
    │   │   │   └── aggregation.py
    │   │   ├── evaluation/
    │   │   │   ├── backtesting.py
    │   │   │   └── metrics.py
    │   │   ├── explainability/
    │   │   │   └── shap_explainer.py
    │   │   └── utils/
    │   │       └── atr_levels.py
    │   ├── security/
    │   │   ├── security_orchestrator.py  # Adaptive risk scoring engine
    │   │   ├── anomaly_detection.py      # IsolationForest on request features
    │   │   ├── zscore_detection.py       # Rolling z-score request-rate check
    │   │   ├── hmac_signing.py           # HMAC-SHA256 prediction signing
    │   │   ├── rate_limiter.py           # Redis-backed rate limiting
    │   │   ├── csrf.py
    │   │   ├── security_alerts.py        # Webhook + structured alert emission
    │   │   └── input_validator.py
    │   ├── repositories/
    │   │   ├── audit_repo.py             # Append-only hash-chained audit log
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
    │   │   ├── admin_service.py
    │   │   └── ciso_service.py
    │   ├── schemas/                  # Pydantic v2 request/response models
    │   ├── workers/                  # APScheduler background jobs
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

### Prerequisites

- Python 3.10+
- Docker & Docker Compose
- MongoDB (local or Atlas) — or use Docker Compose
- Redis — or use Docker Compose

### 1 · Clone

```bash
git clone https://github.com/Toqir-dar/TradeFinlytix.git
cd TradeFinlytix/backend
```

### 2 · Environment Setup

```bash
cp .env.example .env
```

Minimum required variables:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=tradefinlytix_db
JWT_SECRET_KEY=<strong-random-secret>
AES_SECRET_KEY=<exactly-32-bytes>
HMAC_SECRET_KEY=<strong-random-secret>
REDIS_URL=redis://localhost:6379/0

# Seed privileged accounts on startup
ENABLE_BOOTSTRAP=true
BOOTSTRAP_ADMIN_EMAIL=admin@example.com
BOOTSTRAP_ADMIN_PASSWORD=<password>
BOOTSTRAP_CISO_EMAIL=ciso@example.com
BOOTSTRAP_CISO_PASSWORD=<password>
```

### 3 · Run with Docker Compose

```bash
# Production services: backend + MongoDB + Redis
docker-compose up --build

# Include Mongo Express (browser UI) for development
docker-compose --profile dev up --build
```

Services:

| Service | Port |
|---------|------|
| FastAPI backend | `8000` |
| MongoDB | `27017` |
| Redis | `6379` |
| Mongo Express (dev) | `8081` |

### 4 · Run Locally (without Docker)

```bash
pip install -r requirements.txt

# Start MongoDB and Redis separately, then:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5 · Train Models

```bash
python scripts/train_model.py --symbol OGDC --start 2020-01-01 --end 2025-01-01
```

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
| `GET` | `/api/v1/ciso/audit/verify` | Verify audit chain integrity |
| `GET` | `/api/v1/ciso/anomalies` | Behavioral anomaly events |
| `GET` | `/api/v1/ciso/risk/dashboard` | Adaptive risk snapshots and trending |

---

### System Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check — no DB hit |
| `GET` | `/health/db` | Deep check — pings MongoDB |

---

## Model Validation

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

- [ ] Real-time streaming signals via WebSockets
- [ ] PSX-fine-tuned FinBERT (Urdu + English financial corpus)
- [ ] Reinforcement learning for dynamic position sizing
- [ ] Frontend React dashboard with TradingView chart overlay
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
