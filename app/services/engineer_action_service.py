"""Engineer action application service.

Engineer actions are recorded as AuditLog entries.
The AuditLog schema (user_id, action, entity_type, entity_id, details)
is sufficient to represent every required field without a new table.

Action record layout:
    entity_type : "incident"
    entity_id   : incident_id
    user_id     : authenticated engineer
    action      : engineer_action:<action_type>
    details     : JSON-serialisable string with action_description and
                  optional recommendation_id
"""

import json

from app.repositories.audit_log import AuditLogRepository
from app.repositories.incident import IncidentRepository
from app.repositories.recommendation import RecommendationRepository
from app.services.audit_log_service import AuditLogService


ALLOWED_ACTION_TYPES = {
    "investigation",
    "diagnosis",
    "remediation",
    "escalation",
    "monitoring",
    "note",
}


class EngineerActionService:
    """Record and retrieve engineer actions for an incident."""

    def __init__(
        self,
        audit_log_service=None,
        incident_repository=None,
        recommendation_repository=None,
        audit_log_repository=None,
    ):
        self.audit_log_service = audit_log_service or AuditLogService()
        self.incident_repository = (
            incident_repository or IncidentRepository()
        )
        self.recommendation_repository = (
            recommendation_repository or RecommendationRepository()
        )
        self.audit_log_repository = (
            audit_log_repository or AuditLogRepository()
        )

    def record_action(
        self,
        incident_id: int,
        user_id: int,
        action_type: str,
        description: str,
        recommendation_id: int | None = None,
    ):
        """Record an engineer action against an incident.

        Returns the created AuditLog entry.

        Raises:
            ValueError: on validation failure or missing entities.
        """
        # --- validate incident ---
        incident = self.incident_repository.get_by_id(incident_id)
        if incident is None:
            raise ValueError("Incident not found.")

        # --- validate action_type ---
        if not action_type or action_type.strip().lower() not in ALLOWED_ACTION_TYPES:
            raise ValueError(
                f"Invalid action type. Allowed values: "
                f"{sorted(ALLOWED_ACTION_TYPES)}"
            )
        action_type = action_type.strip().lower()

        # --- validate description ---
        if not description or not description.strip():
            raise ValueError("Action description is required.")
        description = description.strip()

        # --- validate recommendation cross-reference ---
        if recommendation_id is not None:
            rec = self.recommendation_repository.get_by_id(recommendation_id)
            if rec is None:
                raise ValueError("Recommendation not found.")
            if rec.incident_id != incident_id:
                raise ValueError(
                    "Recommendation does not belong to this incident."
                )

        # --- build details payload ---
        details_payload = {"description": description}
        if recommendation_id is not None:
            details_payload["recommendation_id"] = recommendation_id

        log = self.audit_log_service.record(
            action=f"engineer_action:{action_type}",
            user_id=user_id,
            entity_type="incident",
            entity_id=incident_id,
            details=json.dumps(details_payload),
        )
        return log

    def list_actions(self, incident_id: int):
        """Return all engineer actions for an incident, newest first.

        Returns an empty list if the incident does not exist — callers
        should separately verify incident existence when a 404 is needed.
        """
        return [
            log
            for log in self.audit_log_repository.get_by_entity(
                "incident", incident_id
            )
            if log.action.startswith("engineer_action:")
        ]
