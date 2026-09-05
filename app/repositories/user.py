"""User repository."""

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data access operations for users."""

    def __init__(self):
        super().__init__(User)

    def get_by_username(self, username: str):
        """Return a user by username."""
        return self.model.query.filter_by(username=username).first()

    def get_by_email(self, email: str):
        """Return a user by email."""
        return self.model.query.filter_by(email=email).first()

    def get_active_users(self):
        """Return all active users."""
        return self.model.query.filter_by(is_active=True).all()
