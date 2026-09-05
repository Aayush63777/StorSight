"""Alert repository."""

from app.models.alert import Alert
from app.repositories.base import BaseRepository


class AlertRepository(BaseRepository[Alert]):
    """Data access operations for alerts."""

    def __init__(self):
        super().__init__(Alert)

    def get_by_resource_id(self, resource_id: int):
        """Return alerts for a resource, newest first."""
        return (
            self.model.query
            .filter_by(resource_id=resource_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_active(self):
        """Return active alerts, newest first."""
        return (
            self.model.query
            .filter_by(status="active")
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_severity(self, severity: str):
        """Return alerts by severity, newest first."""
        return (
            self.model.query
            .filter_by(severity=severity)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_status(self, status: str):
        """Return alerts by status, newest first."""
        return (
            self.model.query
            .filter_by(status=status)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_all(self):
        """Return all alerts, newest first."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .all()
        )
