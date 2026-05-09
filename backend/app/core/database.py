"""
Async MongoDB connection manager using Motor.
How to use in services/repos:
    from app.core.database import get_db
    db = await get_db()
    user = await db["users"].find_one({"email": email})
Lifecycle:
    connect_db()  -> called on app startup (main.py lifespan)
    close_db()    -> called on app shutdown
"""
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Open MongoDB connection. Called once on startup."""
    global _client, _database
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
        maxPoolSize=50,
        minPoolSize=5,
    )
    _database = _client[settings.mongodb_db_name]
    await _client.admin.command("ping")
    logger.info("MongoDB connected -> '%s'", settings.mongodb_db_name)
    await _create_indexes()


async def close_db() -> None:
    """Close MongoDB connection. Called on shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


async def get_db() -> AsyncIOMotorDatabase:
    """Return active database. Raises if called before connect_db()."""
    if _database is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _database


async def _create_indexes() -> None:
    """
    Create all required indexes.
    Idempotent -> safe to run on every startup.
    """
    if _database is None:
        raise RuntimeError("DB not initialized")

    db = _database

    # ✅ Fixed
    await db["users"].create_index(
      [("email_hash", 1)],
      unique=True,
      name="users_email_hash_unique",
      partialFilterExpression={"email_hash": {"$exists": True}}, 
)


    await db["psx_eod"].create_index(
        [("symbol", ASCENDING), ("date", DESCENDING)],
        unique=True,
        name="psx_eod_symbol_date",
    )
    await db["psx_intraday"].create_index(
        [("symbol", ASCENDING), ("datetime", DESCENDING)],
        name="psx_intraday_symbol_datetime",
    )

    await db["sentiment_raw"].create_index(
        [("symbol", ASCENDING), ("date", DESCENDING)],
        name="sentiment_raw_symbol_date",
    )
    await db["sentiment_daily"].create_index(
        [("symbol", ASCENDING), ("date", DESCENDING)],
        unique=True,
        name="sentiment_daily_symbol_date",
    )
    await db["predictions"].create_index(
        [("symbol", ASCENDING), ("date", DESCENDING)],
        name="predictions_symbol_date",
    )

    await db["portfolio"].create_index("user_id", name="portfolio_user_id")
    await db["transactions"].create_index(
        [("user_id", ASCENDING), ("timestamp", DESCENDING)],
        name="transactions_user_timestamp",
    )
    await db["alerts"].create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="alerts_user_created_at",
    )
    await db["alerts"].create_index("is_read", name="alerts_is_read")
    await db["alerts"].create_index(
        "created_at",
        name="alerts_created_at_ttl_30d",
        expireAfterSeconds=60 * 60 * 24 * 30,
    )

    await db["audit_logs"].create_index(
        [("user_id", ASCENDING), ("timestamp", DESCENDING)],
        name="audit_logs_user_timestamp",
    )
    # Single TTL on audit_logs: prefer created_at (canonical). Drop legacy timestamp TTL if present.
    audit_idx = await db["audit_logs"].index_information()
    if "audit_logs_ttl_30d" in audit_idx:
        try:
            await db["audit_logs"].drop_index("audit_logs_ttl_30d")
        except Exception as e:
            logger.warning(
                "Could not drop legacy audit_logs TTL index audit_logs_ttl_30d: %s",
                e,
            )
    await db["audit_logs"].create_index(
        "created_at",
        name="audit_logs_created_at_ttl_30d",
        expireAfterSeconds=60 * 60 * 24 * 30,
    )

    # Migration-safe fix:
    # If an old non-TTL index exists on created_at, drop it so we can enforce TTL
    # on the same key without IndexOptionsConflict.
    anomaly_indexes = await db["anomaly_logs"].index_information()
    if "anomaly_logs_created_at" in anomaly_indexes:
        await db["anomaly_logs"].drop_index("anomaly_logs_created_at")
    await db["anomaly_logs"].create_index(
        "created_at",
        name="anomaly_logs_ttl_30d",
        expireAfterSeconds=60 * 60 * 24 * 30,
    )

    # Enables token revocation/session control for refresh tokens.
    await db["refresh_tokens"].create_index(
        [("user_id", ASCENDING), ("created_at", DESCENDING)],
        name="refresh_tokens_user_created_at",
    )
    await db["refresh_tokens"].create_index(
        "expires_at",
        name="refresh_tokens_expires_at_ttl",
        expireAfterSeconds=0,
    )

    await db["risk_snapshots"].create_index(
        [("subject", ASCENDING), ("created_at", DESCENDING)],
        name="risk_snapshots_subject_created_at",
    )
    await db["risk_snapshots"].create_index(
        "created_at",
        name="risk_snapshots_created_at_ttl_90d",
        expireAfterSeconds=60 * 60 * 24 * 90,
    )

    logger.info("All MongoDB indexes verified/created.")

