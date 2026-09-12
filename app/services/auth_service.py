"""Authentication and password-recovery application service."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models.password_reset_token import PasswordResetToken
from werkzeug.security import check_password_hash, generate_password_hash

from app.models.user import User
from app.repositories.user import UserRepository


class AuthService:
    """Application operations for authentication."""

    def __init__(self, repository=None):
        self.repository = repository or UserRepository()

    def hash_password(self, password: str) -> str:
        """Return a secure hash for a plaintext password."""
        if not password:
            raise ValueError("Password is required.")

        return generate_password_hash(password)

    def verify_password(self, password_hash: str, password: str) -> bool:
        """Verify a plaintext password against its stored hash."""
        if not password_hash or not password:
            return False

        return check_password_hash(password_hash, password)

    def authenticate(self, username: str, password: str) -> User | None:
        """Authenticate an active user by username and password."""
        if not username or not password:
            return None

        user = self.repository.get_by_username(username.strip())

        if user is None or not user.is_active:
            return None

        if not self.verify_password(user.password_hash, password):
            return None

        return user

    def create_password_reset(self, email: str):
        """Create a single-use reset token for an active user."""
        user = self.repository.get_by_email(email)

        if user is None or not user.is_active:
            return None

        now = datetime.now(timezone.utc)
        PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).update(
            {"used_at": now}
        )

        raw_token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=now
            + timedelta(minutes=self._token_ttl_minutes()),
        )
        db.session.add(reset_token)
        db.session.commit()
        return user, raw_token

    def reset_password(self, raw_token: str, password: str) -> bool:
        """Consume a valid reset token and replace the user's password."""
        if not raw_token or not password:
            return False

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset_token = PasswordResetToken.query.filter_by(
            token_hash=token_hash
        ).first()
        now = datetime.now(timezone.utc)

        if reset_token is None or reset_token.used_at is not None:
            return False
        if reset_token.expires_at.replace(tzinfo=timezone.utc) <= now:
            return False
        if reset_token.user is None or not reset_token.user.is_active:
            return False

        reset_token.user.password_hash = self.hash_password(password)
        # A password change invalidates every existing login, not merely the
        # browser session that submitted this request.
        reset_token.user.session_version += 1
        reset_token.used_at = now
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == reset_token.user_id,
            PasswordResetToken.id != reset_token.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": now})
        db.session.commit()
        return True

    @staticmethod
    def _token_ttl_minutes() -> int:
        from flask import current_app

        return current_app.config["PASSWORD_RESET_TOKEN_TTL_MINUTES"]
