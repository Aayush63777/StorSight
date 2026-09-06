"""Tests for StorSight Audit Trail — Phase 9."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def audit_data(app):
    """Create auth test data for audit tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="audituser",
            email="audituser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

        user_id = user.id

    yield {"username": "audituser", "password": password, "user_id": user_id}

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, audit_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": audit_data["username"],
            "password": audit_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="Audit incident", severity="high"):
    resp = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def record_action(client, incident_id, action_type="investigation",
                  description="Reviewed metrics."):
    resp = client.post(
        f"/api/incidents/{incident_id}/actions",
        json={"action_type": action_type, "description": description},
    )
    assert resp.status_code == 201
    return resp.get_json()


def resolve_incident(client, incident_id):
    return client.patch(f"/api/incidents/{incident_id}/resolve")


# ---------------------------------------------------------------------------
# Authentication — audit log list endpoint
# ---------------------------------------------------------------------------

def test_list_audit_logs_requires_authentication(client):
    """Unauthenticated GET /api/audit-logs/ is rejected."""
    response = client.get("/api/audit-logs/")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_incident_audit_logs_requires_authentication(client):
    """Unauthenticated GET /api/audit-logs/incidents/<id> is rejected."""
    response = client.get("/api/audit-logs/incidents/1")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Audit record creation — engineer actions
# ---------------------------------------------------------------------------

def test_engineer_action_creates_audit_record(auth_client, audit_data):
    """Recording an engineer action creates an audit log entry."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id,
                  action_type="investigation",
                  description="Checking disk health.")

    response = auth_client.get(f"/api/audit-logs/incidents/{incident_id}")
    assert response.status_code == 200

    logs = response.get_json()
    assert len(logs) == 1
    assert logs[0]["action"] == "engineer_action:investigation"
    assert logs[0]["entity_type"] == "incident"
    assert logs[0]["entity_id"] == incident_id
    assert logs[0]["user_id"] == audit_data["user_id"]


def test_multiple_actions_create_multiple_audit_records(auth_client):
    """Each engineer action creates a separate audit record."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, action_type="investigation",
                  description="First action.")
    record_action(auth_client, incident_id, action_type="diagnosis",
                  description="Second action.")

    response = auth_client.get(f"/api/audit-logs/incidents/{incident_id}")
    logs = response.get_json()
    assert len(logs) == 2


# ---------------------------------------------------------------------------
# Audit record creation — incident resolution
# ---------------------------------------------------------------------------

def test_incident_resolution_creates_audit_record(auth_client, audit_data):
    """Resolving an incident automatically creates an audit log entry."""
    incident_id = create_incident(auth_client)
    resolve_incident(auth_client, incident_id)

    response = auth_client.get(f"/api/audit-logs/incidents/{incident_id}")
    assert response.status_code == 200

    logs = response.get_json()
    assert len(logs) == 1
    assert logs[0]["action"] == "incident_resolved"
    assert logs[0]["entity_type"] == "incident"
    assert logs[0]["entity_id"] == incident_id
    assert logs[0]["user_id"] == audit_data["user_id"]


def test_resolution_audit_record_details(auth_client):
    """Resolution audit record includes the incident title in details."""
    incident_id = create_incident(auth_client, title="Disk capacity incident")
    resolve_incident(auth_client, incident_id)

    logs = auth_client.get(
        f"/api/audit-logs/incidents/{incident_id}"
    ).get_json()
    assert "Disk capacity incident" in logs[0]["details"]


# ---------------------------------------------------------------------------
# Combined workflow audit trail
# ---------------------------------------------------------------------------

def test_combined_workflow_creates_ordered_audit_trail(auth_client):
    """Actions + resolution together produce a complete ordered audit trail."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, action_type="investigation",
                  description="Initial review.")
    record_action(auth_client, incident_id, action_type="remediation",
                  description="Applied fix.")
    resolve_incident(auth_client, incident_id)

    response = auth_client.get(f"/api/audit-logs/incidents/{incident_id}")
    logs = response.get_json()

    # three entries: 2 actions + 1 resolution
    assert len(logs) == 3

    # newest first — resolution is most recent
    assert logs[0]["action"] == "incident_resolved"
    assert logs[1]["action"] == "engineer_action:remediation"
    assert logs[2]["action"] == "engineer_action:investigation"


# ---------------------------------------------------------------------------
# Cross-incident protection
# ---------------------------------------------------------------------------

def test_incident_audit_logs_isolated_per_incident(auth_client):
    """Audit logs for one incident are not visible under another."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")

    record_action(auth_client, incident_id_a, description="Action on A.")

    response = auth_client.get(
        f"/api/audit-logs/incidents/{incident_id_b}"
    )
    assert response.get_json() == []


def test_global_audit_log_shows_all_entries(auth_client):
    """GET /api/audit-logs/ returns entries from all incidents."""
    incident_id_a = create_incident(auth_client, title="Incident A")
    incident_id_b = create_incident(auth_client, title="Incident B")

    record_action(auth_client, incident_id_a, description="Action on A.")
    resolve_incident(auth_client, incident_id_b)

    response = auth_client.get("/api/audit-logs/")
    assert response.status_code == 200
    logs = response.get_json()
    assert len(logs) >= 2


# ---------------------------------------------------------------------------
# Audit log retrieval — empty
# ---------------------------------------------------------------------------

def test_incident_audit_log_empty_for_new_incident(auth_client):
    """A new incident with no activity has an empty audit log."""
    incident_id = create_incident(auth_client)
    response = auth_client.get(f"/api/audit-logs/incidents/{incident_id}")
    assert response.status_code == 200
    assert response.get_json() == []


# ---------------------------------------------------------------------------
# Audit log response shape
# ---------------------------------------------------------------------------

def test_audit_log_response_shape(auth_client):
    """Audit log entry contains the expected public fields."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, description="Shape check.")

    logs = auth_client.get(
        f"/api/audit-logs/incidents/{incident_id}"
    ).get_json()
    assert len(logs) == 1

    expected_keys = {
        "id", "user_id", "action", "entity_type",
        "entity_id", "details", "created_at",
    }
    assert set(logs[0].keys()) == expected_keys


def test_audit_log_created_at_is_iso_formatted(auth_client):
    """created_at in audit records is ISO 8601 formatted."""
    incident_id = create_incident(auth_client)
    record_action(auth_client, incident_id, description="Timing check.")

    logs = auth_client.get(
        f"/api/audit-logs/incidents/{incident_id}"
    ).get_json()
    assert "T" in logs[0]["created_at"]


# ---------------------------------------------------------------------------
# Audit immutability — no mutation endpoints in Phase 9
# ---------------------------------------------------------------------------

def test_no_delete_endpoint_for_audit_logs(auth_client):
    """DELETE on an audit log returns 404/405 — no mutation API exists."""
    incident_id = create_incident(auth_client)
    action = record_action(auth_client, incident_id,
                           description="Immutability check.")
    log_id = action["id"]

    response = auth_client.delete(f"/api/audit-logs/{log_id}")
    # 404 (no route) or 405 (method not allowed) — neither should be 200
    assert response.status_code in (404, 405)


# ---------------------------------------------------------------------------
# Resolution state-transition guard
# ---------------------------------------------------------------------------

def test_already_resolved_incident_returns_409(auth_client):
    """Resolving an already-resolved incident returns 409."""
    incident_id = create_incident(auth_client)
    first = resolve_incident(auth_client, incident_id)
    assert first.status_code == 200

    second = resolve_incident(auth_client, incident_id)
    assert second.status_code == 409
    assert second.get_json() == {"error": "Incident is already resolved."}


def test_double_resolution_does_not_create_second_audit_record(auth_client):
    """A rejected re-resolve does not create a duplicate audit entry."""
    incident_id = create_incident(auth_client)
    resolve_incident(auth_client, incident_id)
    resolve_incident(auth_client, incident_id)  # rejected with 409

    logs = auth_client.get(
        f"/api/audit-logs/incidents/{incident_id}"
    ).get_json()
    resolution_logs = [l for l in logs if l["action"] == "incident_resolved"]
    assert len(resolution_logs) == 1


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


def test_events_endpoint_still_protected(client):
    response = client.get("/api/events/")
    assert response.status_code == 401


def test_metrics_endpoint_still_protected(client):
    response = client.get("/api/metrics/")
    assert response.status_code == 401
