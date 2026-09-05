"""Incident-event correlation API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required
from app.services.incident_event_service import IncidentEventService


incident_events_bp = Blueprint(
    "incident_events",
    __name__,
    url_prefix="/api/incidents",
)

service = IncidentEventService()


def _serialize_link(link):
    """Serialize an incident-event link for API responses."""
    return {
        "id": link.id,
        "incident_id": link.incident_id,
        "event_id": link.event_id,
        "relationship_type": link.relationship_type,
        "created_at": (
            link.created_at.isoformat()
            if link.created_at
            else None
        ),
    }


@incident_events_bp.get("/<int:incident_id>/events")
@login_required
def list_incident_events(incident_id):
    """List all events correlated with an incident."""
    links = service.list_by_incident(incident_id)
    return jsonify([_serialize_link(link) for link in links]), 200


@incident_events_bp.post("/<int:incident_id>/events")
@login_required
def link_event_to_incident(incident_id):
    """Correlate an event with an incident."""
    data = request.get_json(silent=True) or {}
    event_id = data.get("event_id")
    relationship_type = data.get("relationship_type", "related")

    if event_id is None:
        return jsonify({"error": "event_id is required."}), 400

    if not isinstance(event_id, int) or event_id <= 0:
        return jsonify({"error": "event_id must be a positive integer."}), 400

    try:
        link, created = service.link_event(
            incident_id=incident_id,
            event_id=event_id,
            relationship_type=relationship_type,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    status_code = 201 if created else 200
    return jsonify(_serialize_link(link)), status_code
