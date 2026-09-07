"""Password reset token workflows."""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from flask import current_app

from app.extensions import db
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.auth_service import AuthService


class PasswordResetService:
    """Create and consume expiring, single-use password reset tokens."""

    def request_reset(self, email: str) -> str | None:
        """Create a reset token for an active account, if one exists."""
        if not email or not email.strip():
            return None

        user = User.query.filter_by(
            email=email.strip().lower(),
            is_active=True,
        ).first()
        if user is None:
            return None

        PasswordResetToken.query.filter_by(
            user_id=user.id,
            used_at=None,
        ).update({"used_at": datetime.now(timezone.utc)})

        raw_token = secrets.token_urlsafe(32)
        token = PasswordResetToken(
            user_id=user.id,
            token_hash=self._hash_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(
                minutes=current_app.config["PASSWORD_RESET_TOKEN_TTL_MINUTES"]
            ),
        )
        db.session.add(token)
        db.session.commit()
        return raw_token

    def reset_password(self, raw_token: str, new_password: str) -> bool:
        """Consume a valid token and invalidate the user's sessions."""
        if not raw_token or not new_password or len(new_password) < 12:
            return False

        token = PasswordResetToken.query.filter_by(
            token_hash=self._hash_token(raw_token),
            used_at=None,
        ).first()
        now = datetime.now(timezone.utc)
        if token is None or self._normalise_datetime(token.expires_at) <= now:
            return False

        user = db.session.get(User, token.user_id)
        if user is None or not user.is_active:
            return False

        user.password_hash = AuthService().hash_password(new_password)
        user.session_version += 1
        token.used_at = now
        db.session.commit()
        return True

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @staticmethod
    def _normalise_datetime(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
