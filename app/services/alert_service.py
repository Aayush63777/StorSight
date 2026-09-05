"""Alert application service."""

from datetime import datetime, timezone

from app.models.alert import Alert
from app.repositories.alert import AlertRepository
from app.repositories.storage_resource import StorageResourceRepository


class AlertService:
    """Application operations for alerts."""

    ALLOWED_SEVERITIES = {"info", "warning", "critical"}
    ALLOWED_STATUSES = {"active", "resolved"}

    def __init__(self, repository=None, resource_repository=None):
        self.repository = repository or AlertRepository()
        self.resource_repository = (
            resource_repository or StorageResourceRepository()
        )

    # --- retrieval ---

    def get_by_id(self, alert_id: int):
        return self.repository.get_by_id(alert_id)

    def list_alerts(self):
        return self.repository.get_all()

    def list_active(self):
        return self.repository.get_active()

    def list_by_resource(self, resource_id: int):
        return self.repository.get_by_resource_id(resource_id)

    def list_by_severity(self, severity: str):
        severity = self._validate_severity(severity)
        return self.repository.get_by_severity(severity)

    def list_by_status(self, status: str):
        status = self._validate_status(status)
        return self.repository.get_by_status(status)

    # --- creation ---

    def create_alert(
        self,
        resource_id: int,
        title: str,
        severity: str,
        message: str | None = None,
    ):
        self._validate_resource_id(resource_id)
        title = self._validate_title(title)
        severity = self._validate_severity(severity)

        if not self.resource_repository.get_by_id(resource_id):
            raise ValueError("Storage resource not found.")

        alert = Alert(
            resource_id=resource_id,
            title=title,
            severity=severity,
            message=message.strip() if message else None,
        )

        self.repository.add(alert)
        self.repository.commit()
        return alert

    # --- lifecycle ---

    def resolve_alert(self, alert_id: int):
        alert = self.repository.get_by_id(alert_id)

        if alert is None:
            return None

        alert.status = "resolved"
        alert.resolved_at = datetime.now(timezone.utc)

        self.repository.commit()
        return alert

    # --- private validators ---

    @staticmethod
    def _validate_resource_id(resource_id: int) -> None:
        if resource_id is None or not isinstance(resource_id, int):
            raise ValueError("Resource ID is required.")
        if resource_id <= 0:
            raise ValueError("Resource ID must be positive.")

    @staticmethod
    def _validate_title(title: str) -> str:
        if not title or not title.strip():
            raise ValueError("Alert title is required.")
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
