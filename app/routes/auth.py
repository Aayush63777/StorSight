"""Authentication API routes."""

from flask import Blueprint, current_app, g, jsonify, request, session

from app.auth.decorators import login_required
from app.services.auth_service import AuthService
from app.services.mail_service import MailService
from app.services.password_reset_service import PasswordResetService


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

auth_service = AuthService()
password_reset_service = PasswordResetService()
mail_service = MailService()


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


@auth_bp.post("/forgot-password")
def forgot_password():
    """Start a password reset without revealing account existence."""

    data = request.get_json(silent=True) or {}
    email = data.get("email")
    raw_token = password_reset_service.request_reset(email)

    if raw_token:
        frontend_origin = current_app.config["FRONTEND_ORIGIN"].rstrip("/")
        reset_url = f"{frontend_origin}/reset-password?token={raw_token}"
        try:
            mail_service.send_password_reset(email.strip().lower(), reset_url)
        except Exception:
            current_app.logger.exception("Password reset email delivery failed")

    return jsonify(
        {
            "message": (
                "If an active account matches that email, a reset link "
                "has been sent."
            )
        }
    ), 202


@auth_bp.post("/reset-password")
def reset_password():
    """Consume a reset token and set a new password."""

    data = request.get_json(silent=True) or {}
    token = data.get("token")
    password = data.get("password")

    if not token or not password:
        return jsonify({"error": "Reset token and password are required."}), 400

    if not password_reset_service.reset_password(token, password):
        return jsonify({"error": "Reset link is invalid or expired."}), 400

    session.clear()
    return jsonify({"message": "Password reset successful."}), 200
