"""Tests for the StorSight health endpoint."""

from app.routes import health as health_module


def test_create_app(app):
    """Verify the Flask application can be created."""
    assert app is not None


def test_health_endpoint(client):
    """Verify the health endpoint reports app and database readiness."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["checks"]["database"]["status"] == "ok"


def test_health_ready_endpoint(client):
    """Verify the readiness endpoint reports database and redis health."""
    response = client.get("/health/ready")

    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
    assert data["checks"]["database"]["status"] == "ok"
    assert data["checks"]["redis"]["status"] == "ok"


def test_health_checks_sanitize_dependency_errors(app, monkeypatch):
    """Verify health checks return generic dependency-failure messages."""

    class DummyEngine:
        def connect(self):
            raise RuntimeError("postgresql://user:pass@host:5432/storsight")

    class DummyRedisClient:
        def ping(self):
            raise RuntimeError("redis://user:pass@host:6379/0")

    monkeypatch.setattr(health_module, "db", type("DummyDB", (), {"engine": DummyEngine()})())
    monkeypatch.setattr(
        health_module.redis.Redis,
        "from_url",
        lambda *args, **kwargs: DummyRedisClient(),
    )

    with app.app_context():
        app.config["RATE_LIMIT_STORAGE_URI"] = "redis://redis.example.test:6379/0"

        assert health_module._database_check() == {
            "status": "error",
            "details": "database unavailable",
        }
        assert health_module._redis_check() == {
            "status": "error",
            "details": "redis unavailable",
        }


def test_public_service_endpoints(client):
    """Expose stable health responses for hosting probes and API visitors."""
    for path in ("/", "/api/health"):
        response = client.get(path)
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"
        assert data["checks"]["database"]["status"] == "ok"