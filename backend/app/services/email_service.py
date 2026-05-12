"""Outbound email helpers."""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    async def send_password_reset_otp(self, *, to_email: str, otp: str) -> None:
        subject = "Your TradeFinlytix password reset OTP"
        body = (
            "Use this OTP to reset your TradeFinlytix password:\n\n"
            f"{otp}\n\n"
            "This OTP expires in 2 minutes. If you did not request this, "
            "you can safely ignore this email."
        )
        await self._send_email(to_email=to_email, subject=subject, body=body)

    async def _send_email(self, *, to_email: str, subject: str, body: str) -> None:
        if not settings.smtp_host:
            if settings.is_production:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Email delivery is not configured.",
                )
            logger.warning(
                "email_delivery_not_configured",
                extra={
                    "event": "password_reset_otp_dev_delivery",
                    "to_email": to_email,
                    "subject": subject,
                    "body": body,
                },
            )
            return

        message = EmailMessage()
        message["From"] = settings.smtp_from_email
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        try:
            await asyncio.to_thread(self._send_smtp, message)
        except Exception as exc:
            logger.exception("email_delivery_failed", extra={"to_email": to_email})
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not send email right now. Please try again later.",
            ) from exc

    @staticmethod
    def _send_smtp(message: EmailMessage) -> None:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
