"""Incident repository."""

from app.models.incident import Incident
from app.repositories.base import BaseRepository


class IncidentRepository(BaseRepository[Incident]):
    """Data access operations for incidents."""

    def __init__(self):
        super().__init__(Incident)

    def get_all(self):
        """Return all incidents, newest first."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_open(self):
        """Return open incidents, newest first."""
        return (
            self.model.query
            .filter_by(status="open")
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_status(self, status: str):
        """Return incidents by status, newest first."""
        return (
            self.model.query
            .filter_by(status=status)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_severity(self, severity: str):
        """Return incidents by severity, newest first."""
        return (
            self.model.query
            .filter_by(severity=severity)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_assignee_id(self, assignee_id: int):
        """Return incidents assigned to a user, newest first."""
        return (
            self.model.query
            .filter_by(assignee_id=assignee_id)
            .order_by(self.model.created_at.desc())
            .all()
        )
