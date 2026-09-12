"""Event API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required, operational_write_required
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
    event_type = request.args.get("event_type", "").strip()
    limit = min(max(request.args.get("limit", 100, type=int), 1), 500)

    paginated = (
        request.args.get("page") is not None
        or request.args.get("page_size") is not None
    )
    if paginated:
        try:
            page = int(request.args.get("page", 1))
            page_size = min(max(int(request.args.get("page_size", 50)), 1), 200)
            if page < 1:
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid page or page_size parameter."}), 400

        try:
            events, total = service.page_events(
                resource_id=resource_id,
                severity=severity,
                event_type=event_type or None,
                page=page,
                page_size=page_size,
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        return jsonify({
            "items": [_serialize_event(event) for event in events],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }), 200

    try:
        events = service.search_events(
            resource_id=resource_id,
            severity=severity,
            event_type=event_type or None,
            limit=limit,
        )
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
@operational_write_required
def create_event():
    """Record a new infrastructure event."""
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "Request body must be a JSON object."}), 400

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
