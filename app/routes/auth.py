"""Authentication API routes."""

from flask import Blueprint, g, jsonify, request, session

from app.auth.decorators import login_required
from app.services.auth_service import AuthService


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

auth_service = AuthService()


@auth_bp.post("/login")
def login():
    """Authenticate a user and create a session."""

    data = request.get_json(silent=True) or {}

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Invalid credentials"}), 401

    user = auth_service.authenticate(username, password)

    if user is None:
        return jsonify({"error": "Invalid credentials"}), 401

    session.clear()
    session["user_id"] = user.id

    return jsonify(
        {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role.name if user.role else None,
            },
        }
    ), 200


@auth_bp.post("/logout")
def logout():
    """Log out the current user."""

    session.clear()

    return jsonify({"message": "Logout successful"}), 200


@auth_bp.get("/me")
@login_required
def me():
    """Return the currently authenticated user."""

    user = g.current_user

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name if user.role else None,
        }
    ), 200
