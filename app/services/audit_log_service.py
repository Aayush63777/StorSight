"""Audit log application service."""

from app.models.audit_log import AuditLog
from app.repositories.audit_log import AuditLogRepository


class AuditLogService:
    """Application operations for audit logs."""

    def __init__(self, repository=None):
        self.repository = repository or AuditLogRepository()

    def get_by_id(self, audit_log_id: int):
        return self.repository.get_by_id(audit_log_id)

    def list_logs(self):
        return self.repository.get_all()

    def list_by_user(self, user_id: int):
        return self.repository.get_by_user_id(user_id)

    def list_by_entity(self, entity_type: str, entity_id: int):
        """Return all audit logs for a specific entity."""
        if not entity_type or not entity_type.strip():
            raise ValueError("Entity type is required.")
        if entity_id is None or entity_id <= 0:
            raise ValueError("Entity ID must be a positive integer.")
        return self.repository.get_by_entity(entity_type.strip(), entity_id)

    def list_recent(self, limit: int = 100):
        if limit <= 0:
            raise ValueError("Limit must be greater than zero.")
        return self.repository.get_recent(limit)

    def record(
        self,
        action: str,
        user_id: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        details: str | None = None,
    ) -> AuditLog:
        """Record an audit event and return the persisted log entry."""
        if not action or not action.strip():
            raise ValueError("Audit action is required.")

        log = AuditLog(
            user_id=user_id,
            action=action.strip(),
            entity_type=entity_type.strip() if entity_type else None,
            entity_id=entity_id,
            details=details.strip() if details else None,
        )

        self.repository.add(log)
        self.repository.commit()
        return log
