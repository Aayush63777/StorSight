"""Storage resource application service."""

from app.models.storage_resource import StorageResource
from app.repositories.storage_resource import StorageResourceRepository


class StorageResourceService:
    """Application operations for storage resources."""

    ALLOWED_STATUSES = {"healthy", "warning", "critical", "offline"}
    ALLOWED_HEALTH_STATUSES = {"healthy", "warning", "critical", "unknown"}

    def __init__(self, repository=None):
        self.repository = repository or StorageResourceRepository()

    def get_by_id(self, resource_id: int):
        return self.repository.get_by_id(resource_id)

    def get_by_name(self, name: str):
        return self.repository.get_by_name(name)

    def list_resources(self, name=None, status=None, resource_type=None):
        if name is not None and not isinstance(name, str):
            raise ValueError("Invalid resource name filter.")
        if status is not None and status not in self.ALLOWED_STATUSES:
            raise ValueError("Invalid resource status filter.")
        if resource_type is not None and not isinstance(resource_type, str):
            raise ValueError("Invalid resource type filter.")
        return self.repository.list_filtered(
            name=name.strip() if name else None,
            status=status,
            resource_type=resource_type.strip() if resource_type else None,
        )

    def list_by_status(self, status: str):
        return self.repository.get_by_status(status)

    def list_by_resource_type(self, resource_type: str):
        return self.repository.get_by_resource_type(resource_type)

    def create_resource(
        self,
        name: str,
        resource_type: str,
        status: str = "healthy",
        health_status: str = "healthy",
        capacity_total: float | None = None,
        capacity_used: float | None = None,
    ):
        name = self._validate_name(name)
        resource_type = self._validate_resource_type(resource_type)
        status = self._validate_status(status)
        health_status = self._validate_health_status(health_status)
        self._validate_capacity(capacity_total, capacity_used)

        if self.repository.get_by_name(name):
            raise ValueError("Storage resource already exists.")

        resource = StorageResource(
            name=name,
            resource_type=resource_type,
            status=status,
            health_status=health_status,
            capacity_total=capacity_total,
            capacity_used=capacity_used,
        )

        self.repository.add(resource)
        self.repository.commit()

        return resource

    def update_resource(self, resource_id: int, **updates):
        resource = self.repository.get_by_id(resource_id)

        if resource is None:
            return None

        if "name" in updates:
            name = self._validate_name(updates["name"])
            existing = self.repository.get_by_name(name)
            if existing is not None and existing.id != resource_id:
                raise ValueError("Storage resource already exists.")
            resource.name = name

        if "resource_type" in updates:
            resource.resource_type = self._validate_resource_type(
                updates["resource_type"]
            )

        if "status" in updates:
            resource.status = self._validate_status(updates["status"])

        if "health_status" in updates:
            resource.health_status = self._validate_health_status(
                updates["health_status"]
            )

        capacity_total = updates.get(
            "capacity_total", resource.capacity_total
        )
        capacity_used = updates.get(
            "capacity_used", resource.capacity_used
        )

        self._validate_capacity(capacity_total, capacity_used)

        resource.capacity_total = capacity_total
        resource.capacity_used = capacity_used

        self.repository.commit()

        return resource

    def delete_resource(self, resource_id: int) -> bool:
        resource = self.repository.get_by_id(resource_id)

        if resource is None:
            return False

        self.repository.delete(resource)
        self.repository.commit()

        return True

    @staticmethod
    def _validate_name(name: str) -> str:
        if not name or not name.strip():
            raise ValueError("Resource name is required.")

        return name.strip()

    @staticmethod
    def _validate_resource_type(resource_type: str) -> str:
        if not resource_type or not resource_type.strip():
            raise ValueError("Resource type is required.")

        return resource_type.strip()

    def _validate_status(self, status: str) -> str:
        if not status or status not in self.ALLOWED_STATUSES:
            raise ValueError(
                "Invalid resource status."
            )

        return status

    def _validate_health_status(self, health_status: str) -> str:
        if (
            not health_status
            or health_status not in self.ALLOWED_HEALTH_STATUSES
        ):
            raise ValueError(
                "Invalid health status."
            )

        return health_status

    @staticmethod
    def _validate_capacity(
        capacity_total: float | None,
        capacity_used: float | None,
    ) -> None:
        if capacity_total is not None and capacity_total < 0:
            raise ValueError("Total capacity cannot be negative.")

        if capacity_used is not None and capacity_used < 0:
            raise ValueError("Used capacity cannot be negative.")

        if (
            capacity_total is not None
            and capacity_used is not None
            and capacity_used > capacity_total
        ):
            raise ValueError(
                "Used capacity cannot exceed total capacity."
            )
