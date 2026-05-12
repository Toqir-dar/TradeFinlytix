"""Auth API: register, login, refresh, logout, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from starlette.responses import Response

from app.api.dependencies import CurrentUser
from app.core.database import get_db
from app.schemas.user_schema import (
    AuthResponse,
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
from app.services.auth_service import AuthService
from app.utils.helpers import get_client_ip

router = APIRouter(prefix="/auth", tags=["Auth"])


def _to_public(user: dict) -> UserPublic:
    return UserPublic.model_validate({**user, "_id": str(user["_id"])})


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
    payload: UserLoginRequest, request: Request, db=Depends(get_db)
) -> AuthResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    user, tokens = await service.authenticate(payload.email, payload.password, ip)
    return AuthResponse(user=_to_public(user), tokens=tokens)


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
