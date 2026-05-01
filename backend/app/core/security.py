"""
All cryptographic operations for TradeFinlytix.
  1. Password hashing     - bcrypt (passlib)
  2. JWT tokens           - create + decode (python-jose)
  3. AES-256-GCM          - encrypt/decrypt sensitive fields
  4. HMAC-SHA256          - sign prediction responses
  5. SHA-256 chain hash   - tamper-proof audit log chain
"""
import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str, jwt_version: int = 1) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": subject,
        "role": role,
        "ver": jwt_version,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str, jwt_version: int = 1) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": subject,
        "ver": jwt_version,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify JWT. Raises JWTError if invalid/expired."""
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as e:
        raise JWTError(f"Invalid token: {e}") from e


def _get_aes_key() -> bytes:
    """Derive 32-byte AES key from config via SHA-256."""
    return hashlib.sha256(settings.aes_secret_key.encode()).digest()


def encrypt_field(plaintext: str) -> str:
    """Encrypt a string field with AES-256-GCM."""
    key = _get_aes_key()
    nonce = os.urandom(12)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_field(encrypted_b64: str) -> str:
    """Decrypt an AES-256-GCM field."""
    key = _get_aes_key()
    combined = base64.b64decode(encrypted_b64)
    nonce, ciphertext = combined[:12], combined[12:]
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, None).decode()
    except Exception as e:
        raise ValueError("Decryption failed; data may be tampered.") from e


def sign_payload(payload: dict[str, Any]) -> str:
    """Sign a dict payload. Used to sign prediction API responses."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    return hmac.new(
        settings.hmac_secret_key.encode(),
        serialized.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_signature(payload: dict[str, Any], signature: str) -> bool:
    return hmac.compare_digest(sign_payload(payload), signature)


def compute_audit_hash(log_entry: dict[str, Any], prev_hash: str) -> str:
    """
    Compute SHA-256 hash for an audit log entry.
    Use "genesis" as prev_hash for the first entry.
    """
    content = json.dumps(log_entry, sort_keys=True, default=str) + prev_hash
    return hashlib.sha256(content.encode()).hexdigest()

