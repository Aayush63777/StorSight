"""Role application service."""

from app.models.role import Role
from app.repositories.role import RoleRepository


class RoleService:
    """Application operations for roles."""

    def __init__(self, repository=None):
        self.repository = repository or RoleRepository()

    def get_by_id(self, role_id: int):
        return self.repository.get_by_id(role_id)

    def get_by_name(self, name: str):
        return self.repository.get_by_name(name)

    def list_roles(self):
        return self.repository.get_all()

    def create_role(self, name: str, description: str | None = None):
        if not name or not name.strip():
            raise ValueError("Role name is required.")

        existing = self.repository.get_by_name(name.strip())
        if existing:
            raise ValueError("Role already exists.")

        role = Role(
            name=name.strip(),
            description=description.strip() if description else None,
        )
        self.repository.add(role)
        self.repository.commit()
        return role
