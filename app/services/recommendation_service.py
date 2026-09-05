"""Recommendation application service."""

from app.models.recommendation import Recommendation
from app.repositories.incident import IncidentRepository
from app.repositories.recommendation import RecommendationRepository


class RecommendationService:
    """Application operations for recommendations."""

    ALLOWED_PRIORITIES = {"low", "medium", "high", "critical"}

    def __init__(self, repository=None, incident_repository=None):
        self.repository = repository or RecommendationRepository()
        self.incident_repository = (
            incident_repository or IncidentRepository()
        )

    # --- retrieval ---

    def get_by_id(self, recommendation_id: int):
        return self.repository.get_by_id(recommendation_id)

    def list_by_incident(self, incident_id: int):
        return self.repository.get_by_incident_id(incident_id)

    def list_by_priority(self, priority: str):
        priority = self._validate_priority(priority)
        return self.repository.get_by_priority(priority)

    # --- creation ---

    def create_recommendation(
        self,
        incident_id: int,
        title: str,
        description: str,
        priority: str = "medium",
        reason: str | None = None,
    ):
        if not self.incident_repository.get_by_id(incident_id):
            raise ValueError("Incident not found.")

        if not title or not title.strip():
            raise ValueError("Recommendation title is required.")

        if not description or not description.strip():
            raise ValueError("Recommendation description is required.")

        priority = self._validate_priority(priority)

        recommendation = Recommendation(
            incident_id=incident_id,
            title=title.strip(),
            description=description.strip(),
            priority=priority,
            reason=reason.strip() if reason else None,
        )

        self.repository.add(recommendation)
        self.repository.commit()
        return recommendation

    # --- private validators ---

    def _validate_priority(self, priority: str) -> str:
        if not priority or priority.strip().lower() not in self.ALLOWED_PRIORITIES:
            raise ValueError(
                f"Invalid priority. Allowed values: "
                f"{sorted(self.ALLOWED_PRIORITIES)}"
            )
        return priority.strip().lower()
