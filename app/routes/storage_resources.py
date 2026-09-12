"""Storage resource API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required, operational_write_required
from app.services.monitoring_service import MonitoringService
from app.services.metric_service import MetricService
from app.services.storage_resource_service import StorageResourceService


storage_resources_bp = Blueprint(
    "storage_resources",
    __name__,
    url_prefix="/api/storage-resources",
)

service = StorageResourceService()
monitoring_service = MonitoringService()
metric_service = MetricService()


def _serialize_resource(resource):
    """Serialize a storage resource without exposing internal fields."""
    return {
        "id": resource.id,
        "name": resource.name,
        "resource_type": resource.resource_type,
        "adapter_type": resource.adapter_type,
        "endpoint_url": resource.endpoint_url,
        "credential_configured": bool(resource.credential_ref),
        "monitoring_enabled": resource.monitoring_enabled,
        "poll_interval_seconds": resource.poll_interval_seconds,
        "stale_after_seconds": resource.stale_after_seconds,
        "status": resource.status,
        "health_status": resource.effective_health_status,
        "health_reason": resource.health_reason,
        "monitoring_state": resource.monitoring_state,
        "last_seen": resource.last_seen.isoformat() if resource.last_seen else None,
        "last_metric_at": resource.last_metric_at.isoformat() if resource.last_metric_at else None,
        "connection_tested_at": resource.connection_tested_at.isoformat() if resource.connection_tested_at else None,
        "monitoring_error": resource.monitoring_error,
        "capacity_total": resource.capacity_total,
        "capacity_used": resource.capacity_used,
        "capacity_total_bytes": resource.authoritative_capacity_total_bytes,
        "capacity_used_bytes": resource.authoritative_capacity_used_bytes,
        "capacity_available": resource.capacity_available,
        "capacity_available_bytes": resource.capacity_available_bytes,
        "capacity_utilization_percent": resource.capacity_utilization_percent,
        "created_at": (
            resource.created_at.isoformat()
            if resource.created_at
            else None
        ),
        "updated_at": (
            resource.updated_at.isoformat()
            if resource.updated_at
            else None
        ),
    }


@storage_resources_bp.get("/")
@login_required
def list_storage_resources():
    """List storage resources with optional filters."""
    name = request.args.get("name")
    status = request.args.get("status")
    resource_type = request.args.get("resource_type")

    try:
        resources = service.list_resources(
            name=name,
            status=status,
            resource_type=resource_type,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify([_serialize_resource(resource) for resource in resources]), 200


@storage_resources_bp.get("/<int:resource_id>")
@login_required
def get_storage_resource(resource_id):
    """Return a storage resource by ID."""
    resource = service.get_by_id(resource_id)

    if resource is None:
        return jsonify({"error": "Storage resource not found"}), 404

    return jsonify(_serialize_resource(resource)), 200


@storage_resources_bp.post("/")
@operational_write_required
def create_storage_resource():
    """Create a storage resource."""
    data = request.get_json(silent=True) or {}

    try:
        resource = service.create_resource(
            name=data.get("name"),
            resource_type=data.get("resource_type"),
            status=data.get("status", "healthy"),
            capacity_total=data.get("capacity_total"),
            capacity_used=data.get("capacity_used"),
            adapter_type=data.get("adapter_type", "manual"),
            endpoint_url=data.get("endpoint_url"),
            credential_ref=data.get("credential_ref"),
            monitoring_enabled=data.get("monitoring_enabled", False),
            poll_interval_seconds=data.get("poll_interval_seconds", 300),
            stale_after_seconds=data.get("stale_after_seconds", 900),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_resource(resource)), 201


@storage_resources_bp.patch("/<int:resource_id>")
@operational_write_required
def update_storage_resource(resource_id):
    """Update an existing storage resource."""
    data = request.get_json(silent=True) or {}

    allowed_fields = {
        "name",
        "resource_type",
        "status",
        "capacity_total",
        "capacity_used",
        "adapter_type",
        "endpoint_url",
        "credential_ref",
        "monitoring_enabled",
        "poll_interval_seconds",
        "stale_after_seconds",
    }

    updates = {
        key: value
        for key, value in data.items()
        if key in allowed_fields
    }

    try:
        resource = service.update_resource(resource_id, **updates)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if resource is None:
        return jsonify({"error": "Storage resource not found"}), 404

    return jsonify(_serialize_resource(resource)), 200


@storage_resources_bp.delete("/<int:resource_id>")
@operational_write_required
def delete_storage_resource(resource_id):
    """Delete a storage resource."""
    deleted = service.delete_resource(resource_id)

    if not deleted:
        return jsonify({"error": "Storage resource not found"}), 404

    return jsonify({"message": "Storage resource deleted"}), 200


@storage_resources_bp.post("/<int:resource_id>/test-connection")
@operational_write_required
def test_storage_connection(resource_id):
    """Test a configured provider without returning credentials."""
    resource = service.get_by_id(resource_id)
    if resource is None:
        return jsonify({"error": "Storage resource not found"}), 404
    try:
        monitoring_service.test_connection(resource)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 422
    return jsonify({"status": "ok", "connection_tested_at": resource.connection_tested_at.isoformat()}), 200


@storage_resources_bp.post("/<int:resource_id>/discover")
@operational_write_required
def discover_storage_resource(resource_id):
    """Fetch provider metadata through the configured adapter."""
    resource = service.get_by_id(resource_id)
    if resource is None:
        return jsonify({"error": "Storage resource not found"}), 404
    try:
        result = monitoring_service.discover(resource)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 422
    return jsonify(result), 200


@storage_resources_bp.get("/<int:resource_id>/metrics")
@login_required
def list_resource_metrics(resource_id):
    """Return bounded historical metrics for one resource."""
    if service.get_by_id(resource_id) is None:
        return jsonify({"error": "Storage resource not found"}), 404
    limit = min(max(request.args.get("limit", 100, type=int), 1), 500)
    metrics = metric_service.list_by_resource(resource_id, limit=limit)
    return jsonify([
        {
            "id": metric.id,
            "resource_id": metric.resource_id,
            "metric_name": metric.metric_name,
            "metric_value": metric.metric_value,
            "unit": metric.unit,
            "recorded_at": metric.recorded_at.isoformat(),
        }
        for metric in metrics
    ]), 200


@storage_resources_bp.get("/<int:resource_id>/health")
@login_required
def get_resource_health(resource_id):
    """Return the server-derived health and monitoring state."""
    resource = service.get_by_id(resource_id)
    if resource is None:
        return jsonify({"error": "Storage resource not found"}), 404
    return jsonify({
        "resource_id": resource.id,
        "health_status": resource.effective_health_status,
        "health_reason": resource.health_reason,
        "monitoring_state": resource.monitoring_state,
        "last_seen": resource.last_seen.isoformat() if resource.last_seen else None,
        "last_metric_at": resource.last_metric_at.isoformat() if resource.last_metric_at else None,
        "monitoring_error": resource.monitoring_error,
        "capacity_utilization_percent": resource.capacity_utilization_percent,
    }), 200
