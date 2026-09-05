"""Recommendation repository."""

from app.models.recommendation import Recommendation
from app.repositories.base import BaseRepository


class RecommendationRepository(BaseRepository[Recommendation]):
    """Data access operations for recommendations."""

    def __init__(self):
        super().__init__(Recommendation)

    def get_all(self):
        """Return all recommendations, newest first."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_incident_id(self, incident_id: int):
        """Return recommendations for an incident, newest first."""
        return (
            self.model.query
            .filter_by(incident_id=incident_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_priority(self, priority: str):
        """Return recommendations by priority, newest first."""
        return (
            self.model.query
            .filter_by(priority=priority)
            .order_by(self.model.created_at.desc())
            .all()
        )
