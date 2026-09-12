"""Minimal SMTP email adapter for authentication messages."""

from email.message import EmailMessage
import smtplib

from flask import current_app


class MailService:
    """Send transactional authentication email through configured SMTP."""

    def send_password_reset(self, recipient: str, reset_url: str) -> None:
        host = current_app.config.get("MAIL_HOST")
        sender = current_app.config.get("MAIL_FROM")
        if not host or not sender:
            raise RuntimeError("Transactional email is not configured.")

        message = EmailMessage()
        message["Subject"] = "Reset your StorSight password"
        message["From"] = sender
        message["To"] = recipient
        message.set_content(
            "A password reset was requested for your StorSight account.\n\n"
            f"Use this link within {current_app.config['PASSWORD_RESET_TOKEN_TTL_MINUTES']} "
            f"minutes:\n{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        )

        port = current_app.config["MAIL_PORT"]
        username = current_app.config.get("MAIL_USERNAME")
        password = current_app.config.get("MAIL_PASSWORD")
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.ehlo()
            if current_app.config.get("MAIL_USE_TLS"):
                smtp.starttls()
                smtp.ehlo()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
