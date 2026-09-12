"""Contracts for real storage integrations.

Adapters must return data from the configured storage system. They must never
invent capacity or silently fall back to values stored on the resource.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


class StorageAdapterError(Exception):
    """Controlled failure while contacting or parsing a storage system."""


class UnsupportedStorageAdapter(StorageAdapterError):
    """The requested adapter is not available in this deployment."""


@dataclass(frozen=True)
class CapacitySnapshot:
    """Validated capacity returned by a storage provider in bytes."""

    total_bytes: int
    used_bytes: int
    collected_at: datetime

    @property
    def available_bytes(self) -> int:
        return self.total_bytes - self.used_bytes

    @property
    def utilization_percent(self) -> float:
        return round((self.used_bytes / self.total_bytes) * 100, 2)


class StorageAdapter(Protocol):
    """Provider contract used by connection tests and monitoring."""

    def test_connection(self) -> None:
        """Raise StorageAdapterError when the provider is unreachable."""

    def discover(self) -> dict:
        """Return provider metadata without exposing credentials."""

    def collect_capacity(self) -> CapacitySnapshot:
        """Collect and validate current capacity from the provider."""
