"""Event repository."""

from app.models.event import Event
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository[Event]):
    """Data access operations for infrastructure events."""

    def __init__(self):
        super().__init__(Event)

    def search(self, resource_id=None, severity=None, event_type=None,
               limit=None, offset=None):
        """Return newest events matching all supplied filters."""
        query = self.model.query

        if resource_id is not None:
            query = query.filter(self.model.resource_id == resource_id)
        if severity:
            query = query.filter(self.model.severity == severity)
        if event_type:
            query = query.filter(self.model.event_type.ilike(f"%{event_type}%"))

        query = query.order_by(
            self.model.occurred_at.desc(),
            self.model.id.desc(),
        )
        if limit is not None:
            query = query.limit(limit)
        if offset is not None:
            query = query.offset(offset)
        return query.all()

    def count_search(self, resource_id=None, severity=None, event_type=None):
        """Count events matching all supplied filters."""
        query = self.model.query
        if resource_id is not None:
            query = query.filter(self.model.resource_id == resource_id)
        if severity:
            query = query.filter(self.model.severity == severity)
        if event_type:
            query = query.filter(self.model.event_type.ilike(f"%{event_type}%"))
        return query.count()

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
