"""Tests for StorSight Alert Management — Phase 6."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.storage_resource import StorageResource
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def alert_data(app):
    """Create auth + storage resource test data for alert tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="alertuser",
            email="alertuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)

        resource = StorageResource(
            name="alert-test-storage",
            resource_type="SAN",
            status="healthy",
            health_status="healthy",
            capacity_total=2000,
            capacity_used=800,
        )
        db.session.add(resource)
        db.session.commit()

        resource_id = resource.id

    yield {
        "username": "alertuser",
        "password": password,
        "resource_id": resource_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, alert_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": alert_data["username"],
            "password": alert_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def create_alert(client, resource_id, title="Disk failure",
                 severity="critical", message="Disk A failed"):
    """POST a single alert and return the response."""
    return client.post(
        "/api/alerts/",
        json={
            "resource_id": resource_id,
            "title": title,
            "severity": severity,
            "message": message,
        },
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_alerts_requires_authentication(client):
    """Unauthenticated GET / is rejected."""
    response = client.get("/api/alerts/")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_get_alert_requires_authentication(client):
    """Unauthenticated GET /<id> is rejected."""
    response = client.get("/api/alerts/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_alert_requires_authentication(client, alert_data):
    """Unauthenticated POST / is rejected."""
    response = client.post(
        "/api/alerts/",
        json={
            "resource_id": alert_data["resource_id"],
            "title": "Disk failure",
            "severity": "critical",
        },
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_resolve_alert_requires_authentication(client):
    """Unauthenticated PATCH /<id>/resolve is rejected."""
    response = client.patch("/api/alerts/1/resolve")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create alert — happy path
# ---------------------------------------------------------------------------

def test_create_alert_success(auth_client, alert_data):
    """A valid alert is created and returns 201 with correct fields."""
    response = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="High latency detected",
        severity="warning",
        message="Latency exceeded threshold",
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["resource_id"] == alert_data["resource_id"]
    assert data["title"] == "High latency detected"
    assert data["severity"] == "warning"
    assert data["message"] == "Latency exceeded threshold"
    assert data["status"] == "active"
    assert data["created_at"] is not None
    assert data["resolved_at"] is None
    assert "id" in data


def test_create_alert_default_status_is_active(auth_client, alert_data):
    """Newly created alerts have status 'active' by default."""
    response = create_alert(auth_client, alert_data["resource_id"])
    assert response.status_code == 201
    assert response.get_json()["status"] == "active"


def test_create_alert_without_message(auth_client, alert_data):
    """Message is optional — alert can be created without it."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": alert_data["resource_id"],
            "title": "Controller offline",
            "severity": "critical",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["message"] is None


def test_create_alert_all_allowed_severities(auth_client, alert_data):
    """All three allowed severity values are accepted."""
    for severity in ("info", "warning", "critical"):
        response = create_alert(
            auth_client,
            alert_data["resource_id"],
            title=f"Alert {severity}",
            severity=severity,
        )
        assert response.status_code == 201, f"Failed for severity={severity}"
        assert response.get_json()["severity"] == severity


# ---------------------------------------------------------------------------
# Create alert — validation failures
# ---------------------------------------------------------------------------

def test_create_alert_missing_resource_returns_400(auth_client):
    """A non-existent resource_id returns 400."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": 999999,
            "title": "Disk failure",
            "severity": "critical",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Storage resource not found."}


def test_create_alert_null_resource_id_returns_400(auth_client):
    """A None resource_id is rejected with 400."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": None,
            "title": "Disk failure",
            "severity": "critical",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Resource ID is required."}


def test_create_alert_missing_title_returns_400(auth_client, alert_data):
    """A blank title is rejected with 400."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": alert_data["resource_id"],
            "title": "   ",
            "severity": "critical",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Alert title is required."}


def test_create_alert_invalid_severity_returns_400(auth_client, alert_data):
    """An unrecognised severity is rejected with 400."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": alert_data["resource_id"],
            "title": "Disk failure",
            "severity": "catastrophic",
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "Invalid severity" in data["error"]


def test_create_alert_missing_severity_returns_400(auth_client, alert_data):
    """A None severity is rejected with 400."""
    response = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": alert_data["resource_id"],
            "title": "Disk failure",
            "severity": None,
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid severity" in data["error"]


# ---------------------------------------------------------------------------
# Retrieve alert by ID
# ---------------------------------------------------------------------------

def test_get_alert_by_id(auth_client, alert_data):
    """A created alert can be retrieved by its ID."""
    created = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="Controller failure",
        severity="critical",
        message="Controller A offline",
    )
    alert_id = created.get_json()["id"]

    response = auth_client.get(f"/api/alerts/{alert_id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == alert_id
    assert data["title"] == "Controller failure"
    assert data["severity"] == "critical"
    assert data["message"] == "Controller A offline"


def test_get_alert_not_found_returns_404(auth_client):
    """An unknown alert ID returns 404."""
    response = auth_client.get("/api/alerts/999999")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Alert not found"}


# ---------------------------------------------------------------------------
# List alerts
# ---------------------------------------------------------------------------

def test_list_alerts_returns_all(auth_client, alert_data):
    """All created alerts are returned by the list endpoint."""
    create_alert(auth_client, alert_data["resource_id"],
                 title="Alert One", severity="warning")
    create_alert(auth_client, alert_data["resource_id"],
                 title="Alert Two", severity="critical")

    response = auth_client.get("/api/alerts/")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 2


def test_list_alerts_empty(auth_client):
    """Empty alert list returns 200 with an empty array."""
    response = auth_client.get("/api/alerts/")
    assert response.status_code == 200
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Filter by resource_id
# ---------------------------------------------------------------------------

def test_filter_alerts_by_resource_id(auth_client, alert_data, app):
    """Alerts can be filtered by storage resource."""
    with app.app_context():
        second = StorageResource(
            name="second-alert-storage",
            resource_type="NAS",
            status="healthy",
            health_status="healthy",
        )
        db.session.add(second)
        db.session.commit()
        second_id = second.id

    create_alert(auth_client, alert_data["resource_id"],
                 title="Primary alert", severity="critical")
    create_alert(auth_client, second_id,
                 title="Secondary alert", severity="warning")

    response = auth_client.get(
        f"/api/alerts/?resource_id={alert_data['resource_id']}"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["resource_id"] == alert_data["resource_id"]
    assert data[0]["title"] == "Primary alert"


# ---------------------------------------------------------------------------
# Filter by severity
# ---------------------------------------------------------------------------

def test_filter_alerts_by_severity(auth_client, alert_data):
    """Alerts can be filtered by severity."""
    create_alert(auth_client, alert_data["resource_id"],
                 title="Critical alert", severity="critical")
    create_alert(auth_client, alert_data["resource_id"],
                 title="Info alert", severity="info")

    response = auth_client.get("/api/alerts/?severity=critical")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["severity"] == "critical"


def test_filter_alerts_by_invalid_severity_returns_400(auth_client):
    """Filtering by an invalid severity returns 400."""
    response = auth_client.get("/api/alerts/?severity=unknown")
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid severity" in data["error"]


# ---------------------------------------------------------------------------
# Filter by status
# ---------------------------------------------------------------------------

def test_filter_alerts_by_status_active(auth_client, alert_data):
    """Alerts can be filtered to show only active ones."""
    create_alert(auth_client, alert_data["resource_id"],
                 title="Active alert", severity="warning")

    response = auth_client.get("/api/alerts/?status=active")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["status"] == "active"


def test_filter_alerts_by_status_resolved(auth_client, alert_data):
    """Alerts can be filtered to show only resolved ones."""
    created = create_alert(auth_client, alert_data["resource_id"],
                           title="Soon resolved", severity="info")
    alert_id = created.get_json()["id"]

    auth_client.patch(f"/api/alerts/{alert_id}/resolve")

    create_alert(auth_client, alert_data["resource_id"],
                 title="Still active", severity="warning")

    response = auth_client.get("/api/alerts/?status=resolved")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["status"] == "resolved"


def test_filter_alerts_by_invalid_status_returns_400(auth_client):
    """Filtering by an invalid status returns 400."""
    response = auth_client.get("/api/alerts/?status=pending")
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid status" in data["error"]


# ---------------------------------------------------------------------------
# Lifecycle — resolve
# ---------------------------------------------------------------------------

def test_resolve_alert_success(auth_client, alert_data):
    """An active alert can be resolved."""
    created = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="Disk failure",
        severity="critical",
    )
    alert_id = created.get_json()["id"]

    response = auth_client.patch(f"/api/alerts/{alert_id}/resolve")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None


def test_resolve_alert_persists(auth_client, alert_data):
    """Resolved status is persisted and visible on subsequent GET."""
    created = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="Capacity threshold",
        severity="warning",
    )
    alert_id = created.get_json()["id"]

    auth_client.patch(f"/api/alerts/{alert_id}/resolve")

    response = auth_client.get(f"/api/alerts/{alert_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None


def test_resolve_alert_not_found_returns_404(auth_client):
    """Resolving an unknown alert returns 404."""
    response = auth_client.patch("/api/alerts/999999/resolve")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Alert not found"}


def test_resolved_at_is_set_on_resolve(auth_client, alert_data):
    """resolved_at is None before resolve and set after."""
    created = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="Network failure",
        severity="critical",
    )
    alert_id = created.get_json()["id"]

    assert created.get_json()["resolved_at"] is None

    response = auth_client.patch(f"/api/alerts/{alert_id}/resolve")
    data = response.get_json()
    assert data["resolved_at"] is not None
    assert "T" in data["resolved_at"]


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_alert_response_shape(auth_client, alert_data):
    """Alert response contains exactly the expected public fields."""
    response = create_alert(
        auth_client,
        alert_data["resource_id"],
        title="Performance degradation",
        severity="warning",
        message="Latency spike detected",
    )

    assert response.status_code == 201
    data = response.get_json()

    expected_keys = {
        "id", "resource_id", "title", "severity", "status",
        "message", "created_at", "resolved_at",
    }
    assert set(data.keys()) == expected_keys


def test_alert_created_at_is_iso_formatted(auth_client, alert_data):
    """created_at is present and ISO-formatted."""
    response = create_alert(auth_client, alert_data["resource_id"])
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Regression — existing endpoints still work
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    """Health endpoint is unaffected by Phase 6 changes."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "healthy"}


def test_events_endpoint_still_protected(client):
    """Events endpoint still requires auth after Phase 6."""
    response = client.get("/api/events/")
    assert response.status_code == 401


def test_storage_resources_endpoint_still_protected(client):
    """Storage resource endpoint still requires auth after Phase 6."""
    response = client.get("/api/storage-resources/")
    assert response.status_code == 401


def test_metrics_endpoint_still_protected(client):
    """Metrics endpoint still requires auth after Phase 6."""
    response = client.get("/api/metrics/")
    assert response.status_code == 401
