"""Pytest fixtures for StorSight tests."""

import pytest

from app import create_app


@pytest.fixture
def app():
    """Create a Flask application configured for testing."""
    return create_app("testing")


@pytest.fixture
def client(app):
    """Create a Flask test client."""
    return app.test_client()