"""Tests for the StorSight health endpoint."""


def test_create_app(app):
    """Verify the Flask application can be created."""
    assert app is not None


def test_health_endpoint(client):
    """Verify the health endpoint returns an OK status."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}