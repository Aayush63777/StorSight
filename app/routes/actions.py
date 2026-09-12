"""Engineer action API routes."""

import json

from flask import Blueprint, g, jsonify, request

from app.auth.decorators import login_required, operational_write_required
from app.services.engineer_action_service import EngineerActionService
from app.services.incident_service import IncidentService


actions_bp = Blueprint(
    "actions",
    __name__,
    url_prefix="/api/incidents",
)

action_service = EngineerActionService()
incident_service = IncidentService()


def _serialize_action(log):
    """Serialize an engineer action (AuditLog) for API responses."""
    details = {}
    if log.details:
        try:
            details = json.loads(log.details)
        except (ValueError, TypeError):
            details = {"raw": log.details}

    # strip the "engineer_action:" prefix for the public action_type field
    action_type = log.action
    if action_type.startswith("engineer_action:"):
        action_type = action_type[len("engineer_action:"):]

    return {
        "id": log.id,
        "incident_id": log.entity_id,
        "user_id": log.user_id,
        "action_type": action_type,
        "description": details.get("description"),
        "recommendation_id": details.get("recommendation_id"),
        "created_at": (
            log.created_at.isoformat()
            if log.created_at
            else None
        ),
    }


@actions_bp.get("/<int:incident_id>/actions")
@login_required
def list_actions(incident_id):
    """List all engineer actions for an incident."""
    incident = incident_service.get_by_id(incident_id)
    if incident is None:
        return jsonify({"error": "Incident not found"}), 404

    actions = action_service.list_actions(incident_id)
    return jsonify([_serialize_action(a) for a in actions]), 200


@actions_bp.post("/<int:incident_id>/actions")
@operational_write_required
def create_action(incident_id):
    """Record an engineer action against an incident."""
    data = request.get_json(silent=True) or {}

    try:
        log = action_service.record_action(
            incident_id=incident_id,
            user_id=g.current_user.id,
            action_type=data.get("action_type"),
            description=data.get("description"),
            recommendation_id=data.get("recommendation_id"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_action(log)), 201
