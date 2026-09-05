"""Event repository."""

from app.models.event import Event
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository[Event]):
    """Data access operations for infrastructure events."""

    def __init__(self):
        super().__init__(Event)

    def get_by_resource_id(self, resource_id: int):
        """Return events for a resource."""
        return (
            self.model.query
            .filter_by(resource_id=resource_id)
            .order_by(self.model.occurred_at.desc())
            .all()
        )

    def get_by_severity(self, severity: str):
        """Return events by severity, most recent first."""
        return (
            self.model.query
            .filter_by(severity=severity)
            .order_by(self.model.occurred_at.desc())
            .all()
        )

    def get_by_event_type(self, event_type: str):
        """Return events by type, most recent first."""
        return (
            self.model.query
            .filter_by(event_type=event_type)
            .order_by(self.model.occurred_at.desc())
            .all()
        )
