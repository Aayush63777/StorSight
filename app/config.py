"""StorSight application configuration."""

import os


class BaseConfig:
    """Base configuration shared across environments."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session cookie — safe defaults; subclasses override where needed.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    # Frontend origin for CORS. Override per environment.
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:4200")
    PASSWORD_RESET_TOKEN_TTL_MINUTES = int(
        os.getenv("PASSWORD_RESET_TOKEN_TTL_MINUTES", "30")
    )
    MAIL_HOST = os.getenv("MAIL_HOST")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM = os.getenv("MAIL_FROM")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""

    DEBUG = True
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "sqlite:///storsight.db",
    )

    # Local HTTP development: Lax is correct for same-site localhost origins.
    # Angular at :4200 and Flask at :5000 are different ports but same host,
    # which browsers treat as same-site — so Lax works without SameSite=None.
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

    # Tests run over plain HTTP with no browser — Lax + not Secure is correct.
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = False

    FRONTEND_ORIGIN = "http://localhost:4200"


class ProductionConfig(BaseConfig):
    """Configuration for production."""

    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    # Production: HTTPS assumed.
    # Lax is appropriate for a same-site production deployment.
    # If frontend and API are served from different domains,
    # set FRONTEND_ORIGIN and consider SameSite=None + Secure.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = True

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "")


CONFIG_BY_ENVIRONMENT = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
