"""Tests for password recovery."""

from urllib.parse import parse_qs, urlparse

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.routes import auth as auth_routes
from app.services.auth_service import AuthService


@pytest.fixture
def reset_data(app):
    """Create a user for password-reset tests."""
    email = "resetuser@storsight.local"
    with app.app_context():
        db.drop_all()
        db.create_all()
        role = Role(name="RESET_ENGINEER", description="Password reset test role")
        db.session.add(role)
        db.session.flush()
        user = User(
            username="resetuser",
            email=email,
            password_hash=AuthService().hash_password("Old-Password-123"),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

    yield email

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_forgot_password_does_not_reveal_account_existence(
    client, reset_data, monkeypatch
):
    """Known and unknown emails receive the same response."""
    links = []
    monkeypatch.setattr(
        auth_routes.email_service,
        "send_password_reset",
        lambda recipient, url: links.append((recipient, url)),
    )

    known = client.post(
        "/api/auth/forgot-password", json={"email": reset_data}
    )
    unknown = client.post(
        "/api/auth/forgot-password", json={"email": "missing@example.com"}
    )

    assert known.status_code == 202
    assert unknown.status_code == 202
    assert known.get_json() == unknown.get_json()
    assert len(links) == 1
    assert links[0][0] == reset_data


def test_reset_password_is_successful_and_single_use(
    client, reset_data, monkeypatch
):
    """A reset link changes the password and cannot be reused."""
    links = []
    monkeypatch.setattr(
        auth_routes.email_service,
        "send_password_reset",
        lambda recipient, url: links.append(url),
    )
    client.post("/api/auth/forgot-password", json={"email": reset_data})
    token = parse_qs(urlparse(links[0]).query)["token"][0]

    response = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "New-Password-456"},
    )
    reused = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "Another-Password-789"},
    )

    assert response.status_code == 200
    assert response.get_json() == {"message": "Password reset successful."}
    assert reused.status_code == 400

    login = client.post(
        "/api/auth/login",
        json={"username": "resetuser", "password": "New-Password-456"},
    )
    assert login.status_code == 200
