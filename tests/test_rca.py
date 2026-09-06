"""Tests for StorSight Root-Cause Analysis — Phase 8."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def rca_data(app):
    """Create auth test data for RCA tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="rcauser",
            email="rcauser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

    yield {"username": "rcauser", "password": password}

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, rca_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": rca_data["username"],
            "password": rca_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="RCA incident", severity="high"):
    resp = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def create_rca(client, incident_id,
               category="capacity_exhaustion",
               explanation="Capacity threshold exceeded on primary volume.",
               rule_name="capacity_threshold_rule",
               confidence_score=0.85):
    return client.post(
        f"/api/incidents/{incident_id}/rca",
        json={
            "root_cause_category": category,
            "explanation": explanation,
            "rule_name": rule_name,
            "confidence_score": confidence_score,
        },
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_list_rca_requires_authentication(client):
    response = client.get("/api/incidents/1/rca")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_get_rca_requires_authentication(client):
    response = client.get("/api/incidents/1/rca/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_create_rca_requires_authentication(client):
    response = client.post(
        "/api/incidents/1/rca",
        json={
            "root_cause_category": "capacity_exhaustion",
            "explanation": "Disk full.",
            "rule_name": "capacity_rule",
            "confidence_score": 0.9,
        },
    )
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Create RCA — happy path
# ---------------------------------------------------------------------------

def test_create_rca_success(auth_client):
    """A valid RCA is created and returns 201 with correct fields."""
    incident_id = create_incident(auth_client)

    response = create_rca(
        auth_client,
        incident_id,
        category="performance_degradation",
        explanation="High latency linked to disk saturation.",
        rule_name="latency_saturation_rule",
        confidence_score=0.9,
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["incident_id"] == incident_id
    assert data["root_cause_category"] == "performance_degradation"
    assert data["explanation"] == "High latency linked to disk saturation."
    assert data["rule_name"] == "latency_saturation_rule"
    assert data["confidence_score"] == 0.9
    assert data["created_at"] is not None
    assert "id" in data


def test_create_rca_default_confidence_score(auth_client):
    """When confidence_score is omitted it defaults to 0.0."""
    incident_id = create_incident(auth_client)

    response = auth_client.post(
        f"/api/incidents/{incident_id}/rca",
        json={
            "root_cause_category": "network_failure",
            "explanation": "Network path degraded.",
            "rule_name": "network_rule",
        },
    )
    assert response.status_code == 201
    assert response.get_json()["confidence_score"] == 0.0


def test_create_rca_confidence_score_boundaries(auth_client):
    """Confidence scores of 0.0 and 1.0 are both valid."""
    incident_id = create_incident(auth_client)

    for score in (0.0, 1.0):
        response = create_rca(
            auth_client, incident_id,
            rule_name=f"rule_{score}",
            confidence_score=score,
        )
        assert response.status_code == 201, f"Failed for score={score}"
        assert response.get_json()["confidence_score"] == score


# ---------------------------------------------------------------------------
# Create RCA — validation failures
# ---------------------------------------------------------------------------

def test_create_rca_nonexistent_incident_returns_400(auth_client):
    """RCA for a non-existent incident returns 400."""
    response = create_rca(auth_client, 999999)
    assert response.status_code == 400
    assert response.get_json() == {"error": "Incident not found."}


def test_create_rca_blank_category_returns_400(auth_client):
    """A blank root_cause_category is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/rca",
        json={
            "root_cause_category": "   ",
            "explanation": "Some explanation.",
            "rule_name": "some_rule",
            "confidence_score": 0.5,
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Root-cause category is required."}


def test_create_rca_blank_explanation_returns_400(auth_client):
    """A blank explanation is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/rca",
        json={
            "root_cause_category": "capacity_exhaustion",
            "explanation": "   ",
            "rule_name": "some_rule",
            "confidence_score": 0.5,
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Root-cause explanation is required."}


def test_create_rca_blank_rule_name_returns_400(auth_client):
    """A blank rule_name is rejected."""
    incident_id = create_incident(auth_client)
    response = auth_client.post(
        f"/api/incidents/{incident_id}/rca",
        json={
            "root_cause_category": "capacity_exhaustion",
            "explanation": "Some explanation.",
            "rule_name": "   ",
            "confidence_score": 0.5,
        },
    )
    assert response.status_code == 400
    assert response.get_json() == {"error": "Rule name is required."}


def test_create_rca_confidence_score_above_1_returns_400(auth_client):
    """A confidence_score > 1.0 is rejected."""
    incident_id = create_incident(auth_client)
    response = create_rca(auth_client, incident_id, confidence_score=1.1)
    assert response.status_code == 400
    assert "Confidence score" in response.get_json()["error"]


def test_create_rca_confidence_score_below_0_returns_400(auth_client):
    """A confidence_score < 0.0 is rejected."""
    incident_id = create_incident(auth_client)
    response = create_rca(auth_client, incident_id, confidence_score=-0.1)
    assert response.status_code == 400
    assert "Confidence score" in response.get_json()["error"]


# ---------------------------------------------------------------------------
# Retrieve by ID
# ---------------------------------------------------------------------------

def test_get_rca_by_id(auth_client):
    """A created RCA can be retrieved by its ID."""
    incident_id = create_incident(auth_client)
    created = create_rca(auth_client, incident_id,
                         category="disk_failure",
                         explanation="Primary disk failed.",
                         rule_name="disk_rule",
                         confidence_score=0.95)
    rca_id = created.get_json()["id"]

    response = auth_client.get(f"/api/incidents/{incident_id}/rca/{rca_id}")
    assert response.status_code == 200

    data = response.get_json()
    assert data["id"] == rca_id
    assert data["root_cause_category"] == "disk_failure"
    assert data["confidence_score"] == 0.95


def test_get_rca_not_found_returns_404(auth_client):
    """An unknown RCA ID returns 404."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(f"/api/incidents/{incident_id}/rca/999999")
    assert response.status_code == 404
    assert response.get_json() == {"error": "RCA not found"}


def test_get_rca_wrong_incident_returns_404(auth_client):
    """Fetching an RCA under the wrong incident_id returns 404."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    created = create_rca(auth_client, incident_id_a)
    rca_id = created.get_json()["id"]

    response = auth_client.get(f"/api/incidents/{incident_id_b}/rca/{rca_id}")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# List RCA
# ---------------------------------------------------------------------------

def test_list_rca_returns_all_for_incident(auth_client):
    """All RCA records for an incident are returned."""
    incident_id = create_incident(auth_client)
    create_rca(auth_client, incident_id, category="disk_failure",
               rule_name="rule_1")
    create_rca(auth_client, incident_id, category="network_failure",
               rule_name="rule_2")

    response = auth_client.get(f"/api/incidents/{incident_id}/rca")
    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_list_rca_empty(auth_client):
    """An incident with no RCA returns an empty list."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(f"/api/incidents/{incident_id}/rca")
    assert response.status_code == 200
    assert response.get_json() == []


def test_list_rca_isolated_per_incident(auth_client):
    """RCA records are isolated by incident."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")
    create_rca(auth_client, incident_id_a, rule_name="rule_a")

    response = auth_client.get(f"/api/incidents/{incident_id_b}/rca")
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_rca_response_shape(auth_client):
    """RCA response contains exactly the expected public fields."""
    incident_id = create_incident(auth_client)
    response = create_rca(auth_client, incident_id)

    assert response.status_code == 201
    data = response.get_json()

    expected_keys = {
        "id", "incident_id", "root_cause_category", "confidence_score",
        "explanation", "rule_name", "created_at",
    }
    assert set(data.keys()) == expected_keys


def test_rca_created_at_is_iso_formatted(auth_client):
    """created_at is present and ISO 8601 formatted."""
    incident_id = create_incident(auth_client)
    response = create_rca(auth_client, incident_id)
    data = response.get_json()
    assert data["created_at"] is not None
    assert "T" in data["created_at"]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def test_rca_persists_across_requests(auth_client):
    """A created RCA is visible in subsequent list calls."""
    incident_id = create_incident(auth_client)
    create_rca(auth_client, incident_id, category="capacity_exhaustion",
               rule_name="persist_rule")

    response = auth_client.get(f"/api/incidents/{incident_id}/rca")
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["root_cause_category"] == "capacity_exhaustion"


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
