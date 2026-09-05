"""Tests for StorSight authentication and authorization foundation."""

import pytest

from app.auth.decorators import role_required
from app.extensions import db
from app.models.role import Role
from app.models.user import User
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
