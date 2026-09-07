"""User API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import role_required
from app.services.auth_service import AuthService
from app.services.role_service import RoleService
from app.services.user_service import UserService

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

service = UserService()
auth_service = AuthService()
role_service = RoleService()


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
    """Provision a user account through an administrator."""

    data = request.get_json(silent=True) or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role_id = data.get("role_id")

    if not username or not email or not password or not role_id:
        return jsonify(
            {"error": "Username, email, password, and role are required."}
        ), 400

    try:
        role_id = int(role_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Role must be a valid ID."}), 400

    if role_service.get_by_id(role_id) is None:
        return jsonify({"error": "Role not found."}), 404

    if len(password) < 12:
        return jsonify(
            {"error": "Password must be at least 12 characters long."}
        ), 400

    try:
        user = service.create_user(
            username=username,
            email=email,
            password_hash=auth_service.hash_password(password),
            role_id=role_id,
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "role_id": user.role_id,
        }
    ), 201
