"""Health check routes for StorSight."""

from flask import Blueprint, jsonify


health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health_check():
    """Return the current application health status."""
    return jsonify({"status": "ok"})