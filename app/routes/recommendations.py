"""Recommendation API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required, operational_write_required
from app.services.recommendation_service import RecommendationService


recommendations_bp = Blueprint(
    "recommendations",
    __name__,
    url_prefix="/api/incidents",
)

service = RecommendationService()


def _serialize_recommendation(rec):
    """Serialize a recommendation for API responses."""
    return {
        "id": rec.id,
        "incident_id": rec.incident_id,
        "title": rec.title,
        "description": rec.description,
        "priority": rec.priority,
        "reason": rec.reason,
        "created_at": (
            rec.created_at.isoformat()
            if rec.created_at
            else None
        ),
    }


@recommendations_bp.get("/<int:incident_id>/recommendations")
@login_required
def list_recommendations(incident_id):
    """List all recommendations for an incident."""
    recs = service.list_by_incident(incident_id)
    return jsonify([_serialize_recommendation(r) for r in recs]), 200


@recommendations_bp.get("/<int:incident_id>/recommendations/<int:rec_id>")
@login_required
def get_recommendation(incident_id, rec_id):
    """Return a specific recommendation."""
    rec = service.get_by_id(rec_id)

    if rec is None or rec.incident_id != incident_id:
        return jsonify({"error": "Recommendation not found"}), 404

    return jsonify(_serialize_recommendation(rec)), 200


@recommendations_bp.post("/<int:incident_id>/recommendations")
@operational_write_required
def create_recommendation(incident_id):
    """Create a recommendation for an incident."""
    data = request.get_json(silent=True) or {}

    try:
        rec = service.create_recommendation(
            incident_id=incident_id,
            title=data.get("title"),
            description=data.get("description"),
            priority=data.get("priority", "medium"),
            reason=data.get("reason"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_recommendation(rec)), 201
