"""Event application service."""

from app.models.event import Event
from app.repositories.event import EventRepository
from app.repositories.storage_resource import StorageResourceRepository


class EventService:
    """Application operations for infrastructure events."""

    ALLOWED_SEVERITIES = {"info", "warning", "critical", "error"}

    def __init__(self, repository=None, resource_repository=None):
        self.repository = repository or EventRepository()
        self.resource_repository = (
            resource_repository or StorageResourceRepository()
        )

    def get_by_id(self, event_id: int):
        return self.repository.get_by_id(event_id)

    def list_events(self):
        return self.repository.get_all()

    def list_by_resource(self, resource_id: int):
        return self.repository.get_by_resource_id(resource_id)

    def list_by_severity(self, severity: str):
        severity = severity.strip().lower() if severity else severity
        if severity not in self.ALLOWED_SEVERITIES:
            raise ValueError(
                f"Invalid severity. Allowed values: "
                f"{sorted(self.ALLOWED_SEVERITIES)}"
            )
        return self.repository.get_by_severity(severity)

    def list_by_event_type(self, event_type: str):
        if not event_type or not event_type.strip():
            raise ValueError("Event type is required.")
        return self.repository.get_by_event_type(event_type.strip())

    def record_event(
        self,
        resource_id: int,
        event_type: str,
        message: str,
        severity: str = "info",
    ):
        self._validate_resource_id(resource_id)
        event_type = self._validate_event_type(event_type)
        message = self._validate_message(message)
        severity = self._validate_severity(severity)

        if not self.resource_repository.get_by_id(resource_id):
            raise ValueError("Storage resource not found.")

        event = Event(
            resource_id=resource_id,
            event_type=event_type,
            severity=severity,
            message=message,
        )

        self.repository.add(event)
        self.repository.commit()
        return event

    # --- private validators ---

    @staticmethod
    def _validate_resource_id(resource_id: int) -> None:
        if resource_id is None or not isinstance(resource_id, int):
            raise ValueError("Resource ID is required.")
        if resource_id <= 0:
            raise ValueError("Resource ID must be positive.")

    @staticmethod
    def _validate_event_type(event_type: str) -> str:
        if not event_type or not event_type.strip():
            raise ValueError("Event type is required.")
        return event_type.strip()

    @staticmethod
    def _validate_message(message: str) -> str:
        if not message or not message.strip():
            raise ValueError("Event message is required.")
        return message.strip()

    def _validate_severity(self, severity: str) -> str:
        if not severity or severity.strip().lower() not in self.ALLOWED_SEVERITIES:
            raise ValueError(
                f"Invalid severity. Allowed values: "
                f"{sorted(self.ALLOWED_SEVERITIES)}"
            )
        return severity.strip().lower()
