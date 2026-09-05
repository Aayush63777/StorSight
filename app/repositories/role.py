"""Role repository."""

from app.models.role import Role
from app.repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    """Data access operations for roles."""

    def __init__(self):
        super().__init__(Role)

    def get_by_name(self, name: str):
        """Return a role by name."""
        return self.model.query.filter_by(name=name).first()
