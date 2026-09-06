"""Tests for StorSight Risk Scoring — Phase 8."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.storage_resource import StorageResource
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.risk_scoring_service import RiskScoringService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def risk_data(app):
    """Create auth and storage resource test data for risk tests."""
    with app.app_context():
        db.create_all()

        role = Role(name="ENGINEER", description="Infrastructure engineer")
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"
        user = User(
            username="riskuser",
            email="riskuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)

        resource = StorageResource(
            name="risk-test-storage",
            resource_type="SAN",
            status="healthy",
            health_status="healthy",
            capacity_total=2000,
            capacity_used=1800,
        )
        db.session.add(resource)
        db.session.commit()

        resource_id = resource.id

    yield {"username": "riskuser", "password": password,
           "resource_id": resource_id}

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def auth_client(client, risk_data):
    """Return an authenticated test client."""
    client.post(
        "/api/auth/login",
        json={
            "username": risk_data["username"],
            "password": risk_data["password"],
        },
    )
    return client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_incident(client, title="Risk incident", severity="high"):
    resp = client.post(
        "/api/incidents/",
        json={"title": title, "severity": severity},
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def create_event(client, resource_id, event_type="disk_failure",
                 severity="critical", message="Disk failed"):
    resp = client.post(
        "/api/events/",
        json={
            "resource_id": resource_id,
            "event_type": event_type,
            "message": message,
            "severity": severity,
        },
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def create_alert(client, resource_id, title="Disk alert",
                 severity="critical"):
    resp = client.post(
        "/api/alerts/",
        json={
            "resource_id": resource_id,
            "title": title,
            "severity": severity,
        },
    )
    assert resp.status_code == 201
    return resp.get_json()["id"]


def link_event(client, incident_id, event_id):
    resp = client.post(
        f"/api/incidents/{incident_id}/events",
        json={"event_id": event_id},
    )
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

def test_risk_endpoint_requires_authentication(client):
    """Unauthenticated GET /risk is rejected."""
    response = client.get("/api/incidents/1/risk")
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


# ---------------------------------------------------------------------------
# Risk score — unknown incident
# ---------------------------------------------------------------------------

def test_risk_nonexistent_incident_returns_404(auth_client):
    """Risk score for a non-existent incident returns 404."""
    response = auth_client.get("/api/incidents/999999/risk")
    assert response.status_code == 404
    assert response.get_json() == {"error": "Incident not found."}


# ---------------------------------------------------------------------------
# Risk score — base score only (no correlated events or alerts)
# ---------------------------------------------------------------------------

def test_risk_low_severity_incident_base_score(auth_client):
    """A low-severity incident with no signals scores 10 (low)."""
    incident_id = create_incident(auth_client, severity="low")
    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    assert response.status_code == 200

    data = response.get_json()
    assert data["score"] == 10
    assert data["classification"] == "low"
    assert data["factors"]["base_score"] == 10
    assert data["factors"]["event_contribution"] == 0
    assert data["factors"]["alert_contribution"] == 0


def test_risk_medium_severity_incident_base_score(auth_client):
    """A medium-severity incident with no signals scores 25 (medium)."""
    incident_id = create_incident(auth_client, severity="medium")
    response = auth_client.get(f"/api/incidents/{incident_id}/risk")

    data = response.get_json()
    assert data["score"] == 25
    assert data["classification"] == "medium"


def test_risk_high_severity_incident_base_score(auth_client):
    """A high-severity incident with no signals scores 50 (high)."""
    incident_id = create_incident(auth_client, severity="high")
    response = auth_client.get(f"/api/incidents/{incident_id}/risk")

    data = response.get_json()
    assert data["score"] == 50
    assert data["classification"] == "high"


def test_risk_critical_severity_incident_base_score(auth_client):
    """A critical-severity incident with no signals scores 75 (critical)."""
    incident_id = create_incident(auth_client, severity="critical")
    response = auth_client.get(f"/api/incidents/{incident_id}/risk")

    data = response.get_json()
    assert data["score"] == 75
    assert data["classification"] == "critical"


# ---------------------------------------------------------------------------
# Risk score — with correlated events
# ---------------------------------------------------------------------------

def test_risk_increases_with_correlated_critical_event(
    auth_client, risk_data
):
    """A critical correlated event increases the risk score."""
    incident_id = create_incident(auth_client, severity="medium")
    event_id = create_event(auth_client, risk_data["resource_id"],
                            severity="critical")
    link_event(auth_client, incident_id, event_id)

    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    data = response.get_json()

    # medium base=25, critical event=8 → score=33
    assert data["score"] == 33
    assert data["classification"] == "medium"
    assert data["factors"]["event_contribution"] == 8
    assert data["factors"]["correlated_event_count"] == 1


def test_risk_increases_with_correlated_warning_event(
    auth_client, risk_data
):
    """A warning correlated event increases the risk score by 3."""
    incident_id = create_incident(auth_client, severity="low")
    event_id = create_event(auth_client, risk_data["resource_id"],
                            severity="warning")
    link_event(auth_client, incident_id, event_id)

    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    data = response.get_json()

    # low base=10, warning event=3 → score=13
    assert data["score"] == 13
    assert data["factors"]["event_contribution"] == 3


def test_risk_event_contribution_capped_at_20(auth_client, risk_data):
    """Event contribution is capped at 20 regardless of event count."""
    incident_id = create_incident(auth_client, severity="low")

    # 3 critical events = 3×8 = 24, capped to 20
    for i in range(3):
        event_id = create_event(
            auth_client, risk_data["resource_id"],
            event_type=f"failure_{i}",
            severity="critical",
            message=f"Failure {i}",
        )
        link_event(auth_client, incident_id, event_id)

    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    data = response.get_json()

    assert data["factors"]["event_contribution"] == 20
    # low base=10 + capped events=20 = 30
    assert data["score"] == 30


# ---------------------------------------------------------------------------
# Risk score — with active alerts
# ---------------------------------------------------------------------------

def test_risk_increases_with_active_alert(auth_client, risk_data):
    """An active critical alert on a correlated resource increases the score."""
    incident_id = create_incident(auth_client, severity="medium")
    event_id = create_event(auth_client, risk_data["resource_id"],
                            severity="info")
    link_event(auth_client, incident_id, event_id)
    create_alert(auth_client, risk_data["resource_id"], severity="critical")

    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    data = response.get_json()

    # medium base=25, info event=1, critical alert=4 → score=30
    assert data["score"] == 30
    assert data["factors"]["alert_contribution"] == 4
    assert data["factors"]["active_alert_count"] == 1


def test_risk_resolved_alert_not_counted(auth_client, risk_data):
    """Resolved alerts do not contribute to the risk score."""
    incident_id = create_incident(auth_client, severity="medium")
    event_id = create_event(auth_client, risk_data["resource_id"],
                            severity="info")
    link_event(auth_client, incident_id, event_id)

    alert_resp = auth_client.post(
        "/api/alerts/",
        json={
            "resource_id": risk_data["resource_id"],
            "title": "Will be resolved",
            "severity": "critical",
        },
    )
    alert_id = alert_resp.get_json()["id"]
    auth_client.patch(f"/api/alerts/{alert_id}/resolve")

    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    data = response.get_json()

    # resolved alert should not count
    assert data["factors"]["alert_contribution"] == 0
    assert data["factors"]["active_alert_count"] == 0


# ---------------------------------------------------------------------------
# Determinism and reproducibility
# ---------------------------------------------------------------------------

def test_risk_score_is_deterministic(auth_client, risk_data):
    """Same incident produces the same score on repeated calls."""
    incident_id = create_incident(auth_client, severity="high")
    event_id = create_event(auth_client, risk_data["resource_id"],
                            severity="warning")
    link_event(auth_client, incident_id, event_id)

    r1 = auth_client.get(f"/api/incidents/{incident_id}/risk").get_json()
    r2 = auth_client.get(f"/api/incidents/{incident_id}/risk").get_json()
    r3 = auth_client.get(f"/api/incidents/{incident_id}/risk").get_json()

    assert r1["score"] == r2["score"] == r3["score"]
    assert r1["classification"] == r2["classification"] == r3["classification"]


# ---------------------------------------------------------------------------
# Score boundaries
# ---------------------------------------------------------------------------

def test_risk_score_never_below_zero(auth_client):
    """Risk score is always >= 0."""
    incident_id = create_incident(auth_client, severity="low")
    data = auth_client.get(
        f"/api/incidents/{incident_id}/risk"
    ).get_json()
    assert data["score"] >= 0


def test_risk_score_never_above_100(auth_client, risk_data):
    """Risk score is always <= 100."""
    incident_id = create_incident(auth_client, severity="critical")

    # max possible: 75 base + 20 event cap + 15 alert cap = 110 → capped to 100
    for i in range(4):
        event_id = create_event(
            auth_client, risk_data["resource_id"],
            event_type=f"max_event_{i}",
            severity="critical",
            message=f"Max event {i}",
        )
        link_event(auth_client, incident_id, event_id)

    for i in range(5):
        create_alert(auth_client, risk_data["resource_id"],
                     title=f"Max alert {i}", severity="critical")

    data = auth_client.get(
        f"/api/incidents/{incident_id}/risk"
    ).get_json()
    assert data["score"] <= 100


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------

def test_risk_response_shape(auth_client):
    """Risk response contains exactly the expected fields."""
    incident_id = create_incident(auth_client, severity="medium")
    response = auth_client.get(f"/api/incidents/{incident_id}/risk")
    assert response.status_code == 200

    data = response.get_json()
    assert set(data.keys()) == {
        "incident_id", "score", "classification", "factors"
    }
    assert set(data["factors"].keys()) == {
        "incident_severity", "base_score", "event_contribution",
        "alert_contribution", "correlated_event_count", "active_alert_count",
    }


def test_risk_response_incident_id_matches(auth_client):
    """incident_id in response matches the requested incident."""
    incident_id = create_incident(auth_client)
    data = auth_client.get(
        f"/api/incidents/{incident_id}/risk"
    ).get_json()
    assert data["incident_id"] == incident_id


# ---------------------------------------------------------------------------
# Service-level unit tests (no HTTP)
# ---------------------------------------------------------------------------

def test_risk_service_classify_low(app):
    """Scores 0–24 classify as low."""
    with app.app_context():
        svc = RiskScoringService()
        assert svc._classify(0) == "low"
        assert svc._classify(24) == "low"


def test_risk_service_classify_medium(app):
    """Scores 25–49 classify as medium."""
    with app.app_context():
        svc = RiskScoringService()
        assert svc._classify(25) == "medium"
        assert svc._classify(49) == "medium"


def test_risk_service_classify_high(app):
    """Scores 50–74 classify as high."""
    with app.app_context():
        svc = RiskScoringService()
        assert svc._classify(50) == "high"
        assert svc._classify(74) == "high"


def test_risk_service_classify_critical(app):
    """Scores 75–100 classify as critical."""
    with app.app_context():
        svc = RiskScoringService()
        assert svc._classify(75) == "critical"
        assert svc._classify(100) == "critical"


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


def test_events_endpoint_still_protected(client):
    response = client.get("/api/events/")
    assert response.status_code == 401
