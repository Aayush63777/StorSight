"""User application service."""

from app.models.user import User
from app.repositories.user import UserRepository


class UserService:
    """Application operations for users."""

    def __init__(self, repository=None):
        self.repository = repository or UserRepository()

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
    def list_users(self):
        return self.repository.get_all()

