"""Password-reset email delivery."""

import logging
import smtplib
from email.message import EmailMessage

from flask import current_app


logger = logging.getLogger(__name__)


class EmailService:
    """Send reset links through SMTP, or log them for local development."""

    def send_password_reset(self, recipient: str, reset_url: str) -> None:
        host = current_app.config.get("SMTP_HOST")
        if not host:
            logger.info("Password reset link for %s: %s", recipient, reset_url)
            return

        message = EmailMessage()
        message["Subject"] = "Reset your StorSight password"
        message["From"] = current_app.config["MAIL_FROM"]
        message["To"] = recipient
        ttl_minutes = current_app.config["PASSWORD_RESET_TOKEN_TTL_MINUTES"]
        message.set_content(
            "Use this link to reset your StorSight password:\n\n"
            f"{reset_url}\n\n"
            f"This link expires in {ttl_minutes} minutes and can only be used once."
        )

        with smtplib.SMTP(host, current_app.config["SMTP_PORT"]) as smtp:
            if current_app.config["SMTP_USE_TLS"]:
                smtp.starttls()
            username = current_app.config.get("SMTP_USERNAME")
            password = current_app.config.get("SMTP_PASSWORD")
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
