"""
Reusable FastAPI dependency functions.
  - get_current_user -> validates JWT + checks jwt_version in DB
  - require_role     -> RBAC guard for specific roles
"""
import logging
from typing import Annotated

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.database import get_db
from app.core.roles import UserRole
from app.core.security import decode_token, decrypt_field
from app.utils.helpers import normalize_email

logger = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=True)


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db=Depends(get_db),
) -> dict:
    """
    1. Decode JWT
    2. Check jwt_version matches DB
    3. Check account is active
    4. Return user document
    """
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
    except JWTError as e:
        logger.warning("JWT decode failed: %s", e)
        raise auth_error

    user_id: str = payload.get("sub")
    token_version: int = payload.get("ver", 0)
    if not user_id:
        raise auth_error

    try:
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise auth_error

    if not user:
        raise auth_error

    if "email" not in user and user.get("email_encrypted"):
        try:
            user["email"] = normalize_email(decrypt_field(user["email_encrypted"]))
        except Exception:
            user["email"] = "unknown@invalid.local"

    # Prefer a clear 403 for deactivated accounts over 401 from jwt_version skew
    # (deactivation bumps jwt_version and revokes refresh tokens).
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    if user.get("jwt_version", 1) != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidated. Please log in again.",
        )

    request.state.user = user
    return user


def require_role(*allowed_roles: UserRole):
    """Dependency factory for role-based access."""

    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        allowed = [r.value for r in allowed_roles]
        if current_user.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: {', '.join(allowed)}",
            )
        return current_user

    return _check


CurrentUser = Annotated[dict, Depends(get_current_user)]
AdminOnly = Annotated[dict, Depends(require_role(UserRole.ADMIN))]
CISOOnly = Annotated[dict, Depends(require_role(UserRole.CISO))]
AdminOrCISO = Annotated[dict, Depends(require_role(UserRole.ADMIN, UserRole.CISO))]

