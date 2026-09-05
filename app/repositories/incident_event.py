"""Incident-event repository."""

from app.models.incident_event import IncidentEvent
from app.repositories.base import BaseRepository


class IncidentEventRepository(BaseRepository[IncidentEvent]):
    """Data access operations for incident-event relationships."""

    def __init__(self):
        super().__init__(IncidentEvent)

    def get_by_incident_id(self, incident_id: int):
        """Return event links for an incident, newest first."""
        return (
            self.model.query
            .filter_by(incident_id=incident_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_event_id(self, event_id: int):
        """Return incident links for an event, newest first."""
        return (
            self.model.query
            .filter_by(event_id=event_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_link(self, incident_id: int, event_id: int):
        """Return a specific incident-event link if it exists."""
        return self.model.query.filter_by(
            incident_id=incident_id,
            event_id=event_id,
        ).first()
