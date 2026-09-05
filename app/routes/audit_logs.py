"""Audit log API routes."""

from flask import Blueprint, jsonify

from app.auth.decorators import login_required
from app.services.audit_log_service import AuditLogService


audit_logs_bp = Blueprint(
    "audit_logs",
    __name__,
    url_prefix="/api/audit-logs",
)

service = AuditLogService()


def _serialize_log(log):
    """Serialize an audit log entry for API responses."""
    return {
        "id": log.id,
        "user_id": log.user_id,
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "details": log.details,
        "created_at": (
            log.created_at.isoformat()
            if log.created_at
            else None
        ),
    }


@audit_logs_bp.get("/")
@login_required
def list_audit_logs():
    """List all audit logs, newest first."""
    logs = service.list_logs()
    return jsonify([_serialize_log(log) for log in logs]), 200


@audit_logs_bp.get("/incidents/<int:incident_id>")
@login_required
def list_incident_audit_logs(incident_id):
    """Return all audit log entries for a specific incident."""
    logs = service.list_by_entity("incident", incident_id)
    return jsonify([_serialize_log(log) for log in logs]), 200
