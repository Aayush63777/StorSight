"""Role API routes."""

from flask import Blueprint, jsonify

from app.auth.decorators import login_required
from app.services.role_service import RoleService

roles_bp = Blueprint("roles", __name__, url_prefix="/api/roles")

service = RoleService()


@roles_bp.get("/")
@login_required
def list_roles():
    roles = service.list_roles()
    return jsonify([
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
        }
        for role in roles
    ])
