"""User API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import role_required
from app.services.user_service import UserService

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

service = UserService()


@users_bp.get("/")
@role_required("ADMIN")
def list_users():
    users = service.list_users()
    return jsonify([
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "role_id": user.role_id,
        }
        for user in users
    ])


@users_bp.post("/")
@role_required("ADMIN")
def create_user():
    data = request.get_json(silent=True) or {}
    try:
        user = service.create_user_with_password(
            username=data.get("username"),
            email=data.get("email"),
            password=data.get("password"),
            role_id=data.get("role_id"),
            is_active=data.get("is_active", True),
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "role_id": user.role_id,
        "role": user.role.name if user.role else None,
    }), 201
