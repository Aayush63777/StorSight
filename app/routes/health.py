"""Health check routes for StorSight."""

from flask import Blueprint, jsonify


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
@health_bp.get("/")
@health_bp.get("/api/health")
def health_check():
    """Return the current application health status."""
    return jsonify({"status": "ok"})