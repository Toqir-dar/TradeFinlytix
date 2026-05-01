"""
Central configuration loaded from .env via Pydantic Settings.
Import `settings` from here everywhere — never read os.environ directly.
"""
from functools import lru_cache

from pydantic import field_validator
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

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

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

