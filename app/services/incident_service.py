"""Incident application service."""

from datetime import datetime, timezone

from app.models.incident import Incident
from app.repositories.incident import IncidentRepository


class IncidentService:
    """Application operations for incidents."""

    ALLOWED_SEVERITIES = {"low", "medium", "high", "critical"}
    ALLOWED_STATUSES = {"open", "in_progress", "resolved"}

    def __init__(self, repository=None):
        self.repository = repository or IncidentRepository()

    # --- retrieval ---

    def get_by_id(self, incident_id: int):
        return self.repository.get_by_id(incident_id)

    def list_incidents(self):
        return self.repository.get_all()

    def list_open(self):
        return self.repository.get_open()

    def list_by_status(self, status: str):
        status = self._validate_status(status)
        return self.repository.get_by_status(status)

    def list_by_severity(self, severity: str):
        severity = self._validate_severity(severity)
        return self.repository.get_by_severity(severity)

    # --- creation ---

    def create_incident(
        self,
        title: str,
        description: str | None = None,
        severity: str = "medium",
        assignee_id: int | None = None,
    ):
        title = self._validate_title(title)
        severity = self._validate_severity(severity)

        incident = Incident(
            title=title,
            description=description.strip() if description else None,
            severity=severity,
            assignee_id=assignee_id,
        )

        self.repository.add(incident)
        self.repository.commit()
        return incident

    # --- lifecycle ---

    def assign_incident(self, incident_id: int, assignee_id: int):
        incident = self.repository.get_by_id(incident_id)

        if incident is None:
            return None

        incident.assignee_id = assignee_id
        self.repository.commit()
        return incident

    def resolve_incident(self, incident_id: int, user_id: int | None = None):
        """Resolve an incident.

        Returns:
            The resolved Incident on success.
            None if the incident does not exist.

        Raises:
            ValueError: if the incident is already resolved.
        """
        incident = self.repository.get_by_id(incident_id)

        if incident is None:
            return None

        if incident.status == "resolved":
            raise ValueError("Incident is already resolved.")

        incident.status = "resolved"
        incident.resolved_at = datetime.now(timezone.utc)
        self.repository.commit()

        # record audit entry
        from app.services.audit_log_service import AuditLogService
        AuditLogService().record(
            action="incident_resolved",
            user_id=user_id,
            entity_type="incident",
            entity_id=incident_id,
            details=f"Incident '{incident.title}' resolved.",
        )

        return incident

    # --- private validators ---

    @staticmethod
    def _validate_title(title: str) -> str:
        if not title or not title.strip():
            raise ValueError("Incident title is required.")
        return title.strip()

    def _validate_severity(self, severity: str) -> str:
        if not severity or severity.strip().lower() not in self.ALLOWED_SEVERITIES:
            raise ValueError(
                f"Invalid severity. Allowed values: "
                f"{sorted(self.ALLOWED_SEVERITIES)}"
            )
        return severity.strip().lower()

    def _validate_status(self, status: str) -> str:
        if not status or status.strip().lower() not in self.ALLOWED_STATUSES:
            raise ValueError(
                f"Invalid status. Allowed values: "
                f"{sorted(self.ALLOWED_STATUSES)}"
            )
        return status.strip().lower()
