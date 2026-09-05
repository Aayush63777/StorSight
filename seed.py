"""
Seed script — creates a default admin user and role for local development.

Usage:
    python seed.py

Credentials created:
    username: admin
    password: admin123
"""

from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.role import Role
from app.models.user import User


def seed():
    app = create_app()
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
        user = User.query.filter_by(username="admin").first()
        if not user:
            user = User(
                username="admin",
                email="admin@storsight.local",
                password_hash=generate_password_hash("admin123"),
                role_id=role.id,
                is_active=True,
            )
            db.session.add(user)
            print("Created user: admin / admin123")
        else:
            print(f"User 'admin' already exists (id={user.id})")

        db.session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    seed()
