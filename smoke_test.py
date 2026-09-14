"""Simple deployment smoke test for StorSight.

Run this after configuring environment variables to validate that the
application can boot with the current deployment configuration and that the
public health endpoints respond successfully.
"""

import os
import sys

from app import create_app


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> int:
    env = os.getenv("APP_ENV", "development")
    app = create_app(env)

    with app.test_client() as client:
        health_response = client.get("/health")
        ready_response = client.get("/health/ready")

    _require(
        health_response.status_code == 200,
        f"/health failed with status {health_response.status_code}",
    )
    _require(
        ready_response.status_code == 200,
        f"/health/ready failed with status {ready_response.status_code}",
    )

    health_payload = health_response.get_json(silent=True) or {}
    ready_payload = ready_response.get_json(silent=True) or {}

    _require(
        health_payload.get("status") == "ok",
        f"/health returned unexpected payload: {health_payload}",
    )
    _require(
        ready_payload.get("status") == "ok",
        f"/health/ready returned unexpected payload: {ready_payload}",
    )

    print(f"Smoke test passed for APP_ENV={env}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Smoke test failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
