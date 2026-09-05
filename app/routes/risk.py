"""Risk scoring API routes."""

from flask import Blueprint, jsonify

from app.auth.decorators import login_required
from app.services.risk_scoring_service import RiskScoringService


risk_bp = Blueprint(
    "risk",
    __name__,
    url_prefix="/api/incidents",
)

service = RiskScoringService()


@risk_bp.get("/<int:incident_id>/risk")
@login_required
def get_risk_score(incident_id):
    """Return the deterministic risk score for an incident."""
    try:
        result = service.calculate(incident_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    return jsonify(result), 200
