"""Tests for StorSight Engineer Actions — Phase 9."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def action_data(app):
    """Create auth test data for engineer action tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="actionuser",
            email="actionuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

        user_id = user.id

    yield {"username": "actionuser", "password": password, "user_id": user_id}

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, action_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": action_data["username"],
            "password": action_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="Action incident", severity="high"):
    resp = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def create_recommendation(client, incident_id,
                          title="Check disk health",
                          description="Run disk diagnostics.",
                          priority="high"):
    resp = client.post(
        f"/api/incidents/{incident_id}/recommendations",
        json={"title": title, "description": description, "priority": priority},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def record_action(client, incident_id,
                  action_type="investigation",
                  description="Reviewed disk metrics.",
                  recommendation_id=None):
    payload = {"action_type": action_type, "description": description}
    if recommendation_id is not None:
        payload["recommendation_id"] = recommendation_id
    return client.post(f"/api/incidents/{incident_id}/actions", json=payload)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_actions_requires_authentication(client):
    """Unauthenticated GET /actions is rejected."""
    response = client.get("/api/incidents/1/actions")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_action_requires_authentication(client):
    """Unauthenticated POST /actions is rejected."""
    response = client.post(
        "/api/incidents/1/actions",
        json={"action_type": "investigation", "description": "Reviewed."},
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create action — happy path
# ---------------------------------------------------------------------------

def test_create_action_success(auth_client, action_data):
    """A valid engineer action is created and returns 201."""
    incident_id = create_incident(auth_client)

    response = record_action(
        auth_client, incident_id,
        action_type="investigation",
        description="Reviewed storage metrics and identified capacity issue.",
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["incident_id"] == incident_id
    assert data["user_id"] == action_data["user_id"]
    assert data["action_type"] == "investigation"
    assert data["description"] == "Reviewed storage metrics and identified capacity issue."
    assert data["recommendation_id"] is None
    assert data["created_at"] is not None
    assert "id" in data


def test_create_action_all_allowed_types(auth_client):
    """All six allowed action types are accepted."""
    incident_id = create_incident(auth_client)
    for action_type in (
        "investigation", "diagnosis", "remediation",
        "escalation", "monitoring", "note",
    ):
        response = record_action(
            auth_client, incident_id,
            action_type=action_type,
            description=f"Action: {action_type}",
        )
        assert response.status_code == 201, f"Failed for type={action_type}"
        assert response.get_json()["action_type"] == action_type


def test_create_action_with_recommendation(auth_client):
    """An action can reference a recommendation on the same incident."""
    incident_id = create_incident(auth_client)
    rec_id = create_recommendation(auth_client, incident_id)

    response = record_action(
        auth_client, incident_id,
        action_type="remediation",
        description="Applied recommended fix.",
        recommendation_id=rec_id,
    )

    assert response.status_code == 201
    assert response.get_json()["recommendation_id"] == rec_id


def test_actor_identity_is_authenticated_user(auth_client, action_data):
    """The action's user_id matches the authenticated user, not client-supplied."""
    incident_id = create_incident(auth_client)

    # even if a client somehow sent a different user_id it must be ignored
    response = auth_client.post(
        f"/api/incidents/{incident_id}/actions",
        json={
            "action_type": "note",
            "description": "Noted.",
            "user_id": 99999,  # should be ignored — actor comes from session
        },
    )

    assert response.status_code == 201
    assert response.get_json()["user_id"] == action_data["user_id"]


# ---------------------------------------------------------------------------
# Create action — validation failures
# ---------------------------------------------------------------------------

def test_create_action_nonexistent_incident_returns_400(auth_client):
    """Action for a non-existent incident returns 400."""
    response = record_action(auth_client, 999999)
    assert response.status_code == 400
    assert response.get_json() == {"error": "Incident not found."}


def test_create_action_invalid_type_returns_400(auth_client):
    """An unrecognised action_type is rejected."""
    incident_id = create_incident(auth_client)
    response = record_action(
        auth_client, incident_id,
        action_type="hack",
        description="Something.",
    )
    assert response.status_code == 400
    assert "Invalid action type" in response.get_json()["error"]


def test_create_action_blank_description_returns_400(auth_client):
    """A blank description is rejected."""
    incident_id = create_incident(auth_client)
    response = record_action(
        auth_client, incident_id,
        action_type="note",
        description="   ",
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Action description is required."}


def test_create_action_nonexistent_recommendation_returns_400(auth_client):
    """Referencing a non-existent recommendation returns 400."""
    incident_id = create_incident(auth_client)
    response = record_action(
        auth_client, incident_id,
        action_type="remediation",
        description="Applying fix.",
        recommendation_id=999999,
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Recommendation not found."}


def test_create_action_wrong_incident_recommendation_returns_400(auth_client):
    """A recommendation from a different incident is rejected."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    rec_id = create_recommendation(auth_client, incident_id_a)

    response = record_action(
        auth_client, incident_id_b,
        action_type="remediation",
        description="Cross-incident attempt.",
        recommendation_id=rec_id,
    )
    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Recommendation does not belong to this incident."
    }


# ---------------------------------------------------------------------------
# List actions
# ---------------------------------------------------------------------------

def test_list_actions_returns_all_for_incident(auth_client):
    """All actions for an incident are returned."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, action_type="investigation",
                  description="First look.")
    record_action(auth_client, incident_id, action_type="diagnosis",
                  description="Identified root cause.")

    response = auth_client.get(f"/api/incidents/{incident_id}/actions")
    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_list_actions_empty(auth_client):
    """An incident with no actions returns an empty list."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(f"/api/incidents/{incident_id}/actions")
    assert response.status_code == 200
    assert response.get_json() == []


def test_list_actions_nonexistent_incident_returns_404(auth_client):
    """Listing actions for a non-existent incident returns 404."""
    response = auth_client.get("/api/incidents/999999/actions")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found"}


def test_list_actions_isolated_per_incident(auth_client):
    """Actions are isolated by incident."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    record_action(auth_client, incident_id_a, description="Action for A only.")

    response = auth_client.get(f"/api/incidents/{incident_id_b}/actions")
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_action_response_shape(auth_client, action_data):
    """Action response contains exactly the expected public fields."""
    incident_id = create_incident(auth_client)
    response = record_action(auth_client, incident_id,
                             description="Shape check.")
    assert response.status_code == 201

    expected_keys = {
        "id", "incident_id", "user_id", "action_type",
        "description", "recommendation_id", "created_at",
    }
    assert set(response.get_json().keys()) == expected_keys


def test_action_created_at_is_iso_formatted(auth_client):
    """created_at is present and ISO 8601 formatted."""
    incident_id = create_incident(auth_client)
    response = record_action(auth_client, incident_id, description="Timing.")
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def test_action_persists_across_requests(auth_client):
    """A created action is visible in subsequent list calls."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, action_type="monitoring",
                  description="Watching disk metrics.")

    response = auth_client.get(f"/api/incidents/{incident_id}/actions")
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["description"] == "Watching disk metrics."
    assert data[0]["action_type"] == "monitoring"


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

def test_health_endpoint_still_works(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_incidents_endpoint_still_protected(client):
    response = client.get("/api/incidents/")
    assert response.status_code == 401


def test_alerts_endpoint_still_protected(client):
    response = client.get("/api/alerts/")
    assert response.status_code == 401
