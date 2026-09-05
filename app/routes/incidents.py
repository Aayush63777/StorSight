"""Incident API routes."""

from flask import Blueprint, g, jsonify, request

from app.auth.decorators import login_required
from app.services.incident_service import IncidentService


incidents_bp = Blueprint(
    "incidents",
    __name__,
    url_prefix="/api/incidents",
)

service = IncidentService()


def _serialize_incident(incident):
    """Serialize an incident for API responses."""
    return {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "status": incident.status,
        "assignee_id": incident.assignee_id,
        "created_at": (
            incident.created_at.isoformat()
            if incident.created_at
            else None
        ),
        "updated_at": (
            incident.updated_at.isoformat()
            if incident.updated_at
            else None
        ),
        "resolved_at": (
            incident.resolved_at.isoformat()
            if incident.resolved_at
            else None
        ),
    }


@incidents_bp.get("/")
@login_required
def list_incidents():
    """List incidents with optional filters."""
    status = request.args.get("status")
    severity = request.args.get("severity")

    try:
        if status:
            incidents = service.list_by_status(status)
        elif severity:
            incidents = service.list_by_severity(severity)
        else:
            incidents = service.list_incidents()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify([_serialize_incident(i) for i in incidents]), 200


@incidents_bp.get("/<int:incident_id>")
@login_required
def get_incident(incident_id):
    """Return an incident by ID."""
    incident = service.get_by_id(incident_id)

    if incident is None:
        return jsonify({"error": "Incident not found"}), 404

    return jsonify(_serialize_incident(incident)), 200


@incidents_bp.post("/")
@login_required
def create_incident():
    """Create a new incident."""
    data = request.get_json(silent=True) or {}

    try:
        incident = service.create_incident(
            title=data.get("title"),
            description=data.get("description"),
            severity=data.get("severity", "medium"),
            assignee_id=data.get("assignee_id"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_incident(incident)), 201


@incidents_bp.patch("/<int:incident_id>/resolve")
@login_required
def resolve_incident(incident_id):
    """Resolve an incident."""
    try:
        incident = service.resolve_incident(
            incident_id, user_id=g.current_user.id
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 409

    if incident is None:
        return jsonify({"error": "Incident not found"}), 404

    return jsonify(_serialize_incident(incident)), 200


@incidents_bp.patch("/<int:incident_id>/assign")
@login_required
def assign_incident(incident_id):
    """Assign an incident to a user."""
    data = request.get_json(silent=True) or {}
    assignee_id = data.get("assignee_id")

    if assignee_id is None:
        return jsonify({"error": "assignee_id is required."}), 400

    if not isinstance(assignee_id, int) or assignee_id <= 0:
        return jsonify({"error": "assignee_id must be a positive integer."}), 400

    incident = service.assign_incident(incident_id, assignee_id)

    if incident is None:
        return jsonify({"error": "Incident not found"}), 404

    return jsonify(_serialize_incident(incident)), 200
