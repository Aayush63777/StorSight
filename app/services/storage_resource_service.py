"""Storage resource application service."""

from app.models.storage_resource import StorageResource
from app.repositories.storage_resource import StorageResourceRepository


class StorageResourceService:
    """Application operations for storage resources."""

    ALLOWED_STATUSES = {"healthy", "warning", "critical", "offline"}
    ALLOWED_HEALTH_STATUSES = {"healthy", "warning", "critical", "unknown"}
    ALLOWED_ADAPTER_TYPES = {"manual", "http_json"}

    def __init__(self, repository=None):
        self.repository = repository or StorageResourceRepository()

    def get_by_id(self, resource_id: int):
        return self.repository.get_by_id(resource_id)

    def get_by_name(self, name: str):
        return self.repository.get_by_name(name)

    def list_resources(self, name=None, status=None, resource_type=None):
        return self.repository.list_filtered(
            name=name,
            status=status,
            resource_type=resource_type,
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
        adapter_type: str = "manual",
        endpoint_url: str | None = None,
        credential_ref: str | None = None,
        monitoring_enabled: bool = False,
        poll_interval_seconds: int = 300,
        stale_after_seconds: int = 900,
    ):
        name = self._validate_name(name)
        resource_type = self._validate_resource_type(resource_type)
        status = self._validate_status(status)
        health_status = self._validate_health_status(health_status)
        adapter_type = self._validate_adapter_type(adapter_type)
        self._validate_capacity(capacity_total, capacity_used)
        self._validate_monitoring_intervals(
            poll_interval_seconds,
            stale_after_seconds,
        )

        if self.repository.get_by_name(name):
            raise ValueError("Storage resource already exists.")

        resource = StorageResource(
            name=name,
            resource_type=resource_type,
            status=status,
            health_status=health_status,
            capacity_total=capacity_total,
            capacity_used=capacity_used,
            adapter_type=adapter_type,
            endpoint_url=endpoint_url,
            credential_ref=credential_ref,
            monitoring_enabled=monitoring_enabled,
            poll_interval_seconds=poll_interval_seconds,
            stale_after_seconds=stale_after_seconds,
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

        if "adapter_type" in updates:
            resource.adapter_type = self._validate_adapter_type(
                updates["adapter_type"]
            )

        for field in {
            "endpoint_url",
            "credential_ref",
            "monitoring_enabled",
        }:
            if field in updates:
                setattr(resource, field, updates[field])

        poll_interval_seconds = updates.get(
            "poll_interval_seconds", resource.poll_interval_seconds
        )
        stale_after_seconds = updates.get(
            "stale_after_seconds", resource.stale_after_seconds
        )
        self._validate_monitoring_intervals(
            poll_interval_seconds,
            stale_after_seconds,
        )
        resource.poll_interval_seconds = poll_interval_seconds
        resource.stale_after_seconds = stale_after_seconds

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

    @classmethod
    def _validate_adapter_type(cls, adapter_type: str) -> str:
        if adapter_type not in cls.ALLOWED_ADAPTER_TYPES:
            raise ValueError("Invalid storage adapter type.")
        return adapter_type

    @staticmethod
    def _validate_monitoring_intervals(
        poll_interval_seconds: int,
        stale_after_seconds: int,
    ) -> None:
        if (
            not isinstance(poll_interval_seconds, int)
            or isinstance(poll_interval_seconds, bool)
            or poll_interval_seconds < 15
        ):
            raise ValueError("Poll interval must be at least 15 seconds.")
        if (
            not isinstance(stale_after_seconds, int)
            or isinstance(stale_after_seconds, bool)
            or stale_after_seconds < 15
        ):
            raise ValueError("Stale threshold must be at least 15 seconds.")

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
