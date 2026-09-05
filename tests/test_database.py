"""Tests for the StorSight database foundation."""

from app.extensions import db


def test_database_connection(app):
    """Verify the configured database can establish a connection."""
    with app.app_context():
        connection = db.engine.connect()
        connection.close()


def test_database_session_is_available(app):
    """Verify the SQLAlchemy session is available."""
    with app.app_context():
        assert db.session is not None