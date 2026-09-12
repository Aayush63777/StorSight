"""Build configured storage adapters without exposing secrets."""

from app.integrations.storage.base import StorageAdapterError, UnsupportedStorageAdapter
from app.integrations.storage.http_json import HttpJsonStorageAdapter


class StorageAdapterFactory:
    """Resolve only integrations explicitly supported by this deployment."""

    @staticmethod
    def create(resource):
        if resource.adapter_type == "http_json":
            if not resource.endpoint_url:
                raise StorageAdapterError("Storage endpoint is not configured.")
            return HttpJsonStorageAdapter(
                resource.endpoint_url,
                resource.credential_ref,
            )
        if resource.adapter_type == "manual":
            raise UnsupportedStorageAdapter(
                "Manual resources do not support live discovery or monitoring."
            )
        raise UnsupportedStorageAdapter(
            f"Storage adapter '{resource.adapter_type}' is not supported."
        )
