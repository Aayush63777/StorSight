"""Tests for transactional email provider selection."""

import json

import pytest

from app.services.mail_service import MailService


class FakeResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


def test_api_provider_sends_resend_compatible_request(app, monkeypatch):
    """API mode sends reset mail over HTTPS without opening an SMTP socket."""
    captured = {}

    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.headers)
        captured["timeout"] = timeout
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(
        "app.services.mail_service.urlopen",
        fake_urlopen,
    )

    with app.app_context():
        app.config.update(
            MAIL_PROVIDER="api",
            MAIL_API_URL="https://api.example.test/emails",
            MAIL_API_KEY="test-api-key",
            MAIL_FROM="no-reply@example.test",
        )
        MailService().send_password_reset(
            "user@example.test",
            "https://app.example.test/reset-password?token=test-token",
        )

    assert captured["url"] == "https://api.example.test/emails"
    assert captured["headers"]["Authorization"] == "Bearer test-api-key"
    assert captured["headers"]["Content-type"] == "application/json"
    assert captured["payload"]["to"] == ["user@example.test"]
    assert captured["timeout"] == 10


def test_api_provider_requires_api_key(app):
    """API mode fails clearly when the provider secret is missing."""
    with app.app_context():
        app.config.update(
            MAIL_PROVIDER="api",
            MAIL_API_URL="https://api.example.test/emails",
            MAIL_API_KEY=None,
            MAIL_FROM="no-reply@example.test",
        )

        with pytest.raises(RuntimeError, match="API is not configured"):
            MailService().send_password_reset(
                "user@example.test",
                "https://app.example.test/reset-password?token=test-token",
            )