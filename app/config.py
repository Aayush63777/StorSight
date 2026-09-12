"""StorSight application configuration."""

import os


class BaseConfig:
    """Base configuration shared across environments."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ------------------------------------------------------------------
    # Session
    # ------------------------------------------------------------------
    SESSION_COOKIE_HTTPONLY = (
        os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    )
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = (
        os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    )

    # ------------------------------------------------------------------
    # Frontend / CORS
    # ------------------------------------------------------------------
    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:4200",
    )

    # ------------------------------------------------------------------
    # Password reset
    # ------------------------------------------------------------------
    PASSWORD_RESET_TOKEN_TTL_MINUTES = int(
        os.getenv("PASSWORD_RESET_TOKEN_TTL_MINUTES", "30")
    )

    # ------------------------------------------------------------------
    # Storage monitoring
    # ------------------------------------------------------------------
    MONITORING_ENABLED = os.getenv("MONITORING_ENABLED", "true").lower() == "true"
    MONITORING_INTERVAL_SECONDS = int(
        os.getenv("MONITORING_INTERVAL_SECONDS", "60")
    )
    STORAGE_CONNECT_TIMEOUT_SECONDS = int(
        os.getenv("STORAGE_CONNECT_TIMEOUT_SECONDS", "10")
    )
    STORAGE_MAX_RETRIES = int(os.getenv("STORAGE_MAX_RETRIES", "2"))

    # ------------------------------------------------------------------
    # Email / SMTP
    # ------------------------------------------------------------------
    MAIL_HOST = os.getenv("MAIL_HOST")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM = os.getenv(
        "MAIL_FROM",
        "no-reply@storsight.local",
    )
    MAIL_USE_TLS = (
        os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    )

    # ------------------------------------------------------------------
    # Rate limiting
    # ------------------------------------------------------------------
    RATE_LIMIT_STORAGE_URI = os.getenv(
        "RATE_LIMIT_STORAGE_URI",
        "memory://",
    )
    RATE_LIMIT_ENABLED = (
        os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    )

    # Compatibility aliases for Flask-Limiter
    RATELIMIT_STORAGE_URI = RATE_LIMIT_STORAGE_URI
    RATELIMIT_ENABLED = RATE_LIMIT_ENABLED

    # ------------------------------------------------------------------
    # Security
    # ------------------------------------------------------------------
    CSRF_ORIGIN_CHECK_ENABLED = True


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""

    DEBUG = True
    TESTING = False

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///storsight.db",
    )

    # Local HTTP development.
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False


class TestingConfig(BaseConfig):
    """Configuration for automated tests."""

    DEBUG = False
    TESTING = True

    SECRET_KEY = "test-only-secret"

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "sqlite:///storsight_test.db",
    )

    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    FRONTEND_ORIGIN = "http://localhost:4200"

    RATE_LIMIT_ENABLED = False
    RATELIMIT_ENABLED = False


class ProductionConfig(BaseConfig):
    """Configuration for production."""

    DEBUG = False
    TESTING = False

    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    # Production uses HTTPS.
    SESSION_COOKIE_HTTPONLY = True
    # The SPA and API are commonly hosted on different domains. Cross-site
    # credentialed requests need SameSite=None; Secure is mandatory for it.
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "None")
    SESSION_COOKIE_SECURE = True

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "")


CONFIG_BY_ENVIRONMENT = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
