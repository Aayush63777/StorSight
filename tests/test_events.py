"""Tests for StorSight Event Management — Phase 5."""

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
def event_data(app):
    """Create auth + storage resource test data for event tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="eventuser",
            email="eventuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)

        resource = StorageResource(
            name="event-test-storage",
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
        "username": "eventuser",
        "password": password,
        "resource_id": resource_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, event_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": event_data["username"],
            "password": event_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def create_event(client, resource_id, event_type="disk_failure",
                 message="Disk failure detected", severity="critical"):
    """Post a single event and return the response."""
    return client.post(
        "/api/events/",
        json={
            "resource_id": resource_id,
            "event_type": event_type,
            "message": message,
            "severity": severity,
        },
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_events_requires_authentication(client):
    """Unauthenticated GET / is rejected."""
    response = client.get("/api/events/")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_get_event_requires_authentication(client):
    """Unauthenticated GET /<id> is rejected."""
    response = client.get("/api/events/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_event_requires_authentication(client, event_data):
    """Unauthenticated POST / is rejected."""
    response = client.post(
        "/api/events/",
        json={
            "resource_id": event_data["resource_id"],
            "event_type": "disk_failure",
            "message": "Disk failure detected",
        },
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create event — happy path
# ---------------------------------------------------------------------------

def test_create_event_success(auth_client, event_data):
    """A valid event is created and returns 201 with correct fields."""
    response = create_event(
        auth_client,
        event_data["resource_id"],
        event_type="capacity_threshold",
        message="Capacity exceeded 80%",
        severity="warning",
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["resource_id"] == event_data["resource_id"]
    assert data["event_type"] == "capacity_threshold"
    assert data["message"] == "Capacity exceeded 80%"
    assert data["severity"] == "warning"
    assert data["occurred_at"] is not None
    assert "id" in data


def test_create_event_default_severity_is_info(auth_client, event_data):
    """When severity is omitted it defaults to 'info'."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": event_data["resource_id"],
            "event_type": "health_check",
            "message": "Routine health check",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["severity"] == "info"


def test_create_event_all_allowed_severities(auth_client, event_data):
    """All four allowed severity values are accepted."""
    for severity in ("info", "warning", "error", "critical"):
        response = create_event(
            auth_client,
            event_data["resource_id"],
            event_type=f"test_{severity}",
            message=f"Test {severity} event",
            severity=severity,
        )
        assert response.status_code == 201, f"Failed for severity={severity}"
        assert response.get_json()["severity"] == severity


# ---------------------------------------------------------------------------
# Create event — validation failures
# ---------------------------------------------------------------------------

def test_create_event_missing_resource_returns_400(auth_client):
    """A non-existent resource_id returns 400."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": 999999,
            "event_type": "disk_failure",
            "message": "Disk failure detected",
            "severity": "critical",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Storage resource not found."}


def test_create_event_missing_event_type_returns_400(auth_client, event_data):
    """A blank event_type is rejected with 400."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": event_data["resource_id"],
            "event_type": "   ",
            "message": "Some message",
            "severity": "info",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Event type is required."}


def test_create_event_missing_message_returns_400(auth_client, event_data):
    """A blank message is rejected with 400."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": event_data["resource_id"],
            "event_type": "disk_failure",
            "message": "   ",
            "severity": "info",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Event message is required."}


def test_create_event_invalid_severity_returns_400(auth_client, event_data):
    """An unrecognised severity value is rejected with 400."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": event_data["resource_id"],
            "event_type": "disk_failure",
            "message": "Disk failure detected",
            "severity": "catastrophic",
        },
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "Invalid severity" in data["error"]


def test_create_event_null_resource_id_returns_400(auth_client):
    """A None resource_id is rejected with 400."""
    response = auth_client.post(
        "/api/events/",
        json={
            "resource_id": None,
            "event_type": "disk_failure",
            "message": "Some event",
            "severity": "info",
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Resource ID is required."}


# ---------------------------------------------------------------------------
# Retrieve event by ID
# ---------------------------------------------------------------------------

def test_get_event_by_id(auth_client, event_data):
    """A created event can be retrieved by its ID."""
    created = create_event(
        auth_client,
        event_data["resource_id"],
        event_type="controller_failure",
        message="Controller A offline",
        severity="critical",
    )
    event_id = created.get_json()["id"]

    response = auth_client.get(f"/api/events/{event_id}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == event_id
    assert data["event_type"] == "controller_failure"
    assert data["message"] == "Controller A offline"
    assert data["severity"] == "critical"


def test_get_event_not_found_returns_404(auth_client):
    """An unknown event ID returns 404."""
    response = auth_client.get("/api/events/999999")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Event not found"}


# ---------------------------------------------------------------------------
# List events
# ---------------------------------------------------------------------------

def test_list_events_returns_all(auth_client, event_data):
    """All created events are returned by the list endpoint."""
    create_event(auth_client, event_data["resource_id"],
                 event_type="disk_failure", message="Disk A failed",
                 severity="critical")
    create_event(auth_client, event_data["resource_id"],
                 event_type="network_failure", message="NIC offline",
                 severity="warning")

    response = auth_client.get("/api/events/")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 2


def test_list_events_empty(auth_client):
    """Empty event list returns 200 with an empty array."""
    response = auth_client.get("/api/events/")
    assert response.status_code == 200
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Filter by resource_id
# ---------------------------------------------------------------------------

def test_filter_events_by_resource_id(auth_client, event_data, app):
    """Events can be filtered by storage resource."""
    # create a second resource
    with app.app_context():
        second = StorageResource(
            name="second-storage",
            resource_type="NAS",
            status="healthy",
            health_status="healthy",
        )
        db.session.add(second)
        db.session.commit()
        second_id = second.id

    create_event(auth_client, event_data["resource_id"],
                 event_type="disk_failure", message="Disk failed",
                 severity="critical")
    create_event(auth_client, second_id,
                 event_type="network_failure", message="NIC offline",
                 severity="warning")

    response = auth_client.get(
        f"/api/events/?resource_id={event_data['resource_id']}"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["resource_id"] == event_data["resource_id"]
    assert data[0]["event_type"] == "disk_failure"


# ---------------------------------------------------------------------------
# Filter by severity
# ---------------------------------------------------------------------------

def test_filter_events_by_severity(auth_client, event_data):
    """Events can be filtered by severity."""
    create_event(auth_client, event_data["resource_id"],
                 event_type="disk_failure", message="Disk failed",
                 severity="critical")
    create_event(auth_client, event_data["resource_id"],
                 event_type="health_check", message="Routine check",
                 severity="info")

    response = auth_client.get("/api/events/?severity=critical")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["severity"] == "critical"


def test_filter_events_by_invalid_severity_returns_400(auth_client):
    """Filtering by an invalid severity returns 400."""
    response = auth_client.get("/api/events/?severity=unknown")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert "Invalid severity" in data["error"]


def test_paginated_events_return_metadata(auth_client, event_data):
    """Paginated event responses expose bounded items and totals."""
    for event_type in ("first", "second", "third"):
        create_event(auth_client, event_data["resource_id"], event_type=event_type)

    response = auth_client.get("/api/events/?page=2&page_size=2")

    assert response.status_code == 200
    data = response.get_json()
    assert len(data["items"]) == 1
    assert data["pagination"] == {
        "page": 2,
        "page_size": 2,
        "total": 3,
        "total_pages": 2,
    }


@pytest.mark.parametrize("field,value", [
    ("event_type", 123),
    ("message", {"invalid": True}),
    ("severity", 123),
])
def test_create_event_rejects_non_string_fields(auth_client, event_data, field, value):
    """Malformed JSON fields return validation errors instead of 500s."""
    payload = {
        "resource_id": event_data["resource_id"],
        "event_type": "disk_failure",
        "message": "Disk failure detected",
        "severity": "critical",
    }
    payload[field] = value

    response = auth_client.post("/api/events/", json=payload)

    assert response.status_code == 400


def test_create_event_rejects_overlong_event_type(auth_client, event_data):
    """Event types cannot exceed the database column length."""
    response = create_event(
        auth_client,
        event_data["resource_id"],
        event_type="x" * 51,
    )

    assert response.status_code == 400


def test_create_event_rejects_non_object_body(auth_client):
    """Non-object JSON request bodies return a validation error."""
    response = auth_client.post("/api/events/", json=["invalid"])

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Request body must be a JSON object."
    }


def test_event_filters_are_combined_and_event_type_is_case_insensitive(
    auth_client, event_data
):
    """Resource, severity, and partial event type filters compose together."""
    create_event(
        auth_client,
        event_data["resource_id"],
        event_type="Disk_Failure",
        message="Disk failed",
        severity="critical",
    )
    create_event(
        auth_client,
        event_data["resource_id"],
        event_type="disk_warning",
        message="Disk warning",
        severity="warning",
    )

    response = auth_client.get(
        f"/api/events/?resource_id={event_data['resource_id']}"
        "&severity=critical&event_type=disk_fail"
    )

    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["event_type"] == "Disk_Failure"


# ---------------------------------------------------------------------------
# Filter by event_type
# ---------------------------------------------------------------------------

def test_filter_events_by_event_type(auth_client, event_data):
    """Events can be filtered by event_type."""
    create_event(auth_client, event_data["resource_id"],
                 event_type="replication_degraded",
                 message="Replication lag detected", severity="warning")
    create_event(auth_client, event_data["resource_id"],
                 event_type="disk_failure",
                 message="Disk B failed", severity="critical")

    response = auth_client.get("/api/events/?event_type=replication_degraded")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["event_type"] == "replication_degraded"


# ---------------------------------------------------------------------------
# Response shape — no internal fields leaked
# ---------------------------------------------------------------------------

def test_event_response_shape(auth_client, event_data):
    """Event response contains exactly the expected public fields."""
    response = create_event(
        auth_client,
        event_data["resource_id"],
        event_type="performance_degradation",
        message="Latency spike detected",
        severity="error",
    )

    assert response.status_code == 201
    data = response.get_json()

    expected_keys = {"id", "resource_id", "event_type", "severity",
                     "message", "occurred_at"}
    assert set(data.keys()) == expected_keys


def test_event_response_has_occurred_at(auth_client, event_data):
    """occurred_at is present and ISO-formatted."""
    response = create_event(
        auth_client,
        event_data["resource_id"],
        event_type="capacity_threshold",
        message="80% capacity reached",
        severity="warning",
    )

    data = response.get_json()
    assert data["occurred_at"] is not None
    # ISO 8601 strings contain a 'T' separator
    assert "T" in data["occurred_at"]


# ---------------------------------------------------------------------------
# Regression — existing endpoints still work
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    """Health endpoint is unaffected by Phase 5 changes."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_storage_resources_endpoint_still_protected(client):
    """Storage resource endpoint still requires auth after Phase 5."""
    response = client.get("/api/storage-resources/")
    assert response.status_code == 401


def test_metrics_endpoint_still_protected(client):
    """Metrics endpoint still requires auth after Phase 5."""
    response = client.get("/api/metrics/")
    assert response.status_code == 401
