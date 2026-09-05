"""Storage resource repository."""

from app.models.storage_resource import StorageResource
from app.repositories.base import BaseRepository


class StorageResourceRepository(BaseRepository[StorageResource]):
    """Data access operations for storage resources."""

    def __init__(self):
        super().__init__(StorageResource)

    def get_by_name(self, name: str):
        """Return a storage resource by name."""
        return self.model.query.filter_by(name=name).first()

    def get_by_status(self, status: str):
        """Return resources by status."""
        return self.model.query.filter_by(status=status).all()

    def get_by_resource_type(self, resource_type: str):
        """Return resources by resource type."""
        return self.model.query.filter_by(resource_type=resource_type).all()
