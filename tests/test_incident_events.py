"""Tests for StorSight Event Correlation (IncidentEvent) — Phase 7."""

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
def correlation_data(app):
    """Create auth, storage resource, incident, and event test data."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="correlationuser",
            email="correlationuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)

        resource = StorageResource(
            name="correlation-test-storage",
            resource_type="SAN",
            status="healthy",
            health_status="healthy",
        )
        db.session.add(resource)
        db.session.commit()

        resource_id = resource.id

    yield {
        "username": "correlationuser",
        "password": password,
        "resource_id": resource_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, correlation_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": correlation_data["username"],
            "password": correlation_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="Correlation incident", severity="high"):
    """Create an incident and return its ID."""
    response = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert response.status_code == 201
    return response.get_json()["id"]


def create_event(client, resource_id, event_type="disk_failure",
                 message="Disk failed", severity="critical"):
    """Create an event and return its ID."""
    response = client.post(
        "/api/events/",
        json={
            "resource_id": resource_id,
            "event_type": event_type,
            "message": message,
            "severity": severity,
        },
    )
    assert response.status_code == 201
    return response.get_json()["id"]


def link_event(client, incident_id, event_id,
               relationship_type="related"):
    """POST a correlation link and return the response."""
    return client.post(
        f"/api/incidents/{incident_id}/events",
        json={
            "event_id": event_id,
            "relationship_type": relationship_type,
        },
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_incident_events_requires_authentication(client):
    """Unauthenticated GET /incidents/<id>/events is rejected."""
    response = client.get("/api/incidents/1/events")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_link_event_requires_authentication(client, correlation_data):
    """Unauthenticated POST /incidents/<id>/events is rejected."""
    response = client.post(
        "/api/incidents/1/events",
        json={"event_id": 1},
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Successful correlation
# ---------------------------------------------------------------------------

def test_link_event_to_incident_success(auth_client, correlation_data):
    """An event can be successfully correlated with an incident."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    response = link_event(auth_client, incident_id, event_id)

    assert response.status_code == 201

    data = response.get_json()
    assert data["incident_id"] == incident_id
    assert data["event_id"] == event_id
    assert data["relationship_type"] == "related"
    assert data["created_at"] is not None
    assert "id" in data


def test_link_event_custom_relationship_type(auth_client, correlation_data):
    """A custom relationship_type is stored correctly."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    response = link_event(
        auth_client, incident_id, event_id,
        relationship_type="root_cause",
    )

    assert response.status_code == 201
    assert response.get_json()["relationship_type"] == "root_cause"


def test_link_multiple_events_to_incident(auth_client, correlation_data):
    """Multiple events can be correlated with a single incident."""
    incident_id = create_incident(auth_client)
    event_id_1 = create_event(auth_client, correlation_data["resource_id"],
                               event_type="disk_failure",
                               message="Disk A failed")
    event_id_2 = create_event(auth_client, correlation_data["resource_id"],
                               event_type="network_failure",
                               message="NIC offline")

    link_event(auth_client, incident_id, event_id_1)
    link_event(auth_client, incident_id, event_id_2)

    response = auth_client.get(f"/api/incidents/{incident_id}/events")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 2
    linked_event_ids = {item["event_id"] for item in data}
    assert event_id_1 in linked_event_ids
    assert event_id_2 in linked_event_ids


# ---------------------------------------------------------------------------
# Duplicate prevention (idempotent)
# ---------------------------------------------------------------------------

def test_duplicate_link_is_idempotent(auth_client, correlation_data):
    """Linking the same event twice returns the existing link with 200."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    first = link_event(auth_client, incident_id, event_id)
    assert first.status_code == 201

    second = link_event(auth_client, incident_id, event_id)
    assert second.status_code == 200

    # same link ID returned both times
    assert first.get_json()["id"] == second.get_json()["id"]


def test_duplicate_link_does_not_create_extra_record(
    auth_client, correlation_data
):
    """Idempotent linking leaves only one record in the list."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    link_event(auth_client, incident_id, event_id)
    link_event(auth_client, incident_id, event_id)

    response = auth_client.get(f"/api/incidents/{incident_id}/events")
    assert len(response.get_json()) == 1


# ---------------------------------------------------------------------------
# Validation failures
# ---------------------------------------------------------------------------

def test_link_nonexistent_incident_returns_404(auth_client, correlation_data):
    """Linking to a non-existent incident returns 404."""
    event_id = create_event(auth_client, correlation_data["resource_id"])

    response = link_event(auth_client, 999999, event_id)
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found."}


def test_link_nonexistent_event_returns_404(auth_client):
    """Linking a non-existent event returns 404."""
    incident_id = create_incident(auth_client)

    response = link_event(auth_client, incident_id, 999999)
    assert response.status_code == 404
    assert response.get_json() == {"error": "Event not found."}


def test_link_missing_event_id_returns_400(auth_client):
    """Missing event_id in request body returns 400."""
    incident_id = create_incident(auth_client)

    response = auth_client.post(
        f"/api/incidents/{incident_id}/events",
        json={},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "event_id is required."}


def test_link_null_event_id_returns_400(auth_client):
    """A None event_id returns 400."""
    incident_id = create_incident(auth_client)

    response = auth_client.post(
        f"/api/incidents/{incident_id}/events",
        json={"event_id": None},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "event_id is required."}


def test_link_invalid_event_id_returns_400(auth_client):
    """A non-integer event_id returns 400."""
    incident_id = create_incident(auth_client)

    response = auth_client.post(
        f"/api/incidents/{incident_id}/events",
        json={"event_id": "not-an-int"},
    )
    assert response.status_code == 400
    assert response.get_json() == {
        "error": "event_id must be a positive integer."
    }


# ---------------------------------------------------------------------------
# List correlated events
# ---------------------------------------------------------------------------

def test_list_incident_events_empty(auth_client):
    """An incident with no correlated events returns an empty list."""
    incident_id = create_incident(auth_client)

    response = auth_client.get(f"/api/incidents/{incident_id}/events")
    assert response.status_code == 200
    assert response.get_json() == []


def test_list_incident_events_returns_links(auth_client, correlation_data):
    """The list endpoint returns all correlated event links."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    link_event(auth_client, incident_id, event_id)

    response = auth_client.get(f"/api/incidents/{incident_id}/events")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["incident_id"] == incident_id
    assert data[0]["event_id"] == event_id


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_link_response_shape(auth_client, correlation_data):
    """Link response contains exactly the expected public fields."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    response = link_event(auth_client, incident_id, event_id)
    assert response.status_code == 201

    data = response.get_json()
    expected_keys = {
        "id", "incident_id", "event_id", "relationship_type", "created_at"
    }
    assert set(data.keys()) == expected_keys


def test_link_created_at_is_iso_formatted(auth_client, correlation_data):
    """created_at on a link is ISO 8601 formatted."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    response = link_event(auth_client, incident_id, event_id)
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Persistence verification
# ---------------------------------------------------------------------------

def test_correlation_persists_across_requests(auth_client, correlation_data):
    """A correlated link is visible in subsequent list and GET calls."""
    incident_id = create_incident(auth_client)
    event_id = create_event(auth_client, correlation_data["resource_id"])

    link_event(auth_client, incident_id, event_id)

    # re-fetch the list in a new request
    response = auth_client.get(f"/api/incidents/{incident_id}/events")
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["event_id"] == event_id


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    """Health endpoint is unaffected by Phase 7 correlation changes."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "healthy"}


def test_alerts_endpoint_still_protected(client):
    """Alerts endpoint still requires auth after Phase 7."""
    response = client.get("/api/alerts/")
    assert response.status_code == 401


def test_incidents_endpoint_still_protected(client):
    """Incidents endpoint still requires auth after Phase 7."""
    response = client.get("/api/incidents/")
    assert response.status_code == 401
