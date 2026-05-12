# TradeFinlytix — Backend

FastAPI-based REST API server with an integrated ML prediction engine, adaptive security layer, and RAG-powered audit search.

---

## Tech Stack

| Category | Technology |
|---|---|
| Language | Python 3.11 |
| Framework | FastAPI 0.111 + Uvicorn |
| Database | MongoDB 7.0 (async via Motor) |
| Cache / Rate Limiting | Redis 7.2 |
| ML | XGBoost 2.0, LightGBM 4.3, PyTorch 2.3 (LSTM), SHAP 0.45, scikit-learn 1.5 |
| Market Data | yfinance |
| Embeddings / RAG | sentence-transformers 5.4, Groq API |
| Auth | python-jose, passlib, bcrypt |
| Scheduling | APScheduler 3.10 |
| Testing | pytest, pytest-asyncio |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app entry point, lifespan, middleware
│   ├── core/
│   │   ├── config.py              # Pydantic Settings — all env vars
│   │   ├── database.py            # MongoDB connect/disconnect
│   │   ├── security.py            # JWT encode/decode, AES field encryption
│   │   ├── roles.py               # RBAC: UserRole enum + permission matrix
│   │   └── bootstrap.py           # Seeds admin/CISO accounts on startup
│   ├── api/
│   │   ├── dependencies.py        # require_permission(), get_current_user()
│   │   └── routes/
│   │       ├── auth.py            # /auth/*
│   │       ├── prediction.py      # /predict/{symbol}
│   │       ├── portfolio.py       # /portfolio/*
│   │       ├── alerts.py          # /alerts/*
│   │       ├── screener.py        # /screener/*
│   │       ├── admin.py           # /admin/* (admin role)
│   │       └── ciso.py            # /ciso/* (ciso role)
│   ├── ml_engine/
│   │   ├── ensemble_predict.py    # Main prediction orchestrator
│   │   ├── data/
│   │   │   ├── ingestion.py       # yfinance OHLCV fetching
│   │   │   └── market_data.py     # 59-feature live computation
│   │   ├── features/
│   │   │   └── feature_engineering.py  # RSI, MACD, Bollinger, ATR, OBV, ranks
│   │   ├── models/
│   │   │   ├── ensemble_model.py  # Meta-learner (Logistic Regression)
│   │   │   ├── xgb_model.py       # XGBoost base learner
│   │   │   ├── lgb_model.py       # LightGBM base learner
│   │   │   ├── lstm_model.py      # LSTM (Keras) sequence learner
│   │   │   ├── xgb_model.pkl      # Saved XGBoost weights
│   │   │   ├── lgb_model.pkl      # Saved LightGBM weights
│   │   │   ├── lstm_model.keras   # Saved LSTM weights
│   │   │   └── meta_learner.pkl   # Saved meta-learner weights
│   │   ├── explainability/
│   │   │   └── shap_explainer.py  # SHAP TreeExplainer, top-10 feature attribution
│   │   └── evaluation/
│   │       ├── backtesting.py     # Backtest on historical data
│   │       └── metrics.py         # Precision, recall, F1
│   ├── schemas/                   # Pydantic request/response models
│   ├── repositories/              # MongoDB data access layer
│   ├── services/                  # Business logic layer
│   ├── security/
│   │   ├── security_orchestrator.py  # Adaptive risk scoring
│   │   ├── anomaly_detection.py      # IsolationForest + Z-score
│   │   ├── rate_limiter.py           # Redis sliding-window rate limiter
│   │   └── hmac_signing.py           # Response payload signing
│   └── rag/
│       ├── embedder.py            # SentenceTransformer embeddings
│       ├── retriever.py           # Semantic top-k retrieval
│       └── rag_service.py         # Groq LLM answer generation
├── tests/                         # pytest test suite
├── scripts/                       # DB migration, seed, training stubs
├── Dockerfile                     # Multi-stage Python 3.11-slim image
├── docker-compose.yml             # Backend + MongoDB + Redis + Mongo Express
└── requirements.txt               # All Python dependencies
```

---

## API Routes

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new investor account |
| POST | `/login` | No | Obtain JWT access + refresh tokens |
| POST | `/refresh` | No | Exchange refresh token for new access token |
| POST | `/logout` | Yes | Invalidate current session |
| GET | `/me` | Yes | Get current user profile |

### Predictions (`/api/v1/predict`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/{symbol}` | INVESTOR+ | Ensemble prediction + SHAP attribution + adaptive risk score |

### Portfolio (`/api/v1/portfolio`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | INVESTOR+ | Get portfolio snapshot |
| POST | `/trades` | INVESTOR+ | Record a trade (encrypted at rest) |

### Alerts (`/api/v1/alerts`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | List user alerts |
| POST | `/` | Any | Create an alert |

### Screener (`/api/v1/screener`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | INVESTOR+ | Filter stocks by price, volume, trend, and risk rules |

### Admin (`/api/v1/admin`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | ADMIN | List all users (paginated) |
| GET | `/users/{userId}` | ADMIN | Get user details |
| PATCH | `/users/{userId}` | ADMIN | Deactivate / update user |

### CISO (`/api/v1/ciso`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit/chain` | CISO | Verify audit chain integrity |
| POST | `/audit/search` | CISO | RAG semantic search over audit logs |
| GET | `/risk/dashboard` | CISO | Risk trend and anomaly dashboard |

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Application
APP_NAME=TradeFinlytix
APP_ENV=development
DEBUG=True
HOST=0.0.0.0
PORT=8000

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=tradefinlytix_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Encryption
AES_SECRET_KEY=32-byte-hex-key-here
HMAC_SECRET_KEY=your-hmac-secret-here

# Bootstrap accounts (seeded on first startup)
ENABLE_BOOTSTRAP=true
BOOTSTRAP_ADMIN_EMAIL=admin@tradefinlytix.com
BOOTSTRAP_ADMIN_PASSWORD=StrongPass123!
BOOTSTRAP_CISO_EMAIL=ciso@tradefinlytix.com
BOOTSTRAP_CISO_PASSWORD=UltraSecure123!

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# External APIs
GROQ_API_KEY=your-groq-api-key

# Model directory
MODELS_DIR=app/ml_engine/models
```

---

## Running Locally

### With Docker Compose (recommended)

```bash
docker compose up --build
```

Services started:
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- Mongo Express: `http://localhost:8081`

### Without Docker

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Running Tests

```bash
pytest
```

Tests cover: auth flows, prediction pipeline, ensemble model, anomaly detection, screener, portfolio, admin routes, and security edge cases.

---

## ML Prediction Pipeline

1. **Data ingestion** — fetches live OHLCV data from yfinance for the requested symbol
2. **Feature engineering** — computes 59 technical indicators (RSI, MACD, Bollinger Bands, ATR, OBV, cross-sectional momentum ranks, etc.)
3. **Base learners** — XGBoost, LightGBM, and LSTM each produce a probability score
4. **Meta-learner** — a Logistic Regression stacks the three base outputs into a final signal: `BUY / HOLD / TRIM / SELL`
5. **SHAP** — a TreeExplainer computes the top-10 contributing features for the prediction
6. **Adaptive risk** — the user's recent request behavior is scored by an IsolationForest; high-risk sessions get tighter rate limits

---

## Security Architecture

- **JWT auth** with short-lived access tokens and rotating refresh tokens
- **RBAC** with three roles and a permission matrix enforced at the dependency level
- **AES-256 encryption** for sensitive fields stored in MongoDB
- **HMAC signing** on API responses to detect tampering in transit
- **Redis sliding-window rate limiter** with per-user adaptive tightening
- **IsolationForest anomaly detection** on request patterns (Z-score fallback)
- **Immutable audit chain** — every event is hash-linked; the CISO endpoint verifies chain integrity
- **RAG audit search** — semantic embeddings + Groq LLM enable natural language querying over audit logs

---

## Database Collections

| Collection | Purpose |
|---|---|
| `users` | Authentication, roles, session version |
| `audit_events` | Tamper-proof hash-linked event log |
| `predictions` | Stored predictions with HMAC signatures |
| `alerts` | User-facing alerts (INFO / WARNING / CRITICAL) |
| `portfolio` | Portfolio snapshots (encrypted) |
| `transactions` | Trade log (encrypted at rest) |
| `risk_snapshots` | Per-user adaptive security history |
| `stocks` | Stock metadata cache |

---

## Team

| Name | Roll No |
|---|---|
| Aleena Ahmed | DS-09 |
| Seerat Fatima | DS-32 |
| Toqir Dar | DS-34 |
| Ayan Ahmed | DS-40 |