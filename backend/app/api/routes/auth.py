"""Auth API: register, login, refresh, logout, me."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from jose import JWTError, jwt
from starlette.responses import RedirectResponse, Response

from app.api.dependencies import CurrentUser
from app.core.config import settings
from app.core.database import get_db
from app.core.http_client import get_http_client
from app.schemas.user_schema import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordWithOtpRequest,
    TokenResponse,
    UserLoginRequest,
    UserPublic,
    UserRegisterRequest,
    VerifyPasswordResetOtpRequest,
)
from app.security.csrf import issue_csrf_token
from app.services.auth_service import AuthService
from app.utils.helpers import get_client_ip

router = APIRouter(prefix="/auth", tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def _to_public(user: dict) -> UserPublic:
    return UserPublic.model_validate({**user, "_id": str(user["_id"])})


def _safe_next_path(next_path: str | None) -> str:
    if not next_path or not next_path.startswith("/") or next_path.startswith("//"):
        return "/dashboard"
    return next_path


def _frontend_url(path: str, **params: str) -> str:
    base = settings.frontend_url.rstrip("/")
    query = urlencode({k: v for k, v in params.items() if v})
    return f"{base}{path}{'?' + query if query else ''}"


def _create_google_state(next_path: str) -> str:
    payload = {
        "type": "google_oauth_state",
        "next": _safe_next_path(next_path),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode_google_state(state_token: str) -> str:
    try:
        payload = jwt.decode(
            state_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google OAuth state.",
        ) from exc
    if payload.get("type") != "google_oauth_state":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google OAuth state.",
        )
    return _safe_next_path(payload.get("next"))


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: UserRegisterRequest, db=Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    user, tokens = await service.register(
        payload.email, payload.password, payload.full_name
    )
    return AuthResponse(user=_to_public(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: UserLoginRequest, request: Request, response: Response, db=Depends(get_db)
) -> AuthResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    user, tokens = await service.authenticate(payload.email, payload.password, ip)
    csrf = issue_csrf_token()
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf,
        httponly=False,
        samesite="strict",
        secure=settings.is_production,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    tokens.csrf_token = csrf
    return AuthResponse(user=_to_public(user), tokens=tokens)


@router.get("/google/login")
async def google_login(next: str = Query("/dashboard")) -> RedirectResponse:
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured.",
        )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": _create_google_state(next),
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    db=Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(_frontend_url("/login", error="google_auth_failed"))
    if not code or not state:
        return RedirectResponse(_frontend_url("/login", error="google_auth_missing_code"))

    try:
        next_path = _decode_google_state(state)
    except HTTPException:
        return RedirectResponse(_frontend_url("/login", error="google_auth_invalid_state"))

    client = get_http_client()
    try:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_response.raise_for_status()
        google_tokens = token_response.json()
        access_token = google_tokens.get("access_token")
        if not access_token:
            raise ValueError("Google token response did not include access_token")

        profile_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_response.raise_for_status()
        profile = profile_response.json()
    except Exception:
        return RedirectResponse(_frontend_url("/login", error="google_auth_exchange_failed"))

    email = str(profile.get("email") or "").strip().lower()
    google_sub = str(profile.get("sub") or "").strip()
    email_verified = profile.get("email_verified", False)
    if not email or not google_sub or email_verified not in (True, "true", "True", "1", 1):
        return RedirectResponse(_frontend_url("/login", error="google_email_unverified"))

    service = AuthService(db)
    ip = get_client_ip(request)
    try:
        _user, tokens = await service.authenticate_google(
            email=email,
            full_name=str(profile.get("name") or ""),
            google_sub=google_sub,
            avatar_url=profile.get("picture"),
            ip=ip,
        )
    except HTTPException:
        return RedirectResponse(_frontend_url("/login", error="google_auth_failed"))

    return RedirectResponse(
        _frontend_url(
            "/auth/google/callback",
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            next=next_path,
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, request: Request, db=Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    return await service.refresh(payload.refresh_token, ip)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db=Depends(get_db),
) -> MessageResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    message = await service.request_password_reset(payload.email, ip)
    return MessageResponse(message=message)


@router.post("/forgot-password/resend", response_model=MessageResponse)
async def resend_forgot_password_otp(
    payload: ForgotPasswordRequest,
    request: Request,
    db=Depends(get_db),
) -> MessageResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    message = await service.resend_password_reset_otp(payload.email, ip)
    return MessageResponse(message=message)


@router.post("/forgot-password/verify-otp", response_model=MessageResponse)
async def verify_forgot_password_otp(
    payload: VerifyPasswordResetOtpRequest,
    request: Request,
    db=Depends(get_db),
) -> MessageResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    message = await service.verify_password_reset_otp(payload.email, payload.otp, ip)
    return MessageResponse(message=message)


@router.post("/forgot-password/reset", response_model=MessageResponse)
async def reset_forgotten_password(
    payload: ResetPasswordWithOtpRequest,
    request: Request,
    db=Depends(get_db),
) -> MessageResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    message = await service.reset_password_with_otp(
        payload.email,
        payload.otp,
        payload.new_password,
        ip,
    )
    return MessageResponse(message=message)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current: CurrentUser,
    db=Depends(get_db),
) -> MessageResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    message = await service.change_password(
        str(current["_id"]),
        payload.current_password,
        payload.new_password,
        ip,
    )
    return MessageResponse(message=message)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: RefreshRequest, current: CurrentUser, db=Depends(get_db)
) -> Response:
    service = AuthService(db)
    await service.logout(str(current["_id"]), payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(current: CurrentUser, db=Depends(get_db)) -> Response:
    service = AuthService(db)
    await service.logout_all(str(current["_id"]))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserPublic)
async def me(current: CurrentUser) -> UserPublic:
    return _to_public(current)
