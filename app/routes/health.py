"""Health check routes for StorSight."""

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text
import redis

from app.extensions import db


health_bp = Blueprint("health", __name__)


def _database_check() -> dict:
    """Return the application database health check."""
    try:
        with db.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "details": "database reachable"}
    except Exception:
        return {"status": "error", "details": "database unavailable"}


def _redis_check() -> dict:
    """Return the Redis health check for rate limiting and worker coordination."""
    redis_uri = current_app.config.get("RATE_LIMIT_STORAGE_URI", "memory://")

    if redis_uri.startswith("memory://"):
        return {
            "status": "ok",
            "details": "using in-memory limiter for local development",
        }

    try:
        client = redis.Redis.from_url(
            redis_uri,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        return {"status": "ok", "details": "redis reachable"}
    except Exception:
        return {"status": "error", "details": "redis unavailable"}


def _health_checks() -> dict:
    """Gather application dependency health checks."""
    return {
        "database": _database_check(),
        "redis": _redis_check(),
    }


@health_bp.get("/health")
@health_bp.get("/")
@health_bp.get("/api/health")
def health_check():
    """Return current application health and dependency readiness."""
    checks = _health_checks()

    if checks["database"]["status"] != "ok":
        return jsonify({"status": "error", "checks": checks}), 503

    return jsonify({"status": "ok", "checks": checks}), 200


@health_bp.get("/health/ready")
def health_ready():
    """Return readiness only when required dependencies are healthy."""
    checks = _health_checks()

    if checks["database"]["status"] != "ok" or checks["redis"]["status"] != "ok":
        return jsonify({"status": "error", "checks": checks}), 503

    return jsonify({"status": "ok", "checks": checks}), 200