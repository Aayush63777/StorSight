"""Health and readiness check routes for StorSight."""

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from app.extensions import db


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    """Return the current application health status."""
    return jsonify({"status": "ok"})


@health_bp.get("/health/ready")
def readiness_check():
    """Check dependencies required to serve production traffic."""
    checks = {}
    ready = True

    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        current_app.logger.exception("Readiness database check failed")
        checks["database"] = "unavailable"
        ready = False
    finally:
        db.session.remove()

    redis_uri = current_app.config.get("RATE_LIMIT_STORAGE_URI", "memory://")
    if redis_uri.startswith(("redis://", "rediss://")):
        try:
            import redis

            redis.Redis.from_url(redis_uri, socket_timeout=2).ping()
            checks["redis"] = "ok"
        except Exception:
            current_app.logger.exception("Readiness Redis check failed")
            checks["redis"] = "unavailable"
            ready = False
    else:
        checks["redis"] = "not_configured"

    return jsonify({"status": "ok" if ready else "degraded", "checks": checks}), (
        200 if ready else 503
    )