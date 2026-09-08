"""Authentication API routes."""

from flask import Blueprint, current_app, g, jsonify, request, session

from app.auth.decorators import login_required
from app.extensions import limiter
from app.services.auth_service import AuthService
from app.services.mail_service import MailService

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

auth_service = AuthService()
mail_service = MailService()


@auth_bp.post("/login")
@limiter.limit("5 per minute")
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
    session["session_version"] = user.session_version

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


@auth_bp.post("/forgot-password")
def forgot_password():
    """Issue a password reset link without revealing account existence."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "")

    message = (
        "If an active account matches that email, a password reset link "
        "has been sent."
    )

    if not isinstance(email, str) or not email.strip():
        return jsonify({"message": message}), 202

    email = email.strip().lower()

    reset_data = auth_service.create_password_reset(email)

    if reset_data is not None:
        user, raw_token = reset_data

        frontend_origin = current_app.config["FRONTEND_ORIGIN"].rstrip("/")
        reset_url = f"{frontend_origin}/reset-password?token={raw_token}"

        try:
            mail_service.send_password_reset(user.email, reset_url)
        except Exception:
            current_app.logger.exception(
                "Password reset email delivery failed"
            )

    return jsonify({"message": message}), 202


@auth_bp.post("/reset-password")
def reset_password():
    """Consume a reset token and set a new password."""
    data = request.get_json(silent=True) or {}

    token = data.get("token")
    password = data.get("password")

    if not isinstance(token, str) or not isinstance(password, str):
        return jsonify(
            {"error": "The reset link is invalid or has expired."}
        ), 400

    if len(password) < 8:
        return jsonify(
            {"error": "Password must be at least 8 characters."}
        ), 400

    if not auth_service.reset_password(token, password):
        return jsonify(
            {"error": "The reset link is invalid or has expired."}
        ), 400

    # Clear any existing session after a successful password reset.
    session.clear()

    return jsonify({"message": "Password reset successful."}), 200


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
