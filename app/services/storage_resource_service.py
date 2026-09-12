"""Storage resource application service."""

from app.models.storage_resource import StorageResource
from app.repositories.storage_resource import StorageResourceRepository
from urllib.parse import urlparse


class StorageResourceService:
    """Application operations for storage resources."""

    ALLOWED_STATUSES = {"healthy", "warning", "critical", "offline"}
    ALLOWED_HEALTH_STATUSES = {"healthy", "warning", "critical", "unknown"}
    ALLOWED_ADAPTERS = {"manual", "http_json"}

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
        adapter_type = self._validate_adapter_type(adapter_type)
        endpoint_url = self._validate_endpoint_url(endpoint_url, adapter_type)
        credential_ref = self._validate_credential_ref(credential_ref)
        self._validate_monitoring(
            monitoring_enabled, adapter_type, poll_interval_seconds, stale_after_seconds
        )
        self._validate_capacity(capacity_total, capacity_used)
        if adapter_type != "manual" and (capacity_total is not None or capacity_used is not None):
            raise ValueError("Provider-backed capacity is collected from the adapter.")

        if self.repository.get_by_name(name):
            raise ValueError("Storage resource already exists.")

        resource = StorageResource(
            name=name,
            resource_type=resource_type,
            status=status,
            health_status="unknown",
            capacity_total=capacity_total,
            capacity_used=capacity_used,
            adapter_type=adapter_type,
            endpoint_url=endpoint_url,
            credential_ref=credential_ref,
            monitoring_enabled=monitoring_enabled,
            poll_interval_seconds=poll_interval_seconds,
            stale_after_seconds=stale_after_seconds,
            monitoring_state="pending" if monitoring_enabled else "unconfigured",
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

        adapter_type = updates.get("adapter_type", resource.adapter_type)
        endpoint_url = updates.get("endpoint_url", resource.endpoint_url)
        credential_ref = updates.get("credential_ref", resource.credential_ref)
        monitoring_enabled = updates.get(
            "monitoring_enabled", resource.monitoring_enabled
        )
        poll_interval_seconds = updates.get(
            "poll_interval_seconds", resource.poll_interval_seconds
        )
        stale_after_seconds = updates.get(
            "stale_after_seconds", resource.stale_after_seconds
        )
        adapter_type = self._validate_adapter_type(adapter_type)
        endpoint_url = self._validate_endpoint_url(endpoint_url, adapter_type)
        if "credential_ref" in updates and updates["credential_ref"]:
            credential_ref = self._validate_credential_ref(updates["credential_ref"])
        else:
            credential_ref = resource.credential_ref
        self._validate_monitoring(
            monitoring_enabled, adapter_type, poll_interval_seconds, stale_after_seconds
        )
        resource.adapter_type = adapter_type
        resource.endpoint_url = endpoint_url
        resource.credential_ref = credential_ref
        resource.monitoring_enabled = monitoring_enabled
        resource.poll_interval_seconds = poll_interval_seconds
        resource.stale_after_seconds = stale_after_seconds
        if not monitoring_enabled:
            resource.monitoring_state = "unconfigured"

        if "status" in updates:
            resource.status = self._validate_status(updates["status"])

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

    @classmethod
    def _validate_adapter_type(cls, adapter_type: str) -> str:
        if adapter_type not in cls.ALLOWED_ADAPTERS:
            raise ValueError("Unsupported storage adapter.")
        return adapter_type

    @staticmethod
    def _validate_endpoint_url(endpoint_url: str | None, adapter_type: str):
        if adapter_type == "manual":
            return endpoint_url.strip() if isinstance(endpoint_url, str) and endpoint_url.strip() else None
        if not isinstance(endpoint_url, str) or not endpoint_url.strip():
            raise ValueError("Endpoint URL is required for monitored resources.")
        parsed = urlparse(endpoint_url.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Endpoint URL must be a valid HTTP URL.")
        return endpoint_url.strip()

    @staticmethod
    def _validate_credential_ref(credential_ref: str | None):
        if credential_ref is None or credential_ref == "":
            return None
        if not isinstance(credential_ref, str) or not credential_ref.replace("_", "").isalnum():
            raise ValueError("Credential reference must be an environment variable name.")
        return credential_ref

    @staticmethod
    def _validate_monitoring(enabled, adapter_type, poll_interval, stale_after):
        if not isinstance(enabled, bool):
            raise ValueError("Monitoring enabled must be boolean.")
        if enabled and adapter_type == "manual":
            raise ValueError("Manual resources cannot enable monitoring.")
        if not isinstance(poll_interval, int) or isinstance(poll_interval, bool) or not 15 <= poll_interval <= 86400:
            raise ValueError("Poll interval must be between 15 and 86400 seconds.")
        if not isinstance(stale_after, int) or isinstance(stale_after, bool) or stale_after < poll_interval:
            raise ValueError("Stale threshold must be at least the poll interval.")

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
