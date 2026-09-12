"""Minimal SMTP email adapter for authentication messages."""

from email.message import EmailMessage
import json
import smtplib
from urllib.request import Request, urlopen

from flask import current_app


class MailService:
    """Send transactional authentication email through a configured provider."""

    def send_password_reset(self, recipient: str, reset_url: str) -> None:
        sender = current_app.config.get("MAIL_FROM")
        provider = current_app.config.get("MAIL_PROVIDER", "api").lower()
        if not sender:
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

        if provider == "api":
            self._send_via_api(message)
            return
        if provider != "smtp":
            raise RuntimeError(f"Unsupported mail provider: {provider}")

        self._send_via_smtp(message)

    def _send_via_api(self, message: EmailMessage) -> None:
        api_url = current_app.config.get("MAIL_API_URL")
        api_key = current_app.config.get("MAIL_API_KEY")
        if not api_url or not api_key:
            raise RuntimeError("Transactional email API is not configured.")

        payload = json.dumps(
            {
                "from": message["From"],
                "to": [message["To"]],
                "subject": message["Subject"],
                "text": message.get_content(),
            }
        ).encode("utf-8")
        request = Request(
            api_url,
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=10) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(
                    f"Transactional email API returned HTTP {response.status}."
                )

    def _send_via_smtp(self, message: EmailMessage) -> None:
        host = current_app.config.get("MAIL_HOST")
        if not host:
            raise RuntimeError("SMTP email is not configured.")

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
