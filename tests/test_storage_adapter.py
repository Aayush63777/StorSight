"""Tests for the generic connector safety and parsing boundary."""

import pytest

from app.integrations.storage.base import StorageAdapterError
from app.integrations.storage.http_json import HttpJsonStorageAdapter


@pytest.mark.parametrize("endpoint", [
    "http://127.0.0.1/capacity",
    "http://localhost/capacity",
    "http://169.254.169.254/latest/meta-data",
])
def test_connector_rejects_private_targets(endpoint):
    with pytest.raises(StorageAdapterError):
        HttpJsonStorageAdapter(endpoint)