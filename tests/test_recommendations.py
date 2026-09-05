"""Tests for StorSight Recommendations — Phase 8."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def rec_data(app):
    """Create auth test data for recommendation tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="recuser",
            email="recuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

    yield {"username": "recuser", "password": password}

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, rec_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": rec_data["username"],
            "password": rec_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="Rec incident", severity="high"):
    resp = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def create_recommendation(client, incident_id,
                          title="Expand storage capacity",
                          description="Add additional disk shelves.",
                          priority="high",
                          reason=None):
    payload = {
        "title": title,
        "description": description,
        "priority": priority,
    }
    if reason:
        payload["reason"] = reason
    return client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json=payload,
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_recommendations_requires_authentication(client):
    response = client.get("/api/incidents/1/recommendations")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_get_recommendation_requires_authentication(client):
    response = client.get("/api/incidents/1/recommendations/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_recommendation_requires_authentication(client):
    response = client.post(
        "/api/incidents/1/recommendations",
        json={"title": "Fix it", "description": "Do this.", "priority": "high"},
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create — happy path
# ---------------------------------------------------------------------------

def test_create_recommendation_success(auth_client):
    """A valid recommendation is created and returns 201."""
    incident_id = create_incident(auth_client)

    response = create_recommendation(
        auth_client, incident_id,
        title="Expand storage capacity",
        description="Add additional disk shelves to prevent recurrence.",
        priority="high",
        reason="Capacity exhaustion identified as root cause.",
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["incident_id"] == incident_id
    assert data["title"] == "Expand storage capacity"
    assert data["description"] == "Add additional disk shelves to prevent recurrence."
    assert data["priority"] == "high"
    assert data["reason"] == "Capacity exhaustion identified as root cause."
    assert data["created_at"] is not None
    assert "id" in data


def test_create_recommendation_default_priority_is_medium(auth_client):
    """When priority is omitted it defaults to 'medium'."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json={
            "title": "Check disk health",
            "description": "Run disk diagnostics.",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["priority"] == "medium"


def test_create_recommendation_without_reason(auth_client):
    """Reason is optional — recommendation can be created without it."""
    incident_id = create_incident(auth_client)
    response = create_recommendation(auth_client, incident_id)
    assert response.status_code == 201
    assert response.get_json()["reason"] is None


def test_create_recommendation_all_allowed_priorities(auth_client):
    """All four allowed priority values are accepted."""
    incident_id = create_incident(auth_client)
    for priority in ("low", "medium", "high", "critical"):
        response = create_recommendation(
            auth_client, incident_id,
            title=f"Action {priority}",
            priority=priority,
        )
        assert response.status_code == 201, f"Failed for priority={priority}"
        assert response.get_json()["priority"] == priority


# ---------------------------------------------------------------------------
# Create — validation failures
# ---------------------------------------------------------------------------

def test_create_recommendation_nonexistent_incident_returns_400(auth_client):
    """Recommendation for a non-existent incident returns 400."""
    response = create_recommendation(auth_client, 999999)
    assert response.status_code == 400
    assert response.get_json() == {"error": "Incident not found."}


def test_create_recommendation_blank_title_returns_400(auth_client):
    """A blank title is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json={"title": "   ", "description": "Some desc.", "priority": "low"},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Recommendation title is required."}


def test_create_recommendation_blank_description_returns_400(auth_client):
    """A blank description is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json={"title": "Fix it", "description": "   ", "priority": "low"},
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Recommendation description is required."}


def test_create_recommendation_invalid_priority_returns_400(auth_client):
    """An unrecognised priority is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json={"title": "Fix it", "description": "Do this.", "priority": "urgent"},
    )
    assert response.status_code == 400
    assert "Invalid priority" in response.get_json()["error"]


# ---------------------------------------------------------------------------
# Retrieve by ID
# ---------------------------------------------------------------------------

def test_get_recommendation_by_id(auth_client):
    """A created recommendation can be retrieved by its ID."""
    incident_id = create_incident(auth_client)
    created = create_recommendation(
        auth_client, incident_id,
        title="Replace failed disk",
        description="Remove and replace failed disk.",
        priority="critical",
    )
    rec_id = created.get_json()["id"]

    response = auth_client.get(
        f"/api/incidents/{incident_id}/recommendations/{rec_id}"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert data["id"] == rec_id
    assert data["title"] == "Replace failed disk"
    assert data["priority"] == "critical"


def test_get_recommendation_not_found_returns_404(auth_client):
    """An unknown recommendation ID returns 404."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(
        f"/api/incidents/{incident_id}/recommendations/999999"
    )
    assert response.status_code == 404
    assert response.get_json() == {"error": "Recommendation not found"}


def test_get_recommendation_wrong_incident_returns_404(auth_client):
    """Fetching a recommendation under the wrong incident returns 404."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    created = create_recommendation(auth_client, incident_id_a)
    rec_id = created.get_json()["id"]

    response = auth_client.get(
        f"/api/incidents/{incident_id_b}/recommendations/{rec_id}"
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# List recommendations
# ---------------------------------------------------------------------------

def test_list_recommendations_returns_all_for_incident(auth_client):
    """All recommendations for an incident are returned."""
    incident_id = create_incident(auth_client)
    create_recommendation(auth_client, incident_id, title="Action One",
                          priority="low")
    create_recommendation(auth_client, incident_id, title="Action Two",
                          priority="critical")

    response = auth_client.get(
        f"/api/incidents/{incident_id}/recommendations"
    )
    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_list_recommendations_empty(auth_client):
    """An incident with no recommendations returns an empty list."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(
        f"/api/incidents/{incident_id}/recommendations"
    )
    assert response.status_code == 200
    assert response.get_json() == []


def test_list_recommendations_isolated_per_incident(auth_client):
    """Recommendations are isolated by incident."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    create_recommendation(auth_client, incident_id_a, title="Only for A")

    response = auth_client.get(
        f"/api/incidents/{incident_id_b}/recommendations"
    )
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_recommendation_response_shape(auth_client):
    """Recommendation response contains exactly the expected public fields."""
    incident_id = create_incident(auth_client)
    response = create_recommendation(auth_client, incident_id,
                                     reason="Because of disk failure.")

    assert response.status_code == 201
    data = response.get_json()

    expected_keys = {
        "id", "incident_id", "title", "description",
        "priority", "reason", "created_at",
    }
    assert set(data.keys()) == expected_keys


def test_recommendation_created_at_is_iso_formatted(auth_client):
    """created_at is present and ISO 8601 formatted."""
    incident_id = create_incident(auth_client)
    response = create_recommendation(auth_client, incident_id)
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def test_recommendation_persists_across_requests(auth_client):
    """A created recommendation is visible in subsequent list calls."""
    incident_id = create_incident(auth_client)
    create_recommendation(auth_client, incident_id, title="Persistent action")

    response = auth_client.get(
        f"/api/incidents/{incident_id}/recommendations"
    )
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["title"] == "Persistent action"


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "healthy"}


def test_incidents_endpoint_still_protected(client):
    response = client.get("/api/incidents/")
    assert response.status_code == 401


def test_events_endpoint_still_protected(client):
    response = client.get("/api/events/")
    assert response.status_code == 401
