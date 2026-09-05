"""Event API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required
from app.services.event_service import EventService


events_bp = Blueprint(
    "events",
    __name__,
    url_prefix="/api/events",
)

service = EventService()


def _serialize_event(event):
    """Serialize an event for API responses."""
    return {
        "id": event.id,
        "resource_id": event.resource_id,
        "event_type": event.event_type,
        "severity": event.severity,
        "message": event.message,
        "occurred_at": (
            event.occurred_at.isoformat()
            if event.occurred_at
            else None
        ),
    }


@events_bp.get("/")
@login_required
def list_events():
    """List events with optional filters."""
    resource_id = request.args.get("resource_id", type=int)
    severity = request.args.get("severity")
    event_type = request.args.get("event_type")

    try:
        if resource_id is not None:
            events = service.list_by_resource(resource_id)
        elif severity:
            events = service.list_by_severity(severity)
        elif event_type:
            events = service.list_by_event_type(event_type)
        else:
            events = service.list_events()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify([_serialize_event(event) for event in events]), 200


@events_bp.get("/<int:event_id>")
@login_required
def get_event(event_id):
    """Return an event by ID."""
    event = service.get_by_id(event_id)

    if event is None:
        return jsonify({"error": "Event not found"}), 404

    return jsonify(_serialize_event(event)), 200


@events_bp.post("/")
@login_required
def create_event():
    """Record a new infrastructure event."""
    data = request.get_json(silent=True) or {}

    try:
        event = service.record_event(
            resource_id=data.get("resource_id"),
            event_type=data.get("event_type"),
            message=data.get("message"),
            severity=data.get("severity", "info"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_event(event)), 201
