"""Tests for StorSight authentication and authorization foundation."""

import pytest
from urllib.parse import parse_qs, urlparse

from app.auth.decorators import role_required
from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.auth_service import AuthService


@pytest.fixture
def auth_data(app):
    """Create a role and user for authentication tests."""
    with app.app_context():
        db.create_all()

        role = Role(
            name="ENGINEER",
            description="Infrastructure engineer",
        )
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"

        service = AuthService()
        user = User(
            username="testuser",
            email="testuser@storsight.local",
            password_hash=service.hash_password(password),
            role_id=role.id,
        )

        db.session.add(user)
        db.session.commit()

        user_id = user.id

    yield {
        "username": "testuser",
        "password": password,
        "user_id": user_id,
        "role": "ENGINEER",
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_password_hashing_and_verification():
    """Verify passwords are hashed and can be verified."""
    service = AuthService()
    password = "StorSight-Test-Password"

    password_hash = service.hash_password(password)

    assert password_hash != password
    assert service.verify_password(password_hash, password)
    assert not service.verify_password(password_hash, "wrong-password")


def test_successful_login(client, auth_data):
    """Verify valid credentials create an authenticated session."""
    response = client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["message"] == "Login successful"
    assert data["user"]["username"] == auth_data["username"]
    assert data["user"]["email"] == "testuser@storsight.local"
    assert data["user"]["role"] == auth_data["role"]

    assert "password_hash" not in data
    assert "password" not in data["user"]

    with client.session_transaction() as session:
        assert session["user_id"] == auth_data["user_id"]


def test_failed_login(client, auth_data):
    """Verify invalid credentials are rejected safely."""
    response = client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid credentials"}

    with client.session_transaction() as session:
        assert "user_id" not in session


def test_authenticated_me(client, auth_data):
    """Verify authenticated users can access the current-user endpoint."""
    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    response = client.get("/api/auth/me")

    assert response.status_code == 200

    data = response.get_json()

    assert data["id"] == auth_data["user_id"]
    assert data["username"] == auth_data["username"]
    assert data["email"] == "testuser@storsight.local"
    assert data["role"] == auth_data["role"]

    assert "password_hash" not in data
    assert "password" not in data


def test_unauthenticated_me(client):
    """Verify unauthenticated users cannot access /me."""
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Authentication required"
    }


def test_logout(client, auth_data):
    """Verify logout clears the authenticated session."""
    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    with client.session_transaction() as session:
        assert session["user_id"] == auth_data["user_id"]

    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.get_json() == {
        "message": "Logout successful"
    }

    with client.session_transaction() as session:
        assert "user_id" not in session

    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_protected_route_access(client, auth_data):
    """Verify login_required protects a route."""
    response = client.get("/api/auth/me")

    assert response.status_code == 401

    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    response = client.get("/api/auth/me")

    assert response.status_code == 200


def test_role_authorization_allows_matching_role(client, auth_data):
    """Verify role_required allows an authorized role."""
    @role_required("ENGINEER")
    def protected_engineer_route():
        return {"message": "allowed"}, 200

    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    with client.session_transaction() as session:
        assert session["user_id"] == auth_data["user_id"]

    with client.application.test_request_context():
        from flask import session

        session["user_id"] = auth_data["user_id"]

        response = protected_engineer_route()

        assert response[1] == 200
        assert response[0]["message"] == "allowed"


def test_role_authorization_rejects_non_matching_role(client, auth_data):
    """Verify role_required rejects an unauthorized role."""
    @role_required("ADMIN")
    def protected_admin_route():
        return {"message": "allowed"}, 200

    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    with client.application.test_request_context():
        from flask import session

        session["user_id"] = auth_data["user_id"]

        response = protected_admin_route()

        assert response[1] == 403
        assert response[0].json == {"error": "Forbidden"}


def test_admin_can_provision_user(client, app, auth_data):
    """Verify only an administrator can create a user account."""
    with app.app_context():
        admin_role = Role(name="ADMIN", description="Platform administrator")
        db.session.add(admin_role)
        db.session.flush()

        admin = User(
            username="admin-user",
            email="admin@storsight.local",
            password_hash=AuthService().hash_password("Admin-Test-Password"),
            role_id=admin_role.id,
        )
        db.session.add(admin)
        db.session.commit()
        engineer_role_id = Role.query.filter_by(name="ENGINEER").first().id

    client.post(
        "/api/auth/login",
        json={
            "username": "admin-user",
            "password": "Admin-Test-Password",
        },
    )

    response = client.post(
        "/api/users/",
        json={
            "username": "new-engineer",
            "email": "new-engineer@storsight.local",
            "password": "Secure-Test-Password",
            "role_id": engineer_role_id,
        },
    )

    assert response.status_code == 201
    assert response.get_json()["username"] == "new-engineer"
    assert "password_hash" not in response.get_json()

    with app.app_context():
        user = User.query.filter_by(username="new-engineer").first()
        assert user is not None
        assert AuthService().verify_password(
            user.password_hash,
            "Secure-Test-Password",
        )


def test_engineer_cannot_manage_users(client, auth_data):
    """Verify ordinary authenticated users cannot provision accounts."""
    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    response = client.post(
        "/api/users/",
        json={
            "username": "blocked-user",
            "email": "blocked@storsight.local",
            "password": "Secure-Test-Password",
            "role_id": 1,
        },
    )

    assert response.status_code == 403


def test_forgot_password_does_not_reveal_account_existence(
    client,
    auth_data,
    monkeypatch,
):
    """Verify known and unknown emails receive the same safe response."""
    sent_urls = []

    monkeypatch.setattr(
        "app.routes.auth.mail_service.send_password_reset",
        lambda recipient, reset_url: sent_urls.append((recipient, reset_url)),
    )

    known = client.post(
        "/api/auth/forgot-password",
        json={"email": "testuser@storsight.local"},
    )
    unknown = client.post(
        "/api/auth/forgot-password",
        json={"email": "unknown@storsight.local"},
    )

    assert known.status_code == 202
    assert unknown.status_code == 202
    assert known.get_json() == unknown.get_json()
    assert len(sent_urls) == 1
    assert sent_urls[0][0] == "testuser@storsight.local"


def test_reset_password_is_single_use_and_revokes_session(
    client,
    app,
    auth_data,
    monkeypatch,
):
    """Verify reset consumes its token and invalidates an existing session."""
    sent_urls = []
    monkeypatch.setattr(
        "app.routes.auth.mail_service.send_password_reset",
        lambda recipient, reset_url: sent_urls.append(reset_url),
    )

    client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )
    other_session = app.test_client()
    other_session.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )
    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "testuser@storsight.local"},
    )
    assert response.status_code == 202

    token = parse_qs(urlparse(sent_urls[0]).query)["token"][0]
    reset = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "New-Strong-Test-Password"},
    )
    assert reset.status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    assert other_session.get("/api/auth/me").status_code == 401

    reused = client.post(
        "/api/auth/reset-password",
        json={"token": token, "password": "Another-Strong-Password"},
    )
    assert reused.status_code == 400

    with app.app_context():
        reset_token = PasswordResetToken.query.first()
        assert reset_token.used_at is not None
