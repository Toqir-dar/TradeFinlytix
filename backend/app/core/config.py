"""
Central configuration loaded from .env via Pydantic Settings.
Import `settings` from here everywhere — never read os.environ directly.
"""
from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "TradeFinlytix"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = True
    expose_openapi: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "tradefinlytix_db"

    # JWT
    jwt_secret_key: str = "CHANGE_THIS"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # Auth — optional stricter password policy (symbol required)
    password_require_symbol: bool = False
    auth_lockout_failed_attempts: int = 5
    auth_lockout_minutes: int = 15

    # Adaptive security — cumulative risk score floor for each RiskLevel tier
    risk_score_medium_threshold: int = 30
    risk_score_high_threshold: int = 55
    risk_score_critical_threshold: int = 80

    # Behavioral anomaly detector (IsolationForest + rule fallback)
    anomaly_min_samples_ml: int = 50
    anomaly_max_features_kept: int = 500
    anomaly_model_ttl_seconds: int = 600
    anomaly_refit_growth_threshold: float = 0.2
    anomaly_alert_score_threshold: float = 0.6

    # Rolling z-score anomaly over request-rate series
    zscore_threshold: float = 3.0
    zscore_window_samples: int = 100

    # Bootstrap (privileged accounts seeded on startup)
    enable_bootstrap: bool = True
    bootstrap_admin_email: str = ""
    bootstrap_admin_password: str = ""
    bootstrap_ciso_email: str = ""
    bootstrap_ciso_password: str = ""

    # AES
    aes_secret_key: str = "CHANGE_THIS_32_BYTE_KEY_HERE_!!!"

    # HMAC
    hmac_secret_key: str = "CHANGE_THIS_HMAC_SECRET"

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    redis_url: str = "redis://localhost:6379/0"

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # ML
    models_dir: str = "app/ml_engine/saved_models"

    # Audit chain verification (tamper detection)
    audit_startup_verify_chain: bool = False
    audit_startup_verify_limit: int = 5000
    audit_abort_startup_when_chain_broken: bool = False
    audit_reject_new_events_when_chain_untrusted: bool = False

    # Risk engine — persist each adaptive_security snapshot for CISO trending
    persist_risk_snapshots_enabled: bool = True

    # Optional outbound hook (generic JSON webhook) for alerts
    security_alert_webhook_url: str = ""

    # CSRF (mainly useful if auth is cookie-based; bearer-only APIs can keep disabled)
    csrf_protection_enabled: bool = False
    csrf_cookie_name: str = "csrf_token"
    csrf_header_name: str = "X-CSRF-Token"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_security_threshold_order(self) -> "Settings":
        m, h, c = (
            self.risk_score_medium_threshold,
            self.risk_score_high_threshold,
            self.risk_score_critical_threshold,
        )
        if not (0 <= m < h < c <= 100):
            raise ValueError(
                "risk_score_* must satisfy 0 <= medium < high <= critical <= 100"
            )
        return self

    @field_validator("auth_lockout_failed_attempts")
    @classmethod
    def validate_lockout_attempts(cls, v: int) -> int:
        if v < 1:
            raise ValueError("auth_lockout_failed_attempts must be >= 1")
        return v

    @field_validator("auth_lockout_minutes")
    @classmethod
    def validate_lockout_window(cls, v: int) -> int:
        if v < 1:
            raise ValueError("auth_lockout_minutes must be >= 1")
        return v

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt(cls, v: str) -> str:
        if "CHANGE_THIS" in v:
            raise ValueError("JWT secret not set")
        return v

    @field_validator("aes_secret_key")
    @classmethod
    def validate_aes_key(cls, v: str) -> str:
        if len(v.encode()) != 32:
            raise ValueError("AES key must be exactly 32 bytes")
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — call this to get settings anywhere."""
    return Settings()


# Module-level singleton for convenience
settings = get_settings()

