"""Authentication and authorization decorators."""

from functools import wraps

from flask import g, jsonify, session


def login_required(view):
    """Require an authenticated user for a route."""

    @wraps(view)
    def wrapped_view(*args, **kwargs):
        user_id = session.get("user_id")

        if user_id is None:
            return jsonify({"error": "Authentication required"}), 401

        from app.services.user_service import UserService

        user = UserService().get_by_id(user_id)

        session_version = session.get("session_version", 0)
        if (
            user is None
            or not user.is_active
            or session_version != user.session_version
        ):
            session.clear()
            return jsonify({"error": "Authentication required"}), 401

        g.current_user = user
        return view(*args, **kwargs)

    return wrapped_view


def role_required(*allowed_roles):
    """Require an authenticated user with one of the allowed roles."""

    def decorator(view):
        @wraps(view)
        @login_required
        def wrapped_view(*args, **kwargs):
            user = g.current_user

            if user.role is None or user.role.name not in allowed_roles:
                return jsonify({"error": "Forbidden"}), 403

            return view(*args, **kwargs)

        return wrapped_view

    return decorator


def operational_write_required(view):
    """Allow operational mutations only to engineers and administrators."""
    return role_required("ENGINEER", "ADMIN")(view)
