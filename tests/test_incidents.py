"""Tests for StorSight Incident Management — Phase 7."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def incident_data(app):
    """Create auth test data for incident tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="incidentuser",
            email="incidentuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

        user_id = user.id

    yield {
        "username": "incidentuser",
        "password": password,
        "user_id": user_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, incident_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": incident_data["username"],
            "password": incident_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def create_incident(client, title="Disk failure incident",
                    severity="high", description=None):
    """POST a single incident and return the response."""
    payload = {"title": title, "severity": severity}
    if description:
        payload["description"] = description
    return client.post("/api/incidents/", json=payload)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_incidents_requires_authentication(client):
    """Unauthenticated GET / is rejected."""
    response = client.get("/api/incidents/")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_get_incident_requires_authentication(client):
    """Unauthenticated GET /<id> is rejected."""
    response = client.get("/api/incidents/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_incident_requires_authentication(client):
    """Unauthenticated POST / is rejected."""
    response = client.post(
        "/api/incidents/",
        json={"title": "Test incident", "severity": "high"},
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_resolve_incident_requires_authentication(client):
    """Unauthenticated PATCH /<id>/resolve is rejected."""
    response = client.patch("/api/incidents/1/resolve")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_assign_incident_requires_authentication(client):
    """Unauthenticated PATCH /<id>/assign is rejected."""
    response = client.patch("/api/incidents/1/assign",
                            json={"assignee_id": 1})
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create — happy path
# ---------------------------------------------------------------------------

def test_create_incident_success(auth_client):
    """A valid incident is created and returns 201 with correct fields."""
    response = create_incident(
        auth_client,
        title="Storage latency spike",
        severity="high",
        description="Latency exceeded threshold on SAN-01",
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["title"] == "Storage latency spike"
    assert data["severity"] == "high"
    assert data["description"] == "Latency exceeded threshold on SAN-01"
    assert data["status"] == "open"
    assert data["assignee_id"] is None
    assert data["created_at"] is not None
    assert data["resolved_at"] is None
    assert "id" in data


def test_create_incident_default_severity_is_medium(auth_client):
    """When severity is omitted it defaults to 'medium'."""
    response = auth_client.post(
        "/api/incidents/",
        json={"title": "Minor issue"},
    )
    assert response.status_code == 201
    assert response.get_json()["severity"] == "medium"


def test_create_incident_default_status_is_open(auth_client):
    """Newly created incidents have status 'open' by default."""
    response = create_incident(auth_client)
    assert response.status_code == 201
    assert response.get_json()["status"] == "open"


def test_create_incident_without_description(auth_client):
    """Description is optional — incident can be created without it."""
    response = auth_client.post(
        "/api/incidents/",
        json={"title": "No description incident", "severity": "low"},
    )
    assert response.status_code == 201
    assert response.get_json()["description"] is None


def test_create_incident_all_allowed_severities(auth_client):
    """All four allowed severity values are accepted."""
    for severity in ("low", "medium", "high", "critical"):
        response = create_incident(
            auth_client,
            title=f"Incident {severity}",
            severity=severity,
        )
        assert response.status_code == 201, f"Failed for severity={severity}"
        assert response.get_json()["severity"] == severity


# ---------------------------------------------------------------------------
# Create — validation failures
# ---------------------------------------------------------------------------

def test_create_incident_blank_title_returns_400(auth_client):
    """A blank title is rejected with 400."""
    response = auth_client.post(
        "/api/incidents/",
        json={"title": "   ", "severity": "high"},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Incident title is required."}


def test_create_incident_missing_title_returns_400(auth_client):
    """A None title is rejected with 400."""
    response = auth_client.post(
        "/api/incidents/",
        json={"severity": "high"},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Incident title is required."}


def test_create_incident_invalid_severity_returns_400(auth_client):
    """An unrecognised severity is rejected with 400."""
    response = auth_client.post(
        "/api/incidents/",
        json={"title": "Test", "severity": "catastrophic"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Invalid severity" in data["error"]


def test_create_incident_invalid_assignee_returns_400(auth_client):
    """An unknown assignee is rejected before database commit."""
    response = auth_client.post(
        "/api/incidents/",
        json={"title": "Unassigned target", "assignee_id": 999999},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Assignee not found."}


# ---------------------------------------------------------------------------
# Retrieve by ID
# ---------------------------------------------------------------------------

def test_get_incident_by_id(auth_client):
    """A created incident can be retrieved by its ID."""
    created = create_incident(
        auth_client,
        title="Controller failure",
        severity="critical",
    )
    incident_id = created.get_json()["id"]

    response = auth_client.get(f"/api/incidents/{incident_id}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["id"] == incident_id
    assert data["title"] == "Controller failure"
    assert data["severity"] == "critical"


def test_get_incident_not_found_returns_404(auth_client):
    """An unknown incident ID returns 404."""
    response = auth_client.get("/api/incidents/999999")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found"}


# ---------------------------------------------------------------------------
# List incidents
# ---------------------------------------------------------------------------

def test_list_incidents_returns_all(auth_client):
    """All created incidents are returned by the list endpoint."""
    create_incident(auth_client, title="Incident One", severity="low")
    create_incident(auth_client, title="Incident Two", severity="critical")

    response = auth_client.get("/api/incidents/")
    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_list_incidents_empty(auth_client):
    """Empty incident list returns 200 with an empty array."""
    response = auth_client.get("/api/incidents/")
    assert response.status_code == 200
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Filter by status
# ---------------------------------------------------------------------------

def test_filter_incidents_by_status_open(auth_client):
    """Incidents can be filtered by status=open."""
    create_incident(auth_client, title="Open incident", severity="medium")

    response = auth_client.get("/api/incidents/?status=open")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["status"] == "open"


def test_filter_incidents_by_status_resolved(auth_client):
    """Filter by status=resolved returns only resolved incidents."""
    created = create_incident(auth_client, title="To resolve", severity="high")
    incident_id = created.get_json()["id"]
    auth_client.patch(f"/api/incidents/{incident_id}/resolve")

    create_incident(auth_client, title="Still open", severity="low")

    response = auth_client.get("/api/incidents/?status=resolved")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["status"] == "resolved"


def test_filter_incidents_by_invalid_status_returns_400(auth_client):
    """Filtering by an invalid status returns 400."""
    response = auth_client.get("/api/incidents/?status=pending")
    assert response.status_code == 400
    assert "Invalid status" in response.get_json()["error"]


# ---------------------------------------------------------------------------
# Filter by severity
# ---------------------------------------------------------------------------

def test_filter_incidents_by_severity(auth_client):
    """Incidents can be filtered by severity."""
    create_incident(auth_client, title="Critical one", severity="critical")
    create_incident(auth_client, title="Low one", severity="low")

    response = auth_client.get("/api/incidents/?severity=critical")
    assert response.status_code == 200

    data = response.get_json()
    assert len(data) == 1
    assert data[0]["severity"] == "critical"


def test_filter_incidents_by_invalid_severity_returns_400(auth_client):
    """Filtering by an invalid severity returns 400."""
    response = auth_client.get("/api/incidents/?severity=unknown")
    assert response.status_code == 400
    assert "Invalid severity" in response.get_json()["error"]


# ---------------------------------------------------------------------------
# Lifecycle — resolve
# ---------------------------------------------------------------------------

def test_resolve_incident_success(auth_client):
    """An open incident can be resolved."""
    created = create_incident(auth_client, title="Resolvable", severity="high")
    incident_id = created.get_json()["id"]

    response = auth_client.patch(f"/api/incidents/{incident_id}/resolve")
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None


def test_resolve_incident_persists(auth_client):
    """Resolved status is visible on subsequent GET."""
    created = create_incident(auth_client, title="Will resolve", severity="medium")
    incident_id = created.get_json()["id"]

    auth_client.patch(f"/api/incidents/{incident_id}/resolve")

    response = auth_client.get(f"/api/incidents/{incident_id}")
    assert response.get_json()["status"] == "resolved"
    assert response.get_json()["resolved_at"] is not None


def test_resolve_incident_not_found_returns_404(auth_client):
    """Resolving an unknown incident returns 404."""
    response = auth_client.patch("/api/incidents/999999/resolve")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found"}


def test_resolved_at_is_set_on_resolve(auth_client):
    """resolved_at is None before resolve and ISO-formatted after."""
    created = create_incident(auth_client, title="Timing test", severity="low")
    incident_id = created.get_json()["id"]

    assert created.get_json()["resolved_at"] is None

    response = auth_client.patch(f"/api/incidents/{incident_id}/resolve")
    data = response.get_json()
    assert data["resolved_at"] is not None
    assert "T" in data["resolved_at"]


# ---------------------------------------------------------------------------
# Lifecycle — assign
# ---------------------------------------------------------------------------

def test_assign_incident_success(auth_client, incident_data):
    """An incident can be assigned to a user."""
    created = create_incident(auth_client, title="Assignable", severity="high")
    incident_id = created.get_json()["id"]

    response = auth_client.patch(
        f"/api/incidents/{incident_id}/assign",
        json={"assignee_id": incident_data["user_id"]},
    )
    assert response.status_code == 200
    assert response.get_json()["assignee_id"] == incident_data["user_id"]


def test_assign_incident_not_found_returns_404(auth_client, incident_data):
    """Assigning to an unknown incident returns 404."""
    response = auth_client.patch(
        "/api/incidents/999999/assign",
        json={"assignee_id": incident_data["user_id"]},
    )
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found"}


def test_assign_incident_missing_assignee_id_returns_400(auth_client):
    """Missing assignee_id in assign request returns 400."""
    created = create_incident(auth_client, title="No assignee", severity="low")
    incident_id = created.get_json()["id"]

    response = auth_client.patch(
        f"/api/incidents/{incident_id}/assign",
        json={},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "assignee_id is required."}


def test_assign_incident_unknown_assignee_returns_400(auth_client):
    """Assigning an unknown user is rejected before database commit."""
    created = create_incident(auth_client, title="Invalid assignee", severity="low")
    response = auth_client.patch(
        f"/api/incidents/{created.get_json()['id']}/assign",
        json={"assignee_id": 999999},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Assignee not found."}


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_incident_response_shape(auth_client):
    """Incident response contains exactly the expected public fields."""
    response = create_incident(
        auth_client,
        title="Shape test",
        severity="medium",
        description="Checking response fields",
    )

    assert response.status_code == 201
    data = response.get_json()

    expected_keys = {
        "id", "title", "description", "severity", "status",
        "assignee_id", "created_at", "updated_at", "resolved_at",
    }
    assert set(data.keys()) == expected_keys


def test_incident_created_at_is_iso_formatted(auth_client):
    """created_at is present and ISO 8601 formatted."""
    response = create_incident(auth_client)
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    """Health endpoint is unaffected by Phase 7 changes."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_alerts_endpoint_still_protected(client):
    """Alerts endpoint still requires auth after Phase 7."""
    response = client.get("/api/alerts/")
    assert response.status_code == 401


def test_events_endpoint_still_protected(client):
    """Events endpoint still requires auth after Phase 7."""
    response = client.get("/api/events/")
    assert response.status_code == 401


def test_storage_resources_endpoint_still_protected(client):
    """Storage resources endpoint still requires auth after Phase 7."""
    response = client.get("/api/storage-resources/")
    assert response.status_code == 401
