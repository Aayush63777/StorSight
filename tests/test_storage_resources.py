"""Tests for StorSight storage resource API."""

import pytest

from app.auth.decorators import role_required
from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.fixture
def auth_data(app):
    """Create an authenticated test user."""
    with app.app_context():
        db.create_all()

        role = Role(
            name="ENGINEER",
            description="Infrastructure engineer",
        )
        db.session.add(role)
        db.session.flush()

        password = "StorSight-Test-Password"

        user = User(
            username="resourceuser",
            email="resourceuser@storsight.local",
            password_hash=AuthService().hash_password(password),
            role_id=role.id,
        )
        db.session.add(user)
        db.session.commit()

        user_id = user.id

    yield {
        "username": "resourceuser",
        "password": password,
        "user_id": user_id,
    }

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def authenticated_client(client, auth_data):
    """Return an authenticated test client."""
    response = client.post(
        "/api/auth/login",
        json={
            "username": auth_data["username"],
            "password": auth_data["password"],
        },
    )

    assert response.status_code == 200
    return client


def test_storage_resources_require_authentication(client):
    """Unauthenticated users cannot access storage resources."""
    response = client.get("/api/storage-resources/")

    assert response.status_code == 401
    assert response.get_json() == {
        "error": "Authentication required"
    }


def test_create_storage_resource(authenticated_client):
    """Authenticated users can create resources."""
    response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "storage-node-01",
            "resource_type": "NAS",
            "status": "healthy",
            "health_status": "healthy",
            "capacity_total": 1000,
            "capacity_used": 400,
        },
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["name"] == "storage-node-01"
    assert data["resource_type"] == "NAS"
    assert data["status"] == "healthy"
    assert data["health_status"] == "healthy"
    assert data["capacity_total"] == 1000
    assert data["capacity_used"] == 400
    assert "password_hash" not in data


def test_list_storage_resources(authenticated_client):
    """Authenticated users can list resources."""
    authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "storage-node-01",
            "resource_type": "SAN",
        },
    )

    response = authenticated_client.get("/api/storage-resources/")

    assert response.status_code == 200

    data = response.get_json()

    assert len(data) == 1
    assert data[0]["name"] == "storage-node-01"


def test_get_storage_resource(authenticated_client):
    """Authenticated users can retrieve a resource by ID."""
    create_response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "storage-node-01",
            "resource_type": "SAN",
        },
    )

    resource_id = create_response.get_json()["id"]

    response = authenticated_client.get(
        f"/api/storage-resources/{resource_id}"
    )

    assert response.status_code == 200
    assert response.get_json()["id"] == resource_id


def test_update_storage_resource(authenticated_client):
    """Authenticated users can update a resource."""
    create_response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "storage-node-01",
            "resource_type": "SAN",
        },
    )

    resource_id = create_response.get_json()["id"]

    response = authenticated_client.patch(
        f"/api/storage-resources/{resource_id}",
        json={
            "status": "warning",
            "health_status": "warning",
            "capacity_used": 700,
        },
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["status"] == "warning"
    assert data["health_status"] == "warning"
    assert data["capacity_used"] == 700


def test_delete_storage_resource(authenticated_client):
    """Authenticated users can delete a resource."""
    create_response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "storage-node-01",
            "resource_type": "SAN",
        },
    )

    resource_id = create_response.get_json()["id"]

    response = authenticated_client.delete(
        f"/api/storage-resources/{resource_id}"
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "message": "Storage resource deleted"
    }

    response = authenticated_client.get(
        f"/api/storage-resources/{resource_id}"
    )

    assert response.status_code == 404


def test_invalid_capacity_is_rejected(authenticated_client):
    """Used capacity cannot exceed total capacity."""
    response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "invalid-resource",
            "resource_type": "SAN",
            "capacity_total": 100,
            "capacity_used": 150,
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Used capacity cannot exceed total capacity."
    }


def test_invalid_status_is_rejected(authenticated_client):
    """Unsupported resource status is rejected."""
    response = authenticated_client.post(
        "/api/storage-resources/",
        json={
            "name": "invalid-status-resource",
            "resource_type": "SAN",
            "status": "invalid",
        },
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "error": "Invalid resource status."
    }
