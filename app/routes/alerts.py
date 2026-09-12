"""Alert API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required, operational_write_required
from app.services.alert_service import AlertService


alerts_bp = Blueprint(
    "alerts",
    __name__,
    url_prefix="/api/alerts",
)

service = AlertService()


def _serialize_alert(alert):
    """Serialize an alert for API responses."""
    return {
        "id": alert.id,
        "resource_id": alert.resource_id,
        "title": alert.title,
        "severity": alert.severity,
        "status": alert.status,
        "message": alert.message,
        "created_at": (
            alert.created_at.isoformat()
            if alert.created_at
            else None
        ),
        "resolved_at": (
            alert.resolved_at.isoformat()
            if alert.resolved_at
            else None
        ),
    }


@alerts_bp.get("/")
@login_required
def list_alerts():
    """List alerts with optional filters."""
    resource_id = request.args.get("resource_id", type=int)
    severity = request.args.get("severity")
    status = request.args.get("status")
    limit = min(max(request.args.get("limit", 100, type=int), 1), 500)

    try:
        if resource_id is not None:
            alerts = service.list_by_resource(resource_id)
        elif severity:
            alerts = service.list_by_severity(severity)
        elif status:
            alerts = service.list_by_status(status)
        else:
            alerts = service.list_alerts(limit=limit)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify([_serialize_alert(alert) for alert in alerts]), 200


@alerts_bp.get("/<int:alert_id>")
@login_required
def get_alert(alert_id):
    """Return an alert by ID."""
    alert = service.get_by_id(alert_id)

    if alert is None:
        return jsonify({"error": "Alert not found"}), 404

    return jsonify(_serialize_alert(alert)), 200


@alerts_bp.post("/")
@operational_write_required
def create_alert():
    """Create a new alert."""
    data = request.get_json(silent=True) or {}

    try:
        alert = service.create_alert(
            resource_id=data.get("resource_id"),
            title=data.get("title"),
            severity=data.get("severity"),
            message=data.get("message"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_alert(alert)), 201


@alerts_bp.patch("/<int:alert_id>/resolve")
@operational_write_required
def resolve_alert(alert_id):
    """Resolve an alert."""
    try:
        alert = service.resolve_alert(alert_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if alert is None:
        return jsonify({"error": "Alert not found"}), 404

    return jsonify(_serialize_alert(alert)), 200
