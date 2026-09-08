"""User application service."""

from app.models.user import User
from app.repositories.user import UserRepository
from app.services.auth_service import AuthService
from app.services.role_service import RoleService


class UserService:
    """Application operations for users."""

    def __init__(self, repository=None, auth_service=None, role_service=None):
        self.repository = repository or UserRepository()
        self.auth_service = auth_service or AuthService()
        self.role_service = role_service or RoleService()

    def get_by_id(self, user_id: int):
        return self.repository.get_by_id(user_id)

    def get_by_username(self, username: str):
        return self.repository.get_by_username(username)

    def get_by_email(self, email: str):
        return self.repository.get_by_email(email)

    def list_active_users(self):
        return self.repository.get_active_users()

    def create_user(
        self,
        username: str,
        email: str,
        password_hash: str,
        role_id: int,
    ):
        if not username or not username.strip():
            raise ValueError("Username is required.")

        if not email or not email.strip():
            raise ValueError("Email is required.")

        if not password_hash:
            raise ValueError("Password hash is required.")

        if self.repository.get_by_username(username.strip()):
            raise ValueError("Username already exists.")

        if self.repository.get_by_email(email.strip()):
            raise ValueError("Email already exists.")

        user = User(
            username=username.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
            role_id=role_id,
        )

        self.repository.add(user)
        self.repository.commit()
        return user

    def create_user_with_password(
        self,
        username: str,
        email: str,
        password: str,
        role_id: int,
        is_active: bool = True,
    ):
        """Validate and create a user from a plaintext password."""
        if not isinstance(username, str) or not username.strip():
            raise ValueError("Username is required.")
        if len(username.strip()) > 100:
            raise ValueError("Username must be 100 characters or fewer.")
        if not isinstance(email, str) or not email.strip():
            raise ValueError("Email is required.")
        if len(email.strip()) > 255 or "@" not in email.strip():
            raise ValueError("A valid email is required.")
        if not isinstance(password, str) or len(password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not isinstance(role_id, int) or isinstance(role_id, bool):
            raise ValueError("A valid role is required.")
        if not isinstance(is_active, bool):
            raise ValueError("is_active must be a boolean.")

        normalized_username = username.strip()
        normalized_email = email.strip().lower()
        if self.repository.get_by_username(normalized_username):
            raise ValueError("Username already exists.")
        if self.repository.get_by_email(normalized_email):
            raise ValueError("Email already exists.")
        if self.role_service.get_by_id(role_id) is None:
            raise ValueError("Role not found.")

        user = User(
            username=normalized_username,
            email=normalized_email,
            password_hash=self.auth_service.hash_password(password),
            role_id=role_id,
            is_active=is_active,
        )
        self.repository.add(user)
        self.repository.commit()
        return user

    def list_users(self):
        return self.repository.get_all()

