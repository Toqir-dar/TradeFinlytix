# TradeFinlytix

> **AI-Powered PSX Trading Intelligence Platform**  
> Stacking ensemble of XGBoost · LSTM · Transformer with SHAP explainability, event-aware confidence, and secure deployment — purpose-built for the  Stock Exchange Market.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Solution Highlights](#solution-highlights)
- [AI Pipeline — v4](#ai-pipeline--v4)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Model Validation](#model-validation)
- [Security](#security)
- [Roadmap](#roadmap)
- [Team](#team)
- [License](#license)

---

## Overview

TradeFinlytix is a full-stack, production-grade AI trading platform built specifically for the **Pakistan Stock Exchange (PSX)**. It generates actionable trading signals — **STRONG BUY / HOLD / STRONG SELL** — by combining a calibrated stacking ensemble with real-time sentiment analysis, market event detection, and SHAP-based explainability.

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
- **Secure, auditable ML pipeline** — HMAC-signed predictions, SHA-256 model hashing
- **PSX-specific modeling** — trained on `.KA` tickers with local news sources

---

## AI Pipeline — v4

```
Raw Data → Sentiment → Event Detection → Feature Engineering
    └──────────────────────────────────────────────────────┐
                                                    Base Models
                                              ┌─────────────────┐
                                              │ XGBoost (tabular)│
                                              │ LSTM (time-seq)  │
                                              │ Transformer (seq)│
                                              └────────┬────────┘
                                                Meta-Learner (LR)
                                                Isotonic Calibration
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

- **Model:** FinBERT (finance-domain BERT)
- **Outputs per `(date, symbol)`:**
  - `finbert_score ∈ [-1, 1]` — directional sentiment
  - `finbert_conf ∈ [0, 1]` — model confidence
- Aggregated and aligned to trading days before feature merge

---

### 3 · Event Detection ⚡ *(Key Innovation)*

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

Each model independently outputs a probability triplet `[P(up), P(down), P(hold)]`:

| Model | Architecture | Specialty |
|-------|-------------|-----------|
| **XGBoost** | Gradient-boosted trees | Tabular feature importance |
| **LSTM** | 2-layer LSTM | Sequential price dependencies |
| **Transformer** | Multi-head self-attention | Long-range temporal patterns |

---

### 6 · Meta-Learner (Stacking)

- **Model:** Logistic Regression
- **Input:** 19 engineered features (base model probabilities + context features)
- **Calibration:** Isotonic Regression (more reliable than Platt scaling for non-monotonic outputs)
- **Output:** Final calibrated probability — used directly as confidence %

> Confidence shown in the API is an **isotonic-calibrated probability**, not raw softmax output.

---

### 7 · Signal Generation

```
P(up) > threshold_high  →  STRONG BUY
P(up) > threshold_low   →  BUY
P(hold) dominant        →  HOLD
P(down) > threshold_low →  SELL
P(down) > threshold_high→  STRONG SELL
```

When `event_flag = 1`, confidence is downward-adjusted and the tag **HIGH UNCERTAINTY — MARKET EVENT DETECTED** is appended.

---

### 8 · Explainability (SHAP)

Every prediction includes a SHAP breakdown, computed per model type:

```
Feature Contributions (example — OGDC 2025-04-24):
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

Multipliers `k₁`, `k₂` are tuned per symbol volatility profile.

---

### 10 · Security Layer 🔐

| Layer | Implementation |
|-------|----------------|
| Input validation | Pydantic v2 strict schemas |
| Anomaly detection | Isolation Forest on incoming feature vectors |
| Model integrity | SHA-256 hash check on load |
| Prediction signing | HMAC-SHA256 per response |
| Audit trail | Append-only prediction log with timestamp + hash |

---

## Tech Stack

### AI / ML
- **XGBoost** — tabular ensemble
- **PyTorch** — LSTM & Transformer models
- **HuggingFace Transformers** — FinBERT
- **SHAP** — explainability
- **Scikit-learn** — meta-learner, calibration, validation

### Backend
- **FastAPI** — REST API + async endpoints
- **Pydantic v2** — request/response validation
- **APScheduler** — scheduled model retraining and data pulls

### Frontend
- **React 18** — SPA dashboard
- **TradingView Lightweight Charts** — candlestick + signal overlay

### Database & Storage
- **MongoDB** — predictions, audit logs, news cache

### DevOps & MLOps
- **Docker / Docker Compose** — containerized services
- **GitHub Actions** — CI/CD
- **AWS EC2 + S3 + ECR** — compute, artifact storage, container registry
- **MLflow** — experiment tracking and model registry

---

## Project Structure

```
tradefinlytix/
├── data/
│   ├── ingestion/          # yfinance, news scrapers, Reddit API
│   └── processed/          # Feature-engineered datasets
├── models/
│   ├── xgboost/
│   ├── lstm/
│   ├── transformer/
│   └── meta_learner/       # Stacking + isotonic calibration
├── pipeline/
│   ├── sentiment.py        # FinBERT processing
│   ├── events.py           # Event detection logic
│   ├── features.py         # Feature engineering
│   └── security.py         # HMAC signing, SHA-256, Isolation Forest
├── api/
│   ├── main.py             # FastAPI app
│   ├── schemas.py          # Pydantic models
│   └── routes/
├── frontend/               # React dashboard
├── mlflow/                 # Experiment configs
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── tests/
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- MongoDB (local or Atlas)

### 1 · Clone

```bash
git clone https://github.com/your-org/tradefinlytix.git
cd tradefinlytix
```

### 2 · Environment Setup

```bash
cp .env.example .env
# Fill in: MONGO_URI, REDDIT_CLIENT_ID, REDDIT_SECRET, HMAC_SECRET_KEY
```

### 3 · Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### 4 · Run with Docker

```bash
docker-compose up --build
```

Or run services individually:

```bash
# API server
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend && npm run dev
```

### 5 · Train Models

```bash
python pipeline/train.py --symbol OGDC --start 2020-01-01 --end 2025-01-01
```

---

## API Reference

### `POST /api/v1/predict`

**Request:**
```json
{
  "symbol": "OGDC",
  "date": "2025-04-24"
}
```

**Response:**
```json
{
  "symbol": "OGDC",
  "date": "2025-04-24",
  "prediction": "STRONG BUY",
  "confidence": 0.82,
  "confidence_type": "isotonic-calibrated",
  "event_detected": true,
  "event_tag": "HIGH UNCERTAINTY — MARKET EVENT DETECTED",
  "entry": 175.00,
  "target": 191.40,
  "stop_loss": 167.30,
  "explanation": {
    "lstm_signal": "+31%",
    "finbert_sentiment": "+28%",
    "event_score": "+15%",
    "rsi_overbought": "-10%"
  },
  "signature": "hmac-sha256:a3f9...",
  "audit_id": "pred_20250424_OGDC_0082"
}
```

### `GET /api/v1/signals`

Returns the latest signals across all tracked PSX symbols.

### `GET /api/v1/explain/{audit_id}`

Returns full SHAP breakdown and feature values for a past prediction.

---

## Model Validation

All models are validated using **walk-forward time-series cross-validation** (`TimeSeriesSplit`) to prevent look-ahead bias.

| Metric | Description |
|--------|-------------|
| Accuracy | Overall classification accuracy |
| F1-Score (macro) | Balanced across BUY / HOLD / SELL |
| Directional Accuracy | % of correct up/down calls (most financially relevant) |
| Calibration Error (ECE) | Measures how well confidence matches actual accuracy |

---

## Security

All predictions are signed and logged. The audit pipeline guarantees:

1. **Input integrity** — Pydantic rejects malformed or out-of-range inputs before they reach the model
2. **Feature anomaly detection** — Isolation Forest flags unusual feature vectors as potential data poisoning
3. **Model integrity** — SHA-256 hash is verified on every model load; mismatches halt inference
4. **Output signing** — Every API response is HMAC-SHA256 signed with a secret key
5. **Immutable audit log** — Every prediction is appended to a tamper-evident log with full metadata

---

## Roadmap

- [ ] Real-time streaming signals via WebSockets
- [ ] PSX-fine-tuned FinBERT (Urdu + English financial corpus)
- [ ] Reinforcement learning for dynamic position sizing
- [ ] Multi-market support (KSE derivatives, commodity futures)
- [ ] Mobile app (React Native)

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
