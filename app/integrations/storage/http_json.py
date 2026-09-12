"""Generic HTTPS JSON storage integration.

This adapter supports deployments that expose a documented JSON capacity
endpoint. It is intentionally contract-based rather than vendor-specific:
the remote endpoint must return total_bytes and used_bytes.
"""

import json
import ipaddress
import os
import socket
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

from app.integrations.storage.base import CapacitySnapshot, StorageAdapterError


class HttpJsonStorageAdapter:
    """Collect capacity from a configured, authenticated JSON endpoint."""

    adapter_type = "http_json"

    def __init__(self, endpoint_url: str, credential_ref: str | None = None):
        parsed = urlparse(endpoint_url or "")
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise StorageAdapterError("A valid storage endpoint URL is required.")
        if os.getenv("APP_ENV", "development") == "production" and parsed.scheme != "https":
            raise StorageAdapterError("Production storage endpoints must use HTTPS.")
        self._validate_public_host(parsed.hostname)
        self.endpoint_url = endpoint_url
        self.credential_ref = credential_ref
        self.timeout_seconds = int(os.getenv("STORAGE_CONNECT_TIMEOUT_SECONDS", "10"))
        self.max_retries = int(os.getenv("STORAGE_MAX_RETRIES", "2"))

    def _request(self) -> dict:
        headers = {"Accept": "application/json", "User-Agent": "StorSight/1.0"}
        if self.credential_ref:
            token = os.getenv(self.credential_ref)
            if not token:
                raise StorageAdapterError("Configured storage credential is unavailable.")
            headers["Authorization"] = f"Bearer {token}"

        opener = build_opener(_NoRedirectHandler)
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                request = Request(self.endpoint_url, headers=headers, method="GET")
                with opener.open(request, timeout=self.timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                break
            except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(min(2**attempt, 4))
        else:
            raise StorageAdapterError("Storage endpoint request failed.") from last_error

        if not isinstance(payload, dict):
            raise StorageAdapterError("Storage endpoint returned an invalid response.")
        return payload

    @staticmethod
    def _validate_public_host(hostname: str | None) -> None:
        if not hostname:
            raise StorageAdapterError("Storage endpoint host is required.")
        try:
            addresses = {
                info[4][0]
                for info in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
            }
        except OSError as exc:
            raise StorageAdapterError("Storage endpoint host could not be resolved.") from exc
        for address in addresses:
            if not ipaddress.ip_address(address).is_global:
                raise StorageAdapterError("Storage endpoint must resolve to a public address.")

    def test_connection(self) -> None:
        self._request()

    def discover(self) -> dict:
        payload = self._request()
        return {
            "name": payload.get("name"),
            "resource_type": payload.get("resource_type"),
            "capabilities": payload.get("capabilities", []),
        }

    def collect_capacity(self) -> CapacitySnapshot:
        payload = self._request()
        total_bytes = self._positive_integer(payload.get("total_bytes"), "total_bytes")
        used_bytes = self._non_negative_integer(payload.get("used_bytes"), "used_bytes")
        if used_bytes > total_bytes:
            raise StorageAdapterError("Storage endpoint returned used capacity above total.")
        return CapacitySnapshot(
            total_bytes=total_bytes,
            used_bytes=used_bytes,
            collected_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _positive_integer(value, field: str) -> int:
        parsed = HttpJsonStorageAdapter._non_negative_integer(value, field)
        if parsed <= 0:
            raise StorageAdapterError(f"Storage endpoint returned invalid {field}.")
        return parsed

    @staticmethod
    def _non_negative_integer(value, field: str) -> int:
        if isinstance(value, bool):
            raise StorageAdapterError(f"Storage endpoint returned invalid {field}.")
        try:
            parsed = int(value)
        except (TypeError, ValueError) as exc:
            raise StorageAdapterError(f"Storage endpoint returned invalid {field}.") from exc
        if parsed < 0:
            raise StorageAdapterError(f"Storage endpoint returned invalid {field}.")
        return parsed


class _NoRedirectHandler(HTTPRedirectHandler):
    """Prevent provider configuration from turning into an SSRF redirect."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise StorageAdapterError("Storage endpoint redirects are not allowed.")
