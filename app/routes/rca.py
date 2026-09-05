"""Root-cause analysis API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required
from app.services.root_cause_analysis_service import RootCauseAnalysisService


rca_bp = Blueprint(
    "rca",
    __name__,
    url_prefix="/api/incidents",
)

service = RootCauseAnalysisService()


def _serialize_rca(analysis):
    """Serialize a root-cause analysis for API responses."""
    return {
        "id": analysis.id,
        "incident_id": analysis.incident_id,
        "root_cause_category": analysis.root_cause_category,
        "confidence_score": analysis.confidence_score,
        "explanation": analysis.explanation,
        "rule_name": analysis.rule_name,
        "created_at": (
            analysis.created_at.isoformat()
            if analysis.created_at
            else None
        ),
    }


@rca_bp.get("/<int:incident_id>/rca")
@login_required
def list_rca(incident_id):
    """List all RCA records for an incident."""
    analyses = service.list_by_incident(incident_id)
    return jsonify([_serialize_rca(a) for a in analyses]), 200


@rca_bp.get("/<int:incident_id>/rca/<int:analysis_id>")
@login_required
def get_rca(incident_id, analysis_id):
    """Return a specific RCA record."""
    analysis = service.get_by_id(analysis_id)

    if analysis is None or analysis.incident_id != incident_id:
        return jsonify({"error": "RCA not found"}), 404

    return jsonify(_serialize_rca(analysis)), 200


@rca_bp.post("/<int:incident_id>/rca")
@login_required
def create_rca(incident_id):
    """Create a root-cause analysis for an incident."""
    data = request.get_json(silent=True) or {}

    try:
        analysis = service.create_analysis(
            incident_id=incident_id,
            root_cause_category=data.get("root_cause_category"),
            confidence_score=data.get("confidence_score", 0.0),
            explanation=data.get("explanation"),
            rule_name=data.get("rule_name"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_rca(analysis)), 201
