"""
Seed script — creates the initial admin role and user.

Usage:
    $env:ADMIN_USERNAME = "admin"
    $env:ADMIN_EMAIL = "admin@storsight.local"
    $env:ADMIN_PASSWORD = "use-a-strong-local-password"
    python seed.py

Bootstrap credentials are intentionally supplied through the environment so a
default password cannot be deployed accidentally.
"""

import os

from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.role import Role
from app.models.storage_resource import StorageResource
from app.models.user import User


DEMO_RESOURCES = (
    {
        "name": "prod-san-array-01",
        "resource_type": "SAN",
        "status": "healthy",
        "health_status": "healthy",
        "capacity_total": 2048.0,
        "capacity_used": 972.0,
    },
    {
        "name": "prod-nas-cluster-01",
        "resource_type": "NAS",
        "status": "warning",
        "health_status": "warning",
        "capacity_total": 8192.0,
        "capacity_used": 7168.0,
    },
    {
        "name": "dev-iscsi-pool-01",
        "resource_type": "iSCSI",
        "status": "healthy",
        "health_status": "healthy",
        "capacity_total": 1024.0,
        "capacity_used": 284.0,
    },
    {
        "name": "archive-object-store-01",
        "resource_type": "Object",
        "status": "critical",
        "health_status": "critical",
        "capacity_total": 16384.0,
        "capacity_used": 15872.0,
    },
    {
        "name": "retired-nvme-node-01",
        "resource_type": "NVMe",
        "status": "offline",
        "health_status": "unknown",
        "capacity_total": None,
        "capacity_used": None,
    },
)


def seed():
    app = create_app()
    username = os.getenv("ADMIN_USERNAME")
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not username or not email or not password:
        raise RuntimeError(
            "ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set."
        )
    if len(password) < 8:
        raise RuntimeError("ADMIN_PASSWORD must be at least 8 characters.")

    with app.app_context():
        # ── Role ──────────────────────────────────────────────
        role = Role.query.filter_by(name="ADMIN").first()
        if not role:
            role = Role(name="ADMIN", description="Platform administrator")
            db.session.add(role)
            db.session.flush()
            print(f"Created role: ADMIN (id={role.id})")
        else:
            print(f"Role ADMIN already exists (id={role.id})")

        # ── Engineer role ──────────────────────────────────────
        eng_role = Role.query.filter_by(name="ENGINEER").first()
        if not eng_role:
            eng_role = Role(name="ENGINEER", description="Operations engineer")
            db.session.add(eng_role)
            db.session.flush()
            print(f"Created role: ENGINEER (id={eng_role.id})")

        # ── User ───────────────────────────────────────────────
        user = User.query.filter_by(username=username.strip()).first()
        if not user:
            user = User(
                username=username.strip(),
                email=email.strip().lower(),
                password_hash=generate_password_hash(password),
                role_id=role.id,
                is_active=True,
            )
            db.session.add(user)
            print(f"Created admin user: {user.username}")
        else:
            print(f"User '{user.username}' already exists (id={user.id})")

        if os.getenv("SEED_DEMO_DATA", "false").lower() == "true":
            for fixture in DEMO_RESOURCES:
                resource = StorageResource.query.filter_by(
                    name=fixture["name"]
                ).first()
                if resource is None:
                    db.session.add(StorageResource(**fixture))
                    print(f"Created demo resource: {fixture['name']}")
                else:
                    for key, value in fixture.items():
                        setattr(resource, key, value)
                    print(f"Updated demo resource: {fixture['name']}")

        db.session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
