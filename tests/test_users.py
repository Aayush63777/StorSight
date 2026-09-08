"""Tests for admin user management."""

import pytest

from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.fixture
def user_data(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        admin_role = Role(name="ADMIN", description="Administrator")
        engineer_role = Role(name="ENGINEER", description="Engineer")
        db.session.add_all([admin_role, engineer_role])
        db.session.flush()
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=AuthService().hash_password("Admin-Password-123"),
            role_id=admin_role.id,
        )
        db.session.add(admin)
        db.session.commit()
        ids = {"admin_role": admin_role.id, "engineer_role": engineer_role.id}

    yield ids

    with app.app_context():
        db.session.remove()
        db.drop_all()


def login(client):
    return client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin-Password-123"},
    )


def test_user_management_requires_admin(client, user_data):
    assert client.get("/api/users/").status_code == 401
    assert client.post("/api/users/", json={}).status_code == 401


def test_admin_can_create_user_with_hashed_password(client, user_data):
    login(client)
    response = client.post(
        "/api/users/",
        json={
            "username": " engineer02 ",
            "email": "Engineer02@Example.COM",
            "password": "Engineer-Password-123",
            "role_id": user_data["engineer_role"],
            "is_active": True,
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload == {
        "id": 2,
        "username": "engineer02",
        "email": "engineer02@example.com",
        "is_active": True,
        "role_id": user_data["engineer_role"],
        "role": "ENGINEER",
    }
    assert "password" not in payload
    assert "password_hash" not in payload

    with client.application.app_context():
        user = User.query.filter_by(username="engineer02").first()
        assert user.password_hash != "Engineer-Password-123"
        assert AuthService().verify_password(
            user.password_hash, "Engineer-Password-123"
        )


def test_non_admin_cannot_manage_users(client, user_data):
    with client.application.app_context():
        engineer = User(
            username="engineer",
            email="engineer@example.com",
            password_hash=AuthService().hash_password("Engineer-Password-123"),
            role_id=user_data["engineer_role"],
        )
        db.session.add(engineer)
        db.session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "engineer", "password": "Engineer-Password-123"},
    )
    assert response.status_code == 200
    assert client.get("/api/users/").status_code == 403
    assert client.post("/api/users/", json={}).status_code == 403


def test_user_creation_validates_duplicates_role_and_inactive_status(client, user_data):
    login(client)
    payload = {
        "username": "engineer02",
        "email": "engineer02@example.com",
        "password": "Engineer-Password-123",
        "role_id": user_data["engineer_role"],
        "is_active": False,
    }
    assert client.post("/api/users/", json=payload).status_code == 201
    assert client.post("/api/users/", json=payload).status_code == 400

    invalid_role = {**payload, "username": "other", "email": "other@example.com", "role_id": 999}
    assert client.post("/api/users/", json=invalid_role).status_code == 400

    with client.application.app_context():
        inactive = User.query.filter_by(username="engineer02").first()
        assert inactive.is_active is False

    client.post("/api/auth/logout")
    assert client.post(
        "/api/auth/login",
        json={"username": "engineer02", "password": "Engineer-Password-123"},
    ).status_code == 401
