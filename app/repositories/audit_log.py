"""Audit log repository."""

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Data access operations for audit logs."""

    def __init__(self):
        super().__init__(AuditLog)

    def get_all(self):
        """Return all audit logs, newest first."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_user_id(self, user_id: int):
        """Return audit logs for a user, newest first."""
        return (
            self.model.query
            .filter_by(user_id=user_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_action(self, action: str):
        """Return audit logs by action, newest first."""
        return (
            self.model.query
            .filter_by(action=action)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_entity(self, entity_type: str, entity_id: int):
        """Return audit logs for a specific entity, newest first."""
        return (
            self.model.query
            .filter_by(entity_type=entity_type, entity_id=entity_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_recent(self, limit: int = 100):
        """Return the most recent audit logs."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .limit(limit)
            .all()
        )
