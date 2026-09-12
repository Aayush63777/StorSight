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

    def list_events(self, limit: int | None = None):
        return self.repository.search(limit=limit)

    def search_events(
        self,
        resource_id: int | None = None,
        severity: str | None = None,
        event_type: str | None = None,
        limit: int | None = None,
    ):
        """Return events matching every supplied filter."""
        if severity:
            severity = severity.strip().lower()
            if severity not in self.ALLOWED_SEVERITIES:
                raise ValueError(
                    f"Invalid severity. Allowed values: "
                    f"{sorted(self.ALLOWED_SEVERITIES)}"
                )
        event_type = event_type.strip() if event_type else None
        return self.repository.search(
            resource_id=resource_id,
            severity=severity,
            event_type=event_type,
            limit=limit,
        )

    def page_events(
        self,
        resource_id: int | None = None,
        severity: str | None = None,
        event_type: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ):
        """Return one bounded page and the matching total."""
        if page < 1 or page_size < 1:
            raise ValueError("Page and page size must be positive.")
        normalized_severity = severity.strip().lower() if severity else None
        if normalized_severity and normalized_severity not in self.ALLOWED_SEVERITIES:
            raise ValueError(
                f"Invalid severity. Allowed values: "
                f"{sorted(self.ALLOWED_SEVERITIES)}"
            )
        normalized_type = event_type.strip() if event_type else None
        total = self.repository.count_search(
            resource_id=resource_id,
            severity=normalized_severity,
            event_type=normalized_type,
        )
        items = self.repository.search(
            resource_id=resource_id,
            severity=normalized_severity,
            event_type=normalized_type,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return items, total

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
        if not isinstance(event_type, str) or not event_type.strip():
            raise ValueError("Event type is required.")
        value = event_type.strip()
        if len(value) > 50:
            raise ValueError("Event type must be 50 characters or fewer.")
        return value

    @staticmethod
    def _validate_message(message: str) -> str:
        if not isinstance(message, str) or not message.strip():
            raise ValueError("Event message is required.")
        return message.strip()

    def _validate_severity(self, severity: str) -> str:
        if (
            not isinstance(severity, str)
            or severity.strip().lower() not in self.ALLOWED_SEVERITIES
        ):
            raise ValueError(
                f"Invalid severity. Allowed values: "
                f"{sorted(self.ALLOWED_SEVERITIES)}"
            )
        return severity.strip().lower()
