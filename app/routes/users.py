"""User API routes."""

from flask import Blueprint, jsonify

from app.auth.decorators import login_required
from app.services.user_service import UserService

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

service = UserService()


@users_bp.get("/")
@login_required
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
