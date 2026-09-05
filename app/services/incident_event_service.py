"""Incident-event application service."""

from app.models.incident_event import IncidentEvent
from app.repositories.incident import IncidentRepository
from app.repositories.incident_event import IncidentEventRepository
from app.repositories.event import EventRepository


class IncidentEventService:
    """Application operations for incident-event relationships."""

    def __init__(
        self,
        repository=None,
        incident_repository=None,
        event_repository=None,
    ):
        self.repository = repository or IncidentEventRepository()
        self.incident_repository = (
            incident_repository or IncidentRepository()
        )
        self.event_repository = event_repository or EventRepository()

    def get_by_id(self, link_id: int):
        return self.repository.get_by_id(link_id)

    def list_by_incident(self, incident_id: int):
        return self.repository.get_by_incident_id(incident_id)

    def list_by_event(self, event_id: int):
        return self.repository.get_by_event_id(event_id)

    def link_event(
        self,
        incident_id: int,
        event_id: int,
        relationship_type: str = "related",
    ):
        # validate both referenced entities exist
        if not self.incident_repository.get_by_id(incident_id):
            raise ValueError("Incident not found.")

        if not self.event_repository.get_by_id(event_id):
            raise ValueError("Event not found.")

        # idempotent — return existing link rather than erroring
        existing = self.repository.get_link(incident_id, event_id)
        if existing:
            return existing, False  # (link, created)

        link = IncidentEvent(
            incident_id=incident_id,
            event_id=event_id,
            relationship_type=relationship_type,
        )

        self.repository.add(link)
        self.repository.commit()
        return link, True  # (link, created)
