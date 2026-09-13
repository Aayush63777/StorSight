"""Tests for the StorSight health endpoint."""


def test_create_app(app):
    """Verify the Flask application can be created."""
    assert app is not None


def test_health_endpoint(client):
    """Verify the health endpoint returns an OK status."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_public_service_endpoints(client):
    """Expose stable health responses for hosting probes and API visitors."""
    for path in ("/", "/api/health"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.get_json() == {"status": "ok"}