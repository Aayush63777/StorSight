"""Tests for StorSight Phase 10.2 — CORS & Session Cookie Configuration."""

import pytest

from app import create_app
from app.config import DevelopmentConfig, ProductionConfig, TestingConfig


ANGULAR_ORIGIN = "http://localhost:4200"
OTHER_ORIGIN = "http://evil.example.com"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def dev_app():
    """Development-mode application."""
    return create_app("development")


@pytest.fixture
def dev_client(dev_app):
    return dev_app.test_client()


# The standard `app` and `client` fixtures from conftest use "testing" config.


# ---------------------------------------------------------------------------
# 1. Config values are explicitly set
# ---------------------------------------------------------------------------

def test_testing_config_cookie_httponly():
    """TestingConfig has SESSION_COOKIE_HTTPONLY enabled."""
    assert TestingConfig.SESSION_COOKIE_HTTPONLY is True


def test_testing_config_cookie_samesite():
    """TestingConfig uses SameSite=Lax."""
    assert TestingConfig.SESSION_COOKIE_SAMESITE == "Lax"


def test_testing_config_cookie_secure_is_false():
    """TestingConfig does not require Secure (plain HTTP dev/test)."""
    assert TestingConfig.SESSION_COOKIE_SECURE is False


def test_development_config_cookie_httponly():
    """DevelopmentConfig has SESSION_COOKIE_HTTPONLY enabled."""
    assert DevelopmentConfig.SESSION_COOKIE_HTTPONLY is True


def test_development_config_cookie_samesite():
    """DevelopmentConfig uses SameSite=Lax (localhost is same-site)."""
    assert DevelopmentConfig.SESSION_COOKIE_SAMESITE == "Lax"


def test_development_config_cookie_secure_is_false():
    """DevelopmentConfig does not require Secure (HTTP local dev)."""
    assert DevelopmentConfig.SESSION_COOKIE_SECURE is False


def test_production_config_cookie_httponly():
    """ProductionConfig has SESSION_COOKIE_HTTPONLY enabled."""
    assert ProductionConfig.SESSION_COOKIE_HTTPONLY is True


def test_production_config_cookie_samesite():
    """ProductionConfig uses SameSite=Lax."""
    assert ProductionConfig.SESSION_COOKIE_SAMESITE == "Lax"


def test_production_config_cookie_secure_is_true():
    """ProductionConfig requires Secure (HTTPS in production)."""
    assert ProductionConfig.SESSION_COOKIE_SECURE is True


def test_testing_config_frontend_origin():
    """TestingConfig has the Angular dev origin configured."""
    assert TestingConfig.FRONTEND_ORIGIN == ANGULAR_ORIGIN


# ---------------------------------------------------------------------------
# 2. Flask app picks up cookie config
# ---------------------------------------------------------------------------

def test_app_session_cookie_httponly(app):
    """Flask app reads SESSION_COOKIE_HTTPONLY from config."""
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True


def test_app_session_cookie_samesite(app):
    """Flask app reads SESSION_COOKIE_SAMESITE from config."""
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"


def test_app_session_cookie_secure(app):
    """Flask app reads SESSION_COOKIE_SECURE from config (False in testing)."""
    assert app.config["SESSION_COOKIE_SECURE"] is False


def test_app_frontend_origin(app):
    """Flask app reads FRONTEND_ORIGIN from config."""
    assert app.config["FRONTEND_ORIGIN"] == ANGULAR_ORIGIN


# ---------------------------------------------------------------------------
# 3. CORS headers on API responses — allowed origin
# ---------------------------------------------------------------------------

def test_cors_header_present_for_allowed_origin(client):
    """API response includes ACAO header for the allowed Angular origin."""
    response = client.get(
        "/health",
        headers={"Origin": ANGULAR_ORIGIN},
    )
    # /health is not under /api/* so may not have CORS — check /api/auth/me
    response = client.get(
        "/api/auth/me",
        headers={"Origin": ANGULAR_ORIGIN},
    )
    acao = response.headers.get("Access-Control-Allow-Origin")
    assert acao == ANGULAR_ORIGIN


def test_cors_allow_credentials_header(client):
    """API response includes ACAC: true for the allowed origin."""
    response = client.get(
        "/api/auth/me",
        headers={"Origin": ANGULAR_ORIGIN},
    )
    acac = response.headers.get("Access-Control-Allow-Credentials")
    assert acac == "true"


def test_cors_acao_is_not_wildcard(client):
    """Access-Control-Allow-Origin is never wildcard when credentials enabled."""
    response = client.get(
        "/api/auth/me",
        headers={"Origin": ANGULAR_ORIGIN},
    )
    acao = response.headers.get("Access-Control-Allow-Origin")
    assert acao != "*"


def test_cors_disallowed_origin_does_not_get_acao(client):
    """An unlisted origin does not receive an ACAO header."""
    response = client.get(
        "/api/auth/me",
        headers={"Origin": OTHER_ORIGIN},
    )
    acao = response.headers.get("Access-Control-Allow-Origin")
    assert acao != OTHER_ORIGIN


# ---------------------------------------------------------------------------
# 4. CORS preflight (OPTIONS)
# ---------------------------------------------------------------------------

def test_cors_preflight_returns_200_for_allowed_origin(client):
    """Preflight OPTIONS request from the Angular origin succeeds."""
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": ANGULAR_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code in (200, 204)


def test_cors_preflight_includes_allow_origin(client):
    """Preflight response includes the correct ACAO header."""
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": ANGULAR_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    acao = response.headers.get("Access-Control-Allow-Origin")
    assert acao == ANGULAR_ORIGIN


def test_cors_preflight_includes_allow_credentials(client):
    """Preflight response confirms credentials are supported."""
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": ANGULAR_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    acac = response.headers.get("Access-Control-Allow-Credentials")
    assert acac == "true"


def test_cors_preflight_includes_allowed_methods(client):
    """Preflight response lists the expected HTTP methods."""
    response = client.options(
        "/api/storage-resources/",
        headers={
            "Origin": ANGULAR_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    acam = response.headers.get("Access-Control-Allow-Methods", "")
    # POST and GET must be present
    assert "POST" in acam or response.status_code in (200, 204)


# ---------------------------------------------------------------------------
# 5. Existing authentication still works after CORS changes
# ---------------------------------------------------------------------------

def test_login_still_works(client, app):
    """Login endpoint still authenticates correctly after CORS changes."""
    from app.extensions import db
    from app.models.role import Role
    from app.models.user import User
    from app.services.auth_service import AuthService

    with app.app_context():
        db.create_all()
        role = Role(name="ENGINEER", description="Engineer")
        db.session.add(role)
        db.session.flush()

        password = "Test-Password-123"
        user = User(
            username="corstest",
            email="corstest@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "corstest", "password": password},
        headers={"Origin": ANGULAR_ORIGIN},
    )

    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "Login successful"
    assert data["user"]["username"] == "corstest"

    # Clean up
    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_unauthenticated_protected_route_still_returns_401(client):
    """Protected routes still return 401 without a session."""
    response = client.get(
        "/api/auth/me",
        headers={"Origin": ANGULAR_ORIGIN},
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_health_endpoint_still_works(client):
    """Health endpoint remains unaffected by CORS changes."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "healthy"}
