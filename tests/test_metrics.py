"""Tests for StorSight metrics API."""

import pytest

from app.extensions import db
from app.models.metric import Metric
from app.models.role import Role
from app.models.storage_resource import StorageResource
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.fixture
def metric_data(app):
    """Create authentication and storage-resource test data."""
    with app.app_context():
        db.create_all()

        role = Role(
            name="ENGINEER",
            description="Infrastructure engineer",
        )
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        auth_service = AuthService()

        user = User(
            username="metricuser",
            email="metricuser@storsight.local",
            password_hash=auth_service.hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)

        resource = StorageResource(
            name="metric-test-storage",
            resource_type="SAN",
            status="healthy",
            health_status="healthy",
            capacity_total=1000,
            capacity_used=400,
        )
        db.session.add(resource)
        db.session.commit()

        resource_id = resource.id

    yield {
        "username": "metricuser",
        "password": password,
        "resource_id": resource_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


def login(client, metric_data):
    """Authenticate the test user."""
    return client.post(
        "/api/auth/login",
        json={
            "username": metric_data["username"],
            "password": metric_data["password"],
        },
    )


def test_metrics_require_authentication(client):
    """Verify metrics endpoints reject unauthenticated requests."""
    response = client.get("/api/metrics/")

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Authentication required"
    }


def test_create_metric(client, metric_data):
    """Verify a metric can be recorded."""
    login(client, metric_data)

    response = client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "cpu_utilization",
            "metric_value": 72.5,
            "unit": "%",
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["resource_id"] == metric_data["resource_id"]
    assert data["metric_name"] == "cpu_utilization"
    assert data["metric_value"] == 72.5
    assert data["unit"] == "%"
    assert data["recorded_at"] is not None


def test_list_metrics(client, metric_data):
    """Verify metrics can be listed."""
    login(client, metric_data)

    client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "cpu_utilization",
            "metric_value": 72.5,
            "unit": "%",
        },
    )

    response = client.get("/api/metrics/")

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 1
    assert data[0]["metric_name"] == "cpu_utilization"


def test_get_metric(client, metric_data):
    """Verify a metric can be retrieved by ID."""
    login(client, metric_data)

    create_response = client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "latency",
            "metric_value": 12.4,
            "unit": "ms",
        },
    )

    metric_id = create_response.get_json()["id"]

    response = client.get(f"/api/metrics/{metric_id}")

    assert response.status_code == 200

    data = response.get_json()

    assert data["id"] == metric_id
    assert data["metric_name"] == "latency"
    assert data["metric_value"] == 12.4


def test_filter_metrics_by_resource(client, metric_data):
    """Verify metrics can be filtered by storage resource."""
    login(client, metric_data)

    client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "throughput",
            "metric_value": 500,
            "unit": "MB/s",
        },
    )

    response = client.get(
        f"/api/metrics/?resource_id={metric_data['resource_id']}"
    )

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 1
    assert data[0]["resource_id"] == metric_data["resource_id"]


def test_filter_metrics_by_name(client, metric_data):
    """Verify metrics can be filtered by metric name."""
    login(client, metric_data)

    client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "iops",
            "metric_value": 1200,
            "unit": "IOPS",
        },
    )

    response = client.get("/api/metrics/?metric_name=iops")

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 1
    assert data[0]["metric_name"] == "iops"


def test_metric_requires_existing_resource(client, metric_data):
    """Verify metrics cannot reference a missing storage resource."""
    login(client, metric_data)

    response = client.post(
        "/api/metrics/",
        json={
            "resource_id": 999999,
            "metric_name": "cpu_utilization",
            "metric_value": 50,
            "unit": "%",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Storage resource not found."
    }


def test_invalid_metric_name_rejected(client, metric_data):
    """Verify an empty metric name is rejected."""
    login(client, metric_data)

    response = client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "   ",
            "metric_value": 50,
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Metric name is required."
    }


def test_invalid_metric_value_rejected(client, metric_data):
    """Verify non-numeric metric values are rejected."""
    login(client, metric_data)

    response = client.post(
        "/api/metrics/",
        json={
            "resource_id": metric_data["resource_id"],
            "metric_name": "cpu_utilization",
            "metric_value": "not-a-number",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Metric value must be numeric."
    }


def test_missing_metric_returns_404(client, metric_data):
    """Verify an unknown metric ID returns 404."""
    login(client, metric_data)

    response = client.get("/api/metrics/999999")

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "Metric not found"
    }
