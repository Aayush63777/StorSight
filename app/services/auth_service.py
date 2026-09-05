"""Authentication application service."""

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
