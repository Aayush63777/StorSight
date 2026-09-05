"""Storage resource API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required
from app.services.storage_resource_service import StorageResourceService


storage_resources_bp = Blueprint(
    "storage_resources",
    __name__,
    url_prefix="/api/storage-resources",
)

service = StorageResourceService()


def _serialize_resource(resource):
    """Serialize a storage resource without exposing internal fields."""
    return {
        "id": resource.id,
        "name": resource.name,
        "resource_type": resource.resource_type,
        "status": resource.status,
        "health_status": resource.health_status,
        "capacity_total": resource.capacity_total,
        "capacity_used": resource.capacity_used,
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
    status = request.args.get("status")
    resource_type = request.args.get("resource_type")

    if status:
        resources = service.list_by_status(status)
    elif resource_type:
        resources = service.list_by_resource_type(resource_type)
    else:
        resources = service.list_resources()

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
@login_required
def create_storage_resource():
    """Create a storage resource."""
    data = request.get_json(silent=True) or {}

    try:
        resource = service.create_resource(
            name=data.get("name"),
            resource_type=data.get("resource_type"),
            status=data.get("status", "healthy"),
            health_status=data.get("health_status", "healthy"),
            capacity_total=data.get("capacity_total"),
            capacity_used=data.get("capacity_used"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_resource(resource)), 201


@storage_resources_bp.patch("/<int:resource_id>")
@login_required
def update_storage_resource(resource_id):
    """Update an existing storage resource."""
    data = request.get_json(silent=True) or {}

    allowed_fields = {
        "name",
        "resource_type",
        "status",
        "health_status",
        "capacity_total",
        "capacity_used",
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
@login_required
def delete_storage_resource(resource_id):
    """Delete a storage resource."""
    deleted = service.delete_resource(resource_id)

    if not deleted:
        return jsonify({"error": "Storage resource not found"}), 404

    return jsonify({"message": "Storage resource deleted"}), 200
